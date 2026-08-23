"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { courseForCategoryName } from "@/lib/kitchen-meta";
import { pickDefaultWaiterId } from "@/lib/floor";
import { notifyKitchen, notifyWaiter } from "@/lib/realtime";

const guestItemsSchema = z.object({
  qrSlug: z.string().min(1),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        qty: z.number().int().min(1).max(99),
      }),
    )
    .min(1, "Add at least one item"),
});

const serviceSchema = z.object({
  qrSlug: z.string().min(1),
  type: z.enum(["CALL_WAITER", "REQUEST_BILL"]),
});

function revalidateGuestTable(
  qrSlug: string,
  tableId: string,
  realtime: "kitchen" | "waiter",
) {
  revalidatePath(`/menu/${qrSlug}`);
  revalidatePath("/waiter");
  revalidatePath(`/waiter/tables/${tableId}`);
  revalidatePath("/kitchen");
  if (realtime === "kitchen") notifyKitchen();
  else notifyWaiter();
}

export async function submitGuestOrder(input: {
  qrSlug: string;
  items: { menuItemId: string; qty: number }[];
}): Promise<ActionResult & { orderId?: string }> {
  const parsed = guestItemsSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid order");
  }

  const table = await prisma.table.findUnique({
    where: { qrSlug: parsed.data.qrSlug },
  });
  if (!table) return actionError("Table not found");
  if (table.status === "BILLING") {
    return actionError("This table is closing out — ask your waiter for help");
  }

  const menuItemIds = [...new Set(parsed.data.items.map((i) => i.menuItemId))];
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, isAvailable: true },
    include: {
      category: { select: { name: true, stationId: true } },
    },
  });
  if (menuItems.length !== menuItemIds.length) {
    return actionError("One or more items are unavailable");
  }

  const menuById = new Map(menuItems.map((item) => [item.id, item]));

  const lineCreates = parsed.data.items.map((line) => {
    const menuItem = menuById.get(line.menuItemId)!;
    return {
      menuItemId: menuItem.id,
      name: menuItem.name,
      unitPrice: menuItem.price,
      qty: line.qty,
      status: "PENDING" as const,
      stationId: menuItem.category.stationId,
      priority: "NORMAL" as const,
      course: courseForCategoryName(menuItem.category.name),
    };
  });

  const existingOpen = await prisma.order.findFirst({
    where: { tableId: table.id, status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });

  let orderId: string;

  if (existingOpen) {
    await prisma.orderItem.createMany({
      data: lineCreates.map((line) => ({
        ...line,
        orderId: existingOpen.id,
      })),
    });
    orderId = existingOpen.id;
  } else {
    const waiterId = await pickDefaultWaiterId();
    const order = await prisma.order.create({
      data: {
        tableId: table.id,
        waiterId,
        source: "GUEST",
        status: "OPEN",
        items: { create: lineCreates },
      },
    });
    orderId = order.id;
  }

  if (table.status === "AVAILABLE") {
    await prisma.table.update({
      where: { id: table.id },
      data: { status: "OCCUPIED" },
    });
  }

  revalidateGuestTable(table.qrSlug, table.id, "kitchen");

  return {
    ok: true,
    message: existingOpen ? "Added to your order" : "Order sent to kitchen",
    orderId,
  };
}

export async function createGuestServiceRequest(input: {
  qrSlug: string;
  type: "CALL_WAITER" | "REQUEST_BILL";
}): Promise<ActionResult> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid request");
  }

  const table = await prisma.table.findUnique({
    where: { qrSlug: parsed.data.qrSlug },
  });
  if (!table) return actionError("Table not found");

  const existing = await prisma.serviceRequest.findFirst({
    where: {
      tableId: table.id,
      type: parsed.data.type,
      status: "OPEN",
    },
  });
  if (existing) {
    const label =
      parsed.data.type === "CALL_WAITER"
        ? "Waiter already notified"
        : "Bill already requested";
    return actionOk(label);
  }

  await prisma.serviceRequest.create({
    data: {
      tableId: table.id,
      type: parsed.data.type,
    },
  });

  revalidateGuestTable(table.qrSlug, table.id, "waiter");

  const message =
    parsed.data.type === "CALL_WAITER"
      ? "Waiter called — someone will be right over"
      : "Bill requested — your waiter will bring the check";

  return actionOk(message);
}
