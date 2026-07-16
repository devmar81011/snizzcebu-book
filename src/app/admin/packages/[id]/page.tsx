import { AdminShell } from "@/components/admin/AdminShell";
import { PackageForm } from "@/components/admin/PackageForm";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getPackageById } from "@/lib/packages-store";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const pkg = await getPackageById(id);
  return { title: pkg ? `Edit ${pkg.title} | Admin` : "Edit package | Admin" };
}

export default async function EditPackagePage({ params }: Props) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  const { id } = await params;
  const pkg = await getPackageById(id);
  if (!pkg) notFound();

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
          Edit package
        </h1>
        <p className="mt-1 text-sm text-white/50">{pkg.title}</p>
      </div>
      <PackageForm mode="edit" initial={pkg} />
    </AdminShell>
  );
}
