"use client";

import { useMemo, useState } from "react";
import type { Booking, IncomeBucket } from "@/lib/bookings";
import {
  COMMISSION_RATE,
  commissionOf,
  completedPaymentsInRange,
  endOfDay,
  endOfMonth,
  formatMoney,
  paymentTimestamp,
  startOfMonth,
  startOfWeek,
  sumIncome,
  weeklyIncomeInMonth,
} from "@/lib/bookings";
import type { CommissionPayout } from "@/lib/commission";
import { monthPeriodKey, weekPeriodKey } from "@/lib/commission";
import { formatBookingRef } from "@/lib/notify";

type Props = {
  bookings: Booking[];
  payouts: CommissionPayout[];
  /** YYYY-MM from server (current month default) */
  initialMonth: string;
};

type CollectTarget = {
  periodType: "week" | "month";
  periodKey: string;
  label: string;
  incomeAmount: number;
  commissionAmount: number;
  from?: string;
  to?: string;
  yearMonth?: string;
};

function monthOptions(bookings: Booking[], now: Date): string[] {
  const keys = new Set<string>();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  keys.add(current);
  for (const b of bookings) {
    if (b.status !== "completed") continue;
    const d = paymentTimestamp(b);
    keys.add(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.add(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return [...keys].sort((a, b) => (a < b ? 1 : -1));
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
}

function formatPaidAt(booking: Booking) {
  return paymentTimestamp(booking).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusCell({
  payout,
  busy,
  onCollect,
  onViewProof,
  onUndo,
}: {
  payout?: CommissionPayout;
  busy: boolean;
  onCollect: () => void;
  onViewProof: () => void;
  onUndo: () => void;
}) {
  if (payout) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-palm/20 px-2 py-1 text-[0.65rem] font-semibold tracking-wide text-[#d7f5a8] uppercase">
          Collected
        </span>
        <button
          type="button"
          onClick={onViewProof}
          className="text-xs font-semibold text-sun"
        >
          View proof
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onUndo}
          className="text-xs text-white/45 hover:text-white/70"
        >
          Undo
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onCollect}
      className="rounded-lg border border-sun/40 bg-sun/15 px-3 py-1.5 text-xs font-bold text-sun disabled:opacity-50"
    >
      Mark collected
    </button>
  );
}

export function SuperadminPayments({
  bookings,
  payouts: initialPayouts,
  initialMonth,
}: Props) {
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(initialMonth);
  const [payouts, setPayouts] = useState(initialPayouts);
  const [payoutBaseline, setPayoutBaseline] = useState(initialPayouts);
  const [collectTarget, setCollectTarget] = useState<CollectTarget | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [proofOpen, setProofOpen] = useState<CommissionPayout | null>(null);

  if (initialPayouts !== payoutBaseline) {
    setPayoutBaseline(initialPayouts);
    setPayouts(initialPayouts);
  }

  const options = useMemo(
    () => monthOptions(bookings, now),
    [bookings, now],
  );

  const [year, monthIndex] = month.split("-").map(Number);
  const selectedStart = startOfMonth(new Date(year, monthIndex - 1, 1));
  const selectedEnd = endOfMonth(selectedStart);

  const week = sumIncome(bookings, startOfWeek(now), endOfDay(now));
  const selectedMonth = sumIncome(bookings, selectedStart, selectedEnd);
  const weeks: IncomeBucket[] = weeklyIncomeInMonth(
    bookings,
    year,
    monthIndex - 1,
  );
  const payments = completedPaymentsInRange(
    bookings,
    selectedStart,
    selectedEnd,
  );

  const weekCommission = commissionOf(week.amount);
  const monthCommission = commissionOf(selectedMonth.amount);
  const rateLabel = `${Math.round(COMMISSION_RATE * 100)}%`;

  const payoutByKey = useMemo(() => {
    const map = new Map<string, CommissionPayout>();
    for (const p of payouts) map.set(p.periodKey, p);
    return map;
  }, [payouts]);

  function openCollect(target: CollectTarget) {
    setCollectTarget(target);
    setNote("");
    setFile(null);
    setPreview(null);
    setError("");
  }

  function onPickFile(next: File | null) {
    setFile(next);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  async function submitCollect() {
    if (!collectTarget) return;
    if (!file) {
      setError("Upload a payment screenshot for tracking");
      return;
    }
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("periodType", collectTarget.periodType);
    form.set("label", collectTarget.label);
    form.set("incomeAmount", String(collectTarget.incomeAmount));
    form.set("commissionAmount", String(collectTarget.commissionAmount));
    form.set("note", note);
    form.set("proof", file);
    if (collectTarget.periodType === "week") {
      form.set("from", collectTarget.from || "");
      form.set("to", collectTarget.to || "");
    } else {
      form.set("yearMonth", collectTarget.yearMonth || month);
    }

    try {
      const response = await fetch("/api/superadmin/commission", {
        method: "POST",
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Could not mark as collected");
        setBusy(false);
        return;
      }
      if (Array.isArray(data.payouts)) setPayouts(data.payouts);
      setCollectTarget(null);
      onPickFile(null);
    } catch {
      setError("Network error — try again");
    }
    setBusy(false);
  }

  async function undoCollected(periodKey: string) {
    if (!window.confirm("Remove collected mark for this period?")) return;
    setBusy(true);
    const response = await fetch(
      `/api/superadmin/commission?periodKey=${encodeURIComponent(periodKey)}`,
      { method: "DELETE" },
    );
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      window.alert(data.error || "Could not undo");
      return;
    }
    if (Array.isArray(data.payouts)) setPayouts(data.payouts);
  }

  const monthKey = monthPeriodKey(month);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-syne)] text-3xl font-bold">
            Payments
          </h1>
          <p className="mt-1 text-sm text-white/55">
            Completed (paid) bookings only. Your developer share is {rateLabel}{" "}
            — track when that commission was{" "}
            <span className="text-white/75">collected</span> with a screenshot.
          </p>
        </div>

        <label className="text-sm">
          <span className="mb-1 block text-[0.65rem] tracking-[0.12em] text-white/45 uppercase">
            Filter month
          </span>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 outline-none"
          >
            {options.map((ym) => (
              <option key={ym} value={ym} className="bg-ocean">
                {formatMonthLabel(ym)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-sun/25 bg-sun/10 px-5 py-5">
          <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-sun uppercase">
            This week income
          </p>
          <p className="mt-3 font-[family-name:var(--font-syne)] text-3xl font-bold text-sun">
            {formatMoney(week.amount)}
          </p>
          <p className="mt-1 text-sm text-white/60">
            {week.count} paid · Commission {formatMoney(weekCommission)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-5">
          <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-white/45 uppercase">
            Selected month income
          </p>
          <p className="mt-3 font-[family-name:var(--font-syne)] text-3xl font-bold">
            {formatMoney(selectedMonth.amount)}
          </p>
          <p className="mt-1 text-sm text-white/60">
            {formatMonthLabel(month)} · {selectedMonth.count} paid
          </p>
        </div>

        <div className="rounded-2xl border border-palm/30 bg-palm/10 px-5 py-5">
          <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-[#d7f5a8] uppercase">
            Commission ({rateLabel}) · week
          </p>
          <p className="mt-3 font-[family-name:var(--font-syne)] text-3xl font-bold text-[#d7f5a8]">
            {formatMoney(weekCommission)}
          </p>
          <p className="mt-1 text-sm text-white/60">Your cut this week</p>
        </div>

        <div className="rounded-2xl border border-palm/30 bg-palm/10 px-5 py-5">
          <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-[#d7f5a8] uppercase">
            Commission ({rateLabel}) · month
          </p>
          <p className="mt-3 font-[family-name:var(--font-syne)] text-3xl font-bold text-[#d7f5a8]">
            {formatMoney(monthCommission)}
          </p>
          <div className="mt-3">
            <StatusCell
              payout={payoutByKey.get(monthKey)}
              busy={busy}
              onCollect={() =>
                openCollect({
                  periodType: "month",
                  periodKey: monthKey,
                  label: formatMonthLabel(month),
                  incomeAmount: selectedMonth.amount,
                  commissionAmount: monthCommission,
                  yearMonth: month,
                })
              }
              onViewProof={() => {
                const p = payoutByKey.get(monthKey);
                if (p) setProofOpen(p);
              }}
              onUndo={() => undoCollected(monthKey)}
            />
          </div>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-white/12 bg-white/[0.03] p-5">
        <h2 className="font-[family-name:var(--font-syne)] text-xl font-bold">
          Weekly breakdown · {formatMonthLabel(month)}
        </h2>
        <p className="mt-1 text-sm text-white/50">
          Mark a week collected when the client pays your {rateLabel} share —
          upload the transfer screenshot.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[0.65rem] tracking-[0.12em] text-white/45 uppercase">
              <tr className="border-b border-white/10">
                <th className="px-2 py-2 font-semibold">Week</th>
                <th className="px-2 py-2 font-semibold">Paid bookings</th>
                <th className="px-2 py-2 font-semibold">Income</th>
                <th className="px-2 py-2 font-semibold">
                  Commission ({rateLabel})
                </th>
                <th className="px-2 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => {
                const key = weekPeriodKey(w.from, w.to);
                return (
                  <tr key={w.key} className="border-b border-white/8">
                    <td className="px-2 py-3 font-medium">{w.label}</td>
                    <td className="px-2 py-3 text-white/70">{w.count}</td>
                    <td className="px-2 py-3">{formatMoney(w.amount)}</td>
                    <td className="px-2 py-3 text-[#d7f5a8]">
                      {formatMoney(w.commission)}
                    </td>
                    <td className="px-2 py-3">
                      <StatusCell
                        payout={payoutByKey.get(key)}
                        busy={busy}
                        onCollect={() =>
                          openCollect({
                            periodType: "week",
                            periodKey: key,
                            label: w.label,
                            incomeAmount: w.amount,
                            commissionAmount: w.commission,
                            from: w.from,
                            to: w.to,
                          })
                        }
                        onViewProof={() => {
                          const p = payoutByKey.get(key);
                          if (p) setProofOpen(p);
                        }}
                        onUndo={() => undoCollected(key)}
                      />
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-white/[0.03]">
                <td className="px-2 py-3 font-semibold">Month total</td>
                <td className="px-2 py-3 font-semibold">
                  {selectedMonth.count}
                </td>
                <td className="px-2 py-3 font-semibold">
                  {formatMoney(selectedMonth.amount)}
                </td>
                <td className="px-2 py-3 font-semibold text-[#d7f5a8]">
                  {formatMoney(monthCommission)}
                </td>
                <td className="px-2 py-3">
                  <StatusCell
                    payout={payoutByKey.get(monthKey)}
                    busy={busy}
                    onCollect={() =>
                      openCollect({
                        periodType: "month",
                        periodKey: monthKey,
                        label: formatMonthLabel(month),
                        incomeAmount: selectedMonth.amount,
                        commissionAmount: monthCommission,
                        yearMonth: month,
                      })
                    }
                    onViewProof={() => {
                      const p = payoutByKey.get(monthKey);
                      if (p) setProofOpen(p);
                    }}
                    onUndo={() => undoCollected(monthKey)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-white/12 bg-white/[0.03] p-5">
        <h2 className="font-[family-name:var(--font-syne)] text-xl font-bold">
          Payment history · {formatMonthLabel(month)}
        </h2>
        <p className="mt-1 text-sm text-white/50">
          Each completed booking with your {rateLabel} commission line.
        </p>

        {payments.length === 0 ? (
          <p className="mt-4 text-sm text-white/50">
            No completed payments in this month yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[0.65rem] tracking-[0.12em] text-white/45 uppercase">
                <tr className="border-b border-white/10">
                  <th className="px-2 py-2 font-semibold">Paid at</th>
                  <th className="px-2 py-2 font-semibold">Ref</th>
                  <th className="px-2 py-2 font-semibold">Guest</th>
                  <th className="px-2 py-2 font-semibold">Package</th>
                  <th className="px-2 py-2 font-semibold">Gross</th>
                  <th className="px-2 py-2 font-semibold">
                    Commission ({rateLabel})
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((b) => (
                  <tr key={b.id} className="border-b border-white/8">
                    <td className="px-2 py-3 whitespace-nowrap text-white/70">
                      {formatPaidAt(b)}
                    </td>
                    <td className="px-2 py-3 font-medium">
                      {formatBookingRef(b.id)}
                    </td>
                    <td className="px-2 py-3">
                      <p className="font-medium">{b.customerName}</p>
                      <p className="text-xs text-white/45">{b.customerPhone}</p>
                    </td>
                    <td className="px-2 py-3 text-white/75">
                      {b.packageTitle}
                      <span className="block text-xs text-white/40">
                        {b.guests} pax
                      </span>
                    </td>
                    <td className="px-2 py-3">{formatMoney(b.totalAmount)}</td>
                    <td className="px-2 py-3 font-semibold text-[#d7f5a8]">
                      {formatMoney(commissionOf(b.totalAmount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {collectTarget ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Mark commission collected"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setCollectTarget(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0c1a1c] p-5 shadow-2xl">
            <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold">
              Mark collected
            </h3>
            <p className="mt-1 text-sm text-white/55">
              {collectTarget.label} · Commission{" "}
              {formatMoney(collectTarget.commissionAmount)} (
              {formatMoney(collectTarget.incomeAmount)} gross)
            </p>

            <label className="mt-4 block">
              <span className="text-[0.68rem] font-semibold tracking-[0.14em] text-white/55 uppercase">
                Payment screenshot
              </span>
              <input
                type="file"
                accept="image/*"
                className="mt-1.5 block w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-sun file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-ink"
                onChange={(e) => onPickFile(e.target.files?.[0] || null)}
              />
            </label>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Proof preview"
                className="mt-3 max-h-40 w-full rounded-xl object-contain bg-black/40"
              />
            ) : null}

            <label className="mt-4 block">
              <span className="text-[0.68rem] font-semibold tracking-[0.14em] text-white/55 uppercase">
                Note (optional)
              </span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none"
                placeholder="e.g. GCash from client"
              />
            </label>

            {error ? (
              <p className="mt-3 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={submitCollect}
                className="rounded-xl bg-sun px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save as collected"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setCollectTarget(null)}
                className="rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {proofOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setProofOpen(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0c1a1c] p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-sun uppercase">
                  Collected proof
                </p>
                <p className="mt-1 font-semibold">{proofOpen.label}</p>
                <p className="text-sm text-white/55">
                  {formatMoney(proofOpen.commissionAmount)} ·{" "}
                  {new Date(proofOpen.collectedAt).toLocaleString("en-PH")}
                  {proofOpen.note ? ` · ${proofOpen.note}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProofOpen(null)}
                className="grid h-8 w-8 place-items-center rounded-full border border-white/15"
              >
                ×
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proofOpen.proofUrl}
              alt="Commission payment proof"
              className="max-h-[55vh] w-full rounded-xl object-contain bg-black/40"
            />
            <a
              href={proofOpen.proofUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-sm font-semibold text-sun"
            >
              Open full size
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
