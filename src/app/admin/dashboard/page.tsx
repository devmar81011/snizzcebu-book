import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  endOfDay,
  startOfMonth,
  startOfWeek,
  sumIncome,
} from "@/lib/bookings";
import { readBookings } from "@/lib/bookings-store";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Dashboard | Admin",
};

export default async function AdminDashboardPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }

  const bookings = await readBookings();
  const now = new Date();
  const week = sumIncome(bookings, startOfWeek(now), endOfDay(now));
  const month = sumIncome(bookings, startOfMonth(now), endOfDay(now));
  const allTime = sumIncome(bookings, new Date(0), endOfDay(now));
  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  return (
    <AdminShell>
      <AdminDashboard
        stats={{
          weeklyIncome: week.amount,
          weeklyBookings: week.count,
          monthlyIncome: month.amount,
          monthlyBookings: month.count,
          allTimeIncome: allTime.amount,
          allTimeBookings: allTime.count,
          pendingCount,
        }}
        bookings={bookings}
      />
    </AdminShell>
  );
}
