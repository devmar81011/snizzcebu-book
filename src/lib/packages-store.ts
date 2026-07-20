import { promises as fs } from "fs";
import path from "path";
import {
  normalizePackage,
  seedPackages,
  type TourPackage,
} from "@/lib/destinations";
import { hasBlobStore, readJsonBlob, writeJsonBlob } from "@/lib/blob-json";
import { getSupabase, hasSupabaseStore } from "@/lib/supabase";

const DATA_PATH = path.join(process.cwd(), "data", "packages.json");
const BLOB_PATH = "data/packages.json";
const LOCAL_WRITE_GRACE_MS = 60_000;

type GlobalStore = {
  packages?: TourPackage[];
  localWriteAt?: number;
};

type PackageRow = {
  id: string;
  title: string;
  min_pax: number;
  max_pax: number;
  slots_available: number;
  days: number;
  nights: number;
  destinations: string[] | null;
  accommodation: string[] | null;
  inclusions: string[] | null;
  inclusions_note: string | null;
  exclusions: string[] | null;
  exclusions_note: string | null;
  rates_per_pax: number[] | string[] | null;
};

function globalStore(): GlobalStore {
  const g = globalThis as typeof globalThis & { __snizzzPackages?: GlobalStore };
  if (!g.__snizzzPackages) g.__snizzzPackages = {};
  return g.__snizzzPackages;
}

function rowToPackage(row: PackageRow): TourPackage {
  return normalizePackage({
    id: row.id,
    title: row.title,
    minPax: Number(row.min_pax) || 2,
    maxPax: Number(row.max_pax) || 10,
    slotsAvailable: Number(row.slots_available) || 10,
    days: Number(row.days) || 1,
    nights: Number(row.nights) || 0,
    destinations: row.destinations || [],
    accommodation: row.accommodation || [],
    inclusions: row.inclusions || [],
    inclusionsNote: row.inclusions_note || "",
    exclusions: row.exclusions || [],
    exclusionsNote: row.exclusions_note || "",
    ratesPerPax: (row.rates_per_pax || []).map((n) => Number(n) || 0),
  });
}

function packageToRow(pkg: TourPackage): PackageRow {
  return {
    id: pkg.id,
    title: pkg.title,
    min_pax: pkg.minPax,
    max_pax: pkg.maxPax,
    slots_available: pkg.slotsAvailable,
    days: pkg.days,
    nights: pkg.nights,
    destinations: pkg.destinations,
    accommodation: pkg.accommodation,
    inclusions: pkg.inclusions,
    inclusions_note: pkg.inclusionsNote,
    exclusions: pkg.exclusions,
    exclusions_note: pkg.exclusionsNote,
    rates_per_pax: pkg.ratesPerPax,
  };
}

async function ensureDataFile(): Promise<void> {
  try {
    await fs.access(DATA_PATH);
  } catch {
    try {
      await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
      await fs.writeFile(
        DATA_PATH,
        JSON.stringify(seedPackages, null, 2),
        "utf8",
      );
    } catch {
      // Read-only FS
    }
  }
}

async function readPackagesFromDisk(): Promise<TourPackage[] | null> {
  await ensureDataFile();
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as TourPackage[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(normalizePackage);
    }
  } catch {
    // fall through
  }
  return null;
}

async function readPackagesFromSupabase(): Promise<TourPackage[] | null> {
  const { data, error } = await getSupabase()
    .from("packages")
    .select("*")
    .order("title", { ascending: true });
  if (error) throw new Error(`packages read failed: ${error.message}`);
  if (!Array.isArray(data)) return null;
  return data.map((row) => rowToPackage(row as PackageRow));
}

async function writePackagesToSupabase(packages: TourPackage[]): Promise<void> {
  const supabase = getSupabase();
  const rows = packages.map(packageToRow);
  const ids = rows.map((r) => r.id);

  const { error: upsertError } = await supabase
    .from("packages")
    .upsert(rows, { onConflict: "id" });
  if (upsertError) {
    throw new Error(`packages write failed: ${upsertError.message}`);
  }

  const { data: existing, error: listError } = await supabase
    .from("packages")
    .select("id");
  if (listError) {
    throw new Error(`packages list failed: ${listError.message}`);
  }

  const stale = (existing || [])
    .map((r) => r.id as string)
    .filter((id) => !ids.includes(id));
  if (stale.length > 0) {
    const { error: deleteError } = await supabase
      .from("packages")
      .delete()
      .in("id", stale);
    if (deleteError) {
      throw new Error(`packages cleanup failed: ${deleteError.message}`);
    }
  }
}

export async function readPackages(): Promise<TourPackage[]> {
  const store = globalStore();

  if (
    store.packages?.length &&
    store.localWriteAt &&
    Date.now() - store.localWriteAt < LOCAL_WRITE_GRACE_MS
  ) {
    return structuredClone(store.packages.map(normalizePackage));
  }

  if (hasSupabaseStore()) {
    const fromSb = await readPackagesFromSupabase();
    if (fromSb && fromSb.length > 0) {
      store.packages = fromSb;
      return structuredClone(fromSb);
    }
    if (store.packages?.length) {
      return structuredClone(store.packages.map(normalizePackage));
    }
    store.packages = seedPackages;
    return structuredClone(seedPackages);
  }

  if (hasBlobStore()) {
    const fromBlob = await readJsonBlob<TourPackage[]>(BLOB_PATH);
    if (Array.isArray(fromBlob) && fromBlob.length > 0) {
      store.packages = fromBlob.map(normalizePackage);
      return structuredClone(store.packages);
    }
    if (store.packages?.length) {
      return structuredClone(store.packages.map(normalizePackage));
    }
    const fromDisk = await readPackagesFromDisk();
    store.packages = fromDisk ?? seedPackages;
    return structuredClone(store.packages.map(normalizePackage));
  }

  if (store.packages?.length) {
    return structuredClone(store.packages.map(normalizePackage));
  }

  const fromDisk = await readPackagesFromDisk();
  if (fromDisk) {
    store.packages = fromDisk;
    return structuredClone(fromDisk);
  }

  store.packages = seedPackages;
  return structuredClone(seedPackages);
}

export async function writePackages(packages: TourPackage[]): Promise<void> {
  const store = globalStore();
  store.packages = packages;
  store.localWriteAt = Date.now();

  if (hasSupabaseStore()) {
    await writePackagesToSupabase(packages);
    return;
  }

  if (hasBlobStore()) {
    await writeJsonBlob(BLOB_PATH, packages);
    return;
  }

  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(packages, null, 2), "utf8");
  } catch {
    // Local FS may be read-only
  }
}

export async function getPackageById(
  id: string,
): Promise<TourPackage | undefined> {
  const packages = await readPackages();
  return packages.find((p) => p.id === id);
}

export async function upsertPackage(pkg: TourPackage): Promise<TourPackage[]> {
  const packages = await readPackages();
  const index = packages.findIndex((p) => p.id === pkg.id);
  if (index >= 0) packages[index] = pkg;
  else packages.push(pkg);
  await writePackages(packages);
  return packages;
}

export async function deletePackage(id: string): Promise<TourPackage[]> {
  const packages = await readPackages();
  const next = packages.filter((p) => p.id !== id);
  await writePackages(next);
  return next;
}
