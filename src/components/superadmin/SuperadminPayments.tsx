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
import { formatBookingRef } from "@/lib/notify";

type Props = {
  bookings: Booking[];
  /** YYYY-MM from server (current month default) */
  initialMonth: string;
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
  // Also include previous 11 months for empty months browsing
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

export function SuperadminPayments({ bookings, initialMonth }: Props) {
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(initialMonth);
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

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-syne)] text-3xl font-bold">
            Payments
          </h1>
          <p className="mt-1 text-sm text-white/55">
            Completed (paid) bookings only. Your developer share is{" "}
            {rateLabel} of gross income — column label:{" "}
            <span className="text-white/75">Commission ({rateLabel})</span>.
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
          <p className="mt-1 text-sm text-white/60">
            Your cut for {formatMonthLabel(month)}
          </p>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-white/12 bg-white/[0.03] p-5">
        <h2 className="font-[family-name:var(--font-syne)] text-xl font-bold">
          Weekly breakdown · {formatMonthLabel(month)}
        </h2>
        <p className="mt-1 text-sm text-white/50">
          Income and commission by week inside the selected month.
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
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.key} className="border-b border-white/8">
                  <td className="px-2 py-3 font-medium">{w.label}</td>
                  <td className="px-2 py-3 text-white/70">{w.count}</td>
                  <td className="px-2 py-3">{formatMoney(w.amount)}</td>
                  <td className="px-2 py-3 text-[#d7f5a8]">
                    {formatMoney(w.commission)}
                  </td>
                </tr>
              ))}
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
    </div>
  );
}
