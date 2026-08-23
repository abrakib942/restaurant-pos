import { requireRole } from "@/lib/auth";
import { AdminShell } from "@/components/shells/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("ADMIN");
  return <AdminShell user={session}>{children}</AdminShell>;
}
