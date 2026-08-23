import { Injectable } from '@nestjs/common';
import { DbService } from '@/db/db.service';
import { KITCHEN_IN_PROGRESS_CAP } from '@/common/constants/app.constants';
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from '@/common/interfaces/service-result.interface';

export type KitchenStationInfo = {
  id: string;
  name: string;
};

export type KitchenTicket = {
  id: string;
  name: string;
  qty: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'READY';
  priority: 'NORMAL' | 'RUSH';
  course: number;
  stationId: string | null;
  stationName: string | null;
  tableLabel: string;
  waiterName: string;
  createdAt: string;
  startedAt: string | null;
  readyAt: string | null;
};

export type KitchenBoardData = {
  stations: KitchenStationInfo[];
  pending: KitchenTicket[];
  inProgress: KitchenTicket[];
  ready: KitchenTicket[];
  inProgressCount: number;
  cap: number;
};

function mapTicket(item: {
  id: string;
  name: string;
  qty: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'READY' | 'SERVED';
  priority: 'NORMAL' | 'RUSH';
  course: number;
  stationId: string | null;
  station: { name: string } | null;
  createdAt: Date;
  startedAt: Date | null;
  readyAt: Date | null;
  order: {
    table: { label: string };
    waiter: { name: string };
  };
}): KitchenTicket {
  return {
    id: item.id,
    name: item.name,
    qty: item.qty,
    status: item.status as KitchenTicket['status'],
    priority: item.priority,
    course: item.course,
    stationId: item.stationId,
    stationName: item.station?.name ?? null,
    tableLabel: item.order.table.label,
    waiterName: item.order.waiter.name,
    createdAt: item.createdAt.toISOString(),
    startedAt: item.startedAt?.toISOString() ?? null,
    readyAt: item.readyAt?.toISOString() ?? null,
  };
}

function comparePending(a: KitchenTicket, b: KitchenTicket): number {
  if (a.priority !== b.priority) {
    return a.priority === 'RUSH' ? -1 : 1;
  }
  if (a.course !== b.course) return a.course - b.course;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function sortInProgress(a: KitchenTicket, b: KitchenTicket): number {
  if (a.priority !== b.priority) {
    return a.priority === 'RUSH' ? -1 : 1;
  }
  const aStart = a.startedAt ? new Date(a.startedAt).getTime() : 0;
  const bStart = b.startedAt ? new Date(b.startedAt).getTime() : 0;
  return aStart - bStart;
}

function sortReady(a: KitchenTicket, b: KitchenTicket): number {
  const aReady = a.readyAt ? new Date(a.readyAt).getTime() : 0;
  const bReady = b.readyAt ? new Date(b.readyAt).getTime() : 0;
  return aReady - bReady;
}

@Injectable()
export class KitchenService {
  constructor(private readonly db: DbService) {}

  async getKitchenBoard(): Promise<ServiceResult<KitchenBoardData>> {
    const [stations, items] = await Promise.all([
      this.db.client.kitchenStation.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true },
      }),
      this.db.client.orderItem.findMany({
        where: {
          voidedAt: null,
          status: { in: ['PENDING', 'IN_PROGRESS', 'READY'] },
          order: { status: { in: ['OPEN', 'BILLING'] } },
        },
        include: {
          station: { select: { name: true } },
          order: {
            include: {
              table: { select: { label: true } },
              waiter: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const pending = items
      .filter((i) => i.status === 'PENDING')
      .map(mapTicket)
      .sort(comparePending);
    const inProgress = items
      .filter((i) => i.status === 'IN_PROGRESS')
      .map(mapTicket)
      .sort(sortInProgress);
    const ready = items
      .filter((i) => i.status === 'READY')
      .map(mapTicket)
      .sort(sortReady);

    return createSuccessResult({
      stations,
      pending,
      inProgress,
      ready,
      inProgressCount: inProgress.length,
      cap: KITCHEN_IN_PROGRESS_CAP,
    });
  }

  async startKitchenItem(orderItemId: string): Promise<ServiceResult> {
    const item = await this.db.client.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: { select: { status: true } } },
    });

    if (!item) {
      return createErrorResult(
        { name: 'badRequest', message: 'Ticket not found' },
        'Ticket not found',
      );
    }
    if (item.voidedAt) {
      return createErrorResult(
        { name: 'badRequest', message: 'Ticket was voided' },
        'Ticket was voided',
      );
    }
    if (item.status !== 'PENDING') {
      return createErrorResult(
        { name: 'badRequest', message: 'Only pending tickets can be started' },
        'Only pending tickets can be started',
      );
    }
    if (!['OPEN', 'BILLING'].includes(item.order.status)) {
      return createErrorResult(
        { name: 'badRequest', message: 'Order is no longer active' },
        'Order is no longer active',
      );
    }

    const updated = await this.db.client.$transaction(async (tx) => {
      const inProgressCount = await tx.orderItem.count({
        where: { status: 'IN_PROGRESS' },
      });

      if (inProgressCount >= KITCHEN_IN_PROGRESS_CAP) {
        return null;
      }

      return tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });
    });

    if (!updated) {
      return createErrorResult(
        {
          name: 'badRequest',
          message: `Kitchen is full — only ${KITCHEN_IN_PROGRESS_CAP} tickets can be in progress`,
        },
        `Kitchen is full — only ${KITCHEN_IN_PROGRESS_CAP} tickets can be in progress`,
      );
    }

    return createSuccessResult(undefined, 'Ticket in progress');
  }

  async markKitchenItemReady(orderItemId: string): Promise<ServiceResult> {
    const item = await this.db.client.orderItem.findUnique({
      where: { id: orderItemId },
      include: { order: { select: { status: true } } },
    });

    if (!item) {
      return createErrorResult(
        { name: 'badRequest', message: 'Ticket not found' },
        'Ticket not found',
      );
    }
    if (item.voidedAt) {
      return createErrorResult(
        { name: 'badRequest', message: 'Ticket was voided' },
        'Ticket was voided',
      );
    }
    if (item.status !== 'IN_PROGRESS') {
      return createErrorResult(
        { name: 'badRequest', message: 'Only in-progress tickets can be marked ready' },
        'Only in-progress tickets can be marked ready',
      );
    }
    if (!['OPEN', 'BILLING'].includes(item.order.status)) {
      return createErrorResult(
        { name: 'badRequest', message: 'Order is no longer active' },
        'Order is no longer active',
      );
    }

    await this.db.client.orderItem.update({
      where: { id: orderItemId },
      data: {
        status: 'READY',
        readyAt: new Date(),
      },
    });

    return createSuccessResult(undefined, 'Ticket ready for service');
  }
}
