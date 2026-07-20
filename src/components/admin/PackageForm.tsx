"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  ensureRatesLength,
  listToLines,
  linesToList,
  type TourPackage,
} from "@/lib/destinations";

type PackageFormProps = {
  mode: "create" | "edit";
  initial?: TourPackage;
};

type FormState = {
  title: string;
  minPax: string;
  maxPax: string;
  days: string;
  nights: string;
  destinations: string;
  accommodation: string;
  inclusions: string;
  inclusionsNote: string;
  exclusions: string;
  exclusionsNote: string;
  rates: string[];
};

function buildRateFields(
  minPax: number,
  maxPax: number,
  existing: number[] = [],
): string[] {
  const rates = ensureRatesLength(existing, minPax, maxPax);
  return rates.map((r) => String(r));
}

function formFromPackage(pkg?: TourPackage): FormState {
  return {
    title: pkg?.title || "",
    minPax: String(pkg?.minPax ?? 2),
    maxPax: String(pkg?.maxPax ?? 10),
    days: String(pkg?.days ?? 1),
    nights: String(pkg?.nights ?? 0),
    destinations: listToLines(pkg?.destinations || []),
    accommodation: listToLines(pkg?.accommodation || []),
    inclusions: listToLines(pkg?.inclusions || []),
    inclusionsNote: pkg?.inclusionsNote || "",
    exclusions: listToLines(pkg?.exclusions || []),
    exclusionsNote: pkg?.exclusionsNote || "",
    rates: buildRateFields(
      pkg?.minPax ?? 2,
      pkg?.maxPax ?? 10,
      pkg?.ratesPerPax || [],
    ),
  };
}

function withAdjustedRates(
  prev: FormState,
  nextMinPax: string,
  nextMaxPax: string,
): FormState {
  const nextMin = Math.max(1, Number(nextMinPax) || 1);
  const rawMax = Number(nextMaxPax);
  if (!Number.isFinite(rawMax) || rawMax < 1) {
    return { ...prev, minPax: nextMinPax, maxPax: nextMaxPax };
  }
  const nextMax = Math.max(nextMin, rawMax);
  const numeric = prev.rates.map((r) => {
    const n = Number(r);
    return Number.isFinite(n) ? n : 0;
  });
  return {
    ...prev,
    minPax: nextMinPax,
    maxPax: nextMaxPax,
    rates: buildRateFields(nextMin, nextMax, numeric),
  };
}

