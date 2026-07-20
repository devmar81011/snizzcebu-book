import { SuperadminShell } from "@/components/superadmin/SuperadminShell";
import { SuperadminTools } from "@/components/superadmin/SuperadminTools";
import { isSuperadminAuthenticated } from "@/lib/superadmin-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reset | Superadmin",
};

export default async function SuperadminToolsPage() {
  if (!(await isSuperadminAuthenticated())) {
    redirect("/superadmin");
  }

  return (
    <SuperadminShell>
      <SuperadminTools />
    </SuperadminShell>
  );
}
