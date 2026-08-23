import { prisma } from "@/lib/prisma";

/** Assign guest orders to the waiter with the fewest active tables. */
export async function pickDefaultWaiterId(): Promise<string> {
  const waiters = await prisma.user.findMany({
    where: { role: "WAITER" },
    select: {
      id: true,
      _count: {
        select: {
          orders: {
            where: { status: { in: ["OPEN", "BILLING"] } },
          },
        },
      },
    },
  });

  if (waiters.length === 0) {
    throw new Error("No waiters configured");
  }

  waiters.sort((a, b) => a._count.orders - b._count.orders);
  return waiters[0]!.id;
}
