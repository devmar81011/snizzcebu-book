import { AdminShell } from "@/components/admin/AdminShell";
import { PackageForm } from "@/components/admin/PackageForm";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New package | Admin",
};

export default async function NewPackagePage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  return (
    <AdminShell>
      <div className="mb-8">
        <Link
          href="/admin/packages"
          className="text-sm text-white/55 transition hover:text-sun"
        >
          ← Back to packages
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-syne)] text-3xl font-bold">
          New package
        </h1>
      </div>
      <PackageForm mode="create" />
    </AdminShell>
  );
}
