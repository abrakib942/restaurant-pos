import { prisma } from "@/lib/prisma";
import { KITCHEN_IN_PROGRESS_CAP } from "@/lib/constants";

export type KitchenStationInfo = {
  id: string;
  name: string;
};

export type KitchenTicket = {
  id: string;
  name: string;
  qty: number;
  status: "PENDING" | "IN_PROGRESS" | "READY";
  priority: "NORMAL" | "RUSH";
  course: number;
  stationId: string | null;
  stationName: string | null;
  tableLabel: string;
  waiterName: string;
  createdAt: string;
  startedAt: string | null;
  readyAt: string | null;
};

export type KitchenBoardData = {
  stations: KitchenStationInfo[];
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
  priority: "NORMAL" | "RUSH";
  course: number;
  stationId: string | null;
  station: { name: string } | null;
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
    priority: item.priority,
    course: item.course,
    stationId: item.stationId,
    stationName: item.station?.name ?? null,
    tableLabel: item.order.table.label,
    waiterName: item.order.waiter.name,
    createdAt: item.createdAt.toISOString(),
    startedAt: item.startedAt?.toISOString() ?? null,
    readyAt: item.readyAt?.toISOString() ?? null,
  };
}

function comparePending(a: KitchenTicket, b: KitchenTicket): number {
  if (a.priority !== b.priority) {
    return a.priority === "RUSH" ? -1 : 1;
  }
  if (a.course !== b.course) return a.course - b.course;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function sortInProgress(a: KitchenTicket, b: KitchenTicket): number {
  if (a.priority !== b.priority) {
    return a.priority === "RUSH" ? -1 : 1;
  }
  const aStart = a.startedAt ? new Date(a.startedAt).getTime() : 0;
  const bStart = b.startedAt ? new Date(b.startedAt).getTime() : 0;
  return aStart - bStart;
}

function sortReady(a: KitchenTicket, b: KitchenTicket): number {
  const aReady = a.readyAt ? new Date(a.readyAt).getTime() : 0;
  const bReady = b.readyAt ? new Date(b.readyAt).getTime() : 0;
  return aReady - bReady;
}

export async function getKitchenBoard(): Promise<KitchenBoardData> {
  const [stations, items] = await Promise.all([
    prisma.kitchenStation.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.orderItem.findMany({
      where: {
        voidedAt: null,
        status: { in: ["PENDING", "IN_PROGRESS", "READY"] },
        order: { status: { in: ["OPEN", "BILLING"] } },
      },
      include: {
        station: { select: { name: true } },
        order: {
          include: {
            table: { select: { label: true } },
            waiter: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const pending = items
    .filter((i) => i.status === "PENDING")
    .map(mapTicket)
    .sort(comparePending);
  const inProgress = items
    .filter((i) => i.status === "IN_PROGRESS")
    .map(mapTicket)
    .sort(sortInProgress);
  const ready = items
    .filter((i) => i.status === "READY")
    .map(mapTicket)
    .sort(sortReady);

  return {
    stations,
    pending,
    inProgress,
    ready,
    inProgressCount: inProgress.length,
    cap: KITCHEN_IN_PROGRESS_CAP,
  };
}
