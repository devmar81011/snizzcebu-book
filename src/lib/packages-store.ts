import { promises as fs } from "fs";
import path from "path";
import {
  normalizePackage,
  seedPackages,
  type TourPackage,
} from "@/lib/destinations";
import { hasBlobStore, readJsonBlob, writeJsonBlob } from "@/lib/blob-json";

const DATA_PATH = path.join(process.cwd(), "data", "packages.json");
const BLOB_PATH = "data/packages.json";

type GlobalStore = {
  packages?: TourPackage[];
  mtimeMs?: number;
  localWriteAt?: number;
};

function globalStore(): GlobalStore {
  const g = globalThis as typeof globalThis & { __snizzzPackages?: GlobalStore };
  if (!g.__snizzzPackages) g.__snizzzPackages = {};
  return g.__snizzzPackages;
}

/** Trust local memory briefly after a write. */
const LOCAL_WRITE_GRACE_MS = 60_000;

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
      // Read-only FS (Vercel) — fall back to seed in memory
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

export async function readPackages(): Promise<TourPackage[]> {
  const store = globalStore();

  if (hasBlobStore()) {
    if (
      store.packages?.length &&
      store.localWriteAt &&
      Date.now() - store.localWriteAt < LOCAL_WRITE_GRACE_MS
    ) {
      return structuredClone(store.packages.map(normalizePackage));
    }

    const fromBlob = await readJsonBlob<TourPackage[]>(BLOB_PATH);
    if (Array.isArray(fromBlob) && fromBlob.length > 0) {
      if (
        store.packages?.length &&
        store.localWriteAt &&
        Date.now() - store.localWriteAt < LOCAL_WRITE_GRACE_MS
      ) {
        return structuredClone(store.packages.map(normalizePackage));
      }
      store.packages = fromBlob.map(normalizePackage);
      return structuredClone(store.packages);
    }
    if (store.packages?.length) {
      return structuredClone(store.packages.map(normalizePackage));
    }
    // No Blob file yet → fall back to repo seed (read-only on Vercel).
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

  if (hasBlobStore()) {
    await writeJsonBlob(BLOB_PATH, packages);
    return;
  }

  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(packages, null, 2), "utf8");
  } catch {
    // Local FS may be read-only (e.g. Vercel without Blob).
  }
}

export async function getPackageById(
  id: string,
): Promise<TourPackage | undefined> {
  const packages = await readPackages();
  return packages.find((p) => p.id === id);
}

export async function upsertPackage(
  pkg: TourPackage,
): Promise<TourPackage[]> {
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
