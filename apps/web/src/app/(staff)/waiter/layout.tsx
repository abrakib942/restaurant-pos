import { requireRole } from "@/lib/auth";
import { WaiterShell } from "@/components/shells/waiter-shell";
import { QueryProvider } from "@/components/providers/query-provider";
import { RealtimeListener } from "@/components/providers/realtime-listener";

export default async function WaiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("WAITER");
  return (
    <QueryProvider>
      <RealtimeListener
        url="/api/sse/waiter"
        queryKeys={[["waiter-notifications"], ["waiter-service-requests"]]}
        refresh
      >
        <WaiterShell user={session}>{children}</WaiterShell>
      </RealtimeListener>
    </QueryProvider>
  );
}
