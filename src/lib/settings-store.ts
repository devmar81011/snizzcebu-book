import { promises as fs } from "fs";
import path from "path";
import { hasBlobStore, readJsonBlob, writeJsonBlob } from "@/lib/blob-json";
import { getSupabase, hasSupabaseStore } from "@/lib/supabase";

export type AppSettings = {
  qrImageUrl: string;
  adminPhone: string;
  /** WhatsApp number guests/admins use for booking handoff */
  adminWhatsApp: string;
  /** Days before tour date to send a reminder push */
  reminderDaysBefore: number;
  /** Hours a pending booking can wait before it is flagged */
  pendingAlertHours: number;
  /** Also push a morning digest of today's tours */
  morningDigest: boolean;
};

const DATA_PATH = path.join(process.cwd(), "data", "settings.json");
const BLOB_PATH = "data/settings.json";
const SETTINGS_KEY = "app";
const LOCAL_WRITE_GRACE_MS = 60_000;

export const DEFAULT_SETTINGS: AppSettings = {
  qrImageUrl: "/payments/sample-qr.svg",
  adminPhone: "09568853596",
  adminWhatsApp: "09173201157",
  reminderDaysBefore: 1,
  pendingAlertHours: 4,
  morningDigest: true,
};

const DEFAULTS = DEFAULT_SETTINGS;

type GlobalStore = { settings?: AppSettings; localWriteAt?: number };

function globalStore(): GlobalStore {
  const g = globalThis as typeof globalThis & {
    __snizzzSettings?: GlobalStore;
  };
  if (!g.__snizzzSettings) g.__snizzzSettings = {};
  return g.__snizzzSettings;
}

function normalizeReminderDays(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULTS.reminderDaysBefore;
  return Math.min(30, Math.max(0, Math.round(n)));
}

function normalizePendingHours(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULTS.pendingAlertHours;
  return Math.min(72, Math.max(1, Math.round(n)));
}

function normalizeSettings(parsed: Partial<AppSettings>): AppSettings {
  return {
    qrImageUrl: parsed.qrImageUrl ?? DEFAULTS.qrImageUrl,
    adminPhone: parsed.adminPhone || DEFAULTS.adminPhone,
    adminWhatsApp:
      parsed.adminWhatsApp || parsed.adminPhone || DEFAULTS.adminWhatsApp,
    reminderDaysBefore: normalizeReminderDays(parsed.reminderDaysBefore),
    pendingAlertHours: normalizePendingHours(parsed.pendingAlertHours),
    morningDigest:
      typeof parsed.morningDigest === "boolean"
        ? parsed.morningDigest
        : DEFAULTS.morningDigest,
  };
}

async function readSettingsFromDisk(): Promise<AppSettings | null> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return normalizeSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return null;
  }
}

async function readSettingsFromSupabase(): Promise<AppSettings | null> {
  const { data, error } = await getSupabase()
    .from("app_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  if (error) throw new Error(`settings read failed: ${error.message}`);
  if (!data?.value) return null;
  return normalizeSettings(data.value as Partial<AppSettings>);
}

async function writeSettingsToSupabase(settings: AppSettings): Promise<void> {
  const { error } = await getSupabase()
    .from("app_settings")
    .upsert(
      {
        key: SETTINGS_KEY,
        value: settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );
  if (error) throw new Error(`settings write failed: ${error.message}`);
}

export async function readSettings(): Promise<AppSettings> {
  const store = globalStore();

  if (
    store.settings &&
    store.localWriteAt &&
    Date.now() - store.localWriteAt < LOCAL_WRITE_GRACE_MS
  ) {
    return { ...store.settings };
  }

  if (hasSupabaseStore()) {
    const fromSb = await readSettingsFromSupabase();
    if (fromSb) {
      store.settings = fromSb;
      return { ...fromSb };
    }
    if (store.settings) return { ...store.settings };
    store.settings = { ...DEFAULTS };
    return { ...DEFAULTS };
  }

  if (hasBlobStore()) {
    const fromBlob = await readJsonBlob<Partial<AppSettings>>(BLOB_PATH);
    if (fromBlob) {
      store.settings = normalizeSettings(fromBlob);
      return { ...store.settings };
    }
    if (store.settings) return { ...store.settings };
    store.settings = { ...DEFAULTS };
    return { ...DEFAULTS };
  }

  if (store.settings) return { ...store.settings };

  const fromDisk = await readSettingsFromDisk();
  if (fromDisk) {
    store.settings = fromDisk;
    return { ...fromDisk };
  }

  store.settings = { ...DEFAULTS };
  return { ...DEFAULTS };
}

export async function writeSettings(
  settings: AppSettings,
): Promise<AppSettings> {
  const store = globalStore();
  const next = normalizeSettings(settings);
  store.settings = next;
  store.localWriteAt = Date.now();

  if (hasSupabaseStore()) {
    await writeSettingsToSupabase(next);
    return next;
  }

  if (hasBlobStore()) {
    await writeJsonBlob(BLOB_PATH, next);
    return next;
  }

  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(next, null, 2), "utf8");
  } catch {
    // Local FS may be read-only
  }
  return next;
}

/** @deprecated use AppSettings */
export type PaymentSettings = AppSettings;
