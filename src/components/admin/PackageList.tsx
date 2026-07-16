"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TourPackage } from "@/lib/destinations";
import { formatPhp } from "@/lib/destinations";

export function PackageList({ packages }: { packages: TourPackage[] }) {
  const router = useRouter();

  async function onDelete(id: string, title: string) {
    if (!window.confirm(`Delete “${title}”?`)) return;
    const response = await fetch(`/api/packages/${id}`, { method: "DELETE" });
    if (!response.ok) {
      window.alert("Could not delete package");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-syne)] text-3xl font-bold">
            Packages
          </h1>
          <p className="mt-1 text-sm text-white/55">
            Titles, pax limits, pricing, destinations, and inclusions.
          </p>
        </div>
        <Link
          href="/admin/packages/new"
          className="rounded-xl bg-sun px-4 py-2 text-sm font-bold text-ink transition hover:brightness-105"
        >
          Add package
        </Link>
      </div>

      {packages.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/20 px-5 py-10 text-center text-white/55">
          No packages yet. Create your first package.
        </p>
      ) : (
        <ul className="space-y-3">
          {packages.map((pkg) => {
            const sampleRate = pkg.ratesPerPax[0] ?? 0;
            return (
              <li
                key={pkg.id}
                className="rounded-2xl border border-white/12 bg-white/[0.03] px-4 py-4 sm:px-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-[family-name:var(--font-syne)] text-lg font-bold">
                      {pkg.title}
                    </h2>
                    <p className="mt-1 text-sm text-white/55">
                      {pkg.minPax}–{pkg.maxPax} pax ·{" "}
                      {pkg.days} day{pkg.days === 1 ? "" : "s"}
                      {pkg.nights > 0
                        ? ` / ${pkg.nights} night${pkg.nights === 1 ? "" : "s"}`
                        : ""}
                      · {pkg.days}D/{pkg.nights}N · from {formatPhp(sampleRate)}
                      /person
                    </p>
                    {pkg.destinations.length > 0 ? (
                      <p className="mt-2 line-clamp-2 text-sm text-white/70">
                        {pkg.destinations.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/packages/${pkg.id}`}
                      className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-semibold transition hover:border-sun/50 hover:text-sun"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(pkg.id, pkg.title)}
                      className="rounded-lg border border-red-400/30 px-3 py-1.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/15"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
