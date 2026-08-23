"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/action-result";

const submitSchema = z.object({
  tableId: z.string().min(1),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        qty: z.number().int().min(1).max(99),
      }),
    )
    .min(1, "Add at least one item"),
});

export type SubmitOrderResult = ActionResult & { orderId?: string };

export async function submitOrder(input: {
  tableId: string;
  items: { menuItemId: string; qty: number }[];
}): Promise<SubmitOrderResult> {
  const session = await requireRole("WAITER");

  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid order");
  }

  const table = await prisma.table.findUnique({
    where: { id: parsed.data.tableId },
  });
  if (!table) return actionError("Table not found");
  if (table.status === "BILLING") {
    return actionError("This table is billing — finish checkout first");
  }

  const menuItemIds = [...new Set(parsed.data.items.map((i) => i.menuItemId))];
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, isAvailable: true },
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
    const order = await prisma.order.create({
      data: {
        tableId: table.id,
        waiterId: session.userId,
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

  revalidatePath("/waiter");
  revalidatePath(`/waiter/tables/${table.id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/tables");

  return {
    ok: true,
    message: existingOpen ? "Items added to order" : "Order submitted",
    orderId,
  };
}
