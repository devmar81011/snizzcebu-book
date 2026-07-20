import { promises as fs } from "fs";
import path from "path";
import type { Booking } from "@/lib/bookings";
import { hasBlobStore, readJsonBlob, writeJsonBlob } from "@/lib/blob-json";
import { getSupabase, hasSupabaseStore } from "@/lib/supabase";

const DATA_PATH = path.join(process.cwd(), "data", "bookings.json");
const BLOB_PATH = "data/bookings.json";
const LOCAL_WRITE_GRACE_MS = 60_000;

type GlobalStore = { bookings?: Booking[]; localWriteAt?: number };

type BookingRow = {
  id: string;
  created_at: string;
  completed_at: string | null;
  tour_date: string;
  package_id: string;
  package_title: string;
  guests: number;
  price_per_pax: number | string;
  total_amount: number | string;
  status: string;
  customer_name: string;
  customer_phone: string;
  payment_proof_url: string;
  payment_note: string | null;
};

function globalStore(): GlobalStore {
  const g = globalThis as typeof globalThis & { __snizzzBookings?: GlobalStore };
  if (!g.__snizzzBookings) g.__snizzzBookings = {};
  return g.__snizzzBookings;
}

function migrateBooking(raw: Record<string, unknown>): Booking {
  const statusRaw = String(raw.status || "pending");
  const status =
    statusRaw === "confirmed"
      ? "completed"
      : statusRaw === "completed" ||
          statusRaw === "pending" ||
          statusRaw === "cancelled"
        ? statusRaw
        : "pending";

  return {
    id: String(raw.id),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    completedAt: raw.completedAt ? String(raw.completedAt) : undefined,
    tourDate: String(raw.tourDate),
    packageId: String(raw.packageId),
    packageTitle: String(raw.packageTitle || ""),
    guests: Number(raw.guests) || 0,
    pricePerPax: Number(raw.pricePerPax) || 0,
    totalAmount: Number(raw.totalAmount) || 0,
    status,
    customerName: String(raw.customerName || "Guest"),
    customerPhone: String(raw.customerPhone || ""),
    paymentProofUrl: String(raw.paymentProofUrl || ""),
    paymentNote: String(raw.paymentNote || ""),
  };
}

function rowToBooking(row: BookingRow): Booking {
  return migrateBooking({
    id: row.id,
    createdAt: row.created_at,
    completedAt: row.completed_at || undefined,
    tourDate: row.tour_date,
    packageId: row.package_id,
    packageTitle: row.package_title,
    guests: row.guests,
    pricePerPax: row.price_per_pax,
    totalAmount: row.total_amount,
    status: row.status,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    paymentProofUrl: row.payment_proof_url,
    paymentNote: row.payment_note || "",
  });
}

function bookingToRow(booking: Booking): BookingRow {
  return {
    id: booking.id,
    created_at: booking.createdAt,
    completed_at: booking.completedAt || null,
    tour_date: booking.tourDate.slice(0, 10),
    package_id: booking.packageId,
    package_title: booking.packageTitle,
    guests: booking.guests,
    price_per_pax: booking.pricePerPax,
    total_amount: booking.totalAmount,
    status: booking.status,
    customer_name: booking.customerName,
    customer_phone: booking.customerPhone,
    payment_proof_url: booking.paymentProofUrl,
    payment_note: booking.paymentNote || "",
  };
}

function migrateList(parsed: unknown[]): Booking[] {
  return parsed.map((item) => migrateBooking(item as Record<string, unknown>));
}

async function ensureDataFile(): Promise<void> {
  try {
    await fs.access(DATA_PATH);
  } catch {
    try {
      await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
      await fs.writeFile(DATA_PATH, "[]", "utf8");
    } catch {
      // Read-only FS
    }
  }
}

async function readBookingsFromSupabase(): Promise<Booking[]> {
  const { data, error } = await getSupabase()
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`bookings read failed: ${error.message}`);
  return (data || []).map((row) => rowToBooking(row as BookingRow));
}

