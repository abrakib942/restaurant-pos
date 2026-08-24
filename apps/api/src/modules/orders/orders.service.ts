import { Injectable } from "@nestjs/common";
import { DbService } from "@/db/db.service";
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from "@/common/interfaces/service-result.interface";
import { courseForCategoryName } from "@/common/utils/kitchen-meta";
import { SubmitOrderDto } from "./dto/order.dto";

type LineCreate = {
  menuItemId: string;
  name: string;
  unitPrice: string | number;
  qty: number;
  status: "PENDING";
  stationId: string | null;
  priority: "NORMAL" | "RUSH";
  course: number;
};

type SubmitResult = { orderId: string; fireId: string; mode: string };

@Injectable()
export class OrdersService {
  constructor(private readonly db: DbService) {}

  async submitOrder(
    input: SubmitOrderDto,
    waiterId: string,
  ): Promise<ServiceResult<SubmitResult>> {
    const removeItemIds = [...new Set(input.removeItemIds ?? [])];
    const updateItems = input.updateItems ?? [];
    const addItems = input.items ?? [];

    if (
      addItems.length === 0 &&
      removeItemIds.length === 0 &&
      updateItems.length === 0
    ) {
      return createErrorResult(
        { name: "badRequest", message: "Nothing to send" },
        "Nothing to send",
      ) as ServiceResult<SubmitResult>;
    }

    const table = await this.db.client.table.findUnique({
      where: { id: input.tableId },
    });
    if (!table) {
      return createErrorResult(
        { name: "badRequest", message: "Table not found" },
        "Table not found",
      ) as ServiceResult<SubmitResult>;
    }
    if (table.status === "BILLING") {
      return createErrorResult(
        {
          name: "badRequest",
          message: "This table is billing — finish checkout first",
        },
        "This table is billing — finish checkout first",
      ) as ServiceResult<SubmitResult>;
    }

    let lineCreates: LineCreate[] = [];
    if (addItems.length > 0) {
      const menuItemIds = [...new Set(addItems.map((i) => i.menuItemId))];
      const menuItems = await this.db.client.menuItem.findMany({
        where: { id: { in: menuItemIds }, isAvailable: true },
        include: {
          category: { select: { name: true, stationId: true } },
        },
      });
      if (menuItems.length !== menuItemIds.length) {
        return createErrorResult(
          { name: "badRequest", message: "One or more items are unavailable" },
          "One or more items are unavailable",
        ) as ServiceResult<SubmitResult>;
      }
      const menuById = new Map(menuItems.map((item) => [item.id, item]));
      lineCreates = addItems.map((line) => {
        const menuItem = menuById.get(line.menuItemId)!;
        return {
          menuItemId: menuItem.id,
          name: menuItem.name,
          unitPrice: menuItem.price.toFixed(2),
          qty: line.qty,
          status: "PENDING" as const,
          stationId: menuItem.category.stationId,
          priority: line.rush ? ("RUSH" as const) : ("NORMAL" as const),
          course: courseForCategoryName(menuItem.category.name),
        };
      });
    }

    const liveFire = await this.findLiveFire(table.id);

    if (
      liveFire &&
      !this.isPendingFire(liveFire.items) &&
      (removeItemIds.length > 0 || updateItems.length > 0)
    ) {
      return createErrorResult(
        {
          name: "badRequest",
          message:
            "Kitchen is already cooking this fire — you can add items, but not remove or edit existing ones",
        },
        "Kitchen is already cooking this fire — you can add items, but not remove or edit existing ones",
      ) as ServiceResult<SubmitResult>;
    }

    if (!liveFire && (removeItemIds.length > 0 || updateItems.length > 0)) {
      return createErrorResult(
        { name: "badRequest", message: "No pending fire to update" },
        "No pending fire to update",
      ) as ServiceResult<SubmitResult>;
    }

    if (liveFire && this.isPendingFire(liveFire.items)) {
      const pendingIds = new Set(
        liveFire.items.filter((i) => i.status === "PENDING").map((i) => i.id),
      );
      for (const id of removeItemIds) {
        if (!pendingIds.has(id)) {
          return createErrorResult(
            {
              name: "badRequest",
              message: "Only pending lines on the live fire can be removed",
            },
            "Only pending lines on the live fire can be removed",
          ) as ServiceResult<SubmitResult>;
        }
      }
      for (const upd of updateItems) {
        if (!pendingIds.has(upd.orderItemId)) {
          return createErrorResult(
            {
              name: "badRequest",
              message: "Only pending lines on the live fire can be edited",
            },
            "Only pending lines on the live fire can be edited",
          ) as ServiceResult<SubmitResult>;
        }
      }
    }

    const existingOpen = await this.db.client.order.findFirst({
      where: { tableId: table.id, status: "OPEN" },
      orderBy: { createdAt: "desc" },
    });

    let orderId!: string;
    let fireId!: string;
    let mode: "created" | "patchedPending" | "addedToInProgress";

    await this.db.client.$transaction(async (tx) => {
      if (existingOpen) {
        orderId = existingOpen.id;
      } else {
        const order = await tx.order.create({
          data: {
            tableId: table.id,
            waiterId,
            source: "WAITER",
            status: "OPEN",
          },
        });
        orderId = order.id;
      }

      if (!liveFire) {
        const firePriority = lineCreates.some((l) => l.priority === "RUSH")
          ? ("RUSH" as const)
          : ("NORMAL" as const);
        const courseMin =
          lineCreates.length > 0
            ? Math.min(...lineCreates.map((l) => l.course))
            : 2;
        const fire = await tx.kitchenFire.create({
          data: {
            orderId,
            tableId: table.id,
            waiterId,
            priority: firePriority,
            courseMin,
          },
        });
        fireId = fire.id;
        mode = "created";
        await tx.orderItem.createMany({
          data: lineCreates.map((line) => ({
            ...line,
            orderId,
            fireId: fire.id,
          })),
        });
        return;
      }

      fireId = liveFire.id;
      mode = this.isPendingFire(liveFire.items)
        ? "patchedPending"
        : "addedToInProgress";

      if (mode === "patchedPending") {
        if (removeItemIds.length > 0) {
          await tx.orderItem.updateMany({
            where: { id: { in: removeItemIds }, fireId: liveFire.id },
            data: {
              voidedAt: new Date(),
              voidReason: "Removed before kitchen started",
              voidedById: waiterId,
            },
          });
        }
        for (const upd of updateItems) {
          if (removeItemIds.includes(upd.orderItemId)) continue;
          await tx.orderItem.update({
            where: { id: upd.orderItemId },
            data: { qty: upd.qty },
          });
        }
      }

      if (lineCreates.length > 0) {
        await tx.orderItem.createMany({
          data: lineCreates.map((line) => ({
            ...line,
            orderId,
            fireId: liveFire.id,
          })),
        });
      }

      const remaining = await tx.orderItem.findMany({
        where: { fireId: liveFire.id, voidedAt: null },
        select: { priority: true, course: true },
      });
      if (remaining.length > 0) {
        await tx.kitchenFire.update({
          where: { id: liveFire.id },
          data: {
            priority: remaining.some((i) => i.priority === "RUSH")
              ? "RUSH"
              : "NORMAL",
            courseMin: Math.min(...remaining.map((i) => i.course)),
            readyAt: null,
            waiterId,
          },
        });
      }
    });

    if (table.status === "AVAILABLE") {
      await this.db.client.table.update({
        where: { id: table.id },
        data: { status: "OCCUPIED" },
      });
    }

    if (input.serviceRequestId) {
      await this.closeGuestCartRequest(input.serviceRequestId, table.id);
    }

    const message =
      mode === "created"
        ? "Order submitted"
        : mode === "patchedPending"
          ? "Pending fire updated"
          : "Items added to cooking fire";

    return createSuccessResult({ orderId, fireId, mode }, message);
  }

  private isPendingFire(items: { status: string }[]): boolean {
    return items.length > 0 && items.every((i) => i.status === "PENDING");
  }

  private async findLiveFire(tableId: string) {
    const fires = await this.db.client.kitchenFire.findMany({
      where: {
        tableId,
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
          select: {
            id: true,
            status: true,
            priority: true,
            course: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    return fires[0] ?? null;
  }

  private async closeGuestCartRequest(
    serviceRequestId: string,
    tableId: string,
  ) {
    const request = await this.db.client.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      include: { lines: { select: { id: true } } },
    });
    if (!request) return;
    if (request.tableId !== tableId) return;
    if (request.type !== "CALL_WAITER") return;
    if (request.status !== "OPEN") return;
    if (request.lines.length === 0) return;

    await this.db.client.serviceRequest.update({
      where: { id: request.id },
      data: {
        status: "DONE",
        acknowledgedAt: request.acknowledgedAt ?? new Date(),
      },
    });
  }
}
