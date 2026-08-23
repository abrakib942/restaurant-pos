import "server-only";

import { prisma } from "@/lib/prisma";
import { KITCHEN_IN_PROGRESS_CAP } from "@/lib/constants";
import { fail, ok, type ServiceResult } from "@/lib/services/result";

export async function startKitchenItemService(
  orderItemId: string,
): Promise<ServiceResult> {
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: { select: { status: true } } },
  });

  if (!item) return fail("Ticket not found");
  if (item.status !== "PENDING") {
    return fail("Only pending tickets can be started");
  }
  if (!["OPEN", "BILLING"].includes(item.order.status)) {
    return fail("Order is no longer active");
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
    return fail(
      `Kitchen is full — only ${KITCHEN_IN_PROGRESS_CAP} tickets can be in progress`,
    );
  }

  return ok("Ticket in progress");
}

export async function markKitchenItemReadyService(
  orderItemId: string,
): Promise<ServiceResult> {
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: { select: { status: true } } },
  });

  if (!item) return fail("Ticket not found");
  if (item.status !== "IN_PROGRESS") {
    return fail("Only in-progress tickets can be marked ready");
  }
  if (!["OPEN", "BILLING"].includes(item.order.status)) {
    return fail("Order is no longer active");
  }

  await prisma.orderItem.update({
    where: { id: orderItemId },
    data: {
      status: "READY",
      readyAt: new Date(),
    },
  });

  return ok("Ticket ready for service");
}
