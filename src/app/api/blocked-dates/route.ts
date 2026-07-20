import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { toDateKey } from "@/lib/bookings";
import {
  addBlockedDate,
  readBlockedDates,
  removeBlockedDate,
} from "@/lib/blocked-dates-store";

export async function GET() {
  const blockedDates = await readBlockedDates();
  return NextResponse.json({ blockedDates });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    date?: string;
    packageId?: string | null;
    reason?: string;
  } | null;

  if (!body?.date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  const dateKey = toDateKey(body.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const { entry, blockedDates } = await addBlockedDate({
    date: dateKey,
    packageId: body.packageId ?? null,
    reason: (body.reason || "Blocked by admin").trim(),
  });

  return NextResponse.json({ blockedDate: entry, blockedDates }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { ok, blockedDates } = await removeBlockedDate(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, blockedDates });
}
