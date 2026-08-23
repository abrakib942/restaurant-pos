import { Injectable } from '@nestjs/common';
import { DbService } from '@/db/db.service';
import { createSuccessResult, ServiceResult } from '@/common/interfaces/service-result.interface';
import { isExpoStale } from '@/common/utils/expo-meta';

export type ReadyNotification = {
  id: string;
  name: string;
  qty: number;
  tableLabel: string;
  tableId: string;
  readyAt: string | null;
  orderId: string;
  mine: boolean;
};

export type WaiterNotificationsData = {
  ready: ReadyNotification[];
  count: number;
  mineCount: number;
  staleCount: number;
};

@Injectable()
export class WaiterService {
  constructor(private readonly db: DbService) {}

  async getFloor() {
    const [tables, waitlistEntries] = await Promise.all([
      this.db.client.table.findMany({
        include: {
          orders: {
            where: { status: 'OPEN' },
            include: { _count: { select: { items: true } } },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      this.db.client.waitlistEntry.findMany({
        where: { status: { in: ['WAITING', 'NOTIFIED'] } },
        orderBy: [{ createdAt: 'asc' }],
        take: 5,
        include: { seatedTable: { select: { label: true } } },
      }),
    ]);

    const sorted = [...tables].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true }),
    );

    const waitMinutes = (createdAt: Date) =>
      Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 60_000));

    return createSuccessResult({
      tables: sorted.map((table) => ({
        id: table.id,
        label: table.label,
        status: table.status,
        openOrderItemCount: table.orders[0]?._count.items ?? 0,
      })),
      waitlist: waitlistEntries.map((entry) => ({
        id: entry.id,
        partyName: entry.partyName,
        partySize: entry.partySize,
        phone: entry.phone,
        status: entry.status,
        quotedMinutes: entry.quotedMinutes,
        seatedTableLabel: entry.seatedTable?.label ?? null,
        seatedAt: entry.seatedAt?.toISOString() ?? null,
        createdAt: entry.createdAt.toISOString(),
        waitMinutes: waitMinutes(entry.createdAt),
      })),
    });
  }

  async getTablePos(tableId: string) {
    const table = await this.db.client.table.findUnique({
      where: { id: tableId },
    });
    if (!table) {
      return createSuccessResult(null);
    }

    const [categories, menuItems, openOrders, allTables, waiters, activeOrder] =
      await Promise.all([
        this.db.client.category.findMany({
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
        this.db.client.menuItem.findMany({
          orderBy: [
            { category: { sortOrder: 'asc' } },
            { sortOrder: 'asc' },
            { name: 'asc' },
          ],
          include: { category: { select: { id: true, name: true } } },
        }),
        this.db.client.order.findMany({
          where: { tableId: table.id, status: 'OPEN' },
          include: {
            items: { orderBy: { createdAt: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        }),
        this.db.client.table.findMany({
          orderBy: { label: 'asc' },
          include: {
            orders: {
              where: { status: 'OPEN' },
              take: 1,
              select: { id: true },
            },
          },
        }),
        this.db.client.user.findMany({
          where: { role: 'WAITER' },
          orderBy: { name: 'asc' },
          select: { id: true, name: true },
        }),
        this.db.client.order.findFirst({
          where: {
            tableId: table.id,
            status: { in: ['OPEN', 'BILLING'] },
          },
          select: { id: true, waiterId: true },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

    const existingLines = openOrders.flatMap((order) => order.items);

    return createSuccessResult({
      table: {
        id: table.id,
        label: table.label,
        status: table.status,
      },
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
      })),
      menuItems: menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price.toFixed(2),
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable,
        categoryId: item.categoryId,
        categoryName: item.category.name,
      })),
      existingLines: existingLines.map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice.toFixed(2),
        status: item.status,
      })),
      floorOps: {
        hasActiveOrder: !!activeOrder,
        currentWaiterId: activeOrder?.waiterId ?? null,
        tables: allTables.map((t) => ({
          id: t.id,
          label: t.label,
          status: t.status,
          hasOpenOrder: t.orders.length > 0,
        })),
        waiters,
      },
    });
  }

  async getTableCheckout(tableId: string, orderId?: string) {
    const table = await this.db.client.table.findUnique({ where: { id: tableId } });
    if (!table) {
      return createSuccessResult(null);
    }

    const orders = await this.db.client.order.findMany({
      where: {
        tableId: table.id,
        status: { in: ['OPEN', 'BILLING'] },
      },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        bill: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const selected = orders.find((o) => o.id === orderId) ?? orders[0] ?? null;

    return createSuccessResult({
      table: {
        id: table.id,
        label: table.label,
        status: table.status,
      },
      checks: orders.map((order, index) => ({
        id: order.id,
        label: `Check ${index + 1}`,
        status: order.status,
      })),
      order: selected ? { id: selected.id, status: selected.status } : null,
      lines:
        selected?.items.map((item) => ({
          id: item.id,
          name: item.name,
          qty: item.qty,
          unitPrice: item.unitPrice.toFixed(2),
          status: item.status,
          voided: item.voidedAt != null,
        })) ?? [],
      bill: selected?.bill
        ? {
            subtotal: selected.bill.subtotal.toFixed(2),
            discount: selected.bill.discount.toFixed(2),
            tax: selected.bill.tax.toFixed(2),
            tip: selected.bill.tip.toFixed(2),
            total: selected.bill.total.toFixed(2),
            paymentMethod: selected.bill.paymentMethod,
            paidAt: selected.bill.paidAt?.toISOString() ?? null,
          }
        : null,
    });
  }

  async getNotifications(waiterId: string): Promise<ServiceResult<WaiterNotificationsData>> {
    const items = await this.db.client.orderItem.findMany({
      where: {
        voidedAt: null,
        status: 'READY',
        order: { status: { in: ['OPEN', 'BILLING'] } },
      },
      include: {
        order: {
          select: {
            id: true,
            waiterId: true,
            tableId: true,
            table: { select: { label: true } },
          },
        },
      },
      orderBy: [{ readyAt: 'asc' }, { createdAt: 'asc' }],
    });

    const ready = items.map((item) => ({
      id: item.id,
      name: item.name,
      qty: item.qty,
      tableLabel: item.order.table.label,
      tableId: item.order.tableId,
      orderId: item.order.id,
      readyAt: item.readyAt?.toISOString() ?? null,
      mine: item.order.waiterId === waiterId,
    }));

    return createSuccessResult({
      ready,
      count: ready.length,
      mineCount: ready.filter((r) => r.mine).length,
      staleCount: ready.filter((r) => isExpoStale(r.readyAt)).length,
    });
  }
}
