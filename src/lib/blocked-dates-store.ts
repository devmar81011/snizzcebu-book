import { promises as fs } from "fs";
import path from "path";
import type { BlockedDate } from "@/lib/bookings";

const DATA_PATH = path.join(process.cwd(), "data", "blocked-dates.json");

type GlobalStore = { blocked?: BlockedDate[] };

function globalStore(): GlobalStore {
  const g = globalThis as typeof globalThis & {
    __snizzzBlocked?: GlobalStore;
  };
  if (!g.__snizzzBlocked) g.__snizzzBlocked = {};
  return g.__snizzzBlocked;
}

async function ensureDataFile(): Promise<void> {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, "[]", "utf8");
  }
}

export async function readBlockedDates(): Promise<BlockedDate[]> {
  const store = globalStore();
  if (store.blocked) return structuredClone(store.blocked);

  await ensureDataFile();
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as BlockedDate[];
    if (Array.isArray(parsed)) {
      store.blocked = parsed;
      return structuredClone(parsed);
    }
  } catch {
    // fall through
  }

  store.blocked = [];
  return [];
}

export async function writeBlockedDates(blocked: BlockedDate[]): Promise<void> {
  const store = globalStore();
  store.blocked = blocked;
  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(blocked, null, 2), "utf8");
  } catch {
    // Vercel read-only FS
  }
}

export async function addBlockedDate(
  input: Omit<BlockedDate, "id">,
): Promise<BlockedDate> {
  const blocked = await readBlockedDates();
  const existing = blocked.find(
    (b) => b.date === input.date && b.packageId === input.packageId,
  );
  if (existing) {
    existing.reason = input.reason;
    await writeBlockedDates(blocked);
    return existing;
  }

  const entry: BlockedDate = {
    id: `bd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    date: input.date,
    packageId: input.packageId,
    reason: input.reason,
  };
  blocked.push(entry);
  await writeBlockedDates(blocked);
  return entry;
}

export async function removeBlockedDate(id: string): Promise<boolean> {
  const blocked = await readBlockedDates();
  const next = blocked.filter((b) => b.id !== id);
  if (next.length === blocked.length) return false;
  await writeBlockedDates(next);
  return true;
}