export function PackageForm({ mode, initial }: PackageFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(() => formFromPackage(initial));

  const minPax = Number(form.minPax) || 1;
  const maxPax = Number(form.maxPax) || minPax;

  const fieldClass =
    "mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-foam outline-none transition focus:border-sun/60";
  const labelClass =
    "block text-[0.68rem] font-semibold tracking-[0.14em] text-white/55 uppercase";

  const hint = useMemo(() => "One item per line", []);

  const paxLabels = useMemo(() => {
    const labels: number[] = [];
    for (let p = minPax; p <= maxPax; p += 1) labels.push(p);
    return labels;
  }, [minPax, maxPax]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      if (key === "minPax") {
        return withAdjustedRates(prev, value as string, prev.maxPax);
      }
      if (key === "maxPax") {
        return withAdjustedRates(prev, prev.minPax, value as string);
      }
      return { ...prev, [key]: value };
    });
  }

  function updateRate(index: number, value: string) {
    setForm((prev) => {
      const rates = [...prev.rates];
      rates[index] = value;
      return { ...prev, rates };
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);

    if (maxPax < minPax) {
      setError("Maximum pax must be greater than or equal to minimum pax");
      setSaving(false);
      return;
    }

    const ratesPerPax = form.rates.map((r) => Number(r));
    if (ratesPerPax.some((r) => !Number.isFinite(r) || r < 0)) {
      setError("Enter a valid price for each pax count");
      setSaving(false);
      return;
    }

    const payload = {
      title: form.title.trim(),
      minPax,
      maxPax,
      slotsAvailable: initial?.slotsAvailable ?? 10,
      days: Number(form.days),
      nights: Number(form.nights),
      destinations: linesToList(form.destinations),
      accommodation: linesToList(form.accommodation),
      inclusions: linesToList(form.inclusions),
      inclusionsNote: form.inclusionsNote.trim(),
      exclusions: linesToList(form.exclusions),
      exclusionsNote: form.exclusionsNote.trim(),
      ratesPerPax: ensureRatesLength(ratesPerPax, minPax, maxPax),
    };

    try {
      const response = await fetch(
        mode === "create" ? "/api/packages" : `/api/packages/${initial?.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Could not save package");
        setSaving(false);
        return;
      }
      // Hard navigation avoids Next client router showing a stale packages list.
      window.location.assign("/admin/packages");
    } catch {
      setError("Network error — try again");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-5">
      <label className="block">
        <span className={labelClass}>Package Title</span>
        <input
          required
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          className={fieldClass}
          placeholder="e.g. Oslob + Simala"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Minimum # of pax</span>
          <input
            required
            type="number"
            min={1}
            max={50}
            value={form.minPax}
            onChange={(e) => update("minPax", e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Maximum # of pax</span>
          <input
            required
            type="number"
            min={1}
            max={50}
            value={form.maxPax}
            onChange={(e) => update("maxPax", e.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}># of days</span>
          <input
            required
            type="number"
            min={1}
            max={30}
            value={form.days}
            onChange={(e) => update("days", e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}># of nights</span>
          <input
            required
            type="number"
            min={0}
            max={30}
            value={form.nights}
            onChange={(e) => update("nights", e.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      <div>
        <span className={labelClass}>Price per person (₱)</span>
        <p className="mt-1 text-xs text-white/40">
          Set how much each guest pays depending on group size.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {paxLabels.map((pax, index) => (
            <label key={pax} className="block">
              <span className="mb-1 block text-xs text-white/50">
                {pax} pax
              </span>
              <input
                required
                type="number"
                min={0}
                step={1}
                value={form.rates[index] ?? ""}
                onChange={(e) => updateRate(index, e.target.value)}
                className={fieldClass}
                placeholder="0"
              />
            </label>
          ))}
        </div>
      </div>

      <label className="block">
        <span className={labelClass}>Tour Destinations</span>
        <textarea
          rows={4}
          value={form.destinations}
          onChange={(e) => update("destinations", e.target.value)}
          className={fieldClass}
          placeholder={"Chocolate Hills\nTarsier Sanctuary"}
        />
        <span className="mt-1 block text-xs text-white/40">{hint}</span>
      </label>

      <label className="block">
        <span className={labelClass}>Accommodation</span>
        <textarea
          rows={3}
          value={form.accommodation}
          onChange={(e) => update("accommodation", e.target.value)}
          className={fieldClass}
          placeholder={
            "Standard twin/double room (1 night)\nOr: Day tour — no overnight stay"
          }
        />
        <span className="mt-1 block text-xs text-white/40">{hint}</span>
      </label>

      <label className="block">
        <span className={labelClass}>Inclusions</span>
        <textarea
          rows={5}
          value={form.inclusions}
          onChange={(e) => update("inclusions", e.target.value)}
          className={fieldClass}
          placeholder={"Private van\nDriver / coordinator"}
        />
        <span className="mt-1 block text-xs text-white/40">{hint}</span>
      </label>

      <label className="block">
        <span className={labelClass}>Note on inclusion</span>
        <textarea
          rows={2}
          value={form.inclusionsNote}
          onChange={(e) => update("inclusionsNote", e.target.value)}
          className={fieldClass}
          placeholder="Optional note shown with inclusions"
        />
      </label>

      <label className="block">
        <span className={labelClass}>Exclusions</span>
        <textarea
          rows={5}
          value={form.exclusions}
          onChange={(e) => update("exclusions", e.target.value)}
          className={fieldClass}
          placeholder={"Meals\nEntrance fees"}
        />
        <span className="mt-1 block text-xs text-white/40">{hint}</span>
      </label>

      <label className="block">
        <span className={labelClass}>Note on exclusion</span>
        <textarea
          rows={2}
          value={form.exclusionsNote}
          onChange={(e) => update("exclusionsNote", e.target.value)}
          className={fieldClass}
          placeholder="Optional note shown with exclusions"
        />
      </label>

      {error ? (
        <p className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-sun px-5 py-2.5 text-sm font-bold text-ink transition hover:brightness-105 disabled:opacity-50"
        >
          {saving
            ? "Saving…"
            : mode === "create"
              ? "Create package"
              : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/packages")}
          className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/85 transition hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
