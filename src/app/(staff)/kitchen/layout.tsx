import { requireRole } from "@/lib/auth";
import { KitchenShell } from "@/components/shells/kitchen-shell";
import { QueryProvider } from "@/components/providers/query-provider";

export default async function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("KITCHEN");
  return (
    <QueryProvider>
      <KitchenShell user={session}>{children}</KitchenShell>
    </QueryProvider>
  );
}
