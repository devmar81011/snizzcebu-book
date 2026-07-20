import { promises as fs } from "fs";
import path from "path";
import type { CommissionPayout } from "@/lib/commission";
import { hasBlobStore, readJsonBlob, writeJsonBlob } from "@/lib/blob-json";

export type { CommissionPayout, CommissionPayoutStatus } from "@/lib/commission";
export {
  weekPeriodKey,
  monthPeriodKey,
  allTimePeriodKey,
} from "@/lib/commission";


const DATA_PATH = path.join(process.cwd(), "data", "commission-payouts.json");
const BLOB_PATH = "data/commission-payouts.json";

type GlobalStore = {
  payouts?: CommissionPayout[];
  localWriteAt?: number;
};

function globalStore(): GlobalStore {
  const g = globalThis as typeof globalThis & {
    __snizzzCommissionPayouts?: GlobalStore;
  };
  if (!g.__snizzzCommissionPayouts) g.__snizzzCommissionPayouts = {};
  return g.__snizzzCommissionPayouts;
}

const LOCAL_WRITE_GRACE_MS = 60_000;

export async function readCommissionPayouts(): Promise<CommissionPayout[]> {
  const store = globalStore();

  if (hasBlobStore()) {
    if (
      store.payouts &&
      store.localWriteAt &&
      Date.now() - store.localWriteAt < LOCAL_WRITE_GRACE_MS
    ) {
      return structuredClone(store.payouts);
    }

    const fromBlob = await readJsonBlob<CommissionPayout[]>(BLOB_PATH);
    if (Array.isArray(fromBlob)) {
      if (
        store.payouts &&
        store.localWriteAt &&
        Date.now() - store.localWriteAt < LOCAL_WRITE_GRACE_MS
      ) {
        return structuredClone(store.payouts);
      }
      store.payouts = fromBlob;
      return structuredClone(fromBlob);
    }
    if (store.payouts) return structuredClone(store.payouts);
    store.payouts = [];
    return [];
  }

  if (store.payouts) return structuredClone(store.payouts);

  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as CommissionPayout[];
    if (Array.isArray(parsed)) {
      store.payouts = parsed;
      return structuredClone(parsed);
    }
  } catch {
    // fall through
  }

  store.payouts = [];
  return [];
}

export async function writeCommissionPayouts(
  payouts: CommissionPayout[],
): Promise<void> {
  const store = globalStore();
  store.payouts = payouts;
  store.localWriteAt = Date.now();

  if (hasBlobStore()) {
    await writeJsonBlob(BLOB_PATH, payouts);
    return;
  }

  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(payouts, null, 2), "utf8");
  } catch {
    // Local FS may be read-only
  }
}

export async function upsertCommissionPayout(
  input: Omit<CommissionPayout, "id" | "collectedAt" | "status"> & {
    id?: string;
  },
): Promise<CommissionPayout> {
  const payouts = await readCommissionPayouts();
  const existingIndex = payouts.findIndex(
    (p) => p.periodKey === input.periodKey,
  );

  const entry: CommissionPayout = {
    id:
      input.id ||
      payouts[existingIndex]?.id ||
      `cp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    periodKey: input.periodKey,
    periodType: input.periodType,
    label: input.label,
    incomeAmount: input.incomeAmount,
    commissionAmount: input.commissionAmount,
    status: "collected",
    proofUrl: input.proofUrl,
    note: input.note,
    collectedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) payouts[existingIndex] = entry;
  else payouts.unshift(entry);

  await writeCommissionPayouts(payouts);
  return entry;
}

export async function removeCommissionPayout(
  periodKey: string,
): Promise<boolean> {
  const payouts = await readCommissionPayouts();
  const next = payouts.filter((p) => p.periodKey !== periodKey);
  if (next.length === payouts.length) return false;
  await writeCommissionPayouts(next);
  return true;
}
