"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { TourPackage } from "@/lib/destinations";
import { formatPhp } from "@/lib/destinations";

export function PackageList({
  packages: initialPackages,
}: {
  packages: TourPackage[];
}) {
  const router = useRouter();
  const [packages, setPackages] = useState(initialPackages);
  const [baseline, setBaseline] = useState(initialPackages);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Sync when the server re-renders with fresher props (after router.refresh).
  if (initialPackages !== baseline) {
    setBaseline(initialPackages);
    setPackages(initialPackages);
  }

  async function onDelete(id: string, title: string) {
    if (!window.confirm(`Delete “${title}”?`)) return;
    setBusyId(id);
    try {
      const response = await fetch(`/api/packages/${id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(data.error || "Could not delete package");
        return;
      }
      if (Array.isArray(data.packages)) {
        setPackages(data.packages);
      } else {
        setPackages((prev) => prev.filter((pkg) => pkg.id !== id));
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
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
                      · from {formatPhp(sampleRate)}
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
                      disabled={busyId === pkg.id}
                      onClick={() => onDelete(pkg.id, pkg.title)}
                      className="rounded-lg border border-red-400/30 px-3 py-1.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/15 disabled:opacity-50"
                    >
                      {busyId === pkg.id ? "Deleting…" : "Delete"}
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
