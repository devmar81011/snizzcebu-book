import { promises as fs } from "fs";
import path from "path";

export type AppSettings = {
  qrImageUrl: string;
  adminPhone: string;
  /** Days before tour date to send a reminder push */
  reminderDaysBefore: number;
};

const DATA_PATH = path.join(process.cwd(), "data", "settings.json");
const DEFAULTS: AppSettings = {
  qrImageUrl: "/payments/sample-qr.svg",
  adminPhone: "09568853596",
  reminderDaysBefore: 1,
};

type GlobalStore = { settings?: AppSettings };

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

export async function readSettings(): Promise<AppSettings> {
  const store = globalStore();

  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<AppSettings> & {
      paymentNote?: string;
    };
    store.settings = {
      qrImageUrl: parsed.qrImageUrl ?? DEFAULTS.qrImageUrl,
      adminPhone: parsed.adminPhone || DEFAULTS.adminPhone,
      reminderDaysBefore: normalizeReminderDays(parsed.reminderDaysBefore),
    };
    return { ...store.settings };
  } catch {
    if (store.settings) return { ...store.settings };
    store.settings = { ...DEFAULTS };
    return { ...DEFAULTS };
  }
}

export async function writeSettings(
  settings: AppSettings,
): Promise<AppSettings> {
  const store = globalStore();
  const next = {
    ...settings,
    reminderDaysBefore: normalizeReminderDays(settings.reminderDaysBefore),
  };
  store.settings = next;
  try {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(next, null, 2), "utf8");
  } catch {
    // Vercel read-only FS
  }
  return next;
}

/** @deprecated use AppSettings */
export type PaymentSettings = AppSettings;
