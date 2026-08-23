import { requireRole } from "@/lib/auth";
import { WaiterShell } from "@/components/shells/waiter-shell";
import { QueryProvider } from "@/components/providers/query-provider";

export default async function WaiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("WAITER");
  return (
    <QueryProvider>
      <WaiterShell user={session}>{children}</WaiterShell>
    </QueryProvider>
  );
}
