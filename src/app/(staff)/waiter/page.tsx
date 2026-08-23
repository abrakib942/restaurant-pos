import { TableGrid } from "@/components/waiter/table-grid";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function WaiterHomePage() {
  await requireRole("WAITER");

  const tables = await prisma.table.findMany({
    include: {
      orders: {
        where: { status: "OPEN" },
        include: { _count: { select: { items: true } } },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

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
