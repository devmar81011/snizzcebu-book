import { promises as fs } from "fs";
import path from "path";

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
const DEFAULTS: AppSettings = {
  qrImageUrl: "/payments/sample-qr.svg",
  adminPhone: "09568853596",
  adminWhatsApp: "09173201157",
  reminderDaysBefore: 1,
  pendingAlertHours: 4,
  morningDigest: true,
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

export async function readSettings(): Promise<AppSettings> {
  const store = globalStore();

  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    store.settings = normalizeSettings(parsed);
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
  const next = normalizeSettings(settings);
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
