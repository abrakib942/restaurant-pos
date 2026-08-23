import { TableGrid } from "@/components/waiter/table-grid";
import { PassStrip } from "@/components/waiter/pass-strip";
import { WaitlistStrip } from "@/components/waiter/waitlist-strip";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveWaitlist } from "@/lib/waitlist";

export default async function WaiterHomePage() {
  await requireRole("WAITER");

  const [tables, waitlist] = await Promise.all([
    prisma.table.findMany({
      include: {
        orders: {
          where: { status: "OPEN" },
          include: { _count: { select: { items: true } } },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    getActiveWaitlist(5),
  ]);

  const sorted = [...tables].sort((a, b) =>
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
      <WaitlistStrip parties={waitlist} />
      <PassStrip />
      <TableGrid
        tables={sorted.map((table) => ({
          id: table.id,
          label: table.label,
          status: table.status,
          openOrderItemCount: table.orders[0]?._count.items ?? 0,
        }))}
      />
    </div>
  );
}
