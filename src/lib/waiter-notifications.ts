import { prisma } from "@/lib/prisma";

export type ReadyNotification = {
  id: string;
  name: string;
  qty: number;
  tableLabel: string;
  tableId: string;
  readyAt: string | null;
  orderId: string;
};

export type WaiterNotificationsData = {
  ready: ReadyNotification[];
  count: number;
};

export async function getWaiterReadyNotifications(
  waiterId: string,
): Promise<WaiterNotificationsData> {
  const items = await prisma.orderItem.findMany({
    where: {
      status: "READY",
      order: {
        waiterId,
        status: { in: ["OPEN", "BILLING"] },
      },
    },
    include: {
      order: {
        select: {
          id: true,
          tableId: true,
          table: { select: { label: true } },
        },
      },
    },
    orderBy: [{ readyAt: "asc" }, { createdAt: "asc" }],
  });

  const ready = items.map((item) => ({
    id: item.id,
    name: item.name,
    qty: item.qty,
    tableLabel: item.order.table.label,
    tableId: item.order.tableId,
    orderId: item.order.id,
    readyAt: item.readyAt?.toISOString() ?? null,
  }));

  return { ready, count: ready.length };
}
