import { createHmac, timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { hasBlobStore, readJsonBlob, writeJsonBlob } from "@/lib/blob-json";
import { getSupabase, hasSupabaseStore } from "@/lib/supabase";

const DATA_PATH = path.join(process.cwd(), "data", "admin-credentials.json");
const BLOB_PATH = "data/admin-credentials.json";

type Credentials = {
  passwordHash: string;
};

type GlobalStore = { credentials?: Credentials };

function globalStore(): GlobalStore {
  const g = globalThis as typeof globalThis & {
    __snizzzCredentials?: GlobalStore;
  };
  if (!g.__snizzzCredentials) g.__snizzzCredentials = {};
  return g.__snizzzCredentials;
}

function hashWithPepper(password: string): string {
  const pepper = process.env.ADMIN_SECRET || "snizzz-admin-pepper";
  return createHmac("sha256", pepper).update(password).digest("hex");
}

export function defaultPassword(): string {
  return process.env.ADMIN_PASSWORD || "snizzz-admin";
}

export function hashPassword(password: string): string {
  return hashWithPepper(password);
}

function safeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

async function readCredentialsFromSupabase(): Promise<Credentials | null> {
  const { data, error } = await getSupabase()
    .from("admin_credentials")
    .select("password_hash")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`admin_credentials read failed: ${error.message}`);
  if (!data?.password_hash) return null;
  return { passwordHash: data.password_hash as string };
}

async function writeCredentialsToSupabase(
  credentials: Credentials,
): Promise<void> {
  const { error } = await getSupabase()
    .from("admin_credentials")
    .upsert(
      {
        id: 1,
        password_hash: credentials.passwordHash,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  if (error) {
    throw new Error(`admin_credentials write failed: ${error.message}`);
  }
}

async function readCredentialsFile(): Promise<Credentials | null> {
  const store = globalStore();

  if (hasSupabaseStore()) {
    const fromSb = await readCredentialsFromSupabase();
    if (fromSb?.passwordHash) {
      store.credentials = fromSb;
      return { ...fromSb };
    }
    if (store.credentials) return { ...store.credentials };
    return null;
  }

  if (hasBlobStore()) {
    const fromBlob = await readJsonBlob<Partial<Credentials>>(BLOB_PATH);
    if (fromBlob?.passwordHash) {
      store.credentials = { passwordHash: fromBlob.passwordHash };
      return { ...store.credentials };
    }
    if (store.credentials) return { ...store.credentials };
    return null;
  }

  if (store.credentials) return { ...store.credentials };

  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<Credentials>;
    if (parsed.passwordHash) {
      store.credentials = { passwordHash: parsed.passwordHash };
      return { ...store.credentials };
    }
  } catch {
    // no custom password yet
  }
  return null;
}

export async function getPasswordHash(): Promise<string> {
  const stored = await readCredentialsFile();
  if (stored?.passwordHash) return stored.passwordHash;
  return hashPassword(defaultPassword());
}

export async function verifyPassword(password: string): Promise<boolean> {
  const expected = await getPasswordHash();
  return safeEqual(hashPassword(password), expected);
}

export async function setPassword(newPassword: string): Promise<void> {
  const credentials: Credentials = {
    passwordHash: hashPassword(newPassword),
  };
  const store = globalStore();
  store.credentials = credentials;

  if (hasSupabaseStore()) {
    await writeCredentialsToSupabase(credentials);
    return;
  }

  if (hasBlobStore()) {
    await writeJsonBlob(BLOB_PATH, credentials);
    return;
  }

  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(credentials, null, 2), "utf8");
  } catch {
    // Local FS may be read-only
  }
}
