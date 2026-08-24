import { Injectable } from "@nestjs/common";
import { DbService } from "@/db/db.service";
import { KITCHEN_IN_PROGRESS_FIRE_CAP } from "@/common/constants/app.constants";
import {
  createSuccessResult,
  ServiceResult,
} from "@/common/interfaces/service-result.interface";
import { isExpoStale } from "@/common/utils/expo-meta";
import {
  buildPendingFireQueue,
  fireQueueLookup,
} from "@/common/utils/kitchen-queue";

export type ReadyFireLine = {
  id: string;
  name: string;
  qty: number;
};

export type ReadyNotification = {
  fireId: string;
  tableLabel: string;
  tableId: string;
  orderId: string;
  itemCount: number;
  name: string;
  qty: number;
  items: ReadyFireLine[];
  readyAt: string | null;
  mine: boolean;
};

export type WaiterNotificationsData = {
  ready: ReadyNotification[];
  count: number;
  mineCount: number;
  staleCount: number;
};

export type WaiterKitchenQueueItem = {
  fireId: string;
  itemCount: number;
  status: "PENDING" | "IN_PROGRESS";
  tableId: string;
  tableLabel: string;
  orderId: string;
  queuePosition: number | null;
  estimatedMinutes: number | null;
  estimatedLabel: string | null;
  /** Primary dish name for strip display */
  name: string;
  qty: number;
};

export type WaiterKitchenQueueData = {
  totalPending: number;
  inProgressCount: number;
  cap: number;
  items: WaiterKitchenQueueItem[];
};

function isPendingFireItems(items: { status: string }[]): boolean {
  return items.length > 0 && items.every((i) => i.status === "PENDING");
}

function isInProgressFireItems(items: { status: string }[]): boolean {
  if (items.length === 0) return false;
  const active = items.filter(
    (i) =>
      i.status === "PENDING" ||
      i.status === "IN_PROGRESS" ||
      i.status === "READY",
  );
  if (active.length === 0) return false;
  if (active.every((i) => i.status === "READY")) return false;
  if (active.every((i) => i.status === "PENDING")) return false;
  return true;
}

@Injectable()
export class WaiterService {
  constructor(private readonly db: DbService) {}

  async getFloor() {
    const [tables, waitlistEntries, kitchenFires] = await Promise.all([
      this.db.client.table.findMany({
        include: {
          orders: {
            where: { status: "OPEN" },
            include: { _count: { select: { items: true } } },
            take: 1,
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      this.db.client.waitlistEntry.findMany({
        where: { status: { in: ["WAITING", "NOTIFIED"] } },
        orderBy: [{ createdAt: "asc" }],
        take: 5,
        include: { seatedTable: { select: { label: true } } },
      }),
      this.db.client.kitchenFire.findMany({
        where: {
          order: { status: { in: ["OPEN", "BILLING"] } },
          items: {
            some: {
              voidedAt: null,
              status: { in: ["PENDING", "IN_PROGRESS"] },
            },
          },
        },
        include: {
          items: {
            where: {
              voidedAt: null,
              status: { in: ["PENDING", "IN_PROGRESS", "READY"] },
            },
            select: { status: true },
          },
        },
      }),
    ]);

    const sorted = [...tables].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true }),
    );

    const waitMinutes = (createdAt: Date) =>
      Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 60_000));

    const pendingHouse = kitchenFires.filter((f) =>
      isPendingFireItems(f.items),
    );
    const inProgressHouse = kitchenFires.filter((f) =>
      isInProgressFireItems(f.items),
    );
    const queued = buildPendingFireQueue(
      pendingHouse.map((fire) => ({
        id: fire.id,
        priority: fire.priority,
        courseMin: fire.courseMin,
        createdAt: fire.createdAt.toISOString(),
        itemCount: fire.items.length,
      })),
      inProgressHouse.length,
    );
    const queueByFire = fireQueueLookup(queued);
    const pendingByTable = new Map<
      string,
      {
        kitchenPendingCount: number;
        kitchenQueuePosition: number | null;
        kitchenEstimatedLabel: string | null;
      }
    >();
    for (const fire of kitchenFires) {
      const tableId = fire.tableId;
      const current = pendingByTable.get(tableId) ?? {
        kitchenPendingCount: 0,
        kitchenQueuePosition: null,
        kitchenEstimatedLabel: null,
      };
      const pendingItems = fire.items.filter(
        (i) => i.status === "PENDING",
      ).length;
      current.kitchenPendingCount += pendingItems;
      const queue = queueByFire.get(fire.id);
      if (
        queue &&
        (current.kitchenQueuePosition == null ||
          queue.queuePosition < current.kitchenQueuePosition)
      ) {
        current.kitchenQueuePosition = queue.queuePosition;
        current.kitchenEstimatedLabel = queue.estimatedLabel;
      }
      pendingByTable.set(tableId, current);
    }

