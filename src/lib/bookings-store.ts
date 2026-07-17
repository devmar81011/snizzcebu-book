import { promises as fs } from "fs";
import path from "path";
import type { Booking } from "@/lib/bookings";
import { hasBlobStore, readJsonBlob, writeJsonBlob } from "@/lib/blob-json";

const DATA_PATH = path.join(process.cwd(), "data", "bookings.json");
const BLOB_PATH = "data/bookings.json";

type GlobalStore = { bookings?: Booking[] };

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

async function ensureDataFile(): Promise<void> {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, "[]", "utf8");
  }
}

function migrateList(parsed: unknown[]): Booking[] {
  return parsed.map((item) => migrateBooking(item as Record<string, unknown>));
}

export async function readBookings(): Promise<Booking[]> {
  const store = globalStore();

  if (hasBlobStore()) {
    const fromBlob = await readJsonBlob<unknown[]>(BLOB_PATH);
    if (Array.isArray(fromBlob)) {
      store.bookings = migrateList(fromBlob);
      return structuredClone(store.bookings);
    }
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
  bookings[index] = { ...bookings[index], status };
  await writeBookings(bookings);
  return bookings[index];
}
