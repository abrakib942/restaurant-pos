import { Injectable } from "@nestjs/common";
import { DbService } from "@/db/db.service";
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from "@/common/interfaces/service-result.interface";
import {
  buildPendingFireQueue,
  fireQueueLookup,
} from "@/common/utils/kitchen-queue";
import {
  CreateGuestServiceRequestDto,
  GuestServiceRequestLineDto,
  SubmitGuestOrderDto,
} from "./dto/guest.dto";

const GUEST_ORDER_BLOCKED =
  "Your waiter will confirm and send items to the kitchen";

export type GuestOrderStatusLine = {
  id: string;
  fireId: string;
  name: string;
  qty: number;
  status: "PENDING" | "IN_PROGRESS" | "READY" | "SERVED";
  queuePosition: number | null;
  estimatedMinutes: number | null;
  estimatedLabel: string | null;
  batchLabel: string;
};

export type GuestPendingRequest = {
  id: string;
  acknowledgedAt: string | null;
  lines: {
    menuItemId: string;
    name: string;
    qty: number;
    note: string | null;
  }[];
};

export type GuestOrderStatusData = {
  table: {
    qrSlug: string;
    label: string;
    status: "AVAILABLE" | "OCCUPIED" | "BILLING";
  };
  pendingRequest: GuestPendingRequest | null;
  items: GuestOrderStatusLine[];
  kitchenSummary: {
    totalPending: number;
    yourPendingCount: number;
    yourPendingFires: number;
  };
};

function fireRoundLabels(
  fires: { id: string; createdAt: Date }[],
): Map<string, string> {
  const sorted = [...fires].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const labels = new Map<string, string>();
  sorted.forEach((fire, index) => {
    labels.set(fire.id, `Round ${index + 1}`);
  });
  return labels;
}

function isPendingFire(
  items: { status: string; voidedAt: Date | null }[],
): boolean {
  const active = items.filter((i) => i.voidedAt == null);
  return (
    active.length > 0 &&
    active.every((i) => i.status === "PENDING") &&
    !active.some((i) => i.status === "IN_PROGRESS")
  );
}

function isInProgressFire(
  items: { status: string; voidedAt: Date | null }[],
): boolean {
  const active = items.filter(
    (i) =>
      i.voidedAt == null &&
      (i.status === "PENDING" ||
        i.status === "IN_PROGRESS" ||
        i.status === "READY"),
  );
  if (active.length === 0) return false;
  if (active.every((i) => i.status === "READY")) return false;
  if (active.every((i) => i.status === "PENDING")) return false;
  return true;
}

@Injectable()
export class GuestService {
  constructor(private readonly db: DbService) {}