    return createSuccessResult({
      tables: sorted.map((table) => {
        const kitchen = pendingByTable.get(table.id);
        return {
          id: table.id,
          label: table.label,
          status: table.status,
          openOrderItemCount: table.orders[0]?._count.items ?? 0,
          kitchenPendingCount: kitchen?.kitchenPendingCount ?? 0,
          kitchenQueuePosition: kitchen?.kitchenQueuePosition ?? null,
          kitchenEstimatedLabel: kitchen?.kitchenEstimatedLabel ?? null,
        };
      }),
      waitlist: waitlistEntries.map((entry) => ({
        id: entry.id,
        partyName: entry.partyName,
        partySize: entry.partySize,
        phone: entry.phone,
        status: entry.status,
        quotedMinutes: entry.quotedMinutes,
        seatedTableLabel: entry.seatedTable?.label ?? null,
        seatedAt: entry.seatedAt?.toISOString() ?? null,
        createdAt: entry.createdAt.toISOString(),
        waitMinutes: waitMinutes(entry.createdAt),
      })),
    });
  }

  async getTablePos(tableId: string) {
    const table = await this.db.client.table.findUnique({
      where: { id: tableId },
    });
    if (!table) {
      return createSuccessResult(null);
    }

    const [
      categories,
      menuItems,
      openOrders,
      allTables,
      waiters,
      activeOrder,
      kitchenFires,
    ] = await Promise.all([
      this.db.client.category.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      this.db.client.menuItem.findMany({
        orderBy: [
          { category: { sortOrder: "asc" } },
          { sortOrder: "asc" },
          { name: "asc" },
        ],
        include: { category: { select: { id: true, name: true } } },
      }),
      this.db.client.order.findMany({
        where: { tableId: table.id, status: "OPEN" },
        include: {
          items: {
            where: { voidedAt: null },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      this.db.client.table.findMany({
        orderBy: { label: "asc" },
        include: {
          orders: {
            where: { status: "OPEN" },
            take: 1,
            select: { id: true },
          },
        },
      }),
      this.db.client.user.findMany({
        where: { role: "WAITER" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      this.db.client.order.findFirst({
        where: {
          tableId: table.id,
          status: { in: ["OPEN", "BILLING"] },
        },
        select: { id: true, waiterId: true },
        orderBy: { createdAt: "asc" },
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
          items: {
            where: {
              voidedAt: null,
              status: { in: ["PENDING", "IN_PROGRESS", "READY"] },
            },
            select: { status: true },
          },
        },
      }),
    ]);

    const existingLines = openOrders.flatMap((order) => order.items);
    const pendingHouse = kitchenFires.filter((f) =>
      isPendingFireItems(f.items),
    );
    const inProgressHouse = kitchenFires.filter((f) =>
      isInProgressFireItems(f.items),
    );
    const posQueued = buildPendingFireQueue(
      pendingHouse.map((fire) => ({
        id: fire.id,
        priority: fire.priority,
        courseMin: fire.courseMin,
        createdAt: fire.createdAt.toISOString(),
        itemCount: fire.items.length,
      })),
      inProgressHouse.length,
    );
    const posQueueByFire = fireQueueLookup(posQueued);

    const tableLiveFires = await this.db.client.kitchenFire.findMany({
      where: {
        tableId: table.id,
        order: { status: { in: ["OPEN", "BILLING"] } },
        items: {
          some: {
            voidedAt: null,
            status: { in: ["PENDING", "IN_PROGRESS"] },
          },
        },
      },
      include: {
        items: {
          where: {
            voidedAt: null,
            status: { in: ["PENDING", "IN_PROGRESS", "READY"] },
          },
          select: { status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    const live = tableLiveFires[0] ?? null;
    const liveMode = live
      ? isPendingFireItems(live.items)
        ? ("pending" as const)
        : ("inProgress" as const)
      : null;
    const liveQueue = live ? posQueueByFire.get(live.id) : null;

    return createSuccessResult({
      table: {
        id: table.id,
        label: table.label,
        status: table.status,
      },
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
      menuItems: menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price.toFixed(2),
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable,
        categoryId: item.categoryId,
        categoryName: item.category.name,
      })),
      liveFire: live
        ? {
            fireId: live.id,
            mode: liveMode!,
            queuePosition: liveQueue?.queuePosition ?? null,
            estimatedLabel: liveQueue?.estimatedLabel ?? null,
          }
        : null,
      existingLines: existingLines.map((item) => {
        const queue = posQueueByFire.get(item.fireId);
        return {
          id: item.id,
          fireId: item.fireId,
          menuItemId: item.menuItemId,
          name: item.name,
          qty: item.qty,
          unitPrice: item.unitPrice.toFixed(2),
          status: item.status,
          removable: item.status === "PENDING",
          queuePosition: queue?.queuePosition ?? null,
          estimatedLabel: queue?.estimatedLabel ?? null,
        };
      }),
      floorOps: {
        hasActiveOrder: !!activeOrder,
        currentWaiterId: activeOrder?.waiterId ?? null,
        tables: allTables.map((t) => ({
          id: t.id,
          label: t.label,
          status: t.status,
          hasOpenOrder: t.orders.length > 0,
        })),
        waiters,
      },
    });
  }

  async getTableCheckout(tableId: string, orderId?: string) {
    const table = await this.db.client.table.findUnique({
      where: { id: tableId },
    });
    if (!table) {
      return createSuccessResult(null);
    }

    const orders = await this.db.client.order.findMany({
      where: {
        tableId: table.id,
        status: { in: ["OPEN", "BILLING"] },
      },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        bill: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const selected = orders.find((o) => o.id === orderId) ?? orders[0] ?? null;

    return createSuccessResult({
      table: {
        id: table.id,
        label: table.label,
        status: table.status,
      },
      checks: orders.map((order, index) => ({
        id: order.id,
        label: `Check ${index + 1}`,
        status: order.status,
      })),
      order: selected ? { id: selected.id, status: selected.status } : null,
      lines:
        selected?.items.map((item) => ({
          id: item.id,
          name: item.name,
          qty: item.qty,
          unitPrice: item.unitPrice.toFixed(2),
          status: item.status,
          voided: item.voidedAt != null,
        })) ?? [],
      bill: selected?.bill
        ? {
            subtotal: selected.bill.subtotal.toFixed(2),
            discount: selected.bill.discount.toFixed(2),
            tax: selected.bill.tax.toFixed(2),
            tip: selected.bill.tip.toFixed(2),
            total: selected.bill.total.toFixed(2),
            paymentMethod: selected.bill.paymentMethod,
            paidAt: selected.bill.paidAt?.toISOString() ?? null,
          }
        : null,
    });
  }

  async getNotifications(
    waiterId: string,
  ): Promise<ServiceResult<WaiterNotificationsData>> {
    const fires = await this.db.client.kitchenFire.findMany({
      where: {
        order: { status: { in: ["OPEN", "BILLING"] } },
        items: {
          some: { voidedAt: null, status: "READY" },
          none: {
            voidedAt: null,
            status: { in: ["PENDING", "IN_PROGRESS"] },
          },
        },
      },
      include: {
        table: { select: { label: true } },
        order: { select: { id: true, waiterId: true, tableId: true } },
        items: {
          where: { voidedAt: null, status: "READY" },
          orderBy: [{ course: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            name: true,
            qty: true,
            readyAt: true,
          },
        },
      },
    });

    const ready = fires
      .map((fire) => {
        const lead = fire.items[0];
        const extras = fire.items.length - 1;
        return {
          fireId: fire.id,
          tableLabel: fire.table.label,
          tableId: fire.order.tableId,
          orderId: fire.order.id,
          itemCount: fire.items.length,
          name:
            extras > 0
              ? `${lead?.name ?? "Order"} +${extras}`
              : (lead?.name ?? "Order"),
          qty: lead?.qty ?? 1,
          items: fire.items.map((item) => ({
            id: item.id,
            name: item.name,
            qty: item.qty,
          })),
          readyAt:
            fire.readyAt?.toISOString() ?? lead?.readyAt?.toISOString() ?? null,
          mine: fire.order.waiterId === waiterId,
        };
      })
      .sort((a, b) => {
        const aT = a.readyAt ? new Date(a.readyAt).getTime() : 0;
        const bT = b.readyAt ? new Date(b.readyAt).getTime() : 0;
        return aT - bT;
      });

    return createSuccessResult({
      ready,
      count: ready.length,
      mineCount: ready.filter((r) => r.mine).length,
      staleCount: ready.filter((r) => isExpoStale(r.readyAt)).length,
    });
  }

  async getKitchenQueue(
    waiterId: string,
  ): Promise<ServiceResult<WaiterKitchenQueueData>> {
    const fires = await this.db.client.kitchenFire.findMany({
      where: {
        waiterId,
        order: { status: { in: ["OPEN", "BILLING"] } },
        items: {
          some: {
            voidedAt: null,
            status: { in: ["PENDING", "IN_PROGRESS"] },
          },
        },
      },
      include: {
        table: { select: { label: true } },
        items: {
          where: {
            voidedAt: null,
            status: { in: ["PENDING", "IN_PROGRESS", "READY"] },
          },
          orderBy: [{ course: "asc" }, { createdAt: "asc" }],
          select: {
            name: true,
            qty: true,
            status: true,
          },
        },
      },
    });

    const allHouse = await this.db.client.kitchenFire.findMany({
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
        items: {
          where: {
            voidedAt: null,
            status: { in: ["PENDING", "IN_PROGRESS", "READY"] },
          },
          select: { status: true },
        },
      },
    });

    const pendingHouse = allHouse.filter((f) => isPendingFireItems(f.items));
    const inProgressHouse = allHouse.filter((f) =>
      isInProgressFireItems(f.items),
    );
    const queued = buildPendingFireQueue(
      pendingHouse.map((fire) => ({
        id: fire.id,
        priority: fire.priority,
        courseMin: fire.courseMin,
        createdAt: fire.createdAt.toISOString(),
        itemCount: fire.items.length,
      })),
      inProgressHouse.length,
    );
    const byId = fireQueueLookup(queued);

    const items = fires
      .map((fire) => {
        const queue = byId.get(fire.id);
        const pendingOrCooking = fire.items.filter(
          (i) => i.status === "PENDING" || i.status === "IN_PROGRESS",
        );
        const status: "PENDING" | "IN_PROGRESS" = isPendingFireItems(fire.items)
          ? "PENDING"
          : "IN_PROGRESS";
        const lead = pendingOrCooking[0] ?? fire.items[0];
        return {
          fireId: fire.id,
          itemCount: fire.items.length,
          status,
          tableId: fire.tableId,
          tableLabel: fire.table.label,
          orderId: fire.orderId,
          queuePosition: queue?.queuePosition ?? null,
          estimatedMinutes: queue?.estimatedMinutes ?? null,
          estimatedLabel: queue?.estimatedLabel ?? null,
          name:
            fire.items.length > 1
              ? `${lead?.name ?? "Order"} +${fire.items.length - 1}`
              : (lead?.name ?? "Order"),
          qty: lead?.qty ?? 1,
        };
      })
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === "PENDING" ? -1 : 1;
        }
        return (a.queuePosition ?? 9999) - (b.queuePosition ?? 9999);
      });

    return createSuccessResult({
      totalPending: queued.length,
      inProgressCount: inProgressHouse.length,
      cap: KITCHEN_IN_PROGRESS_FIRE_CAP,
      items,
    });
  }
}
