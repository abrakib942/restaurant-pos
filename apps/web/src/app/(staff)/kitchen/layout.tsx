import { requireRole } from "@/lib/auth";
import { KitchenShell } from "@/components/shells/kitchen-shell";
import { QueryProvider } from "@/components/providers/query-provider";
import { RealtimeListener } from "@/components/providers/realtime-listener";

export default async function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("KITCHEN");
  return (
    <QueryProvider>
      <RealtimeListener url="/api/sse/kitchen" queryKeys={[["kitchen-board"]]}>
        <KitchenShell user={session}>{children}</KitchenShell>
      </RealtimeListener>
    </QueryProvider>
  );
}