  async getGuestMenu(qrSlug: string) {
    const table = await this.db.client.table.findUnique({
      where: { qrSlug },
    });
    if (!table) {
      return createErrorResult(
        { name: "badRequest", message: "Table not found" },
        "Table not found",
      );
    }

    const categories = await this.db.client.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
    });

    const menuItems = categories.flatMap((category) =>
      category.items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price.toFixed(2),
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable,
        categoryId: category.id,
      })),
    );

    return createSuccessResult({
      table: {
        qrSlug: table.qrSlug,
        label: table.label,
        status: table.status,
      },
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
      menuItems,
    });
  }

  async submitGuestOrder(
    _input: SubmitGuestOrderDto,
  ): Promise<ServiceResult<{ orderId: string }>> {
    return createErrorResult(
      { name: "badRequest", message: GUEST_ORDER_BLOCKED },
      GUEST_ORDER_BLOCKED,
    ) as ServiceResult<{ orderId: string }>;
  }

  async createGuestServiceRequest(
    input: CreateGuestServiceRequestDto,
  ): Promise<ServiceResult<{ requestId: string }>> {
    const table = await this.db.client.table.findUnique({
      where: { qrSlug: input.qrSlug },
    });
    if (!table) {
      return createErrorResult(
        { name: "badRequest", message: "Table not found" },
        "Table not found",
      ) as ServiceResult<{ requestId: string }>;
    }

    const items = (input.items ?? []).filter((line) => line.qty > 0);
    if (input.type === "REQUEST_BILL" && items.length > 0) {
      return createErrorResult(
        {
          name: "badRequest",
          message: "Bill requests cannot include menu items",
        },
        "Bill requests cannot include menu items",
      ) as ServiceResult<{ requestId: string }>;
    }
    if (
      input.type === "CALL_WAITER" &&
      table.status === "BILLING" &&
      items.length > 0
    ) {
      return createErrorResult(
        {
          name: "badRequest",
          message: "This table is closing out — ask your waiter for help",
        },
        "This table is closing out — ask your waiter for help",
      ) as ServiceResult<{ requestId: string }>;
    }

    const resolved = await this.resolveRequestLines(items);
    if (resolved.ok === false) {
      return createErrorResult(
        { name: "badRequest", message: resolved.message },
        resolved.message,
      ) as ServiceResult<{ requestId: string }>;
    }

    const existing = await this.db.client.serviceRequest.findFirst({
      where: {
        tableId: table.id,
        type: input.type,
        status: "OPEN",
      },
      include: { lines: true },
    });

    if (existing && resolved.lines.length === 0) {
      const label =
        input.type === "CALL_WAITER"
          ? "Waiter already notified"
          : "Bill already requested";
      return createSuccessResult({ requestId: existing.id }, label);
    }

    if (existing && input.type === "CALL_WAITER" && resolved.lines.length > 0) {
      await this.mergeRequestLines(existing.id, existing.lines, resolved.lines);
      if (table.status === "AVAILABLE") {
        await this.db.client.table.update({
          where: { id: table.id },
          data: { status: "OCCUPIED" },
        });
      }
      return createSuccessResult(
        { requestId: existing.id },
        existing.lines.length > 0
          ? "Added to your waiter request"
          : "Waiter called with your items",
      );
    }

    const created = await this.db.client.serviceRequest.create({
      data: {
        tableId: table.id,
        type: input.type,
        lines:
          resolved.lines.length > 0 ? { create: resolved.lines } : undefined,
      },
    });

    if (
      input.type === "CALL_WAITER" &&
      resolved.lines.length > 0 &&
      table.status === "AVAILABLE"
    ) {
      await this.db.client.table.update({
        where: { id: table.id },
        data: { status: "OCCUPIED" },
      });
    }

    const message =
      input.type === "CALL_WAITER"
        ? resolved.lines.length > 0
          ? "Waiter called with your items — they will confirm at the table"
          : "Waiter called — someone will be right over"
        : "Bill requested — your waiter will bring the check";

    return createSuccessResult({ requestId: created.id }, message);
  }

  async getGuestOrderStatus(
    qrSlug: string,
  ): Promise<ServiceResult<GuestOrderStatusData>> {
    const table = await this.db.client.table.findUnique({
      where: { qrSlug },
    });
    if (!table) {
      return createErrorResult(
        { name: "badRequest", message: "Table not found" },
        "Table not found",
      ) as ServiceResult<GuestOrderStatusData>;
    }

    const [pendingCall, tableItems, kitchenFires] = await Promise.all([
      this.db.client.serviceRequest.findFirst({
        where: {
          tableId: table.id,
          type: "CALL_WAITER",
          status: "OPEN",
        },
        include: { lines: { orderBy: { name: "asc" } } },
        orderBy: { createdAt: "desc" },
      }),
      this.db.client.orderItem.findMany({
        where: {
          voidedAt: null,
          order: {
            tableId: table.id,
            status: { in: ["OPEN", "BILLING"] },
          },
        },
        include: {
          fire: { select: { id: true, createdAt: true } },
        },
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
            where: { voidedAt: null },
            select: { status: true, voidedAt: true },
          },
        },
      }),
    ]);

    const pendingHouse = kitchenFires.filter((f) => isPendingFire(f.items));
    const inProgressHouse = kitchenFires.filter((f) =>
      isInProgressFire(f.items),
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
    const byFireId = fireQueueLookup(queued);

    const tableFireIds = [
      ...new Map(
        tableItems.map((item) => [
          item.fire.id,
          { id: item.fire.id, createdAt: item.fire.createdAt },
        ]),
      ).values(),
    ];
    const rounds = fireRoundLabels(tableFireIds);

    const items: GuestOrderStatusLine[] = tableItems.map((item) => {
      const queue = byFireId.get(item.fireId);
      return {
        id: item.id,
        fireId: item.fireId,
        name: item.name,
        qty: item.qty,
        status: item.status,
        queuePosition: queue?.queuePosition ?? null,
        estimatedMinutes: queue?.estimatedMinutes ?? null,
        estimatedLabel: queue?.estimatedLabel ?? null,
        batchLabel: rounds.get(item.fireId) ?? "Round 1",
      };
    });

    const yourPendingFireIds = new Set(
      items
        .filter((i) => i.status === "PENDING" || i.status === "IN_PROGRESS")
        .map((i) => i.fireId),
    );

    return createSuccessResult({
      table: {
        qrSlug: table.qrSlug,
        label: table.label,
        status: table.status,
      },
      pendingRequest: pendingCall
        ? {
            id: pendingCall.id,
            acknowledgedAt: pendingCall.acknowledgedAt?.toISOString() ?? null,
            lines: pendingCall.lines.map((line) => ({
              menuItemId: line.menuItemId,
              name: line.name,
              qty: line.qty,
              note: line.note,
            })),
          }
        : null,
      items,
      kitchenSummary: {
        totalPending: queued.length,
        yourPendingCount: items.filter((i) => i.status === "PENDING").length,
        yourPendingFires: yourPendingFireIds.size,
      },
    });
  }

  private async resolveRequestLines(
    items: GuestServiceRequestLineDto[],
  ): Promise<
    | {
        ok: true;
        lines: {
          menuItemId: string;
          name: string;
          qty: number;
          note: string | null;
        }[];
      }
    | { ok: false; message: string }
  > {
    if (items.length === 0) {
      return { ok: true, lines: [] };
    }

    const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];
    const menuItems = await this.db.client.menuItem.findMany({
      where: { id: { in: menuItemIds }, isAvailable: true },
    });
    if (menuItems.length !== menuItemIds.length) {
      return { ok: false, message: "One or more items are unavailable" };
    }

    const menuById = new Map(menuItems.map((item) => [item.id, item]));
    return {
      ok: true,
      lines: items.map((line) => {
        const menuItem = menuById.get(line.menuItemId)!;
        return {
          menuItemId: menuItem.id,
          name: menuItem.name,
          qty: line.qty,
          note: line.note?.trim() ? line.note.trim() : null,
        };
      }),
    };
  }

  private async mergeRequestLines(
    requestId: string,
    existing: { id: string; menuItemId: string; qty: number }[],
    incoming: {
      menuItemId: string;
      name: string;
      qty: number;
      note: string | null;
    }[],
  ) {
    const byMenuItem = new Map(existing.map((line) => [line.menuItemId, line]));
    for (const line of incoming) {
      const current = byMenuItem.get(line.menuItemId);
      if (current) {
        await this.db.client.serviceRequestLine.update({
          where: { id: current.id },
          data: {
            qty: current.qty + line.qty,
            note: line.note ?? undefined,
          },
        });
        current.qty += line.qty;
      } else {
        const created = await this.db.client.serviceRequestLine.create({
          data: {
            serviceRequestId: requestId,
            menuItemId: line.menuItemId,
            name: line.name,
            qty: line.qty,
            note: line.note,
          },
        });
        byMenuItem.set(line.menuItemId, created);
      }
    }
  }
}
