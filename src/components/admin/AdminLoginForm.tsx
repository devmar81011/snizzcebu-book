"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        setError("Wrong password");
        setLoading(false);
        return;
      }
      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Could not sign in");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0c1a1c]/90 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
    >
      <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-sun uppercase">
        Admin
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-syne)] text-2xl font-bold">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-white/55">
        Manage tour packages, inclusions, and guest limits.
      </p>

      <label className="mt-6 block">
        <span className="mb-1.5 block text-[0.68rem] font-semibold tracking-[0.14em] text-white/55 uppercase">
          Password
        </span>
        <input
          type="password"
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm outline-none transition focus:border-sun/60"
        />
      </label>

      {error ? (
        <p className="mt-3 text-sm text-red-300">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-xl bg-sun px-4 py-3 text-sm font-bold text-ink transition hover:brightness-105 disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Enter admin"}
      </button>
    </form>
  );
}
