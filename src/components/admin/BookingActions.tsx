"use client";

import { useState } from "react";
import type { Booking } from "@/lib/bookings";

type Props = {
  booking: Booking;
  onUpdated: () => void;
  size?: "sm" | "md";
};

export function BookingActions({
  booking,
  onUpdated,
  size = "md",
}: Props) {
  const [busy, setBusy] = useState(false);

  const btn =
    size === "sm"
      ? "rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50"
      : "rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

  async function setStatus(status: Booking["status"]) {
    if (busy) return;
    if (status === "cancelled") {
      const ok = window.confirm(
        `Cancel booking for ${booking.customerName}?`,
      );
      if (!ok) return;
    }
    if (status === "completed") {
      const ok = window.confirm(
        `Mark ${booking.customerName}'s booking as completed (paid)?`,
      );
      if (!ok) return;
    }

    setBusy(true);
    const response = await fetch("/api/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: booking.id, status }),
    });
    setBusy(false);

    if (!response.ok) {
      window.alert("Could not update booking");
      return;
    }
    onUpdated();
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {booking.paymentProofUrl ? (
        <a
          href={booking.paymentProofUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            btn,
            "border border-white/20 bg-white/5 text-white/85 hover:border-sun/40 hover:text-sun",
          ].join(" ")}
        >
          Proof
        </a>
      ) : (
        <span
          className={[
            btn,
            "cursor-not-allowed border border-white/10 text-white/30",
          ].join(" ")}
          title="No proof uploaded"
        >
          No proof
        </span>
      )}
      {booking.status === "pending" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setStatus("completed")}
          className={[btn, "bg-sun font-bold text-ink hover:brightness-105"].join(
            " ",
          )}
        >
          Complete
        </button>
      ) : null}
      {booking.status !== "cancelled" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setStatus("cancelled")}
          className={[
            btn,
            "border border-red-400/35 text-red-200 hover:bg-red-500/15",
          ].join(" ")}
        >
          Cancel
        </button>
      ) : null}
    </div>
  );
}
