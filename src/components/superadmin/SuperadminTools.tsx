"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Counts = {
  blockedDates: number;
  commissionPayouts: number;
  bookings: number;
  completedBookings: number;
  pendingBookings: number;
};

const OPTIONS: Array<{
  id: "blocked-dates" | "commission-payouts" | "bookings";
  title: string;
  blurb: string;
  danger?: boolean;
}> = [
  {
    id: "blocked-dates",
    title: "Clear blocked dates",
    blurb: "Empties the admin calendar blocks so the client can test availability cleanly.",
  },
  {
    id: "commission-payouts",
    title: "Clear commission collected marks",
    blurb: "Removes Collected status and payment screenshots from week/month/all-time tracking.",
  },
  {
    id: "bookings",
    title: "Clear all bookings",
    blurb:
      "Deletes every booking (pending + completed). Use only for test data — this cannot be undone.",
    danger: true,
  },
];

export function SuperadminTools() {
  const router = useRouter();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [selected, setSelected] = useState<string[]>(["blocked-dates"]);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refreshCounts() {
    const data = await fetch("/api/superadmin/reset").then((r) => r.json());
    if (data.counts) setCounts(data.counts);
  }

  useEffect(() => {
    refreshCounts().catch(() => undefined);
  }, []);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onReset() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/superadmin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets: selected, confirm }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Reset failed");
        setBusy(false);
        return;
      }
      const parts = Object.entries(data.cleared || {}).map(
        ([k, v]) => `${k}: ${v}`,
      );
      setMessage(`Cleared — ${parts.join(" · ") || "done"}`);
      setConfirm("");
      await refreshCounts();
      router.refresh();
    } catch {
      setError("Network error — try again");
    }
    setBusy(false);
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-syne)] text-3xl font-bold">
        Reset / clean
      </h1>
      <p className="mt-1 text-sm text-white/55">
        Clear test data yourself before client demos — no need to ping the
        agent. Destructive actions require typing{" "}
        <span className="font-semibold text-white/80">RESET</span>.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-4">
          <p className="text-[0.65rem] tracking-[0.12em] text-white/45 uppercase">
            Blocked dates
          </p>
          <p className="mt-2 font-[family-name:var(--font-syne)] text-2xl font-bold">
            {counts?.blockedDates ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-4">
          <p className="text-[0.65rem] tracking-[0.12em] text-white/45 uppercase">
            Commission marks
          </p>
          <p className="mt-2 font-[family-name:var(--font-syne)] text-2xl font-bold">
            {counts?.commissionPayouts ?? "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-4">
          <p className="text-[0.65rem] tracking-[0.12em] text-white/45 uppercase">
            Bookings
          </p>
          <p className="mt-2 font-[family-name:var(--font-syne)] text-2xl font-bold">
            {counts?.bookings ?? "—"}
          </p>
          <p className="mt-1 text-xs text-white/45">
            {counts
              ? `${counts.completedBookings} paid · ${counts.pendingBookings} pending`
              : ""}
          </p>
        </div>
      </div>

      <section className="mt-8 space-y-3 rounded-2xl border border-white/12 bg-white/[0.03] p-5">
        <h2 className="font-[family-name:var(--font-syne)] text-xl font-bold">
          What to clear
        </h2>
        {OPTIONS.map((opt) => (
          <label
            key={opt.id}
            className={[
              "flex cursor-pointer gap-3 rounded-xl border px-4 py-3",
              selected.includes(opt.id)
                ? opt.danger
                  ? "border-red-400/40 bg-red-500/10"
                  : "border-sun/40 bg-sun/10"
                : "border-white/10 bg-white/[0.02]",
            ].join(" ")}
          >
            <input
              type="checkbox"
              checked={selected.includes(opt.id)}
              onChange={() => toggle(opt.id)}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span
                className={[
                  "block font-semibold",
                  opt.danger ? "text-red-100" : "",
                ].join(" ")}
              >
                {opt.title}
              </span>
              <span className="mt-0.5 block text-sm text-white/55">
                {opt.blurb}
              </span>
            </span>
          </label>
        ))}

        <label className="mt-6 block">
          <span className="text-[0.68rem] font-semibold tracking-[0.14em] text-white/55 uppercase">
            Type RESET to confirm
          </span>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-3 w-full max-w-xs rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none"
            placeholder="RESET"
            autoComplete="off"
          />
        </label>

        {error ? (
          <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-xl border border-palm/40 bg-palm/10 px-3 py-2 text-sm text-[#d7f5a8]">
            {message}
          </p>
        ) : null}

        <button
          type="button"
          disabled={busy || selected.length === 0 || confirm !== "RESET"}
          onClick={onReset}
          className="rounded-xl border border-red-400/40 bg-red-500/15 px-5 py-2.5 text-sm font-bold text-red-100 transition hover:bg-red-500/25 disabled:opacity-40"
        >
          {busy ? "Resetting…" : "Run reset"}
        </button>
      </section>
    </div>
  );
}
