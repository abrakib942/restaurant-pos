import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok, type ServiceResult } from "@/lib/services/result";

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

export async function submitOrderService(input: {
  tableId: string;
  items: { menuItemId: string; qty: number }[];
  waiterId: string;
}): Promise<ServiceResult<{ orderId: string }>> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid order");
  }

  const table = await prisma.table.findUnique({
    where: { id: parsed.data.tableId },
  });
  if (!table) return fail("Table not found");
  if (table.status === "BILLING") {
    return fail("This table is billing — finish checkout first");
  }

  const menuItemIds = [...new Set(parsed.data.items.map((i) => i.menuItemId))];
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds }, isAvailable: true },
  });
  if (menuItems.length !== menuItemIds.length) {
    return fail("One or more items are unavailable");
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
        waiterId: input.waiterId,
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

  return ok(
    existingOpen ? "Items added to order" : "Order submitted",
    { orderId },
  );
}
