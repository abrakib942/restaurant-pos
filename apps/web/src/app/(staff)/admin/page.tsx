import { requireRole } from "@/lib/auth";
import type { AdminDashboardData } from "@/lib/dashboard";
import { serverApiData } from "@/lib/server-api";
import { DashboardOverview } from "@/components/admin/dashboard-overview";

export default async function AdminHomePage() {
  const session = await requireRole("ADMIN");
  const data =
    (await serverApiData<AdminDashboardData>("/admin/dashboard")) ?? {
      dateLabel: "Today",
      salesToday: 0,
      paidOrdersToday: 0,
      openOrders: 0,
      billingOrders: 0,
      tables: { available: 0, occupied: 0, billing: 0, total: 0 },
      topItems: [],
    };

  return (
    <DashboardOverview
      welcomeName={session.name.split(" ")[0] ?? session.name}
      data={data}
    />
  );
}
