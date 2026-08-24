import { Injectable } from "@nestjs/common";
import { DbService } from "@/db/db.service";
import { KITCHEN_IN_PROGRESS_FIRE_CAP } from "@/common/constants/app.constants";
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from "@/common/interfaces/service-result.interface";
import { buildPendingFireQueue } from "@/common/utils/kitchen-queue";

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
  createdAt: string;
  startedAt: string | null;
  readyAt: string | null;
};

export type KitchenFireCard = {
  fireId: string;
  tableLabel: string;
  waiterName: string;
  priority: "NORMAL" | "RUSH";
  courseMin: number;
  createdAt: string;
  startedAt: string | null;
  readyAt: string | null;
  queuePosition: number | null;
  estimatedMinutes: number | null;
  estimatedLabel: string | null;
  itemCount: number;
  items: KitchenTicket[];
};

export type KitchenBoardData = {
  stations: KitchenStationInfo[];
  pending: KitchenFireCard[];
  inProgress: KitchenFireCard[];
  ready: KitchenFireCard[];
  inProgressCount: number;
  cap: number;
};

type FireItemRow = {
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
  voidedAt: Date | null;
};

type FireRow = {
  id: string;
  priority: "NORMAL" | "RUSH";
  courseMin: number;
  createdAt: Date;
  startedAt: Date | null;
  readyAt: Date | null;
  table: { label: string };
  waiter: { name: string };
  items: FireItemRow[];
};

function mapItem(item: FireItemRow): KitchenTicket {
  return {
    id: item.id,
    name: item.name,
    qty: item.qty,
    status: item.status as KitchenTicket["status"],
    priority: item.priority,
    course: item.course,
    stationId: item.stationId,
    stationName: item.station?.name ?? null,
    createdAt: item.createdAt.toISOString(),
    startedAt: item.startedAt?.toISOString() ?? null,
    readyAt: item.readyAt?.toISOString() ?? null,
  };
}

function activeItems(fire: FireRow): FireItemRow[] {
  return fire.items.filter(
    (i) =>
      i.voidedAt == null &&
      (i.status === "PENDING" ||
        i.status === "IN_PROGRESS" ||
        i.status === "READY"),
  );
}

function fireColumn(
  fire: FireRow,
): "pending" | "inProgress" | "ready" | "skip" {
  const items = activeItems(fire);
  if (items.length === 0) return "skip";
  if (items.every((i) => i.status === "READY")) return "ready";
  if (items.every((i) => i.status === "PENDING")) return "pending";
  return "inProgress";
}

function sortInProgress(a: KitchenFireCard, b: KitchenFireCard): number {
  if (a.priority !== b.priority) {
    return a.priority === "RUSH" ? -1 : 1;
  }
  const aStart = a.startedAt ? new Date(a.startedAt).getTime() : 0;
  const bStart = b.startedAt ? new Date(b.startedAt).getTime() : 0;
  return aStart - bStart;
}

function sortReady(a: KitchenFireCard, b: KitchenFireCard): number {
  const aReady = a.readyAt ? new Date(a.readyAt).getTime() : 0;
  const bReady = b.readyAt ? new Date(b.readyAt).getTime() : 0;
  return aReady - bReady;
}

function toCard(
  fire: FireRow,
  queue?: {
    queuePosition: number;
    estimatedMinutes: number;
    estimatedLabel: string;
  } | null,
): KitchenFireCard {
  const items = activeItems(fire).map(mapItem);
  return {
    fireId: fire.id,
    tableLabel: fire.table.label,
    waiterName: fire.waiter.name,
    priority: fire.priority,
    courseMin: fire.courseMin,
    createdAt: fire.createdAt.toISOString(),
    startedAt: fire.startedAt?.toISOString() ?? null,
    readyAt: fire.readyAt?.toISOString() ?? null,
    queuePosition: queue?.queuePosition ?? null,
    estimatedMinutes: queue?.estimatedMinutes ?? null,
    estimatedLabel: queue?.estimatedLabel ?? null,
    itemCount: items.length,
    items,
  };
}

@Injectable()
export class KitchenService {
  constructor(private readonly db: DbService) {}

