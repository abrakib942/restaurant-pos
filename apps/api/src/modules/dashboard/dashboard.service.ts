import { Injectable } from '@nestjs/common';
import { DbService } from '@/db/db.service';
import { createSuccessResult, ServiceResult } from '@/common/interfaces/service-result.interface';

export type TopItem = {
  name: string;
  qty: number;
};

export type AdminDashboardData = {
  dateLabel: string;
  salesToday: number;
  paidOrdersToday: number;
  openOrders: number;
  billingOrders: number;
  tables: {
    available: number;
    occupied: number;
    billing: number;
    total: number;
  };
  topItems: TopItem[];
};

function startOfLocalDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfLocalDay(date = new Date()) {
  const d = startOfLocalDay(date);
  d.setDate(d.getDate() + 1);
  return d;
}

@Injectable()
export class DashboardService {
  constructor(private readonly db: DbService) {}

  async getAdminDashboard(): Promise<ServiceResult<AdminDashboardData>> {
    const start = startOfLocalDay();
    const end = endOfLocalDay();

    const [paidBills, openOrders, billingOrders, tableGroups, paidItems] =
      await Promise.all([
        this.db.client.bill.findMany({
          where: { paidAt: { gte: start, lt: end } },
          select: { total: true },
        }),
        this.db.client.order.count({ where: { status: 'OPEN' } }),
        this.db.client.order.count({ where: { status: 'BILLING' } }),
        this.db.client.table.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        this.db.client.orderItem.findMany({
          where: {
            order: {
              bill: { paidAt: { gte: start, lt: end } },
            },
          },
          select: { name: true, qty: true },
        }),
      ]);

    const salesToday = paidBills.reduce(
      (sum, bill) => sum + Number(bill.total),
      0,
    );

    const tables = { available: 0, occupied: 0, billing: 0, total: 0 };
    for (const group of tableGroups) {
      const count = group._count._all;
      tables.total += count;
      if (group.status === 'AVAILABLE') tables.available = count;
      if (group.status === 'OCCUPIED') tables.occupied = count;
      if (group.status === 'BILLING') tables.billing = count;
    }

    const qtyByName = new Map<string, number>();
    for (const item of paidItems) {
      qtyByName.set(item.name, (qtyByName.get(item.name) ?? 0) + item.qty);
    }

    const topItems = [...qtyByName.entries()]
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name))
      .slice(0, 8);

    return createSuccessResult({
      dateLabel: start.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
      salesToday,
      paidOrdersToday: paidBills.length,
      openOrders,
      billingOrders,
      tables,
      topItems,
    });
  }
}
