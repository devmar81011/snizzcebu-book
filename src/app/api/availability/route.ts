import { NextResponse } from "next/server";
import {
  checkAvailability,
  getMonthDayStatuses,
} from "@/lib/availability";
import { readBlockedDates } from "@/lib/blocked-dates-store";
import { readBookings } from "@/lib/bookings-store";
import { getPackageById } from "@/lib/packages-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const packageId = searchParams.get("packageId");
  const monthParam = searchParams.get("month"); // YYYY-MM
  const tourDate = searchParams.get("tourDate");
  const guests = Number(searchParams.get("guests") || "0");

  if (!packageId) {
    return NextResponse.json({ error: "packageId is required" }, { status: 400 });
  }

  const pkg = await getPackageById(packageId);
  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const [bookings, blockedDates] = await Promise.all([
    readBookings(),
    readBlockedDates(),
  ]);

  if (monthParam) {
    const [yearStr, monthStr] = monthParam.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr) - 1;
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 0 || month > 11) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }

    const days = getMonthDayStatuses({
      pkg,
      year,
      month,
      bookings,
      blockedDates,
      guests: guests || pkg.minPax,
    });

    return NextResponse.json({
      package: {
        id: pkg.id,
        title: pkg.title,
        days: pkg.days,
        nights: pkg.nights,
        slotsAvailable: pkg.slotsAvailable,
        minPax: pkg.minPax,
        maxPax: pkg.maxPax,
      },
      days,
    });
  }

  if (!tourDate) {
    return NextResponse.json(
      { error: "tourDate or month is required" },
      { status: 400 },
    );
  }

  const availability = checkAvailability({
    pkg,
    tourDate: new Date(tourDate),
    guests: guests || pkg.minPax,
    bookings,
    blockedDates,
  });

  return NextResponse.json({
    availability,
    package: {
      id: pkg.id,
      title: pkg.title,
      days: pkg.days,
      nights: pkg.nights,
      slotsAvailable: pkg.slotsAvailable,
    },
  });
}
