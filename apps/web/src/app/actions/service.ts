"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import {
  computeBillTotals,
  parseMoneyInput,
  parseTaxRatePercent,
} from "@/lib/billing";
import { notifyKitchen } from "@/lib/realtime";
import { AuditAction, writeAuditLog } from "@/lib/audit";

function revalidateService(tableId: string) {
  revalidatePath("/waiter");
  revalidatePath(`/waiter/tables/${tableId}`);
  revalidatePath(`/waiter/tables/${tableId}/checkout`);
  revalidatePath("/kitchen");
  revalidatePath("/admin");
  revalidatePath("/admin/tables");
  notifyKitchen();
}

export async function markItemServed(
  orderItemId: string,
): Promise<ActionResult> {
  await requireRole("WAITER");

  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      order: {
        select: { id: true, waiterId: true, tableId: true, status: true },
      },
    },
  });

  if (!item) return actionError("Item not found");
  if (item.voidedAt) return actionError("Item was voided");
  if (!["OPEN", "BILLING"].includes(item.order.status)) {
    return actionError("Order is no longer active");
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

const generateBillSchema = z.object({
  tableId: z.string().min(1),
  orderId: z.string().min(1),
  discount: z.string().trim(),
  taxRatePercent: z.string().trim(),
  tip: z.string().trim(),
});

export async function generateBill(input: {
  tableId: string;
  orderId: string;
  discount: string;
  taxRatePercent: string;
  tip: string;
}): Promise<ActionResult> {
  const session = await requireRole("WAITER");

  const parsed = generateBillSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid bill");
  }

  const discount = parseMoneyInput(parsed.data.discount);
  if (discount === null) return actionError("Discount must be a valid amount");

  const taxRate = parseTaxRatePercent(parsed.data.taxRatePercent);
  if (taxRate === null) {
    return actionError("Tax rate must be between 0 and 30%");
  }

  const tip = parseMoneyInput(parsed.data.tip || "0");
  if (tip === null) return actionError("Tip must be a valid amount");

  const order = await prisma.order.findFirst({
    where: {
      id: parsed.data.orderId,
      tableId: parsed.data.tableId,
      status: "OPEN",
    },
    include: { items: true, bill: true },
  });

  if (!order) return actionError("No open order for this check");

  const billableItems = order.items.filter((item) => !item.voidedAt);
  if (billableItems.length === 0) {
    return actionError("No billable items on this check");
  }
  if (order.bill) return actionError("Bill already exists");

  const subtotal = billableItems.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.qty,
    0,
  );

  const totals = computeBillTotals({
    subtotal,
    discount,
    taxRate,
    tip,
  });

  await prisma.$transaction([
    prisma.bill.create({
      data: {
        orderId: order.id,
        subtotal: totals.subtotal.toFixed(2),
        discount: totals.discount.toFixed(2),
        tax: totals.tax.toFixed(2),
        tip: totals.tip.toFixed(2),
        total: totals.total.toFixed(2),
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
    prisma.serviceRequest.updateMany({
      where: {
        tableId: parsed.data.tableId,
        type: "REQUEST_BILL",
        status: "OPEN",
      },
      data: {
        status: "DONE",
        acknowledgedAt: new Date(),
      },
    }),
  ]);

  await writeAuditLog({
    action: AuditAction.BillGenerated,
    actorId: session.userId,
    actorName: session.name,
    target: order.id,
    meta: {
      tableId: parsed.data.tableId,
      total: totals.total.toFixed(2),
    },
  });

  revalidateService(parsed.data.tableId);
  return actionOk("Bill generated");
}

const payBillSchema = z.object({
  tableId: z.string().min(1),
  orderId: z.string().min(1),
  paymentMethod: z.enum(["CASH", "CARD", "OTHER"]),
});

export async function markBillPaid(input: {
  tableId: string;
  orderId: string;
  paymentMethod: "CASH" | "CARD" | "OTHER";
}): Promise<ActionResult> {
  const session = await requireRole("WAITER");

  const parsed = payBillSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid payment");
  }

  const order = await prisma.order.findFirst({
    where: {
      id: parsed.data.orderId,
      tableId: parsed.data.tableId,
      status: "BILLING",
    },
    include: { bill: true },
  });

  if (!order) return actionError("No billing check for this order");
  if (!order.bill) return actionError("Generate a bill first");
  if (order.bill.paidAt) return actionError("Bill already paid");

  await prisma.$transaction([
    prisma.bill.update({
      where: { id: order.bill.id },
      data: {
        paidAt: new Date(),
        paymentMethod: parsed.data.paymentMethod,
      },
    }),
    prisma.order.update({
      where: { id: order.id },
      data: { status: "PAID" },
    }),
  ]);

  const remaining = await prisma.order.findMany({
    where: {
      tableId: parsed.data.tableId,
      status: { in: ["OPEN", "BILLING"] },
    },
    select: { status: true },
  });

  const tableStatus = remaining.some((o) => o.status === "BILLING")
    ? ("BILLING" as const)
    : remaining.some((o) => o.status === "OPEN")
      ? ("OCCUPIED" as const)
      : ("AVAILABLE" as const);

  await prisma.table.update({
    where: { id: parsed.data.tableId },
    data: { status: tableStatus },
  });

  await writeAuditLog({
    action: AuditAction.BillPaid,
    actorId: session.userId,
    actorName: session.name,
    target: order.id,
    meta: {
      tableId: parsed.data.tableId,
      paymentMethod: parsed.data.paymentMethod,
      total: order.bill.total.toFixed(2),
    },
  });

  revalidateService(parsed.data.tableId);
  return actionOk(
    tableStatus === "AVAILABLE"
      ? "Payment recorded — table is free"
      : "Payment recorded",
  );
}
