export type BookingStatus = "pending" | "completed" | "cancelled";

export type Booking = {
  id: string;
  createdAt: string;
  /** Set when marked completed (paid). Used for income/commission periods. */
  completedAt?: string;
  tourDate: string;
  packageId: string;
  packageTitle: string;
  guests: number;
  pricePerPax: number;
  totalAmount: number;
  status: BookingStatus;
  customerName: string;
  customerPhone: string;
  paymentProofUrl: string;
  /** Optional GCash reference / note from guest */
  paymentNote: string;
};

export type BlockedDate = {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** null = block for all packages */
  packageId: string | null;
  reason: string;
};

export function toDateKey(input: Date | string): string {
  // Keep calendar YYYY-MM-DD strings as-is so UTC parsing cannot shift the day.
  if (typeof input === "string") {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(input.trim());
    if (match) return match[1];
  }
  const d = typeof input === "string" ? new Date(input) : input;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isActiveBooking(status: BookingStatus): boolean {
  return status === "pending" || status === "completed";
}

export function sumIncome(
  bookings: Booking[],
  from: Date,
  to: Date,
): { amount: number; count: number } {
  let amount = 0;
  let count = 0;
  for (const booking of bookings) {
    if (booking.status !== "completed") continue;
    const created = new Date(booking.completedAt || booking.createdAt);
    if (created >= from && created <= to) {
      amount += booking.totalAmount;
      count += 1;
    }
  }
  return { amount, count };
}

/** Developer / platform commission rate (5%). */
export const COMMISSION_RATE = 0.05;

export function commissionOf(amount: number): number {
  return Math.round(amount * COMMISSION_RATE * 100) / 100;
}

export function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function paymentTimestamp(booking: Booking): Date {
  return new Date(booking.completedAt || booking.createdAt);
}

export type IncomeBucket = {
  key: string;
  label: string;
  from: string;
  to: string;
  amount: number;
  count: number;
  commission: number;
};

/** Split a month into Mon–Sun weeks (clipped to the month). */
export function weeklyIncomeInMonth(
  bookings: Booking[],
  year: number,
  monthIndex: number,
): IncomeBucket[] {
  const monthStart = startOfMonth(new Date(year, monthIndex, 1));
  const monthEnd = endOfMonth(monthStart);
  const buckets: IncomeBucket[] = [];

  let cursor = startOfWeek(monthStart);
  while (cursor <= monthEnd) {
    const weekStart = new Date(cursor);
    const weekEnd = endOfDay(
      new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6),
    );
    const from = weekStart < monthStart ? monthStart : weekStart;
    const to = weekEnd > monthEnd ? monthEnd : weekEnd;
    const { amount, count } = sumIncome(bookings, from, to);
    const fromKey = toDateKey(from);
    const toKey = toDateKey(to);
    buckets.push({
      key: `${fromKey}_${toKey}`,
      label:
        fromKey === toKey
          ? from.toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
            })
          : `${from.toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
            })} – ${to.toLocaleDateString("en-PH", {
              month: "short",
              day: "numeric",
            })}`,
      from: fromKey,
      to: toKey,
      amount,
      count,
      commission: commissionOf(amount),
    });
    cursor = new Date(
      weekStart.getFullYear(),
      weekStart.getMonth(),
      weekStart.getDate() + 7,
    );
  }

  return buckets;
}

export function completedPaymentsInRange(
  bookings: Booking[],
  from: Date,
  to: Date,
): Booking[] {
  return bookings
    .filter((b) => {
      if (b.status !== "completed") return false;
      const paid = paymentTimestamp(b);
      return paid >= from && paid <= to;
    })
    .sort(
      (a, b) =>
        paymentTimestamp(b).getTime() - paymentTimestamp(a).getTime(),
    );
}

export function formatMoney(amount: number): string {
  return `₱${amount.toLocaleString("en-PH")}`;
}

export function validateCustomerName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Full name is required";
  if (trimmed.length > 80) return "Full name is too long";
  if (!/^[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ\s.'-]*$/.test(trimmed)) {
    return "Enter a valid full name";
  }
  return null;
}

export function validateCustomerPhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s()-]/g, "");
  if (!cleaned) return "Mobile number is required";
  // PH mobile: 09XXXXXXXXX or +639XXXXXXXXX or 639XXXXXXXXX
  if (!/^(\+?63|0)9\d{9}$/.test(cleaned)) {
    return "Enter a valid PH mobile number (e.g. 09XXXXXXXXX)";
  }
  return null;
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s()-]/g, "");
  if (cleaned.startsWith("+63")) return `0${cleaned.slice(3)}`;
  if (cleaned.startsWith("63")) return `0${cleaned.slice(2)}`;
  return cleaned;
}
