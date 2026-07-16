import { NextResponse } from "next/server";
import { checkAvailability } from "@/lib/availability";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  endOfDay,
  normalizePhone,
  startOfMonth,
  startOfWeek,
  sumIncome,
  validateCustomerName,
  validateCustomerPhone,
} from "@/lib/bookings";
import { readBlockedDates } from "@/lib/blocked-dates-store";
import {
  createBooking,
  readBookings,
  updateBookingStatus,
} from "@/lib/bookings-store";
import { pricePerPax, totalPrice } from "@/lib/destinations";
import { getPackageById } from "@/lib/packages-store";
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookings = await readBookings();
  const now = new Date();
  const week = sumIncome(bookings, startOfWeek(now), endOfDay(now));
  const month = sumIncome(bookings, startOfMonth(now), endOfDay(now));
  const allTime = sumIncome(bookings, new Date(0), endOfDay(now));
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  return NextResponse.json({
    bookings,
    stats: {
      weeklyIncome: week.amount,
      weeklyBookings: week.count,
      monthlyIncome: month.amount,
      monthlyBookings: month.count,
      allTimeIncome: allTime.amount,
      allTimeBookings: allTime.count,
      pendingCount,
    },
  });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Send reservation as multipart form data" },
      { status: 400 },
    );
  }

  const form = await request.formData();
  const packageId = String(form.get("packageId") || "");
  const tourDateRaw = String(form.get("tourDate") || "");
  const guests = Number(form.get("guests") || "0");
  const customerName = String(form.get("customerName") || "");
  const customerPhone = String(form.get("customerPhone") || "");
  const proof = form.get("paymentProof");

  const nameError = validateCustomerName(customerName);
  if (nameError) {
    return NextResponse.json({ error: nameError }, { status: 400 });
  }

  const phoneError = validateCustomerPhone(customerPhone);
  if (phoneError) {
    return NextResponse.json({ error: phoneError }, { status: 400 });
  }

  if (!(proof instanceof File) || proof.size <= 0) {
    return NextResponse.json(
      { error: "Payment proof screenshot is required" },
      { status: 400 },
    );
  }
  if (!proof.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Payment proof must be an image" },
      { status: 400 },
    );
  }
  if (proof.size > 8 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Payment proof must be under 8MB" },
      { status: 400 },
    );
  }

  const pkg = await getPackageById(packageId);
  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const tourDate = new Date(tourDateRaw);
  const [bookings, blockedDates] = await Promise.all([
    readBookings(),
    readBlockedDates(),
  ]);

  const availability = checkAvailability({
    pkg,
    tourDate,
    guests,
    bookings,
    blockedDates,
  });

  if (!availability.ok) {
    return NextResponse.json(
      { error: availability.reason || "Unavailable", availability },
      { status: 409 },
    );
  }

  const ext = proof.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const filename = `proof-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "proofs");
  await fs.mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await proof.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), buffer);
  const paymentProofUrl = `/uploads/proofs/${filename}`;

  const per = pricePerPax(pkg, guests);
  const total = totalPrice(pkg, guests);

  const booking = await createBooking({
    packageId: pkg.id,
    packageTitle: pkg.title,
    tourDate: tourDate.toISOString(),
    guests,
    pricePerPax: per,
    totalAmount: total,
    customerName: customerName.trim(),
    customerPhone: normalizePhone(customerPhone),
    paymentProofUrl,
    status: "pending",
  });

  // Notify installed admin PWAs (best-effort; ignore push failures)
  try {
    const { sendPushToAll } = await import("@/lib/push");
    const tourLabel = tourDate.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    await sendPushToAll({
      title: "New Snizzz booking",
      body: `${booking.customerName} · ${booking.packageTitle} · ${booking.guests} pax · ${tourLabel}`,
      url: "/admin/dashboard",
      tag: `booking-${booking.id}`,
    });
  } catch {
    // push optional
  }

  return NextResponse.json({ booking }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    status?: "pending" | "completed" | "cancelled";
  } | null;

  if (!body?.id || !body?.status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }

  if (!["pending", "completed", "cancelled"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updated = await updateBookingStatus(body.id, body.status);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ booking: updated });
}
