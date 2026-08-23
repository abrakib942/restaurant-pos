"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { notifyKitchen } from "@/lib/realtime";
import { AuditAction, writeAuditLog } from "@/lib/audit";

const voidSchema = z.object({
  orderItemId: z.string().min(1),
  reason: z.string().trim().max(200).optional(),
});

export async function voidOrderItem(input: {
  orderItemId: string;
  reason?: string;
}): Promise<ActionResult> {
  const session = await requireRole("ADMIN");

  const parsed = voidSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid void");
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: parsed.data.orderItemId },
    include: {
      order: {
        select: { id: true, status: true, tableId: true },
      },
    },
  });

  if (!item) return actionError("Line item not found");
  if (item.voidedAt) return actionError("Already voided");
  if (!["OPEN", "BILLING"].includes(item.order.status)) {
    return actionError("Cannot void on a closed order");
  }
  if (item.order.status === "BILLING") {
    return actionError(
      "Void before generating the bill, or adjust at checkout",
    );
  }

  await prisma.orderItem.update({
    where: { id: item.id },
    data: {
      voidedAt: new Date(),
      voidReason: parsed.data.reason?.trim() || null,
      voidedById: session.userId,
    },
  });

  await writeAuditLog({
    action: AuditAction.OrderVoid,
    actorId: session.userId,
    actorName: session.name,
    target: item.name,
    meta: {
      orderItemId: item.id,
      qty: item.qty,
      reason: parsed.data.reason?.trim() || null,
    },
  });

  revalidatePath("/admin/reports");
  revalidatePath("/admin/audit");
  revalidatePath(`/waiter/tables/${item.order.tableId}`);
  revalidatePath(`/waiter/tables/${item.order.tableId}/checkout`);
  revalidatePath("/kitchen");
  notifyKitchen();

  return actionOk("Line voided");
}
