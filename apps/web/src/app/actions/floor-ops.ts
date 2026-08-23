"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import {
  getActiveOrderForTable,
  getOpenOrderForTable,
  tableStatusForOrder,
} from "@/lib/floor-ops";
import { notifyKitchen } from "@/lib/realtime";

function revalidateFloor(tableIds: string[]) {
  const unique = [...new Set(tableIds)];
  revalidatePath("/waiter");
  revalidatePath("/admin/tables");
  revalidatePath("/kitchen");
  for (const id of unique) {
    revalidatePath(`/waiter/tables/${id}`);
    revalidatePath(`/waiter/tables/${id}/checkout`);
  }
  notifyKitchen();
}

export async function transferTableOrder(input: {
  fromTableId: string;
  toTableId: string;
}): Promise<ActionResult> {
  await requireRole("WAITER");

  if (input.fromTableId === input.toTableId) {
    return actionError("Pick a different table");
  }

  const [fromTable, toTable, order] = await Promise.all([
    prisma.table.findUnique({ where: { id: input.fromTableId } }),
    prisma.table.findUnique({ where: { id: input.toTableId } }),
    getActiveOrderForTable(input.fromTableId),
  ]);

  if (!fromTable || !toTable) return actionError("Table not found");
  if (!order) return actionError("No active order to transfer");
  if (toTable.status !== "AVAILABLE") {
    return actionError("Target table must be available");
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { tableId: toTable.id },
    }),
    prisma.table.update({
      where: { id: fromTable.id },
      data: { status: "AVAILABLE" },
    }),
    prisma.table.update({
      where: { id: toTable.id },
      data: { status: tableStatusForOrder(order.status) },
    }),
  ]);

  revalidateFloor([fromTable.id, toTable.id]);
  return actionOk(`Order moved to table ${toTable.label}`);
}

export async function mergeTableOrders(input: {
  sourceTableId: string;
  targetTableId: string;
}): Promise<ActionResult> {
  await requireRole("WAITER");

  if (input.sourceTableId === input.targetTableId) {
    return actionError("Pick a different table");
  }

  const [sourceTable, targetTable, sourceOrder, targetOrder] =
    await Promise.all([
      prisma.table.findUnique({ where: { id: input.sourceTableId } }),
      prisma.table.findUnique({ where: { id: input.targetTableId } }),
      getOpenOrderForTable(input.sourceTableId),
      getOpenOrderForTable(input.targetTableId),
    ]);

  if (!sourceTable || !targetTable) return actionError("Table not found");
  if (!sourceOrder) return actionError("Source table has no open order");
  if (sourceOrder.items.length === 0) {
    return actionError("Source order is empty");
  }

  if (!targetOrder) {
    if (targetTable.status !== "AVAILABLE") {
      return actionError("Target table is not free for merge");
    }
    await prisma.$transaction([
      prisma.order.update({
        where: { id: sourceOrder.id },
        data: { tableId: targetTable.id },
      }),
      prisma.table.update({
        where: { id: sourceTable.id },
        data: { status: "AVAILABLE" },
      }),
      prisma.table.update({
        where: { id: targetTable.id },
        data: { status: "OCCUPIED" },
      }),
    ]);
    revalidateFloor([sourceTable.id, targetTable.id]);
    return actionOk(`Combined onto table ${targetTable.label}`);
  }

  await prisma.$transaction([
    prisma.orderItem.updateMany({
      where: { orderId: sourceOrder.id },
      data: { orderId: targetOrder.id },
    }),
    prisma.order.delete({ where: { id: sourceOrder.id } }),
    prisma.table.update({
      where: { id: sourceTable.id },
      data: { status: "AVAILABLE" },
    }),
    prisma.table.update({
      where: { id: targetTable.id },
      data: { status: "OCCUPIED" },
    }),
  ]);

  revalidateFloor([sourceTable.id, targetTable.id]);
  return actionOk(`Merged into table ${targetTable.label}`);
}

const reassignSchema = z.object({
  tableId: z.string().min(1),
  waiterId: z.string().min(1),
});

export async function reassignOrderWaiter(input: {
  tableId: string;
  waiterId: string;
}): Promise<ActionResult> {
  await requireRole("WAITER");

  const parsed = reassignSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const [order, waiter] = await Promise.all([
    getActiveOrderForTable(parsed.data.tableId),
    prisma.user.findFirst({
      where: { id: parsed.data.waiterId, role: "WAITER" },
    }),
  ]);

  if (!order) return actionError("No active order on this table");
  if (!waiter) return actionError("Waiter not found");

  await prisma.order.update({
    where: { id: order.id },
    data: { waiterId: waiter.id },
  });

  revalidateFloor([parsed.data.tableId]);
  return actionOk(`Assigned to ${waiter.name}`);
}

const splitSchema = z.object({
  tableId: z.string().min(1),
  orderId: z.string().min(1),
  itemIds: z.array(z.string().min(1)).min(1, "Select items to split"),
});

export async function splitOrderItems(input: {
  tableId: string;
  orderId: string;
  itemIds: string[];
}): Promise<ActionResult & { newOrderId?: string }> {
  await requireRole("WAITER");

  const parsed = splitSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid split");
  }

  const order = await prisma.order.findFirst({
    where: {
      id: parsed.data.orderId,
      tableId: parsed.data.tableId,
      status: "OPEN",
    },
    include: { items: true },
  });

  if (!order) return actionError("Open order not found");
  if (order.items.length < 2) {
    return actionError("Need at least two items to split");
  }

  const activeItems = order.items.filter((i) => !i.voidedAt);
  const itemIdSet = new Set(parsed.data.itemIds);
  const toMove = activeItems.filter((i) => itemIdSet.has(i.id));
  const staying = activeItems.filter((i) => !itemIdSet.has(i.id));

  if (toMove.length === 0) return actionError("No matching items selected");
  if (staying.length === 0) {
    return actionError("Leave at least one item on the original check");
  }

  const newOrder = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        tableId: order.tableId,
        waiterId: order.waiterId,
        source: order.source,
        status: "OPEN",
      },
    });

    await tx.orderItem.updateMany({
      where: { id: { in: toMove.map((i) => i.id) } },
      data: { orderId: created.id },
    });

    return created;
  });

  revalidateFloor([parsed.data.tableId]);
  return {
    ok: true,
    message: "Split to a new check",
    newOrderId: newOrder.id,
  };
}
