"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  formatPhp,
  pricePerPax,
  seedPackages,
  totalPrice,
  type TourPackage,
} from "@/lib/destinations";
import {
  toDateKey,
  validateCustomerName,
  validateCustomerPhone,
} from "@/lib/bookings";

type BookingCalendarProps = {
  activePlace: string;
  activeIsland: string;
};

type ModalStep = "package" | "details" | "payment" | "done";

type Availability = {
  ok: boolean;
  reason?: string;
  slotsRemaining: number;
  blocked: boolean;
};

type DayStatus = {
  blocked: boolean;
  slotsUsed: number;
  slotsRemaining: number;
  bookingCount: number;
  full: boolean;
  past: boolean;
};

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function startWeekday(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatShort(date: Date) {
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(days: number, nights: number) {
  const d = days || 1;
  const n = nights ?? 0;
  return `${d} day${d === 1 ? "" : "s"} / ${n} night${n === 1 ? "" : "s"}`;
}

function DetailList({
  title,
  items,
  note,
  emptyLabel,
}: {
  title: string;
  items: string[];
  note?: string;
  emptyLabel?: string;
}) {
  if (!items.length && !note && !emptyLabel) return null;
  return (
    <div>
      <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-white/45 uppercase">
        {title}
      </p>
      {items.length > 0 ? (
        <ul className="mt-1.5 space-y-1 text-sm text-white/80">
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>• {item}</li>
          ))}
        </ul>
      ) : emptyLabel ? (
        <p className="mt-1.5 text-sm text-white/55">{emptyLabel}</p>
      ) : null}
      {note ? (
        <p className="mt-1.5 text-xs leading-relaxed text-white/45">{note}</p>
      ) : null}
    </div>
  );
}

