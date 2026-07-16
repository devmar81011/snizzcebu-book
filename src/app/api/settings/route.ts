import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readSettings, writeSettings } from "@/lib/settings-store";
import { validateCustomerPhone } from "@/lib/bookings";
import { promises as fs } from "fs";
import path from "path";

function parseReminderDays(value: FormDataEntryValue | null | undefined, fallback: number) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(30, Math.max(0, Math.round(n)));
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
    const reminderDaysBefore = parseReminderDays(
      form.get("reminderDaysBefore"),
      current.reminderDaysBefore,
    );
    const clearQr = String(form.get("clearQr") || "") === "1";
    const file = form.get("qr");

    const phoneError = validateCustomerPhone(adminPhone);
    if (phoneError) {
      return NextResponse.json({ error: phoneError }, { status: 400 });
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

      const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
      const filename = `qr-${Date.now()}.${ext}`;
      const dir = path.join(process.cwd(), "public", "payments");
      await fs.mkdir(dir, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(path.join(dir, filename), buffer);
      qrImageUrl = `/payments/${filename}`;
    }

    const settings = await writeSettings({
      qrImageUrl,
      adminPhone: adminPhone.trim(),
      reminderDaysBefore,
    });
    return NextResponse.json({ settings });
  }

  const body = (await request.json().catch(() => null)) as {
    qrImageUrl?: string;
    adminPhone?: string;
    clearQr?: boolean;
    reminderDaysBefore?: number;
  } | null;

  const adminPhone = body?.adminPhone?.trim() || current.adminPhone;
  const phoneError = validateCustomerPhone(adminPhone);
  if (phoneError) {
    return NextResponse.json({ error: phoneError }, { status: 400 });
  }

  const settings = await writeSettings({
    qrImageUrl: body?.clearQr
      ? ""
      : body?.qrImageUrl !== undefined
        ? body.qrImageUrl
        : current.qrImageUrl,
    adminPhone,
    reminderDaysBefore:
      body?.reminderDaysBefore !== undefined
        ? parseReminderDays(String(body.reminderDaysBefore), current.reminderDaysBefore)
        : current.reminderDaysBefore,
  });
  return NextResponse.json({ settings });
}
