import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin | Snizzz Cebu",
};

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin/dashboard");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_20%_10%,rgba(200,245,42,0.12),transparent_35%),linear-gradient(160deg,#081416,#0f2428_55%,#081416)] px-5 py-12">
      <AdminLoginForm />
    </main>
  );
}
