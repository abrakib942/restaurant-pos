import { requireRole } from "@/lib/auth";
import { getAdminAuditLog } from "@/lib/audit";
import { AuditLogView } from "@/components/admin/audit-log-view";

export default async function AdminAuditPage() {
  await requireRole("ADMIN");
  const entries = await getAdminAuditLog();

  return <AuditLogView entries={entries} />;
}
