"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { notifyWaiter } from "@/lib/realtime";

function revalidateServiceRequest(tableId: string) {
  revalidatePath("/waiter");
  revalidatePath(`/waiter/tables/${tableId}`);
  revalidatePath(`/waiter/tables/${tableId}/checkout`);
}

export async function acknowledgeServiceRequest(
  requestId: string,
): Promise<ActionResult> {
  await requireRole("WAITER");

  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    include: { table: { select: { id: true, qrSlug: true } } },
  });

  if (!request) return actionError("Request not found");
  if (request.status !== "OPEN") {
    return actionError("Request already handled");
  }

  await prisma.serviceRequest.update({
    where: { id: requestId },
    data: {
      status: "DONE",
      acknowledgedAt: new Date(),
    },
  });

  revalidateServiceRequest(request.table.id);
  revalidatePath(`/menu/${request.table.qrSlug}`);
  notifyWaiter();

  return actionOk("Request cleared");
}
