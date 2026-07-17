import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readSettings, writeSettings } from "@/lib/settings-store";
import { validateCustomerPhone } from "@/lib/bookings";
import { uploadPublicImage } from "@/lib/upload";

function parseReminderDays(value: FormDataEntryValue | null | undefined, fallback: number) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(30, Math.max(0, Math.round(n)));
}

function parsePendingHours(value: FormDataEntryValue | null | undefined, fallback: number) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(72, Math.max(1, Math.round(n)));
}

function parseBool(value: FormDataEntryValue | null | undefined, fallback: boolean) {
  if (value === null || value === undefined || value === "") return fallback;
  const raw = String(value).toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes" || raw === "on") return true;
  if (raw === "0" || raw === "false" || raw === "no" || raw === "off") return false;
  return fallback;
}

export async function GET() {
  const settings = await readSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";
  const current = await readSettings();

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const adminPhone = String(form.get("adminPhone") ?? current.adminPhone);
    const adminWhatsApp = String(
      form.get("adminWhatsApp") ?? current.adminWhatsApp ?? adminPhone,
    );
    const reminderDaysBefore = parseReminderDays(
      form.get("reminderDaysBefore"),
      current.reminderDaysBefore,
    );
    const pendingAlertHours = parsePendingHours(
      form.get("pendingAlertHours"),
      current.pendingAlertHours,
    );
    const morningDigest = parseBool(
      form.get("morningDigest"),
      current.morningDigest,
    );
    const clearQr = String(form.get("clearQr") || "") === "1";
    const file = form.get("qr");

    const phoneError = validateCustomerPhone(adminPhone);
    if (phoneError) {
      return NextResponse.json({ error: phoneError }, { status: 400 });
    }
    const waError = validateCustomerPhone(adminWhatsApp);
    if (waError) {
      return NextResponse.json(
        { error: `WhatsApp number: ${waError}` },
        { status: 400 },
      );
    }

    let qrImageUrl = current.qrImageUrl;
    if (clearQr) {
      qrImageUrl = "";
    }
    if (file && file instanceof File && file.size > 0) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "QR must be an image file" },
          { status: 400 },
        );
      }
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "QR image must be under 5MB" },
          { status: 400 },
        );
      }

      try {
        qrImageUrl = await uploadPublicImage(file, {
          folder: "payments",
          prefix: "qr",
          fallbackExt: "png",
        });
      } catch {
        return NextResponse.json(
          {
            error:
              "Could not save QR image. Configure BLOB_READ_WRITE_TOKEN on Vercel, or try again.",
          },
          { status: 500 },
        );
      }
    }

    const settings = await writeSettings({
      qrImageUrl,
      adminPhone: adminPhone.trim(),
      adminWhatsApp: adminWhatsApp.trim(),
      reminderDaysBefore,
      pendingAlertHours,
      morningDigest,
    });
    return NextResponse.json({ settings });
  }

  const body = (await request.json().catch(() => null)) as {
    qrImageUrl?: string;
    adminPhone?: string;
    adminWhatsApp?: string;
    clearQr?: boolean;
    reminderDaysBefore?: number;
    pendingAlertHours?: number;
    morningDigest?: boolean;
  } | null;

  const adminPhone = body?.adminPhone?.trim() || current.adminPhone;
  const phoneError = validateCustomerPhone(adminPhone);
  if (phoneError) {
    return NextResponse.json({ error: phoneError }, { status: 400 });
  }
  const adminWhatsApp =
    body?.adminWhatsApp?.trim() || current.adminWhatsApp || adminPhone;
  const waError = validateCustomerPhone(adminWhatsApp);
  if (waError) {
    return NextResponse.json(
      { error: `WhatsApp number: ${waError}` },
      { status: 400 },
    );
  }

  const settings = await writeSettings({
    qrImageUrl: body?.clearQr
      ? ""
      : body?.qrImageUrl !== undefined
        ? body.qrImageUrl
        : current.qrImageUrl,
    adminPhone,
    adminWhatsApp,
    reminderDaysBefore:
      body?.reminderDaysBefore !== undefined
        ? parseReminderDays(String(body.reminderDaysBefore), current.reminderDaysBefore)
        : current.reminderDaysBefore,
    pendingAlertHours:
      body?.pendingAlertHours !== undefined
        ? parsePendingHours(String(body.pendingAlertHours), current.pendingAlertHours)
        : current.pendingAlertHours,
    morningDigest:
      body?.morningDigest !== undefined
        ? Boolean(body.morningDigest)
        : current.morningDigest,
  });
  return NextResponse.json({ settings });
}
