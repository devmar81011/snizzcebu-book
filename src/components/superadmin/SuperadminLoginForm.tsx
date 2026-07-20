"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function SuperadminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/superadmin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Invalid password");
        setBusy(false);
        return;
      }
      router.push("/superadmin/payments");
      router.refresh();
    } catch {
      setError("Network error — try again");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md rounded-3xl border border-white/12 bg-white/[0.04] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
    >
      <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-sun uppercase">
        Superadmin
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-syne)] text-3xl font-bold">
        Payment & commission
      </h1>
      <p className="mt-2 text-sm text-white/55">
        Track completed payments, weekly/monthly income, and your 5% developer
        share.
      </p>

      <label className="mt-6 block">
        <span className="text-[0.68rem] font-semibold tracking-[0.14em] text-white/55 uppercase">
          Password
        </span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm outline-none transition focus:border-sun/60"
        />
      </label>

      {error ? (
        <p className="mt-3 rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full rounded-xl bg-sun px-4 py-2.5 text-sm font-bold text-ink transition hover:brightness-105 disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
