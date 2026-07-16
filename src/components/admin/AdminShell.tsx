"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin/packages", label: "Packages" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function onLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-[#081416] text-foam lg:flex">
      <aside className="flex w-full flex-col border-b border-white/10 bg-[#0a181a] lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="px-5 py-5">
          <p className="text-[0.68rem] font-semibold tracking-[0.18em] text-sun uppercase">
            Snizzz Admin
          </p>
          <p className="mt-1 text-sm text-white/45">Tour operations</p>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                  active
                    ? "bg-sun text-ink"
                    : "text-white/70 hover:bg-white/8 hover:text-white",
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex gap-2 border-t border-white/10 p-3 lg:flex-col">
          <Link
            href="/"
            className="rounded-lg border border-white/15 px-3 py-2 text-center text-sm font-semibold text-white/75 transition hover:bg-white/8"
          >
            View site
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/8"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        {children}
      </div>
    </div>
  );
}
