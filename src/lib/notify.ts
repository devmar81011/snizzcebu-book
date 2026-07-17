/** Build WhatsApp / Messenger deep links for guest ↔ admin handoff. */

export function toWhatsAppDigits(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned.slice(1);
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return `63${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith("63")) return cleaned;
  return cleaned.replace(/\D/g, "");
}

export function whatsAppLink(phone: string, message: string): string {
  const digits = toWhatsAppDigits(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function messengerLink(pagePath = "snizzztravelandtours"): string {
  return `https://m.me/${pagePath}`;
}

export function bookingHandoffMessage(input: {
  bookingId: string;
  customerName: string;
  packageTitle: string;
  tourDateLabel: string;
  guests: number;
  totalLabel: string;
  paymentNote?: string;
}): string {
  const note = input.paymentNote?.trim()
    ? `\nGCash note: ${input.paymentNote.trim()}`
    : "";
  return [
    `Hi Snizzz! I just submitted a booking.`,
    `Ref: ${formatBookingRef(input.bookingId)}`,
    `Name: ${input.customerName}`,
    `Package: ${input.packageTitle}`,
    `Date: ${input.tourDateLabel}`,
    `Guests: ${input.guests} pax`,
    `Total: ${input.totalLabel}${note}`,
  ].join("\n");
}

export function formatBookingRef(id: string): string {
  const tail = id.replace(/^bk_/i, "").split("_").pop() || id;
  return `BK-${tail.toUpperCase()}`;
}

export function pendingAgeHours(createdAt: string, now = new Date()): number {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, (now.getTime() - created) / (1000 * 60 * 60));
}

export function formatPendingAge(createdAt: string, now = new Date()): string {
  const hours = pendingAgeHours(createdAt, now);
  if (hours < 1) {
    const mins = Math.max(1, Math.round(hours * 60));
    return `${mins}m waiting`;
  }
  if (hours < 24) return `${Math.round(hours)}h waiting`;
  const days = Math.floor(hours / 24);
  return `${days}d waiting`;
}
