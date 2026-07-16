import type { Booking, BlockedDate } from "@/lib/bookings";
import { isActiveBooking, toDateKey } from "@/lib/bookings";
import type { TourPackage } from "@/lib/destinations";

export type AvailabilityResult = {
  ok: boolean;
  reason?: string;
  slotsAvailable: number;
  slotsUsed: number;
  slotsRemaining: number;
  blocked: boolean;
};

export function getSlotsUsed(
  bookings: Booking[],
  packageId: string,
  dateKey: string,
): number {
  return bookings
    .filter(
      (b) =>
        b.packageId === packageId &&
        toDateKey(b.tourDate) === dateKey &&
        isActiveBooking(b.status),
    )
    .reduce((sum, b) => sum + b.guests, 0);
}

export function isDateBlocked(
  blocked: BlockedDate[],
  packageId: string,
  dateKey: string,
): BlockedDate | undefined {
  return blocked.find(
    (b) =>
      b.date === dateKey &&
      (b.packageId === null || b.packageId === packageId),
  );
}

export function checkAvailability(options: {
  pkg: TourPackage;
  tourDate: Date;
  guests: number;
  bookings: Booking[];
  blockedDates: BlockedDate[];
  today?: Date;
}): AvailabilityResult {
  const today = options.today ?? new Date();
  today.setHours(0, 0, 0, 0);

  const tourDay = new Date(options.tourDate);
  tourDay.setHours(0, 0, 0, 0);
  const dateKey = toDateKey(tourDay);

  const slotsAvailable = options.pkg.slotsAvailable ?? 10;
  const slotsUsed = getSlotsUsed(
    options.bookings,
    options.pkg.id,
    dateKey,
  );
  const slotsRemaining = Math.max(0, slotsAvailable - slotsUsed);

  if (Number.isNaN(tourDay.getTime())) {
    return {
      ok: false,
      reason: "Invalid tour date",
      slotsAvailable,
      slotsUsed,
      slotsRemaining,
      blocked: false,
    };
  }

  if (tourDay < today) {
    return {
      ok: false,
      reason: "Cannot book a past date",
      slotsAvailable,
      slotsUsed,
      slotsRemaining,
      blocked: false,
    };
  }

  const block = isDateBlocked(
    options.blockedDates,
    options.pkg.id,
    dateKey,
  );
  if (block) {
    return {
      ok: false,
      reason: "Unavailable",
      slotsAvailable,
      slotsUsed,
      slotsRemaining: 0,
      blocked: true,
    };
  }

  if (
    options.guests < options.pkg.minPax ||
    options.guests > options.pkg.maxPax
  ) {
    return {
      ok: false,
      reason: `Guests must be between ${options.pkg.minPax} and ${options.pkg.maxPax}`,
      slotsAvailable,
      slotsUsed,
      slotsRemaining,
      blocked: false,
    };
  }

  if (options.guests > slotsRemaining) {
    return {
      ok: false,
      reason: "Unavailable",
      slotsAvailable,
      slotsUsed,
      slotsRemaining,
      blocked: false,
    };
  }

  return {
    ok: true,
    slotsAvailable,
    slotsUsed,
    slotsRemaining,
    blocked: false,
  };
}

export function getMonthDayStatuses(options: {
  pkg: TourPackage;
  year: number;
  month: number;
  bookings: Booking[];
  blockedDates: BlockedDate[];
  guests?: number;
  today?: Date;
}): Record<
  string,
  {
    blocked: boolean;
    slotsUsed: number;
    slotsRemaining: number;
    bookingCount: number;
    full: boolean;
    past: boolean;
  }
> {
  const today = options.today ?? new Date();
  today.setHours(0, 0, 0, 0);
  const guests = options.guests ?? options.pkg.minPax;
  const days = new Date(options.year, options.month + 1, 0).getDate();
  const result: Record<
    string,
    {
      blocked: boolean;
      slotsUsed: number;
      slotsRemaining: number;
      bookingCount: number;
      full: boolean;
      past: boolean;
    }
  > = {};

  for (let day = 1; day <= days; day += 1) {
    const date = new Date(options.year, options.month, day);
    date.setHours(0, 0, 0, 0);
    const key = toDateKey(date);
    const slotsAvailable = options.pkg.slotsAvailable ?? 10;
    const slotsUsed = getSlotsUsed(options.bookings, options.pkg.id, key);
    const slotsRemaining = Math.max(0, slotsAvailable - slotsUsed);
    const blocked = Boolean(
      isDateBlocked(options.blockedDates, options.pkg.id, key),
    );
    const bookingCount = options.bookings.filter(
      (b) =>
        b.packageId === options.pkg.id &&
        toDateKey(b.tourDate) === key &&
        isActiveBooking(b.status),
    ).length;
    const past = date < today;
    const full = !blocked && !past && slotsRemaining < guests;

    result[key] = {
      blocked,
      slotsUsed,
      slotsRemaining,
      bookingCount,
      full,
      past,
    };
  }

  return result;
}
