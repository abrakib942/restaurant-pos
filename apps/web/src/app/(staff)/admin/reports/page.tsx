import { requireRole } from "@/lib/auth";
import { getAdminReports, getVoidableOpenItems } from "@/lib/reports";
import { AdminReports } from "@/components/admin/admin-reports";

type AdminReportsPageProps = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function AdminReportsPage({
  searchParams,
}: AdminReportsPageProps) {
  await requireRole("ADMIN");
  const params = await searchParams;

  const [data, voidable] = await Promise.all([
    getAdminReports({ from: params.from, to: params.to }),
    getVoidableOpenItems(),
  ]);

  return <AdminReports data={data} voidable={voidable} />;
}
