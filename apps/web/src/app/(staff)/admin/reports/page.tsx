import { requireRole } from "@/lib/auth";
import type { AdminReportsData, VoidableItemRow } from "@/lib/reports";
import { serverApiData } from "@/lib/server-api";
import { AdminReports } from "@/components/admin/admin-reports";

type AdminReportsPageProps = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function AdminReportsPage({
  searchParams,
}: AdminReportsPageProps) {
  await requireRole("ADMIN");
  const params = await searchParams;

  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  const query = qs.toString() ? `?${qs.toString()}` : "";

  const [data, voidable] = await Promise.all([
    serverApiData<AdminReportsData>(`/admin/reports${query}`),
    serverApiData<VoidableItemRow[]>("/admin/reports/voidable-items"),
  ]);

  return (
    <AdminReports
      data={
        data ?? {
          from: params.from ?? "",
          to: params.to ?? "",
          label: "Reports",
          salesTotal: 0,
          paidChecks: 0,
          voidCount: 0,
          voidAmount: 0,
          byWaiter: [],
          byHour: [],
          voids: [],
        }
      }
      voidable={voidable ?? []}
    />
  );
}
