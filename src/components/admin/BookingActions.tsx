"use client";

import { useState } from "react";
import type { Booking } from "@/lib/bookings";
import { formatMoney } from "@/lib/bookings";
import {
  formatBookingRef,
  formatPendingAge,
  pendingAgeHours,
  whatsAppLink,
} from "@/lib/notify";

type Props = {
  booking: Booking;
  onUpdated: () => void;
  size?: "sm" | "md";
  pendingAlertHours?: number;
};

export function BookingActions({
  booking,
  onUpdated,
  size = "md",
  pendingAlertHours = 4,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);

  const btn =
    size === "sm"
      ? "rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50"
      : "rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50";

  const guestWa = whatsAppLink(
    booking.customerPhone,
    `Hi ${booking.customerName}! This is Snizzz regarding your booking ${formatBookingRef(booking.id)} (${booking.packageTitle}).`,
  );

  const overdue =
    booking.status === "pending" &&
    pendingAgeHours(booking.createdAt) >= pendingAlertHours;

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
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {booking.status === "pending" ? (
          <span
            className={[
              "rounded-md px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide",
              overdue
                ? "bg-red-500/20 text-red-100"
                : "bg-amber-400/15 text-amber-100",
            ].join(" ")}
            title={`Pending since ${new Date(booking.createdAt).toLocaleString("en-PH")}`}
          >
            {formatPendingAge(booking.createdAt)}
            {overdue ? " · needs reply" : ""}
          </span>
        ) : null}

        {booking.paymentProofUrl ? (
          <button
            type="button"
            onClick={() => setProofOpen(true)}
            className={[
              btn,
              "border border-white/20 bg-white/5 text-white/85 hover:border-sun/40 hover:text-sun",
            ].join(" ")}
          >
            Proof
          </button>
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

        <a
          href={guestWa}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            btn,
            "border border-palm/40 bg-palm/10 text-[#d7f5a8] hover:bg-palm/20",
          ].join(" ")}
        >
          WhatsApp
        </a>

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

      {proofOpen && booking.paymentProofUrl ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Payment proof"
          onClick={(e) => {
            if (e.target === e.currentTarget) setProofOpen(false);
          }}
        >
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-[#0c1a1c] p-4 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-sun uppercase">
                  Payment proof
                </p>
                <p className="mt-1 font-semibold text-white">
                  {booking.customerName} · {formatBookingRef(booking.id)}
                </p>
                <p className="text-sm text-white/55">
                  {booking.packageTitle} · {formatMoney(booking.totalAmount)}
                  {booking.paymentNote
                    ? ` · note: ${booking.paymentNote}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProofOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-white/70"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={booking.paymentProofUrl}
              alt="Payment proof"
              className="max-h-[55vh] w-full rounded-xl object-contain bg-black/40"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={booking.paymentProofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/20 px-3 py-2 text-sm font-semibold"
              >
                Open full size
              </a>
              {booking.status === "pending" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setStatus("completed")}
                  className="rounded-xl bg-sun px-3 py-2 text-sm font-bold text-ink"
                >
                  Mark completed
                </button>
              ) : null}
              <a
                href={guestWa}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-palm/40 bg-palm/10 px-3 py-2 text-sm font-semibold text-[#d7f5a8]"
              >
                Message guest
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