  async getKitchenBoard(): Promise<ServiceResult<KitchenBoardData>> {
    const [stations, fires] = await Promise.all([
      this.db.client.kitchenStation.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      }),
      this.db.client.kitchenFire.findMany({
        where: {
          order: { status: { in: ["OPEN", "BILLING"] } },
          items: {
            some: {
              voidedAt: null,
              status: { in: ["PENDING", "IN_PROGRESS", "READY"] },
            },
          },
        },
        include: {
          table: { select: { label: true } },
          waiter: { select: { name: true } },
          items: {
            include: { station: { select: { name: true } } },
            orderBy: [{ course: "asc" }, { createdAt: "asc" }],
          },
        },
      }),
    ]);

    const pendingFires: FireRow[] = [];
    const inProgressFires: FireRow[] = [];
    const readyFires: FireRow[] = [];

    for (const fire of fires as FireRow[]) {
      const col = fireColumn(fire);
      if (col === "pending") pendingFires.push(fire);
      else if (col === "inProgress") inProgressFires.push(fire);
      else if (col === "ready") readyFires.push(fire);
    }

    const queued = buildPendingFireQueue(
      pendingFires.map((fire) => ({
        id: fire.id,
        priority: fire.priority,
        courseMin: fire.courseMin,
        createdAt: fire.createdAt.toISOString(),
        itemCount: activeItems(fire).length,
      })),
      inProgressFires.length,
    );

    const pending = queued.map((q) => {
      const fire = pendingFires.find((f) => f.id === q.id)!;
      return toCard(fire, q);
    });
    const inProgress = inProgressFires
      .map((fire) => toCard(fire, null))
      .sort(sortInProgress);
    const ready = readyFires.map((fire) => toCard(fire, null)).sort(sortReady);

    return createSuccessResult({
      stations,
      pending,
      inProgress,
      ready,
      inProgressCount: inProgress.length,
      cap: KITCHEN_IN_PROGRESS_FIRE_CAP,
    });
  }

  async startKitchenItem(orderItemId: string): Promise<ServiceResult> {
    const item = await this.db.client.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: { select: { status: true } },
        fire: {
          select: {
            id: true,
            startedAt: true,
            items: {
              where: { voidedAt: null },
              select: { id: true, status: true },
            },
          },
        },
      },
    });

    if (!item) {
      return createErrorResult(
        { name: "badRequest", message: "Ticket not found" },
        "Ticket not found",
      );
    }
    if (item.voidedAt) {
      return createErrorResult(
        { name: "badRequest", message: "Ticket was voided" },
        "Ticket was voided",
      );
    }
    if (item.status !== "PENDING") {
      return createErrorResult(
        { name: "badRequest", message: "Only pending tickets can be started" },
        "Only pending tickets can be started",
      );
    }
    if (!["OPEN", "BILLING"].includes(item.order.status)) {
      return createErrorResult(
        { name: "badRequest", message: "Order is no longer active" },
        "Order is no longer active",
      );
    }

    const fireAlreadyActive =
      item.fire.startedAt != null ||
      item.fire.items.some((i) => i.status === "IN_PROGRESS");

    const updated = await this.db.client.$transaction(async (tx) => {
      if (!fireAlreadyActive) {
        const activeFireCount = await tx.kitchenFire.count({
          where: {
            order: { status: { in: ["OPEN", "BILLING"] } },
            items: {
              some: { voidedAt: null, status: "IN_PROGRESS" },
            },
          },
        });
        if (activeFireCount >= KITCHEN_IN_PROGRESS_FIRE_CAP) {
          return null;
        }
      }

      const now = new Date();
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          status: "IN_PROGRESS",
          startedAt: now,
        },
      });

      if (!fireAlreadyActive) {
        await tx.kitchenFire.update({
          where: { id: item.fire.id },
          data: { startedAt: now },
        });
      }

      return true;
    });

    if (!updated) {
      return createErrorResult(
        {
          name: "badRequest",
          message: `Kitchen is full — only ${KITCHEN_IN_PROGRESS_FIRE_CAP} fires can be in progress`,
        },
        `Kitchen is full — only ${KITCHEN_IN_PROGRESS_FIRE_CAP} fires can be in progress`,
      );
    }

    return createSuccessResult(undefined, "Ticket in progress");
  }

  async markKitchenItemReady(orderItemId: string): Promise<ServiceResult> {
    const item = await this.db.client.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: { select: { status: true } },
        fire: {
          select: {
            id: true,
            items: {
              where: { voidedAt: null },
              select: { id: true, status: true },
            },
          },
        },
      },
    });

    if (!item) {
      return createErrorResult(
        { name: "badRequest", message: "Ticket not found" },
        "Ticket not found",
      );
    }
    if (item.voidedAt) {
      return createErrorResult(
        { name: "badRequest", message: "Ticket was voided" },
        "Ticket was voided",
      );
    }
    if (item.status !== "IN_PROGRESS") {
      return createErrorResult(
        {
          name: "badRequest",
          message: "Only in-progress tickets can be marked ready",
        },
        "Only in-progress tickets can be marked ready",
      );
    }
    if (!["OPEN", "BILLING"].includes(item.order.status)) {
      return createErrorResult(
        { name: "badRequest", message: "Order is no longer active" },
        "Order is no longer active",
      );
    }

    const now = new Date();
    const siblingsReady = item.fire.items.every(
      (sibling) =>
        sibling.id === orderItemId ||
        sibling.status === "READY" ||
        sibling.status === "SERVED",
    );

    await this.db.client.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          status: "READY",
          readyAt: now,
        },
      });
      if (siblingsReady) {
        await tx.kitchenFire.update({
          where: { id: item.fire.id },
          data: { readyAt: now },
        });
      }
    });

    return createSuccessResult(
      undefined,
      siblingsReady ? "Fire ready — run food" : "Ticket ready for service",
    );
  }
}
