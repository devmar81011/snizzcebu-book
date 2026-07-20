import { AdminCalendar } from "@/components/admin/AdminCalendar";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readBlockedDates } from "@/lib/blocked-dates-store";
import { readBookings } from "@/lib/bookings-store";
import { readPackages } from "@/lib/packages-store";
import { readSettings } from "@/lib/settings-store";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Calendar | Admin",
};

export default async function AdminCalendarPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  const [bookings, blockedDates, packages, settings] = await Promise.all([
    readBookings(),
    readBlockedDates(),
    readPackages(),
    readSettings(),
  ]);

  return (
    <AdminShell>
      <AdminCalendar
        bookings={bookings}
        blockedDates={blockedDates}
        packages={packages}
        pendingAlertHours={settings.pendingAlertHours}
      />
    </AdminShell>
  );
}
