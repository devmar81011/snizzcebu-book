"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AppSettings } from "@/lib/settings-store";
import { AdminPwaNotifications } from "@/components/admin/AdminPwaNotifications";

export function AdminSettingsForm({ initial }: { initial: AppSettings }) {
  const router = useRouter();
  const [adminPhone, setAdminPhone] = useState(initial.adminPhone);
  const [adminWhatsApp, setAdminWhatsApp] = useState(
    initial.adminWhatsApp || initial.adminPhone,
  );
  const [reminderDaysBefore, setReminderDaysBefore] = useState(
    String(initial.reminderDaysBefore ?? 1),
  );
  const [pendingAlertHours, setPendingAlertHours] = useState(
    String(initial.pendingAlertHours ?? 4),
  );
  const [morningDigest, setMorningDigest] = useState(
    initial.morningDigest ?? true,
  );
  const [qrPreview, setQrPreview] = useState(initial.qrImageUrl || "");
  const [file, setFile] = useState<File | null>(null);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const fieldClass =
    "mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm outline-none transition focus:border-sun/60";
  const labelClass =
    "block text-[0.68rem] font-semibold tracking-[0.14em] text-white/55 uppercase";

  async function saveSettings() {
    setSavingSettings(true);
    setSettingsMessage("");
    setSettingsError("");
    const form = new FormData();
    form.set("adminPhone", adminPhone);
    form.set("adminWhatsApp", adminWhatsApp);
    form.set("reminderDaysBefore", reminderDaysBefore);
    form.set("pendingAlertHours", pendingAlertHours);
    form.set("morningDigest", morningDigest ? "1" : "0");
    if (file) form.set("qr", file);

    const response = await fetch("/api/settings", {
      method: "PUT",
      body: form,
    });
    const data = await response.json().catch(() => ({}));
    setSavingSettings(false);

    if (!response.ok) {
      setSettingsError(data.error || "Could not save settings");
      return;
    }

    setQrPreview(data.settings?.qrImageUrl || qrPreview);
    if (data.settings?.reminderDaysBefore !== undefined) {
      setReminderDaysBefore(String(data.settings.reminderDaysBefore));
    }
    if (data.settings?.pendingAlertHours !== undefined) {
      setPendingAlertHours(String(data.settings.pendingAlertHours));
    }
    if (data.settings?.adminWhatsApp) {
      setAdminWhatsApp(data.settings.adminWhatsApp);
    }
    if (typeof data.settings?.morningDigest === "boolean") {
      setMorningDigest(data.settings.morningDigest);
    }
    setFile(null);
    setSettingsMessage("Settings saved");
    router.refresh();
  }

  async function changePassword() {
    setSavingPassword(true);
    setPasswordMessage("");
    setPasswordError("");

    const response = await fetch("/api/admin/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setSavingPassword(false);

    if (!response.ok) {
      setPasswordError(data.error || "Could not change password");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Password updated");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-syne)] text-3xl font-bold">
          Settings
        </h1>
        <p className="mt-1 text-sm text-white/55">
          Payment, reminders, WhatsApp handoff, installable admin app, and
          password.
        </p>
      </div>

      <AdminPwaNotifications />

      <section className="rounded-2xl border border-white/12 bg-white/[0.03] p-5">
        <h2 className="font-[family-name:var(--font-syne)] text-xl font-bold">
          Alerts & reminders
        </h2>
        <p className="mt-1 text-sm text-white/55">
          Push reminders for upcoming tours, morning digests, and how long a
          pending booking can wait before it is flagged.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Days before tour reminder</span>
            <input
              type="number"
              min={0}
              max={30}
              value={reminderDaysBefore}
              onChange={(e) => setReminderDaysBefore(e.target.value)}
              className={fieldClass}
            />
            <span className="mt-1 block text-xs text-white/40">
              1 = remind one day before. 0 = on the tour day.
            </span>
          </label>
          <label className="block">
            <span className={labelClass}>Pending alert after (hours)</span>
            <input
              type="number"
              min={1}
              max={72}
              value={pendingAlertHours}
              onChange={(e) => setPendingAlertHours(e.target.value)}
              className={fieldClass}
            />
            <span className="mt-1 block text-xs text-white/40">
              Pending bookings older than this show “needs reply”.
            </span>
          </label>
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm text-white/80">
          <input
            type="checkbox"
            checked={morningDigest}
            onChange={(e) => setMorningDigest(e.target.checked)}
            className="h-4 w-4 rounded border-white/30"
          />
          Send morning digest push (today&apos;s tours + pending count)
        </label>
        <button
          type="button"
          disabled={savingSettings}
          onClick={saveSettings}
          className="mt-4 rounded-xl bg-sun px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-50"
        >
          {savingSettings ? "Saving…" : "Save alert settings"}
        </button>
      </section>

      <section className="rounded-2xl border border-white/12 bg-white/[0.03] p-5">
        <h2 className="font-[family-name:var(--font-syne)] text-xl font-bold">
          Payment & contact
        </h2>
        <p className="mt-1 text-sm text-white/55">
          GCash number for checkout, WhatsApp for guest handoff after booking,
          and optional QR.
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-[11rem_minmax(0,1fr)]">
          <div className="grid place-items-center rounded-xl border border-white/15 bg-white/5 p-3 text-center">
            {qrPreview ? (
              <Image
                src={qrPreview}
                alt="Payment QR"
                width={160}
                height={160}
                unoptimized
                className="h-auto w-full"
              />
            ) : (
              <p className="px-2 text-xs leading-relaxed text-white/50">
                No QR — customers use GCash number only
              </p>
            )}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className={labelClass}>Admin / GCash phone #</span>
              <input
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                className={fieldClass}
                placeholder="09XXXXXXXXX"
              />
            </label>

            <label className="block">
              <span className={labelClass}>WhatsApp for guest handoff</span>
              <input
                value={adminWhatsApp}
                onChange={(e) => setAdminWhatsApp(e.target.value)}
                className={fieldClass}
                placeholder="09XXXXXXXXX"
              />
              <span className="mt-1 block text-xs text-white/40">
                Guests tap this after booking to message Snizzz with their
                booking ref.
              </span>
            </label>

            <label className="block">
              <span className={labelClass}>Upload payment QR (optional)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const next = e.target.files?.[0] || null;
                  setFile(next);
                  if (next) setQrPreview(URL.createObjectURL(next));
                }}
                className="mt-1.5 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-sun file:px-3 file:py-2 file:text-sm file:font-bold file:text-ink"
              />
            </label>

            <button
              type="button"
              disabled={savingSettings}
              onClick={saveSettings}
              className="rounded-xl bg-sun px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-50"
            >
              {savingSettings ? "Saving…" : "Save settings"}
            </button>

            {settingsError ? (
              <p className="text-sm text-red-300">{settingsError}</p>
            ) : null}
            {settingsMessage ? (
              <p className="text-sm text-white/60">{settingsMessage}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/12 bg-white/[0.03] p-5">
        <h2 className="font-[family-name:var(--font-syne)] text-xl font-bold">
          Change password
        </h2>
        <p className="mt-1 text-sm text-white/55">
          Update the password used to sign in to this admin panel.
        </p>

        <div className="mt-5 grid gap-4 sm:max-w-md">
          <label className="block">
            <span className={labelClass}>Current password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={fieldClass}
              autoComplete="current-password"
            />
          </label>
          <label className="block">
            <span className={labelClass}>New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={fieldClass}
              autoComplete="new-password"
            />
          </label>
          <label className="block">
            <span className={labelClass}>Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={fieldClass}
              autoComplete="new-password"
            />
          </label>

          <button
            type="button"
            disabled={savingPassword}
            onClick={changePassword}
            className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/8 disabled:opacity-50"
          >
            {savingPassword ? "Updating…" : "Update password"}
          </button>

          {passwordError ? (
            <p className="text-sm text-red-300">{passwordError}</p>
          ) : null}
          {passwordMessage ? (
            <p className="text-sm text-white/60">{passwordMessage}</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
