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

  const target = new Date();
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + daysBefore);
  const targetKey = toDateKey(target);

  const due = bookings.filter(
    (b) =>
      b.status !== "cancelled" && toDateKey(b.tourDate) === targetKey,
  );

  if (due.length === 0) {
    return NextResponse.json({ ok: true, reminders: 0, targetKey });
  }

  const names = due
    .slice(0, 3)
    .map((b) => b.customerName)
    .join(", ");
  const more = due.length > 3 ? ` +${due.length - 3} more` : "";

  const result = await sendPushToAll({
    title: "Upcoming Snizzz booking",
    body: `${due.length} booking(s) in ${daysBefore} day(s): ${names}${more}`,
    url: "/admin/calendar",
    tag: `reminder-${targetKey}`,
  });

  return NextResponse.json({
    ok: true,
    reminders: due.length,
    targetKey,
    ...result,
  });
}
