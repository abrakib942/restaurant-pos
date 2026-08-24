import { TableGrid } from "@/components/waiter/table-grid";
import { PassStrip } from "@/components/waiter/pass-strip";
import { KitchenQueueStrip } from "@/components/waiter/kitchen-queue-strip";
import { WaitlistStrip } from "@/components/waiter/waitlist-strip";
import { requireRole } from "@/lib/auth";
import type { WaitlistParty } from "@/lib/types/waitlist";
import { serverApiData } from "@/lib/server-api";

type FloorData = {
  tables: {
    id: string;
    label: string;
    status: "AVAILABLE" | "OCCUPIED" | "BILLING";
    openOrderItemCount: number;
    kitchenPendingCount?: number;
    kitchenQueuePosition?: number | null;
    kitchenEstimatedLabel?: string | null;
  }[];
  waitlist: WaitlistParty[];
};

export default async function WaiterHomePage() {
  await requireRole("WAITER");

  const floor = (await serverApiData<FloorData>("/waiter/floor")) ?? {
    tables: [],
    waitlist: [],
  };

  const sorted = [...floor.tables].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { numeric: true }),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">Floor</h1>
        <p className="mt-2 text-muted-foreground">
          Select a table to take or add to an order.
        </p>
      </div>
      <WaitlistStrip parties={floor.waitlist} />
      <KitchenQueueStrip />
      <PassStrip />
      <TableGrid
        tables={sorted.map((table) => ({
          id: table.id,
          label: table.label,
          status: table.status,
          openOrderItemCount: table.openOrderItemCount,
          kitchenPendingCount: table.kitchenPendingCount,
          kitchenQueuePosition: table.kitchenQueuePosition,
          kitchenEstimatedLabel: table.kitchenEstimatedLabel,
        }))}
      />
    </div>
  );
}
