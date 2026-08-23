import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  computeBillTotals,
  parseMoneyInput,
  parseTaxRatePercent,
} from "@/lib/billing";
import { fail, ok, type ServiceResult } from "@/lib/services/result";

export async function markItemServedService(
  orderItemId: string,
): Promise<ServiceResult> {
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      order: {
        select: { id: true, waiterId: true, tableId: true, status: true },
      },
    },
  });

  if (!item) return fail("Item not found");
  if (item.voidedAt) return fail("Item was voided");
  if (!["OPEN", "BILLING"].includes(item.order.status)) {
    return fail("Order is no longer active");
  }
  if (item.status !== "READY") {
    return fail("Only ready items can be marked served");
  }

  await prisma.orderItem.update({
    where: { id: orderItemId },
    data: {
      status: "SERVED",
      servedAt: new Date(),
    },
  });

  return ok("Marked served");
}

const generateBillSchema = z.object({
  tableId: z.string().min(1),
  discount: z.string().trim(),
  taxRatePercent: z.string().trim().optional(),
  tip: z.string().trim().optional(),
});

export async function generateBillService(input: {
  tableId: string;
  discount: string;
  taxRatePercent?: string;
  tip?: string;
}): Promise<ServiceResult> {
  const parsed = generateBillSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid bill");
  }

  const discount = parseMoneyInput(parsed.data.discount);
  if (discount === null) return fail("Discount must be a valid amount");

  const taxRate = parseTaxRatePercent(parsed.data.taxRatePercent ?? "8.875");
  if (taxRate === null) return fail("Tax rate must be between 0 and 30%");

  const tip = parseMoneyInput(parsed.data.tip ?? "0");
  if (tip === null) return fail("Tip must be a valid amount");

  const order = await prisma.order.findFirst({
    where: {
      tableId: parsed.data.tableId,
      status: "OPEN",
    },
    include: { items: true, bill: true },
    orderBy: { createdAt: "desc" },
  });

  if (!order) return fail("No open order for this table");

  const billableItems = order.items.filter((item) => !item.voidedAt);
  if (billableItems.length === 0)
    return fail("No billable items on this order");
  if (order.bill) return fail("Bill already exists");

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
  ]);

  return ok("Bill generated");
}

export async function markBillPaidService(
  tableId: string,
  paymentMethod: "CASH" | "CARD" | "OTHER" = "CARD",
): Promise<ServiceResult> {
  const order = await prisma.order.findFirst({
    where: {
      tableId,
      status: "BILLING",
    },
    include: { bill: true },
    orderBy: { createdAt: "desc" },
  });

  if (!order) return fail("No billing order for this table");
  if (!order.bill) return fail("Generate a bill first");
  if (order.bill.paidAt) return fail("Bill already paid");

  await prisma.$transaction([
    prisma.bill.update({
      where: { id: order.bill.id },
      data: {
        paidAt: new Date(),
        paymentMethod,
      },
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

  return ok("Payment recorded — table is free");
}
