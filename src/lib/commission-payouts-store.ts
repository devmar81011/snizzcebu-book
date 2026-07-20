import { promises as fs } from "fs";
import path from "path";
import type { CommissionPayout } from "@/lib/commission";
import { hasBlobStore, readJsonBlob, writeJsonBlob } from "@/lib/blob-json";
import { getSupabase, hasSupabaseStore } from "@/lib/supabase";

export type { CommissionPayout, CommissionPayoutStatus } from "@/lib/commission";
export {
  weekPeriodKey,
  monthPeriodKey,
  allTimePeriodKey,
} from "@/lib/commission";

const DATA_PATH = path.join(process.cwd(), "data", "commission-payouts.json");
const BLOB_PATH = "data/commission-payouts.json";
const LOCAL_WRITE_GRACE_MS = 60_000;

type GlobalStore = {
  payouts?: CommissionPayout[];
  localWriteAt?: number;
};

type PayoutRow = {
  id: string;
  period_key: string;
  period_type: string;
  label: string;
  income_amount: number | string;
  commission_amount: number | string;
  status: string;
  proof_url: string;
  note: string;
  collected_at: string;
};

function globalStore(): GlobalStore {
  const g = globalThis as typeof globalThis & {
    __snizzzCommissionPayouts?: GlobalStore;
  };
  if (!g.__snizzzCommissionPayouts) g.__snizzzCommissionPayouts = {};
  return g.__snizzzCommissionPayouts;
}

function rowToPayout(row: PayoutRow): CommissionPayout {
  return {
    id: row.id,
    periodKey: row.period_key,
    periodType: row.period_type as CommissionPayout["periodType"],
    label: row.label || "",
    incomeAmount: Number(row.income_amount) || 0,
    commissionAmount: Number(row.commission_amount) || 0,
    status: "collected",
    proofUrl: row.proof_url || "",
    note: row.note || "",
    collectedAt: row.collected_at,
  };
}

function payoutToRow(payout: CommissionPayout): PayoutRow {
  return {
    id: payout.id,
    period_key: payout.periodKey,
    period_type: payout.periodType,
    label: payout.label,
    income_amount: payout.incomeAmount,
    commission_amount: payout.commissionAmount,
    status: payout.status,
    proof_url: payout.proofUrl,
    note: payout.note || "",
    collected_at: payout.collectedAt,
  };
}

async function readPayoutsFromSupabase(): Promise<CommissionPayout[]> {
  const { data, error } = await getSupabase()
    .from("commission_payouts")
    .select("*")
    .order("collected_at", { ascending: false });
  if (error) {
    throw new Error(`commission_payouts read failed: ${error.message}`);
  }
  return (data || []).map((row) => rowToPayout(row as PayoutRow));
}

async function writePayoutsToSupabase(
  payouts: CommissionPayout[],
): Promise<void> {
  const supabase = getSupabase();
  const rows = payouts.map(payoutToRow);
  const ids = rows.map((r) => r.id);

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("commission_payouts")
      .upsert(rows, { onConflict: "id" });
    if (upsertError) {
      throw new Error(
        `commission_payouts write failed: ${upsertError.message}`,
      );
    }
  }

  const { data: existing, error: listError } = await supabase
    .from("commission_payouts")
    .select("id");
  if (listError) {
    throw new Error(`commission_payouts list failed: ${listError.message}`);
  }

  const stale = (existing || [])
    .map((r) => r.id as string)
    .filter((id) => !ids.includes(id));
  if (stale.length > 0) {
    const { error: deleteError } = await supabase
      .from("commission_payouts")
      .delete()
      .in("id", stale);
    if (deleteError) {
      throw new Error(
        `commission_payouts cleanup failed: ${deleteError.message}`,
      );
    }
  }
}

export async function readCommissionPayouts(): Promise<CommissionPayout[]> {
  const store = globalStore();

  if (
    store.payouts &&
    store.localWriteAt &&
    Date.now() - store.localWriteAt < LOCAL_WRITE_GRACE_MS
  ) {
    return structuredClone(store.payouts);
  }

  if (hasSupabaseStore()) {
    const fromSb = await readPayoutsFromSupabase();
    store.payouts = fromSb;
    return structuredClone(fromSb);
  }

  if (hasBlobStore()) {
    const fromBlob = await readJsonBlob<CommissionPayout[]>(BLOB_PATH);
    if (Array.isArray(fromBlob)) {
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

  if (hasSupabaseStore()) {
    await writePayoutsToSupabase(payouts);
    return;
  }

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