async function writeBookingsToSupabase(bookings: Booking[]): Promise<void> {
  const supabase = getSupabase();
  const rows = bookings.map(bookingToRow);
  const ids = rows.map((r) => r.id);

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("bookings")
      .upsert(rows, { onConflict: "id" });
    if (upsertError) {
      throw new Error(`bookings write failed: ${upsertError.message}`);
    }
  }

  const { data: existing, error: listError } = await supabase
    .from("bookings")
    .select("id");
  if (listError) {
    throw new Error(`bookings list failed: ${listError.message}`);
  }

  const stale = (existing || [])
    .map((r) => r.id as string)
    .filter((id) => !ids.includes(id));
  if (stale.length > 0) {
    const { error: deleteError } = await supabase
      .from("bookings")
      .delete()
      .in("id", stale);
    if (deleteError) {
      throw new Error(`bookings cleanup failed: ${deleteError.message}`);
    }
  }
}

export async function readBookings(): Promise<Booking[]> {
  const store = globalStore();

  if (
    store.bookings &&
    store.localWriteAt &&
    Date.now() - store.localWriteAt < LOCAL_WRITE_GRACE_MS
  ) {
    return structuredClone(store.bookings);
  }

  if (hasSupabaseStore()) {
    const fromSb = await readBookingsFromSupabase();
    store.bookings = fromSb;
    return structuredClone(fromSb);
  }

  if (hasBlobStore()) {
    const fromBlob = await readJsonBlob<unknown[]>(BLOB_PATH);
    if (Array.isArray(fromBlob)) {
      store.bookings = migrateList(fromBlob);
      return structuredClone(store.bookings);
    }
    if (store.bookings) return structuredClone(store.bookings);
    store.bookings = [];
    return [];
  }

  if (store.bookings) return structuredClone(store.bookings);

  await ensureDataFile();
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown[];
    if (Array.isArray(parsed)) {
      store.bookings = migrateList(parsed);
      return structuredClone(store.bookings);
    }
  } catch {
    // fall through
  }

  store.bookings = [];
  return [];
}

export async function writeBookings(bookings: Booking[]): Promise<void> {
  const store = globalStore();
  store.bookings = bookings;
  store.localWriteAt = Date.now();

  if (hasSupabaseStore()) {
    await writeBookingsToSupabase(bookings);
    return;
  }

  if (hasBlobStore()) {
    await writeJsonBlob(BLOB_PATH, bookings);
    return;
  }

  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(bookings, null, 2), "utf8");
  } catch {
    // Vercel read-only FS
  }
}

export async function createBooking(
  input: Omit<Booking, "id" | "createdAt"> & { status?: Booking["status"] },
): Promise<Booking> {
  const bookings = await readBookings();
  const booking: Booking = {
    id: `bk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    status: input.status || "pending",
    tourDate: input.tourDate,
    packageId: input.packageId,
    packageTitle: input.packageTitle,
    guests: input.guests,
    pricePerPax: input.pricePerPax,
    totalAmount: input.totalAmount,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    paymentProofUrl: input.paymentProofUrl,
    paymentNote: input.paymentNote || "",
  };
  bookings.unshift(booking);
  await writeBookings(bookings);
  return booking;
}

export async function updateBookingStatus(
  id: string,
  status: Booking["status"],
): Promise<Booking | null> {
  const bookings = await readBookings();
  const index = bookings.findIndex((b) => b.id === id);
  if (index < 0) return null;
  const prev = bookings[index];
  const next: Booking = { ...prev, status };
  if (status === "completed" && prev.status !== "completed") {
    next.completedAt = new Date().toISOString();
  }
  if (status !== "completed") {
    delete next.completedAt;
  }
  bookings[index] = next;
  await writeBookings(bookings);
  return bookings[index];
}
