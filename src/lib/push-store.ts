import { promises as fs } from "fs";
import path from "path";
import { hasBlobStore, readJsonBlob, writeJsonBlob } from "@/lib/blob-json";
import { getSupabase, hasSupabaseStore } from "@/lib/supabase";

export type PushSubscriptionJSON = {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
  expirationTime?: number | null;
};

const DATA_PATH = path.join(process.cwd(), "data", "push-subscriptions.json");
const BLOB_PATH = "data/push-subscriptions.json";
const LOCAL_WRITE_GRACE_MS = 60_000;

type GlobalStore = {
  subscriptions?: PushSubscriptionJSON[];
  localWriteAt?: number;
};

type PushRow = {
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
  expiration_time: number | null;
};

function globalStore(): GlobalStore {
  const g = globalThis as typeof globalThis & {
    __snizzzPushSubs?: GlobalStore;
  };
  if (!g.__snizzzPushSubs) g.__snizzzPushSubs = {};
  return g.__snizzzPushSubs;
}

function rowToSub(row: PushRow): PushSubscriptionJSON {
  return {
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh || undefined,
      auth: row.auth || undefined,
    },
    expirationTime: row.expiration_time,
  };
}

function subToRow(sub: PushSubscriptionJSON): PushRow {
  return {
    endpoint: sub.endpoint,
    p256dh: sub.keys?.p256dh || null,
    auth: sub.keys?.auth || null,
    expiration_time:
      typeof sub.expirationTime === "number" ? sub.expirationTime : null,
  };
}

async function readPushFromSupabase(): Promise<PushSubscriptionJSON[]> {
  const { data, error } = await getSupabase()
    .from("push_subscriptions")
    .select("*");
  if (error) throw new Error(`push_subscriptions read failed: ${error.message}`);
  return (data || []).map((row) => rowToSub(row as PushRow));
}

async function writePushToSupabase(
  subscriptions: PushSubscriptionJSON[],
): Promise<void> {
  const supabase = getSupabase();
  const rows = subscriptions.map(subToRow);
  const endpoints = rows.map((r) => r.endpoint);

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("push_subscriptions")
      .upsert(rows, { onConflict: "endpoint" });
    if (upsertError) {
      throw new Error(`push_subscriptions write failed: ${upsertError.message}`);
    }
  }

  const { data: existing, error: listError } = await supabase
    .from("push_subscriptions")
    .select("endpoint");
  if (listError) {
    throw new Error(`push_subscriptions list failed: ${listError.message}`);
  }

  const stale = (existing || [])
    .map((r) => r.endpoint as string)
    .filter((endpoint) => !endpoints.includes(endpoint));
  if (stale.length > 0) {
    const { error: deleteError } = await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", stale);
    if (deleteError) {
      throw new Error(
        `push_subscriptions cleanup failed: ${deleteError.message}`,
      );
    }
  }
}

export async function readPushSubscriptions(): Promise<PushSubscriptionJSON[]> {
  const store = globalStore();

  if (
    store.subscriptions &&
    store.localWriteAt &&
    Date.now() - store.localWriteAt < LOCAL_WRITE_GRACE_MS
  ) {
    return structuredClone(store.subscriptions);
  }

  if (hasSupabaseStore()) {
    const fromSb = await readPushFromSupabase();
    store.subscriptions = fromSb;
    return structuredClone(fromSb);
  }

  if (hasBlobStore()) {
    const fromBlob = await readJsonBlob<PushSubscriptionJSON[]>(BLOB_PATH);
    if (Array.isArray(fromBlob)) {
      store.subscriptions = fromBlob;
      return structuredClone(fromBlob);
    }
    if (store.subscriptions) return structuredClone(store.subscriptions);
    return [];
  }

  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as PushSubscriptionJSON[];
    if (Array.isArray(parsed)) {
      store.subscriptions = parsed;
      return structuredClone(parsed);
    }
  } catch {
    // fall through
  }
  if (store.subscriptions) return structuredClone(store.subscriptions);
  return [];
}

export async function writePushSubscriptions(
  subscriptions: PushSubscriptionJSON[],
): Promise<void> {
  const store = globalStore();
  store.subscriptions = subscriptions;
  store.localWriteAt = Date.now();

  if (hasSupabaseStore()) {
    await writePushToSupabase(subscriptions);
    return;
  }

  if (hasBlobStore()) {
    await writeJsonBlob(BLOB_PATH, subscriptions);
    return;
  }

  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(
      DATA_PATH,
      JSON.stringify(subscriptions, null, 2),
      "utf8",
    );
  } catch {
    // Local FS may be read-only
  }
}

export async function upsertPushSubscription(
  subscription: PushSubscriptionJSON,
): Promise<PushSubscriptionJSON[]> {
  const list = await readPushSubscriptions();
  const next = list.filter((s) => s.endpoint !== subscription.endpoint);
  next.push(subscription);
  await writePushSubscriptions(next);
  return next;
}

export async function removePushSubscription(
  endpoint: string,
): Promise<PushSubscriptionJSON[]> {
  const list = await readPushSubscriptions();
  const next = list.filter((s) => s.endpoint !== endpoint);
  await writePushSubscriptions(next);
  return next;
}
