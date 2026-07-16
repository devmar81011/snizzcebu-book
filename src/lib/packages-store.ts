import { promises as fs } from "fs";
import path from "path";
import {
  normalizePackage,
  seedPackages,
  type TourPackage,
} from "@/lib/destinations";

const DATA_PATH = path.join(process.cwd(), "data", "packages.json");

type GlobalStore = {
  packages?: TourPackage[];
  mtimeMs?: number;
};

function globalStore(): GlobalStore {
  const g = globalThis as typeof globalThis & { __snizzzPackages?: GlobalStore };
  if (!g.__snizzzPackages) g.__snizzzPackages = {};
  return g.__snizzzPackages;
}

async function ensureDataFile(): Promise<void> {
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(
      DATA_PATH,
      JSON.stringify(seedPackages, null, 2),
      "utf8",
    );
  }
}

export async function readPackages(): Promise<TourPackage[]> {
  const store = globalStore();

  await ensureDataFile();
  try {
    const stat = await fs.stat(DATA_PATH);
    if (
      store.packages?.length &&
      store.mtimeMs === stat.mtimeMs
    ) {
      return structuredClone(store.packages.map(normalizePackage));
    }

    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as TourPackage[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      store.packages = parsed.map(normalizePackage);
      store.mtimeMs = stat.mtimeMs;
      return structuredClone(store.packages);
    }
  } catch {
    // fall through to seed / memory
  }

  if (store.packages?.length) {
    return structuredClone(store.packages.map(normalizePackage));
  }

  store.packages = seedPackages;
  return structuredClone(seedPackages);
}

export async function writePackages(packages: TourPackage[]): Promise<void> {
  const store = globalStore();
  store.packages = packages;

  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(packages, null, 2), "utf8");
    const stat = await fs.stat(DATA_PATH);
    store.mtimeMs = stat.mtimeMs;
  } catch {
    // On Vercel the filesystem is read-only; in-memory store still works
    // for the current serverless instance.
    store.mtimeMs = Date.now();
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
