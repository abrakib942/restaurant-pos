import { prisma } from "@/lib/prisma";

export type PassTicket = {
  id: string;
  name: string;
  qty: number;
  tableLabel: string;
  tableId: string;
  orderId: string;
  readyAt: string | null;
  waiterId: string;
};

export async function getPassQueue(limit?: number): Promise<PassTicket[]> {
  const items = await prisma.orderItem.findMany({
    where: {
      voidedAt: null,
      status: "READY",
      order: { status: { in: ["OPEN", "BILLING"] } },
    },
    include: {
      order: {
        select: {
          id: true,
          waiterId: true,
          tableId: true,
          table: { select: { label: true } },
        },
      },
    },
    orderBy: [{ readyAt: "asc" }, { createdAt: "asc" }],
    ...(limit !== undefined ? { take: limit } : {}),
  });

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    qty: item.qty,
    tableLabel: item.order.table.label,
    tableId: item.order.tableId,
    orderId: item.order.id,
    readyAt: item.readyAt?.toISOString() ?? null,
    waiterId: item.order.waiterId,
  }));
}
