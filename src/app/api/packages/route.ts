import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  ensureRatesLength,
  linesToList,
  slugifyTitle,
  type TourPackage,
} from "@/lib/destinations";
import { readPackages, upsertPackage } from "@/lib/packages-store";

function parsePackageBody(
  body: Partial<{
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
  }>,
  id: string,
): TourPackage | { error: string } {
  if (!body.title?.trim()) return { error: "Package title is required" };

  const minPax = Number(body.minPax) || 2;
  const maxPax = Number(body.maxPax) || 10;
  if (minPax < 1 || maxPax < minPax) {
    return { error: "Invalid min/max pax range" };
  }

  const slotsAvailable = Number(body.slotsAvailable ?? 10);
  const days = Number(body.days);
  const nights = Number(body.nights);
  if (!Number.isFinite(slotsAvailable) || slotsAvailable < 1) {
    return { error: "Slots available must be at least 1" };
  }
  if (!Number.isFinite(days) || days < 1) {
    return { error: "Days must be at least 1" };
  }
  if (!Number.isFinite(nights) || nights < 0) {
    return { error: "Nights cannot be negative" };
  }

  const toList = (value: string | string[] | undefined) =>
    Array.isArray(value)
      ? value.map((v) => v.trim()).filter(Boolean)
      : linesToList(value || "");

  return {
    id,
    title: body.title.trim(),
    minPax,
    maxPax,
    slotsAvailable,
    days,
    nights,
    destinations: toList(body.destinations),
    accommodation: toList(body.accommodation),
    inclusions: toList(body.inclusions),
    inclusionsNote: (body.inclusionsNote || "").trim(),
    exclusions: toList(body.exclusions),
    exclusionsNote: (body.exclusionsNote || "").trim(),
    ratesPerPax: ensureRatesLength(body.ratesPerPax || [], minPax, maxPax),
  };
}

export async function GET() {
  const packages = await readPackages();
  return NextResponse.json({ packages });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Parameters<
    typeof parsePackageBody
  >[0] | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const idBase = slugifyTitle(body.title || "") || `package-${Date.now()}`;
  const existing = await readPackages();
  let id = idBase;
  let n = 2;
  while (existing.some((p) => p.id === id)) {
    id = `${idBase}-${n}`;
    n += 1;
  }

  const pkg = parsePackageBody(body, id);
  if ("error" in pkg) {
    return NextResponse.json({ error: pkg.error }, { status: 400 });
  }

  const packages = await upsertPackage(pkg);
  return NextResponse.json({ package: pkg, packages }, { status: 201 });
}
