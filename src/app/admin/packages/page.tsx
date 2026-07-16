import { AdminShell } from "@/components/admin/AdminShell";
import { PackageList } from "@/components/admin/PackageList";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readPackages } from "@/lib/packages-store";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Packages | Admin",
};

export default async function AdminPackagesPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  const packages = await readPackages();

  return (
    <AdminShell>
      <PackageList packages={packages} />
    </AdminShell>
  );
}
