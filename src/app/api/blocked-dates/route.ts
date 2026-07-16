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

  const parsed = new Date(body.date);
  if (Number.isNaN(parsed.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const entry = await addBlockedDate({
    date: toDateKey(parsed),
    packageId: body.packageId ?? null,
    reason: (body.reason || "Blocked by admin").trim(),
  });

  const blockedDates = await readBlockedDates();
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

  const ok = await removeBlockedDate(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const blockedDates = await readBlockedDates();
  return NextResponse.json({ ok: true, blockedDates });
}
