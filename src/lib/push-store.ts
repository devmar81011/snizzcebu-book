import { promises as fs } from "fs";
import path from "path";
import { hasBlobStore, readJsonBlob, writeJsonBlob } from "@/lib/blob-json";

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

type GlobalStore = { subscriptions?: PushSubscriptionJSON[] };

function globalStore(): GlobalStore {
  const g = globalThis as typeof globalThis & {
    __snizzzPushSubs?: GlobalStore;
  };
  if (!g.__snizzzPushSubs) g.__snizzzPushSubs = {};
  return g.__snizzzPushSubs;
}

export async function readPushSubscriptions(): Promise<PushSubscriptionJSON[]> {
  const store = globalStore();

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
    // Local FS may be read-only (e.g. Vercel without Blob).
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