export function BookingCalendar({
  activePlace,
  activeIsland,
}: BookingCalendarProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [packages, setPackages] = useState<TourPackage[]>(seedPackages);
  const [view, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selected, setSelected] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("package");
  const [tourId, setTourId] = useState(
    seedPackages[1]?.id || seedPackages[0]?.id || "",
  );
  const [guests, setGuests] = useState(4);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [monthDays, setMonthDays] = useState<Record<string, DayStatus>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);

  const selectedTour =
    packages.find((t) => t.id === tourId) ?? packages[0] ?? seedPackages[0];

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/packages").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([pkgData, settingsData]) => {
        if (cancelled) return;
        if (pkgData.packages?.length) {
          setPackages(pkgData.packages);
          setTourId((current: string) =>
            pkgData.packages.some((p: TourPackage) => p.id === current)
              ? current
              : pkgData.packages[0].id,
          );
        }
        if (settingsData.settings) {
          setQrUrl(settingsData.settings.qrImageUrl || "");
          setAdminPhone(settingsData.settings.adminPhone || "");
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedTour) return;
    setGuests((g) =>
      Math.min(selectedTour.maxPax, Math.max(selectedTour.minPax, g)),
    );
  }, [selectedTour]);

  useEffect(() => {
    if (!selectedTour) return;
    let cancelled = false;
    const month = `${view.year}-${String(view.month + 1).padStart(2, "0")}`;
    const params = new URLSearchParams({
      packageId: selectedTour.id,
      month,
      guests: String(guests),
    });
    fetch(`/api/availability?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setMonthDays(data.days || {});
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selectedTour, view, guests, modalOpen]);

  useEffect(() => {
    if (!selected || !selectedTour) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({
      packageId: selectedTour.id,
      tourDate: selected.toISOString(),
      guests: String(guests),
    });
    fetch(`/api/availability?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setAvailability(data.availability || null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selected, selectedTour, guests]);

  useEffect(() => {
    if (!proofFile) {
      setProofPreview(null);
      return;
    }
    const url = URL.createObjectURL(proofFile);
    setProofPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [proofFile]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(
    "en-PH",
    { month: "long", year: "numeric" },
  );

  const cells = useMemo(() => {
    const total = daysInMonth(view.year, view.month);
    const offset = startWeekday(view.year, view.month);
    const items: Array<{ day: number | null; date: Date | null }> = [];
    for (let i = 0; i < offset; i += 1) items.push({ day: null, date: null });
    for (let day = 1; day <= total; day += 1) {
      items.push({ day, date: new Date(view.year, view.month, day) });
    }
    return items;
  }, [view]);

  const tourSpanKeys = useMemo(() => {
    if (!selected || !selectedTour) return new Set<string>();
    const keys = new Set<string>();
    const span = Math.max(1, selectedTour.days || 1);
    for (let i = 0; i < span; i += 1) {
      const d = new Date(selected);
      d.setDate(d.getDate() + i);
      keys.add(toDateKey(d));
    }
    return keys;
  }, [selected, selectedTour]);

  const perPerson = selectedTour ? pricePerPax(selectedTour, guests) : 0;
  const total = selectedTour ? totalPrice(selectedTour, guests) : 0;

  function shiftMonth(delta: number) {
    setView((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function isSameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function openModal() {
    if (!selected) {
      setError("Select a date first");
      return;
    }
    if (availability && !availability.ok) {
      setError(availability.reason || "Unavailable");
      return;
    }
    setError("");
    setModalStep("package");
    setModalOpen(true);
  }

  function closeModal() {
    if (modalStep === "done") {
      setCustomerName("");
      setCustomerPhone("");
      setProofFile(null);
      setModalStep("package");
      setModalOpen(false);
      setError("");
      return;
    }
    setModalOpen(false);
    setError("");
  }

  function goToDetails() {
    setError("");
    if (availability && !availability.ok) {
      setError(availability.reason || "Unavailable");
      return;
    }
    setModalStep("details");
  }

  function goToPayment() {
    setError("");
    const nameError = validateCustomerName(customerName);
    if (nameError) {
      setError(nameError);
      return;
    }
    const phoneError = validateCustomerPhone(customerPhone);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    setModalStep("payment");
  }

  async function copyAdminPhone() {
    if (!adminPhone) return;
    try {
      await navigator.clipboard.writeText(adminPhone.replace(/\s/g, ""));
      setPhoneCopied(true);
      window.setTimeout(() => setPhoneCopied(false), 2000);
    } catch {
      setError("Could not copy number — please copy it manually");
    }
  }

  async function submitReservation() {
    if (!selected || !selectedTour) return;
    setError("");
    if (!proofFile) {
      setError("Upload a screenshot of your payment proof");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.set("packageId", selectedTour.id);
      form.set("tourDate", selected.toISOString());
      form.set("guests", String(guests));
      form.set("customerName", customerName.trim());
      form.set("customerPhone", customerPhone.trim());
      form.set("paymentProof", proofFile);

      const response = await fetch("/api/bookings", {
        method: "POST",
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Could not submit reservation");
        setLoading(false);
        return;
      }
      setModalStep("done");
      // refresh calendar markers after a successful booking
      const month = `${view.year}-${String(view.month + 1).padStart(2, "0")}`;
      const params = new URLSearchParams({
        packageId: selectedTour.id,
        month,
        guests: String(guests),
      });
      fetch(`/api/availability?${params}`)
        .then((r) => r.json())
        .then((data) => setMonthDays(data.days || {}))
        .catch(() => undefined);
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  if (!selectedTour) return null;

  return (
    <>
      <aside className="animate-slide-in-right w-full max-w-[22rem] rounded-2xl border border-white/20 bg-[rgba(8,20,22,0.72)] p-4 text-foam shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-sun uppercase">
              Book a tour
            </p>
            <h2 className="mt-1 font-[family-name:var(--font-syne)] text-lg leading-tight font-bold">
              Pick your date
            </h2>
          </div>
          <div className="rounded-full bg-palm/20 px-2.5 py-1 text-[0.65rem] font-semibold tracking-wide text-[#d7f5a8]">
            {activeIsland}
          </div>
        </div>

        <p className="mb-3 text-xs text-white/65">
          Now viewing <span className="text-white">{activePlace}</span>
        </p>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-[0.68rem] font-semibold tracking-[0.14em] text-white/55 uppercase">
            Select Package
          </span>
          <div className="relative">
            <select
              value={tourId}
              onChange={(e) => {
                setTourId(e.target.value);
                setError("");
              }}
              className="w-full appearance-none rounded-xl border border-white/15 bg-white/5 py-2.5 pr-12 pl-3.5 text-sm outline-none focus:border-sun/60"
            >
              {packages.map((tour) => (
                <option
                  key={tour.id}
                  value={tour.id}
                  className="bg-ocean text-white"
                >
                  {tour.title}
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

        <div className="mb-3 rounded-xl border border-sun/25 bg-sun/10 px-3 py-2.5">
          <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-sun uppercase">
            Duration
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {formatDuration(selectedTour.days, selectedTour.nights)}
          </p>
          <p className="mt-0.5 text-xs text-white/55">
            {selectedTour.minPax}–{selectedTour.maxPax} pax
          </p>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-sm transition hover:bg-white/10"
            aria-label="Previous month"
          >
            ‹
          </button>
          <p className="text-sm font-semibold tracking-wide">{monthLabel}</p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-sm transition hover:bg-white/10"
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[0.65rem] tracking-wide text-white/45">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="mb-3 grid grid-cols-7 gap-1">
          {cells.map((cell, index) => {
            if (!cell.date || cell.day === null) {
              return <span key={`empty-${index}`} className="h-10" />;
            }
            const key = toDateKey(cell.date);
            const status = monthDays[key];
            const past = cell.date < today || Boolean(status?.past);
            const blocked = Boolean(status?.blocked);
            const full = Boolean(status?.full);
            const unavailable = past || blocked || full;
            const isSelected = selected
              ? isSameDay(cell.date, selected)
              : false;
            const inSpan = tourSpanKeys.has(key);
            const isToday = isSameDay(cell.date, today);

            return (
              <button
                key={cell.date.toISOString()}
                type="button"
                disabled={unavailable}
                title={unavailable ? "Unavailable" : undefined}
                onClick={() => {
                  setSelected(cell.date);
                  setError("");
                }}
                className={[
                  "relative flex h-10 flex-col items-center justify-center rounded-lg text-sm font-medium transition",
                  unavailable
                    ? "cursor-not-allowed text-white/25"
                    : "hover:bg-white/12",
                  isSelected
                    ? "bg-sun text-ink shadow-[0_0_0_1px_rgba(200,245,42,0.7)]"
                    : inSpan && !unavailable
                      ? "bg-sun/25 text-sun"
                      : isToday && !unavailable
                        ? "bg-white/10 text-white"
                        : unavailable
                          ? "text-white/25"
                          : "text-white/85",
                ].join(" ")}
              >
                <span>{cell.day}</span>
              </button>
            );
          })}
        </div>

        <div className="mb-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/70">
          {selected ? (
            <div className="space-y-1">
              <p>
                Selected:{" "}
                <span className="font-semibold text-white">
                  {formatShort(selected)}
                </span>
              </p>
              <p className="text-xs text-white/55">
                {formatDuration(selectedTour.days, selectedTour.nights)}
                {selectedTour.days > 1
                  ? ` · ends ${formatShort(
                      new Date(
                        selected.getFullYear(),
                        selected.getMonth(),
                        selected.getDate() + (selectedTour.days - 1),
                      ),
                    )}`
                  : ""}
              </p>
            </div>
          ) : (
            "Select a date to continue"
          )}
        </div>

        <button
          type="button"
          disabled={!selected || Boolean(availability && !availability.ok)}
          onClick={openModal}
          className="w-full rounded-xl bg-sun px-4 py-3 text-sm font-bold tracking-wide text-ink transition enabled:hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reserve Now
        </button>

        {error && !modalOpen ? (
          <p className="mt-3 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
            {error}
          </p>
        ) : null}
      </aside>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reserve-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-[#0c1a1c] p-5 text-foam shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-sun uppercase">
                  Reservation
                </p>
                <h3
                  id="reserve-modal-title"
                  className="mt-1 font-[family-name:var(--font-syne)] text-xl font-bold"
                >
                  {modalStep === "package"
                    ? "Package details"
                    : modalStep === "details"
                      ? "Your details"
                      : modalStep === "payment"
                        ? "Pay & upload proof"
                        : "Booking confirmation"}
                </h3>
                {modalStep !== "done" && selected ? (
                  <p className="mt-1 text-sm text-white/55">
                    Tour date · {formatShort(selected)} ·{" "}
                    {formatDuration(selectedTour.days, selectedTour.nights)}
                  </p>
                ) : null}
              </div>
              {modalStep !== "done" ? (
                <button
                  type="button"
                  onClick={closeModal}
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-white/70 transition hover:bg-white/10"
                  aria-label="Close"
                >
                  ×
                </button>
              ) : (
                <span className="h-8 w-8" aria-hidden />
              )}
            </div>

            {modalStep === "package" ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-[0.68rem] font-semibold tracking-[0.14em] text-white/55 uppercase">
                    Select Package
                  </span>
                  <div className="relative">
                    <select
                      value={tourId}
                      onChange={(e) => setTourId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-white/15 bg-white/5 py-2.5 pr-12 pl-3.5 text-sm outline-none focus:border-sun/60"
                    >
                      {packages.map((tour) => (
                        <option
                          key={tour.id}
                          value={tour.id}
                          className="bg-ocean text-white"
                        >
                          {tour.title}
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

                <label className="block">
                  <span className="mb-1.5 block text-[0.68rem] font-semibold tracking-[0.14em] text-white/55 uppercase">
                    Guests ({selectedTour.minPax}–{selectedTour.maxPax} pax)
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setGuests((g) => Math.max(selectedTour.minPax, g - 1))
                      }
                      className="grid h-12 w-12 place-items-center rounded-xl border border-white/15 text-xl font-semibold"
                    >
                      −
                    </button>
                    <span className="min-w-16 text-center font-[family-name:var(--font-syne)] text-3xl font-bold text-sun">
                      {guests}
                      <span className="ml-1.5 text-base font-semibold text-white/55">
                        pax
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setGuests((g) => Math.min(selectedTour.maxPax, g + 1))
                      }
                      className="grid h-12 w-12 place-items-center rounded-xl border border-white/15 text-xl font-semibold"
                    >
                      +
                    </button>
                  </div>
                </label>

                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 space-y-3">
                  <p className="text-sm font-semibold text-white">
                    {formatDuration(selectedTour.days, selectedTour.nights)}
                  </p>
                  <DetailList
                    title="Destinations"
                    items={selectedTour.destinations}
                  />
                  <DetailList
                    title="Accommodation"
                    items={selectedTour.accommodation || []}
                    emptyLabel="No accommodation listed"
                  />
                  <DetailList
                    title="Inclusions"
                    items={selectedTour.inclusions}
                    note={selectedTour.inclusionsNote}
                  />
                  <DetailList
                    title="Exclusions"
                    items={selectedTour.exclusions}
                    note={selectedTour.exclusionsNote}
                  />
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                  <div className="flex justify-between text-white/70">
                    <span>Per person</span>
                    <span className="font-semibold text-white">
                      {formatPhp(perPerson)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex justify-between">
                    <span className="text-white/70">Estimated total</span>
                    <span className="font-[family-name:var(--font-syne)] text-lg font-bold text-sun">
                      {formatPhp(total)}
                    </span>
                  </div>
                  {availability && !availability.ok ? (
                    <p className="mt-2 text-xs text-red-200">
                      {availability.reason}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  disabled={Boolean(availability && !availability.ok)}
                  onClick={goToDetails}
                  className="w-full rounded-xl bg-sun px-4 py-3 text-sm font-bold text-ink disabled:opacity-40"
                >
                  Continue · {formatPhp(total)}
                </button>
              </div>
            ) : null}

            {modalStep === "details" ? (
              <div className="space-y-3">
                <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/65">
                  {selectedTour.title} · {selected ? formatShort(selected) : ""}{" "}
                  · {formatDuration(selectedTour.days, selectedTour.nights)} ·{" "}
                  {guests} pax · {formatPhp(total)}
                </p>
                <label className="block">
                  <span className="mb-1.5 block text-[0.68rem] font-semibold tracking-[0.14em] text-white/55 uppercase">
                    Full name
                  </span>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm outline-none focus:border-sun/60"
                    placeholder="Juan Dela Cruz"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[0.68rem] font-semibold tracking-[0.14em] text-white/55 uppercase">
                    Mobile number
                  </span>
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm outline-none focus:border-sun/60"
                    placeholder="09XXXXXXXXX"
                  />
                </label>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setModalStep("package")}
                    className="flex-1 rounded-xl border border-white/20 px-3 py-2.5 text-sm font-semibold"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={goToPayment}
                    className="flex-1 rounded-xl bg-sun px-3 py-2.5 text-sm font-bold text-ink"
                  >
                    Continue to pay
                  </button>
                </div>
              </div>
            ) : null}

            {modalStep === "payment" ? (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitReservation();
                }}
              >
                <div className="rounded-xl border border-white/12 bg-white/[0.04] p-4">
                  <p className="text-center text-sm font-semibold text-sun">
                    Pay {formatPhp(total)}
                  </p>
                  <p className="mt-1 text-center text-xs text-white/55">
                    Choose QR scan or manual GCash, then upload your receipt.
                  </p>

                  <div className="mt-4 space-y-4">
                    {qrUrl ? (
                      <div className="rounded-xl border border-white/15 bg-white p-3">
                        <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-ink/50 uppercase">
                          Option 1 · Scan QR
                        </p>
                        <Image
                          src={qrUrl}
                          alt="Payment QR code"
                          width={220}
                          height={220}
                          unoptimized
                          className="mx-auto mt-2 h-auto w-full max-w-[13rem]"
                        />
                        <p className="mt-2 text-center text-xs text-ink/60">
                          Open GCash → Scan → pay {formatPhp(total)}
                        </p>
                      </div>
                    ) : null}

                    {qrUrl ? (
                      <div className="flex items-center gap-3 text-[0.65rem] font-semibold tracking-[0.12em] text-white/35 uppercase">
                        <span className="h-px flex-1 bg-white/10" />
                        or
                        <span className="h-px flex-1 bg-white/10" />
                      </div>
                    ) : null}

                    <div className="rounded-xl border border-sun/30 bg-sun/10 px-4 py-4 text-sm leading-relaxed text-white/90">
                      <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-sun uppercase">
                        {qrUrl ? "Option 2 · Manual GCash" : "Pay via GCash"}
                      </p>
                      <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-xs text-white/70">
                        <li>Open GCash and tap Send / Pay</li>
                        <li>Copy the number below and paste it in GCash</li>
                        <li>Send exactly {formatPhp(total)}</li>
                        <li>Screenshot your receipt and upload below</li>
                      </ol>
                      {adminPhone ? (
                        <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/15 bg-[#0c1a1c]/60 p-2.5">
                          <p className="min-w-0 flex-1 font-[family-name:var(--font-syne)] text-xl font-bold tracking-wide text-sun">
                            {adminPhone}
                          </p>
                          <button
                            type="button"
                            onClick={copyAdminPhone}
                            className="shrink-0 rounded-lg border border-sun/40 bg-sun/15 px-3 py-2 text-xs font-bold text-sun transition hover:bg-sun/25"
                          >
                            {phoneCopied ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      ) : (
                        <p className="mt-3 text-red-200">
                          GCash number is not set yet. Please contact the tour
                          operator.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <label className="block rounded-xl border border-white/12 bg-white/[0.03] p-4">
                  <span className="mb-1.5 block text-[0.68rem] font-semibold tracking-[0.14em] text-white/55 uppercase">
                    Proof of payment screenshot
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-sun file:px-3 file:py-2 file:text-sm file:font-bold file:text-ink"
                  />
                  {proofPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={proofPreview}
                      alt="Payment proof preview"
                      className="mt-3 max-h-36 w-full rounded-xl object-cover"
                    />
                  ) : null}
                </label>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setModalStep("details")}
                    className="flex-1 rounded-xl border border-white/20 px-3 py-2.5 text-sm font-semibold"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-xl bg-sun px-3 py-2.5 text-sm font-bold text-ink disabled:opacity-50"
                  >
                    {loading ? "Submitting…" : "Submit reservation"}
                  </button>
                </div>
              </form>
            ) : null}

            {modalStep === "done" ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-palm/20 text-2xl text-[#dff7b8]">
                  ✓
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-syne)] text-xl font-bold text-white">
                    Booking received
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">
                    Thank you! Your reservation for{" "}
                    <span className="font-semibold text-white">
                      {selectedTour.title}
                    </span>
                    {selected ? (
                      <>
                        {" "}
                        on{" "}
                        <span className="font-semibold text-white">
                          {formatShort(selected)}
                        </span>
                      </>
                    ) : null}{" "}
                    has been submitted.
                  </p>
                </div>
                <p className="rounded-xl border border-sun/30 bg-sun/10 px-4 py-3 text-sm leading-relaxed text-white/85">
                  A Snizzz admin will contact you shortly to confirm your
                  booking.
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full rounded-xl bg-sun px-4 py-2.5 text-sm font-bold text-ink"
                >
                  Got it
                </button>
              </div>
            ) : null}

            {error ? (
              <p className="mt-3 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
