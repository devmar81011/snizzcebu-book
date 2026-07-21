"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Booking, BlockedDate } from "@/lib/bookings";
import { formatMoney, toDateKey } from "@/lib/bookings";
import type { TourPackage } from "@/lib/destinations";
import { BookingActions } from "@/components/admin/BookingActions";

type Props = {
  bookings: Booking[];
  blockedDates: BlockedDate[];
  packages: TourPackage[];
  pendingAlertHours?: number;
};

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function startWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function AdminCalendar({
  bookings: initialBookings,
  blockedDates: initialBlockedDates,
  packages,
  pendingAlertHours = 4,
}: Props) {
  const router = useRouter();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [view, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selectedKey, setSelectedKey] = useState(toDateKey(today));
  const [packageFilter, setPackageFilter] = useState<string>("all");
  const [blockReason, setBlockReason] = useState("Unavailable");
  const [busy, setBusy] = useState(false);
  const [blockedDates, setBlockedDates] = useState(initialBlockedDates);
  const [blockedBaseline, setBlockedBaseline] = useState(initialBlockedDates);
  const [bookings, setBookings] = useState(initialBookings);
  const [bookingsBaseline, setBookingsBaseline] = useState(initialBookings);

  if (initialBlockedDates !== blockedBaseline) {
    setBlockedBaseline(initialBlockedDates);
    setBlockedDates(initialBlockedDates);
  }

  if (initialBookings !== bookingsBaseline) {
    setBookingsBaseline(initialBookings);
    setBookings(initialBookings);
  }

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(
    "en-PH",
    { month: "long", year: "numeric" },
  );

  const cells = useMemo(() => {
    const total = daysInMonth(view.year, view.month);
    const offset = startWeekday(view.year, view.month);
    const items: Array<{ day: number | null; key: string | null }> = [];
    for (let i = 0; i < offset; i += 1) items.push({ day: null, key: null });
    for (let day = 1; day <= total; day += 1) {
      const key = toDateKey(new Date(view.year, view.month, day));
      items.push({ day, key });
    }
    return items;
  }, [view]);

  const dayBookings = bookings.filter((b) => {
    if (toDateKey(b.tourDate) !== selectedKey) return false;
    if (packageFilter !== "all" && b.packageId !== packageFilter) return false;
    return b.status !== "cancelled";
  });

  const dayBlocks = blockedDates.filter((b) => {
    if (b.date !== selectedKey) return false;
    if (packageFilter === "all") return true;
    return b.packageId === null || b.packageId === packageFilter;
  });

  function isBlockedKey(key: string) {
    return blockedDates.some(
      (b) =>
        b.date === key &&
        (packageFilter === "all"
          ? true
          : b.packageId === null || b.packageId === packageFilter),
    );
  }

  async function blockSelected() {
    setBusy(true);
    try {
      const response = await fetch("/api/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedKey,
          packageId: packageFilter === "all" ? null : packageFilter,
          reason: blockReason,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(data.error || "Could not block date");
        return;
      }
      if (Array.isArray(data.blockedDates)) {
        // Prefer API list, but always ensure the just-written entry is present.
        const list = data.blockedDates as BlockedDate[];
        if (data.blockedDate) {
          const entry = data.blockedDate as BlockedDate;
          const withoutDup = list.filter(
            (b) =>
              !(b.date === entry.date && b.packageId === entry.packageId) &&
              b.id !== entry.id,
          );
          setBlockedDates([...withoutDup, entry]);
        } else {
          setBlockedDates(list);
        }
      } else if (data.blockedDate) {
        setBlockedDates((prev) => {
          const withoutDup = prev.filter(
            (b) =>
              !(
                b.date === data.blockedDate.date &&
                b.packageId === data.blockedDate.packageId
              ),
          );
          return [...withoutDup, data.blockedDate as BlockedDate];
        });
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function unblock(id: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/blocked-dates?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(data.error || "Could not unblock date");
        return;
      }
      if (Array.isArray(data.blockedDates)) {
        setBlockedDates(data.blockedDates);
      } else {
        setBlockedDates((prev) => prev.filter((b) => b.id !== id));
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-syne)] text-3xl font-bold">
        Calendar
      </h1>
      <p className="mt-1 text-sm text-white/55">
        See who booked each day, verify payments, and block unavailable dates.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <label className="block text-sm">
          <span className="mb-1.5 block text-[0.68rem] font-semibold tracking-[0.14em] text-white/55 uppercase">
            Package filter
          </span>
          <div className="relative min-w-[12rem]">
            <select
              value={packageFilter}
              onChange={(e) => setPackageFilter(e.target.value)}
              className="w-full appearance-none rounded-xl border border-white/15 bg-white/5 py-2.5 pr-12 pl-3.5 text-sm outline-none focus:border-sun/60"
            >
              <option value="all" className="bg-ocean text-white">
                All packages
              </option>
              {packages.map((pkg) => (
                <option
                  key={pkg.id}
                  value={pkg.id}
                  className="bg-ocean text-white"
                >
                  {pkg.title}
                </option>
              ))}
            </select>
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sun"
            >
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                <path
                  d="M1 1.5L6 6.5L11 1.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
        </label>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setView((v) => {
                  const d = new Date(v.year, v.month - 1, 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })
              }
              className="grid h-8 w-8 place-items-center rounded-full border border-white/15"
            >
              ‹
            </button>
            <p className="font-semibold">{monthLabel}</p>
            <button
              type="button"
              onClick={() =>
                setView((v) => {
                  const d = new Date(v.year, v.month + 1, 1);
                  return { year: d.getFullYear(), month: d.getMonth() };
                })
              }
              className="grid h-8 w-8 place-items-center rounded-full border border-white/15"
            >
              ›
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[0.65rem] text-white/45">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, index) => {
              if (!cell.key || cell.day === null) {
                return <span key={`e-${index}`} className="h-14" />;
              }
              const blocked = isBlockedKey(cell.key);
              const selected = cell.key === selectedKey;
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelectedKey(cell.key!)}
                  className={[
                    "flex h-14 flex-col items-center justify-center rounded-lg border text-sm transition",
                    selected
                      ? "border-sun bg-sun/15 text-sun"
                      : blocked
                        ? "border-red-400/30 bg-red-500/10 text-red-100"
                        : "border-white/10 hover:bg-white/8",
                  ].join(" ")}
                >
                  <span>{cell.day}</span>
                  {blocked ? (
                    <span className="text-[0.6rem]">blocked</span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-[0.65rem] text-white/45">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-red-300/80" /> Blocked
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-4">
            <h2 className="font-[family-name:var(--font-syne)] text-lg font-bold">
              {selectedKey}
            </h2>

            <div className="mt-3 flex flex-wrap gap-2">
              <input
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="min-w-[12rem] flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none"
                placeholder="Block reason"
              />
              <button
                type="button"
                disabled={busy}
                onClick={blockSelected}
                className="rounded-xl border border-red-400/40 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/15 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Block date"}
              </button>
            </div>

            {dayBlocks.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {dayBlocks.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm"
                  >
                    <span>
                      {b.reason}
                      {b.packageId
                        ? ` · ${packages.find((p) => p.id === b.packageId)?.title || b.packageId}`
                        : " · All packages"}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => unblock(b.id)}
                      className="text-xs font-semibold text-sun disabled:opacity-50"
                    >
                      Unblock
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-4">
            <h2 className="font-[family-name:var(--font-syne)] text-lg font-bold">
              Bookings
            </h2>
            {dayBookings.length === 0 ? (
              <p className="mt-3 text-sm text-white/50">No bookings this day.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {dayBookings.map((b) => (
                  <li
                    key={b.id}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{b.customerName}</p>
                        <p className="text-sm text-white/55">
                          {b.customerPhone} · {b.packageTitle}
                        </p>
                        <p className="mt-1 font-[family-name:var(--font-syne)] text-2xl font-bold text-sun">
                          {b.guests}{" "}
                          <span className="text-sm font-semibold text-white/55">
                            pax
                          </span>
                        </p>
                        <p className="mt-1 text-sm text-sun">
                          {formatMoney(b.totalAmount)} · {b.status}
                        </p>
                      </div>
                      <BookingActions
                        booking={b}
                        size="sm"
                        pendingAlertHours={pendingAlertHours}
                        onUpdated={() => router.refresh()}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
