import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  allTimePeriodKey,
  monthPeriodKey,
  readCommissionPayouts,
  removeCommissionPayout,
  upsertCommissionPayout,
  weekPeriodKey,
} from "@/lib/commission-payouts-store";
import { isSuperadminAuthenticated } from "@/lib/superadmin-auth";
import { uploadPublicImage } from "@/lib/upload";

export async function GET() {
  if (!(await isSuperadminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payouts = await readCommissionPayouts();
  return NextResponse.json({ payouts });
}

export async function POST(request: Request) {
  if (!(await isSuperadminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Send as multipart form data" },
      { status: 400 },
    );
  }

  const form = await request.formData();
  const periodType = String(form.get("periodType") || "");
  const label = String(form.get("label") || "").trim();
  const note = String(form.get("note") || "").trim().slice(0, 200);
  const incomeAmount = Number(form.get("incomeAmount") || "0");
  const commissionAmount = Number(form.get("commissionAmount") || "0");
  const proof = form.get("proof");

  if (
    periodType !== "week" &&
    periodType !== "month" &&
    periodType !== "alltime"
  ) {
    return NextResponse.json({ error: "Invalid period type" }, { status: 400 });
  }
  if (!label) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }
  if (!Number.isFinite(incomeAmount) || incomeAmount < 0) {
    return NextResponse.json({ error: "Invalid income amount" }, { status: 400 });
  }
  if (!Number.isFinite(commissionAmount) || commissionAmount < 0) {
    return NextResponse.json(
      { error: "Invalid commission amount" },
      { status: 400 },
    );
  }
  if (!(proof instanceof File) || proof.size <= 0) {
    return NextResponse.json(
      { error: "Payment screenshot is required for tracking" },
      { status: 400 },
    );
  }
  if (!proof.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Proof must be an image" },
      { status: 400 },
    );
  }
  if (proof.size > 8 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Proof must be under 8MB" },
      { status: 400 },
    );
  }

  let periodKey = "";
  if (periodType === "week") {
    const from = String(form.get("from") || "");
    const to = String(form.get("to") || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json({ error: "Invalid week range" }, { status: 400 });
    }
    periodKey = weekPeriodKey(from, to);
  } else if (periodType === "month") {
    const yearMonth = String(form.get("yearMonth") || "");
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }
    periodKey = monthPeriodKey(yearMonth);
  } else {
    periodKey = allTimePeriodKey();
  }

  let proofUrl: string;
  try {
    proofUrl = await uploadPublicImage(proof, {
      folder: "uploads/commission-proofs",
      prefix: `commission-${periodType}`,
      fallbackExt: "jpg",
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not save screenshot. Configure BLOB_READ_WRITE_TOKEN on Vercel.",
      },
      { status: 500 },
    );
  }

  const payout = await upsertCommissionPayout({
    periodKey,
    periodType,
    label,
    incomeAmount,
    commissionAmount,
    proofUrl,
    note,
  });

  const payouts = await readCommissionPayouts();
  revalidatePath("/superadmin/payments");
  return NextResponse.json({ payout, payouts }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!(await isSuperadminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const periodKey = searchParams.get("periodKey");
  if (!periodKey) {
    return NextResponse.json({ error: "periodKey is required" }, { status: 400 });
  }

  const ok = await removeCommissionPayout(periodKey);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payouts = await readCommissionPayouts();
  revalidatePath("/superadmin/payments");
  return NextResponse.json({ ok: true, payouts });
}
