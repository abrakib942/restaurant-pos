import type { Prisma } from '@repo/db';
import { DbService } from '@/db/db.service';

type OrderWithItemsAndBill = Prisma.OrderGetPayload<{
  include: { items: true; bill: true };
}>;

export async function getOpenOrderForTable(
  db: DbService,
  tableId: string,
): Promise<OrderWithItemsAndBill | null> {
  return db.client.order.findFirst({
    where: { tableId, status: 'OPEN' },
    include: { items: true, bill: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getActiveOrderForTable(
  db: DbService,
  tableId: string,
): Promise<OrderWithItemsAndBill | null> {
  const open = await getOpenOrderForTable(db, tableId);
  if (open) return open;
  return db.client.order.findFirst({
    where: { tableId, status: 'BILLING' },
    include: { items: true, bill: true },
    orderBy: { createdAt: 'asc' },
  });
}

export function tableStatusForOrder(
  orderStatus: 'OPEN' | 'BILLING' | 'PAID',
): 'OCCUPIED' | 'BILLING' {
  return orderStatus === 'BILLING' ? 'BILLING' : 'OCCUPIED';
}

/** Assign guest orders to the waiter with the fewest active tables. */
export async function pickDefaultWaiterId(db: DbService): Promise<string> {
  const waiters = await db.client.user.findMany({
    where: { role: 'WAITER' },
    select: {
      id: true,
      _count: {
        select: {
          orders: {
            where: { status: { in: ['OPEN', 'BILLING'] } },
          },
        },
      },
    },
  });

  if (waiters.length === 0) {
    throw new Error('No waiters configured');
  }

  waiters.sort((a, b) => a._count.orders - b._count.orders);
  return waiters[0]!.id;
}
