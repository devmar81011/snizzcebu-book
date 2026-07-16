import { AdminCalendar } from "@/components/admin/AdminCalendar";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readBlockedDates } from "@/lib/blocked-dates-store";
import { readBookings } from "@/lib/bookings-store";
import { readPackages } from "@/lib/packages-store";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Calendar | Admin",
};

export default async function AdminCalendarPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  const [bookings, blockedDates, packages] = await Promise.all([
    readBookings(),
    readBlockedDates(),
    readPackages(),
  ]);

  return (
    <AdminShell>
      <AdminCalendar
        bookings={bookings}
        blockedDates={blockedDates}
        packages={packages}
      />
    </AdminShell>
  );
}
