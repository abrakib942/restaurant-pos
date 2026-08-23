"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

function revalidateService(tableId: string) {
  revalidatePath("/waiter");
  revalidatePath(`/waiter/tables/${tableId}`);
  revalidatePath(`/waiter/tables/${tableId}/checkout`);
  revalidatePath("/kitchen");
  revalidatePath("/admin");
  revalidatePath("/admin/tables");
}

export async function markItemServed(
  orderItemId: string,
): Promise<ActionResult> {
  const session = await requireRole("WAITER");

  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      order: {
        select: { id: true, waiterId: true, tableId: true, status: true },
      },
    },
  });

  if (!item) return actionError("Item not found");
  if (item.order.waiterId !== session.userId) {
    return actionError("This ticket belongs to another waiter");
  }
  if (item.status !== "READY") {
    return actionError("Only ready items can be marked served");
  }

  await prisma.orderItem.update({
    where: { id: orderItemId },
    data: {
      status: "SERVED",
      servedAt: new Date(),
    },
  });

  revalidateService(item.order.tableId);
  return actionOk("Marked served");
}

const discountSchema = z.object({
  tableId: z.string().min(1),
  discount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Discount must be a valid amount")
    .transform((v) => Number(v))
    .refine((v) => v >= 0, "Discount cannot be negative"),
});

export async function generateBill(input: {
  tableId: string;
  discount: string;
}): Promise<ActionResult> {
  await requireRole("WAITER");

  const parsed = discountSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid discount");
  }

  const order = await prisma.order.findFirst({
    where: {
      tableId: parsed.data.tableId,
      status: "OPEN",
    },
    include: { items: true, bill: true },
    orderBy: { createdAt: "desc" },
  });

  if (!order) {
    return actionError("No open order for this table");
  }
  if (order.items.length === 0) {
    return actionError("Order has no items");
  }
  if (order.bill) {
    return actionError("Bill already exists");
  }

  const subtotal = order.items.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.qty,
    0,
  );
  const discount = Math.min(parsed.data.discount, subtotal);
  const total = Math.max(0, subtotal - discount);

  await prisma.$transaction([
    prisma.bill.create({
      data: {
        orderId: order.id,
        subtotal: subtotal.toFixed(2),
        discount: discount.toFixed(2),
        total: total.toFixed(2),
      },
    }),
    prisma.order.update({
      where: { id: order.id },
      data: { status: "BILLING" },
    }),
    prisma.table.update({
      where: { id: parsed.data.tableId },
      data: { status: "BILLING" },
    }),
  ]);

  revalidateService(parsed.data.tableId);
  return actionOk("Bill generated");
}

export async function markBillPaid(tableId: string): Promise<ActionResult> {
  await requireRole("WAITER");

  const order = await prisma.order.findFirst({
    where: {
      tableId,
      status: "BILLING",
    },
    include: { bill: true },
    orderBy: { createdAt: "desc" },
  });

  if (!order) return actionError("No billing order for this table");
  if (!order.bill) return actionError("Generate a bill first");
  if (order.bill.paidAt) return actionError("Bill already paid");

  await prisma.$transaction([
    prisma.bill.update({
      where: { id: order.bill.id },
      data: { paidAt: new Date() },
    }),
    prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    }),
    prisma.table.update({
      where: { id: tableId },
      data: { status: "AVAILABLE" },
    }),
  ]);

  revalidateService(tableId);
  return actionOk("Payment recorded — table is free");
}
