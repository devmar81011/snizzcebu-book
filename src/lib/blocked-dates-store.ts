import { promises as fs } from "fs";
import path from "path";
import type { BlockedDate } from "@/lib/bookings";
import { hasBlobStore, readJsonBlob, writeJsonBlob } from "@/lib/blob-json";
import { getSupabase, hasSupabaseStore } from "@/lib/supabase";

const DATA_PATH = path.join(process.cwd(), "data", "blocked-dates.json");
const BLOB_PATH = "data/blocked-dates.json";
const LOCAL_WRITE_GRACE_MS = 60_000;

type GlobalStore = {
  blocked?: BlockedDate[];
  localWriteAt?: number;
};

type BlockedRow = {
  id: string;
  date: string;
  package_id: string | null;
  reason: string;
};

function globalStore(): GlobalStore {
  const g = globalThis as typeof globalThis & {
    __snizzzBlocked?: GlobalStore;
  };
  if (!g.__snizzzBlocked) g.__snizzzBlocked = {};
  return g.__snizzzBlocked;
}

function rowToBlocked(row: BlockedRow): BlockedDate {
  return {
    id: row.id,
    date: String(row.date).slice(0, 10),
    packageId: row.package_id,
    reason: row.reason || "",
  };
}

function blockedToRow(entry: BlockedDate): BlockedRow {
  return {
    id: entry.id,
    date: entry.date.slice(0, 10),
    package_id: entry.packageId,
    reason: entry.reason || "",
  };
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

async function readBlockedFromSupabase(): Promise<BlockedDate[]> {
  const { data, error } = await getSupabase()
    .from("blocked_dates")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw new Error(`blocked_dates read failed: ${error.message}`);
  return (data || []).map((row) => rowToBlocked(row as BlockedRow));
}

async function writeBlockedToSupabase(blocked: BlockedDate[]): Promise<void> {
  const supabase = getSupabase();
  const rows = blocked.map(blockedToRow);
  const ids = rows.map((r) => r.id);

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("blocked_dates")
      .upsert(rows, { onConflict: "id" });
    if (upsertError) {
      throw new Error(`blocked_dates write failed: ${upsertError.message}`);
    }
  }

  const { data: existing, error: listError } = await supabase
    .from("blocked_dates")
    .select("id");
  if (listError) {
    throw new Error(`blocked_dates list failed: ${listError.message}`);
  }

  const stale = (existing || [])
    .map((r) => r.id as string)
    .filter((id) => !ids.includes(id));
  if (stale.length > 0) {
    const { error: deleteError } = await supabase
      .from("blocked_dates")
      .delete()
      .in("id", stale);
    if (deleteError) {
      throw new Error(`blocked_dates cleanup failed: ${deleteError.message}`);
    }
  }
}

export async function readBlockedDates(): Promise<BlockedDate[]> {
  const store = globalStore();

  if (
    store.blocked &&
    store.localWriteAt &&
    Date.now() - store.localWriteAt < LOCAL_WRITE_GRACE_MS
  ) {
    return structuredClone(store.blocked);
  }

  if (hasSupabaseStore()) {
    const fromSb = await readBlockedFromSupabase();
    store.blocked = fromSb;
    return structuredClone(fromSb);
  }

  if (hasBlobStore()) {
    const fromBlob = await readJsonBlob<BlockedDate[]>(BLOB_PATH);
    if (Array.isArray(fromBlob)) {
      store.blocked = fromBlob;
      return structuredClone(fromBlob);
    }
    if (store.blocked) return structuredClone(store.blocked);
    store.blocked = [];
    return [];
  }

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
  store.localWriteAt = Date.now();

  if (hasSupabaseStore()) {
    await writeBlockedToSupabase(blocked);
    return;
  }

  if (hasBlobStore()) {
    await writeJsonBlob(BLOB_PATH, blocked);
    return;
  }

  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(blocked, null, 2), "utf8");
  } catch {
    // Local FS may be read-only
  }
}

export async function addBlockedDate(
  input: Omit<BlockedDate, "id">,
): Promise<{ entry: BlockedDate; blockedDates: BlockedDate[] }> {
  const blocked = await readBlockedDates();
  const existing = blocked.find(
    (b) => b.date === input.date && b.packageId === input.packageId,
  );
  if (existing) {
    existing.reason = input.reason;
    await writeBlockedDates(blocked);
    return { entry: existing, blockedDates: structuredClone(blocked) };
  }

  const entry: BlockedDate = {
    id: `bd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    date: input.date,
    packageId: input.packageId,
    reason: input.reason,
  };
  blocked.push(entry);
  await writeBlockedDates(blocked);
  return { entry, blockedDates: structuredClone(blocked) };
}

export async function removeBlockedDate(
  id: string,
): Promise<{ ok: boolean; blockedDates: BlockedDate[] }> {
  const blocked = await readBlockedDates();
  const next = blocked.filter((b) => b.id !== id);
  if (next.length === blocked.length) {
    return { ok: false, blockedDates: structuredClone(blocked) };
  }
  await writeBlockedDates(next);
  return { ok: true, blockedDates: structuredClone(next) };
}
