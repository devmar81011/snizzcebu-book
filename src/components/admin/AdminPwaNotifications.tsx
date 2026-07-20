"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function AdminPwaNotifications() {
  const [supported] = useState(() =>
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window,
  );
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [enabled, setEnabled] = useState(false);
  const [installEvent, setInstallEvent] = useState<{
    prompt: () => Promise<void>;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);

  async function refreshPushStatus() {
    try {
      const data = await fetch("/api/push/vapid").then((r) => r.json());
      setConfigured(Boolean(data.configured));
      setSubscriberCount(Number(data.subscriberCount) || 0);
    } catch {
      setConfigured(false);
    }
  }

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      const e = event as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: string }>;
      };
      setInstallEvent({
        prompt: async () => {
          await e.prompt();
          await e.userChoice;
          setInstallEvent(null);
        },
      });
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    navigator.serviceWorker
      ?.register("/sw.js")
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setEnabled(Boolean(sub));
      })
      .catch(() => undefined);

    refreshPushStatus().catch(() => undefined);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  async function enableNotifications() {
    setBusy(true);
    setMessage("");
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setMessage(
          "Notification permission was denied. On Android/Chrome: site settings → Notifications → Allow, then try again.",
        );
        setBusy(false);
        return;
      }

      const vapid = await fetch("/api/push/vapid").then((r) => r.json());
      if (!vapid.configured || !vapid.publicKey) {
        setMessage(
          "Push keys are missing on the server. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Vercel → Project → Settings → Environment Variables, then redeploy.",
        );
        setBusy(false);
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
        }));

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setMessage(data.error || "Could not save notification subscription");
        setBusy(false);
        return;
      }

      setEnabled(true);
      setConfigured(true);
      await refreshPushStatus();
      setMessage(
        "Notifications enabled on this device. Tap “Send test notification” to confirm.",
      );
    } catch {
      setMessage(
        "Could not enable notifications. Use Chrome/Edge on Android or desktop. iPhone needs iOS 16.4+ and Add to Home Screen first.",
      );
    }
    setBusy(false);
  }

  async function disableNotifications() {
    setBusy(true);
    setMessage("");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setEnabled(false);
      await refreshPushStatus();
      setMessage("Notifications turned off on this device");
    } catch {
      setMessage("Could not disable notifications");
    }
    setBusy(false);
  }

  async function sendTest() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error || "Test notification failed");
        setBusy(false);
        return;
      }
      setSubscriberCount(Number(data.subscriberCount) || subscriberCount);
      setMessage(
        `Test sent to ${data.subscriberCount} device(s) (${data.sent} delivered, ${data.failed} failed). Check the notification shade / lock screen.`,
      );
    } catch {
      setMessage("Network error while sending test notification");
    }
    setBusy(false);
  }

  if (!supported) {
    return (
      <section className="rounded-2xl border border-white/12 bg-white/[0.03] p-5">
        <h2 className="font-[family-name:var(--font-syne)] text-xl font-bold">
          App & notifications
        </h2>
        <p className="mt-2 text-sm text-white/55">
          This browser does not support installable PWA push notifications.
          Try Chrome or Edge on Android/desktop. On iPhone, open this admin in
          Safari, Add to Home Screen, then open the installed app.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/12 bg-white/[0.03] p-5">
      <h2 className="font-[family-name:var(--font-syne)] text-xl font-bold">
        App & notifications
      </h2>
      <p className="mt-1 text-sm text-white/55">
        Push alerts go to admin devices only (not guest customers). Installing
        the app is not enough — each phone must tap Enable notifications while
        logged into admin.
      </p>

      <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-white/55">
        <li>Install / Add to Home Screen (optional but recommended).</li>
        <li>Open admin Settings on that same device.</li>
        <li>Tap Enable notifications and allow the browser permission.</li>
        <li>Tap Send test notification — you should see a ping immediately.</li>
      </ol>

      <div className="mt-4 flex flex-wrap gap-2">
        {installEvent ? (
          <button
            type="button"
            onClick={() => installEvent.prompt()}
            className="rounded-xl bg-sun px-4 py-2.5 text-sm font-bold text-ink"
          >
            Install app
          </button>
        ) : (
          <p className="rounded-xl border border-white/15 px-3 py-2 text-xs text-white/50">
            Install via browser menu (Add to Home Screen / Install app) if the
            install button is not shown.
          </p>
        )}

        {!enabled ? (
          <button
            type="button"
            disabled={busy}
            onClick={enableNotifications}
            className="rounded-xl border border-sun/40 bg-sun/15 px-4 py-2.5 text-sm font-bold text-sun disabled:opacity-50"
          >
            {busy ? "Enabling…" : "Enable notifications"}
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={sendTest}
              className="rounded-xl bg-sun px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send test notification"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={disableNotifications}
              className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {busy ? "Updating…" : "Disable notifications"}
            </button>
          </>
        )}
      </div>

      <ul className="mt-4 space-y-1 text-xs text-white/50">
        <li>
          This device:{" "}
          <span className="text-white/75">
            {enabled ? "Subscribed" : "Not subscribed"}
          </span>
        </li>
        <li>
          Permission: <span className="text-white/75">{permission}</span>
        </li>
        <li>
          Push keys:{" "}
          <span className="text-white/75">
            {configured
              ? "Configured"
              : "Missing — add VAPID keys in Vercel env"}
          </span>
        </li>
        <li>
          Devices registered:{" "}
          <span className="text-white/75">{subscriberCount}</span>
        </li>
      </ul>

      {message ? (
        <p className="mt-3 text-sm text-white/65">{message}</p>
      ) : null}
    </section>
  );
}
