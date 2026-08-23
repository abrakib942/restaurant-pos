"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { notifyKitchen } from "@/lib/realtime";
import { KITCHEN_IN_PROGRESS_CAP } from "@/lib/constants";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

function revalidateKitchen() {
  revalidatePath("/kitchen");
  revalidatePath("/waiter");
  notifyKitchen();
}

export async function startKitchenItem(
  orderItemId: string,
): Promise<ActionResult> {
  await requireRole("KITCHEN");

  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: { select: { status: true } } },
  });

  if (!item) return actionError("Ticket not found");
  if (item.voidedAt) return actionError("Ticket was voided");
  if (item.status !== "PENDING") {
    return actionError("Only pending tickets can be started");
  }
  if (!["OPEN", "BILLING"].includes(item.order.status)) {
    return actionError("Order is no longer active");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const inProgressCount = await tx.orderItem.count({
      where: { status: "IN_PROGRESS" },
    });

    if (inProgressCount >= KITCHEN_IN_PROGRESS_CAP) {
      return null;
    }

    return tx.orderItem.update({
      where: { id: orderItemId },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
      },
    });
  });

  if (!updated) {
    return actionError(
      `Kitchen is full — only ${KITCHEN_IN_PROGRESS_CAP} tickets can be in progress`,
    );
  }

  revalidateKitchen();
  return actionOk("Ticket in progress");
}

export async function markKitchenItemReady(
  orderItemId: string,
): Promise<ActionResult> {
  await requireRole("KITCHEN");

  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: { select: { status: true } } },
  });

  if (!item) return actionError("Ticket not found");
  if (item.voidedAt) return actionError("Ticket was voided");
  if (item.status !== "IN_PROGRESS") {
    return actionError("Only in-progress tickets can be marked ready");
  }
  if (!["OPEN", "BILLING"].includes(item.order.status)) {
    return actionError("Order is no longer active");
  }

  await prisma.orderItem.update({
    where: { id: orderItemId },
    data: {
      status: "READY",
      readyAt: new Date(),
    },
  });

  revalidateKitchen();
  return actionOk("Ticket ready for service");
}
