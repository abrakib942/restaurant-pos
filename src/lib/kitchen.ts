import { prisma } from "@/lib/prisma";
import { KITCHEN_IN_PROGRESS_CAP } from "@/lib/constants";

export type KitchenTicket = {
  id: string;
  name: string;
  qty: number;
  status: "PENDING" | "IN_PROGRESS" | "READY";
  tableLabel: string;
  waiterName: string;
  createdAt: string;
  startedAt: string | null;
  readyAt: string | null;
};

export type KitchenBoardData = {
  pending: KitchenTicket[];
  inProgress: KitchenTicket[];
  ready: KitchenTicket[];
  inProgressCount: number;
  cap: number;
};

function mapTicket(item: {
  id: string;
  name: string;
  qty: number;
  status: "PENDING" | "IN_PROGRESS" | "READY" | "SERVED";
  createdAt: Date;
  startedAt: Date | null;
  readyAt: Date | null;
  order: {
    table: { label: string };
    waiter: { name: string };
  };
}): KitchenTicket {
  return {
    id: item.id,
    name: item.name,
    qty: item.qty,
    status: item.status as KitchenTicket["status"],
    tableLabel: item.order.table.label,
    waiterName: item.order.waiter.name,
    createdAt: item.createdAt.toISOString(),
    startedAt: item.startedAt?.toISOString() ?? null,
    readyAt: item.readyAt?.toISOString() ?? null,
  };
}

export async function getKitchenBoard(): Promise<KitchenBoardData> {
  const items = await prisma.orderItem.findMany({
    where: {
      status: { in: ["PENDING", "IN_PROGRESS", "READY"] },
      order: { status: { in: ["OPEN", "BILLING"] } },
    },
    include: {
      order: {
        include: {
          table: { select: { label: true } },
          waiter: { select: { name: true } },
        },
      },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  const pending = items.filter((i) => i.status === "PENDING").map(mapTicket);
  const inProgress = items
    .filter((i) => i.status === "IN_PROGRESS")
    .map(mapTicket);
  const ready = items.filter((i) => i.status === "READY").map(mapTicket);

  return {
    pending,
    inProgress,
    ready,
    inProgressCount: inProgress.length,
    cap: KITCHEN_IN_PROGRESS_CAP,
  };
}
