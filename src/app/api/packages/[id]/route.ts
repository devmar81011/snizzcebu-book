import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  ensureRatesLength,
  linesToList,
  type TourPackage,
} from "@/lib/destinations";
import {
  deletePackage,
  getPackageById,
  upsertPackage,
} from "@/lib/packages-store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Ctx) {
  const { id } = await context.params;
  const pkg = await getPackageById(id);
  if (!pkg) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ package: pkg });
}

export async function PUT(request: Request, context: Ctx) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getPackageById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as Partial<{
    title: string;
    minPax: number;
    maxPax: number;
    slotsAvailable: number;
    days: number;
    nights: number;
    destinations: string | string[];
    accommodation: string | string[];
    inclusions: string | string[];
    inclusionsNote: string;
    exclusions: string | string[];
    exclusionsNote: string;
    ratesPerPax: number[];
  }> | null;

  if (!body?.title?.trim()) {
    return NextResponse.json({ error: "Package title is required" }, { status: 400 });
  }

  const minPax = Number(body.minPax) || existing.minPax;
  const maxPax = Number(body.maxPax) || existing.maxPax;
  if (minPax < 1 || maxPax < minPax) {
    return NextResponse.json(
      { error: "Invalid min/max pax range" },
      { status: 400 },
    );
  }

  const slotsAvailable = Number(
    body.slotsAvailable ?? existing.slotsAvailable ?? 10,
  );
  const days = Number(body.days ?? existing.days ?? 1);
  const nights = Number(body.nights ?? existing.nights ?? 0);
  if (!Number.isFinite(slotsAvailable) || slotsAvailable < 1) {
    return NextResponse.json(
      { error: "Slots available must be at least 1" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(days) || days < 1) {
    return NextResponse.json({ error: "Days must be at least 1" }, { status: 400 });
  }
  if (!Number.isFinite(nights) || nights < 0) {
    return NextResponse.json(
      { error: "Nights cannot be negative" },
      { status: 400 },
    );
  }

  const toList = (value: string | string[] | undefined, fallback: string[]) => {
    if (value === undefined) return fallback;
    return Array.isArray(value)
      ? value.map((v) => v.trim()).filter(Boolean)
      : linesToList(value);
  };

  const pkg: TourPackage = {
    id,
    title: body.title.trim(),
    minPax,
    maxPax,
    slotsAvailable,
    days,
    nights,
    destinations: toList(body.destinations, existing.destinations),
    accommodation: toList(body.accommodation, existing.accommodation || []),
    inclusions: toList(body.inclusions, existing.inclusions),
    inclusionsNote:
      body.inclusionsNote !== undefined
        ? body.inclusionsNote.trim()
        : existing.inclusionsNote,
    exclusions: toList(body.exclusions, existing.exclusions),
    exclusionsNote:
      body.exclusionsNote !== undefined
        ? body.exclusionsNote.trim()
        : existing.exclusionsNote,
    ratesPerPax: ensureRatesLength(
      body.ratesPerPax || existing.ratesPerPax,
      minPax,
      maxPax,
    ),
  };

  const packages = await upsertPackage(pkg);
  revalidatePath("/admin/packages");
  revalidatePath(`/admin/packages/${id}`);
  revalidatePath("/");
  return NextResponse.json({ package: pkg, packages });
}

export async function DELETE(_request: Request, context: Ctx) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getPackageById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const packages = await deletePackage(id);
  revalidatePath("/admin/packages");
  revalidatePath(`/admin/packages/${id}`);
  revalidatePath("/");
  return NextResponse.json({ ok: true, packages });
}
