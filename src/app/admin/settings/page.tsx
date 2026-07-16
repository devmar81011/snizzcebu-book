import { AdminSettingsForm } from "@/components/admin/AdminSettingsForm";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readSettings } from "@/lib/settings-store";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Settings | Admin",
};

export default async function AdminSettingsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  const settings = await readSettings();

  return (
    <AdminShell>
      <AdminSettingsForm initial={settings} />
    </AdminShell>
  );
}
