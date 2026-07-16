"use client";

import { useRouter } from "next/navigation";
import type { Booking } from "@/lib/bookings";
import { formatMoney } from "@/lib/bookings";
import { BookingActions } from "@/components/admin/BookingActions";

type DashboardProps = {
  stats: {
    weeklyIncome: number;
    weeklyBookings: number;
    monthlyIncome: number;
    monthlyBookings: number;
    allTimeIncome: number;
    allTimeBookings: number;
    pendingCount: number;
  };
  bookings: Booking[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminDashboard({ stats, bookings }: DashboardProps) {
  const router = useRouter();

  return (
    <div>
      <h1 className="font-[family-name:var(--font-syne)] text-3xl font-bold">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-white/55">
        Income counts completed (paid) bookings only. Pending awaits payment
        verification.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-sun/25 bg-sun/10 px-5 py-5">
          <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-sun uppercase">
            This week
          </p>
          <p className="mt-3 font-[family-name:var(--font-syne)] text-3xl font-bold text-sun">
            {formatMoney(stats.weeklyIncome)}
          </p>
          <p className="mt-1 text-sm text-white/60">
            {stats.weeklyBookings} completed
          </p>
        </div>

        <div className="rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-5">
          <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-white/45 uppercase">
            This month
          </p>
          <p className="mt-3 font-[family-name:var(--font-syne)] text-3xl font-bold">
            {formatMoney(stats.monthlyIncome)}
          </p>
          <p className="mt-1 text-sm text-white/60">
            {stats.monthlyBookings} completed
          </p>
        </div>

        <div className="rounded-2xl border border-white/12 bg-white/[0.04] px-5 py-5">
          <p className="text-[0.68rem] font-semibold tracking-[0.16em] text-white/45 uppercase">
            All time
          </p>
          <p className="mt-3 font-[family-name:var(--font-syne)] text-3xl font-bold">
            {formatMoney(stats.allTimeIncome)}
          </p>
          <p className="mt-1 text-sm text-white/60">
            {stats.allTimeBookings} completed
          </p>
        </div>

      </div>

      <div className="mt-10">
        <h2 className="font-[family-name:var(--font-syne)] text-xl font-bold">
          Recent bookings
        </h2>
        {bookings.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-white/20 px-5 py-10 text-center text-white/50">
            No bookings yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/12">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03] text-[0.65rem] tracking-[0.12em] text-white/45 uppercase">
                <tr>
                  <th className="px-4 py-3 font-semibold">Guest</th>
                  <th className="px-4 py-3 font-semibold">Tour date</th>
                  <th className="px-4 py-3 font-semibold">Package</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="min-w-[11rem] px-4 py-3 font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-white/8 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{booking.customerName}</p>
                      <p className="text-xs text-white/50">
                        {booking.customerPhone}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {formatDate(booking.tourDate)}
                    </td>
                    <td className="px-4 py-3">
                      {booking.packageTitle}
                      <span className="mt-0.5 block font-[family-name:var(--font-syne)] text-xl font-bold text-sun">
                        {booking.guests}{" "}
                        <span className="text-xs font-semibold text-white/55">
                          pax
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-sun">
                      {formatMoney(booking.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide",
                          booking.status === "completed"
                            ? "bg-palm/20 text-[#d7f5a8]"
                            : booking.status === "pending"
                              ? "bg-amber-400/15 text-amber-100"
                              : "bg-white/10 text-white/50",
                        ].join(" ")}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <BookingActions
                        booking={booking}
                        onUpdated={() => router.refresh()}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
