import { prisma } from "@/lib/prisma";

export async function getOpenOrderForTable(tableId: string) {
  return prisma.order.findFirst({
    where: { tableId, status: "OPEN" },
    include: { items: true, bill: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getActiveOrderForTable(tableId: string) {
  const open = await getOpenOrderForTable(tableId);
  if (open) return open;
  return prisma.order.findFirst({
    where: { tableId, status: "BILLING" },
    include: { items: true, bill: true },
    orderBy: { createdAt: "asc" },
  });
}

export function tableStatusForOrder(
  orderStatus: "OPEN" | "BILLING" | "PAID",
): "OCCUPIED" | "BILLING" {
  return orderStatus === "BILLING" ? "BILLING" : "OCCUPIED";
}
