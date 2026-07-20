import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { writeBlockedDates, readBlockedDates } from "@/lib/blocked-dates-store";
import { writeBookings, readBookings } from "@/lib/bookings-store";
import {
  readCommissionPayouts,
  writeCommissionPayouts,
} from "@/lib/commission-payouts-store";
import { isSuperadminAuthenticated } from "@/lib/superadmin-auth";

const ALLOWED = ["blocked-dates", "commission-payouts", "bookings"] as const;
type ResetTarget = (typeof ALLOWED)[number];

export async function GET() {
  if (!(await isSuperadminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [blockedDates, payouts, bookings] = await Promise.all([
    readBlockedDates(),
    readCommissionPayouts(),
    readBookings(),
  ]);

  return NextResponse.json({
    counts: {
      blockedDates: blockedDates.length,
      commissionPayouts: payouts.length,
      bookings: bookings.length,
      completedBookings: bookings.filter((b) => b.status === "completed").length,
      pendingBookings: bookings.filter((b) => b.status === "pending").length,
    },
  });
}

export async function POST(request: Request) {
  if (!(await isSuperadminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    targets?: string[];
    confirm?: string;
  } | null;

  if (!body || body.confirm !== "RESET") {
    return NextResponse.json(
      { error: 'Type RESET to confirm destructive cleanup' },
      { status: 400 },
    );
  }

  const targets = (body.targets || []).filter((t): t is ResetTarget =>
    (ALLOWED as readonly string[]).includes(t),
  );
  if (targets.length === 0) {
    return NextResponse.json(
      { error: "Select at least one thing to reset" },
      { status: 400 },
    );
  }

  const cleared: Record<string, number> = {};

  if (targets.includes("blocked-dates")) {
    const before = await readBlockedDates();
    await writeBlockedDates([]);
    cleared.blockedDates = before.length;
  }

  if (targets.includes("commission-payouts")) {
    const before = await readCommissionPayouts();
    await writeCommissionPayouts([]);
    cleared.commissionPayouts = before.length;
  }

  if (targets.includes("bookings")) {
    const before = await readBookings();
    await writeBookings([]);
    cleared.bookings = before.length;
  }

  revalidatePath("/superadmin/payments");
  revalidatePath("/superadmin/tools");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/dashboard");
  revalidatePath("/");

  return NextResponse.json({ ok: true, cleared });
}
