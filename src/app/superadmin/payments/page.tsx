import { SuperadminPayments } from "@/components/superadmin/SuperadminPayments";
import { SuperadminShell } from "@/components/superadmin/SuperadminShell";
import { readBookings } from "@/lib/bookings-store";
import { isSuperadminAuthenticated } from "@/lib/superadmin-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payments | Superadmin",
};

type Props = {
  searchParams?: Promise<{ month?: string }>;
};

export default async function SuperadminPaymentsPage({ searchParams }: Props) {
  if (!(await isSuperadminAuthenticated())) {
    redirect("/superadmin");
  }

  const params = (await searchParams) || {};
  const bookings = await readBookings();
  const now = new Date();
  const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const initialMonth =
    params.month && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : fallback;

  return (
    <SuperadminShell>
      <SuperadminPayments bookings={bookings} initialMonth={initialMonth} />
    </SuperadminShell>
  );
}
