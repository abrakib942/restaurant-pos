import { requireRole } from "@/lib/auth";
import type { AuditLogRow } from "@/lib/audit-meta";
import { serverApiData } from "@/lib/server-api";
import { AuditLogView } from "@/components/admin/audit-log-view";

export default async function AdminAuditPage() {
  await requireRole("ADMIN");
  const entries =
    (await serverApiData<AuditLogRow[]>("/admin/audit")) ?? [];

  return <AuditLogView entries={entries} />;
}
