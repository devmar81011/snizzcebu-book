import { NextResponse } from "next/server";
import { toDateKey } from "@/lib/bookings";
import { readBookings } from "@/lib/bookings-store";
import { sendPushToAll } from "@/lib/push";
import { readSettings } from "@/lib/settings-store";

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = request.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await readSettings();
  const daysBefore = Math.max(0, settings.reminderDaysBefore || 1);
  const bookings = await readBookings();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = toDateKey(today);

  const target = new Date(today);
  target.setDate(target.getDate() + daysBefore);
  const targetKey = toDateKey(target);

  const due = bookings.filter(
    (b) =>
      b.status !== "cancelled" && toDateKey(b.tourDate) === targetKey,
  );

  const todayTours = bookings.filter(
    (b) => b.status !== "cancelled" && toDateKey(b.tourDate) === todayKey,
  );
  const pending = bookings.filter((b) => b.status === "pending");

  let reminderResult = { sent: 0, failed: 0 };
  if (due.length > 0) {
    const names = due
      .slice(0, 3)
      .map((b) => b.customerName)
      .join(", ");
    const more = due.length > 3 ? ` +${due.length - 3} more` : "";
    reminderResult = await sendPushToAll({
      title: "Upcoming Snizzz booking",
      body: `${due.length} booking(s) in ${daysBefore} day(s): ${names}${more}`,
      url: "/admin/calendar",
      tag: `reminder-${targetKey}`,
    });
  }

  let digestResult = { sent: 0, failed: 0 };
  if (settings.morningDigest && (todayTours.length > 0 || pending.length > 0)) {
    const tourNames = todayTours
      .slice(0, 3)
      .map((b) => b.customerName)
      .join(", ");
    const tourMore =
      todayTours.length > 3 ? ` +${todayTours.length - 3} more` : "";
    digestResult = await sendPushToAll({
      title: "Snizzz morning digest",
      body: `Today: ${todayTours.length} tour(s)${tourNames ? ` (${tourNames}${tourMore})` : ""}. Pending payment checks: ${pending.length}.`,
      url: "/admin/dashboard",
      tag: `digest-${todayKey}`,
    });
  }

  return NextResponse.json({
    ok: true,
    reminders: due.length,
    targetKey,
    todayTours: todayTours.length,
    pending: pending.length,
    reminderPush: reminderResult,
    digestPush: digestResult,
  });
}
