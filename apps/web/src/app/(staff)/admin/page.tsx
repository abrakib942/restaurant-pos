import { requireRole } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/dashboard";
import { DashboardOverview } from "@/components/admin/dashboard-overview";

export default async function AdminHomePage() {
  const session = await requireRole("ADMIN");
  const data = await getAdminDashboard();

  return (
    <DashboardOverview
      welcomeName={session.name.split(" ")[0] ?? session.name}
      data={data}
    />
  );
}
