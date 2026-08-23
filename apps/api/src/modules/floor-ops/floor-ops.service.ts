import { Injectable } from '@nestjs/common';
import { DbService } from '@/db/db.service';
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from '@/common/interfaces/service-result.interface';
import {
  getActiveOrderForTable,
  getOpenOrderForTable,
  tableStatusForOrder,
} from '@/common/utils/floor-ops';
import {
  MergeTableOrdersDto,
  ReassignOrderWaiterDto,
  SplitOrderItemsDto,
  TransferTableOrderDto,
} from './dto/floor-ops.dto';

@Injectable()
export class FloorOpsService {
  constructor(private readonly db: DbService) {}

  async transferTableOrder(input: TransferTableOrderDto): Promise<ServiceResult> {
    if (input.fromTableId === input.toTableId) {
      return createErrorResult(
        { name: 'badRequest', message: 'Pick a different table' },
        'Pick a different table',
      );
    }

    const [fromTable, toTable, order] = await Promise.all([
      this.db.client.table.findUnique({ where: { id: input.fromTableId } }),
      this.db.client.table.findUnique({ where: { id: input.toTableId } }),
      getActiveOrderForTable(this.db, input.fromTableId),
    ]);

    if (!fromTable || !toTable) {
      return createErrorResult(
        { name: 'badRequest', message: 'Table not found' },
        'Table not found',
      );
    }
    if (!order) {
      return createErrorResult(
        { name: 'badRequest', message: 'No active order to transfer' },
        'No active order to transfer',
      );
    }
    if (toTable.status !== 'AVAILABLE') {
      return createErrorResult(
        { name: 'badRequest', message: 'Target table must be available' },
        'Target table must be available',
      );
    }

    await this.db.client.$transaction([
      this.db.client.order.update({
        where: { id: order.id },
        data: { tableId: toTable.id },
      }),
      this.db.client.table.update({
        where: { id: fromTable.id },
        data: { status: 'AVAILABLE' },
      }),
      this.db.client.table.update({
        where: { id: toTable.id },
        data: { status: tableStatusForOrder(order.status) },
      }),
    ]);

    return createSuccessResult(undefined, `Order moved to table ${toTable.label}`);
  }

  async mergeTableOrders(input: MergeTableOrdersDto): Promise<ServiceResult> {
    if (input.sourceTableId === input.targetTableId) {
      return createErrorResult(
        { name: 'badRequest', message: 'Pick a different table' },
        'Pick a different table',
      );
    }

    const [sourceTable, targetTable, sourceOrder, targetOrder] =
      await Promise.all([
        this.db.client.table.findUnique({ where: { id: input.sourceTableId } }),
        this.db.client.table.findUnique({ where: { id: input.targetTableId } }),
        getOpenOrderForTable(this.db, input.sourceTableId),
        getOpenOrderForTable(this.db, input.targetTableId),
      ]);

    if (!sourceTable || !targetTable) {
      return createErrorResult(
        { name: 'badRequest', message: 'Table not found' },
        'Table not found',
      );
    }
    if (!sourceOrder) {
      return createErrorResult(
        { name: 'badRequest', message: 'Source table has no open order' },
        'Source table has no open order',
      );
    }
    if (sourceOrder.items.length === 0) {
      return createErrorResult(
        { name: 'badRequest', message: 'Source order is empty' },
        'Source order is empty',
      );
    }

    if (!targetOrder) {
      if (targetTable.status !== 'AVAILABLE') {
        return createErrorResult(
          { name: 'badRequest', message: 'Target table is not free for merge' },
          'Target table is not free for merge',
        );
      }
      await this.db.client.$transaction([
        this.db.client.order.update({
          where: { id: sourceOrder.id },
          data: { tableId: targetTable.id },
        }),
        this.db.client.table.update({
          where: { id: sourceTable.id },
          data: { status: 'AVAILABLE' },
        }),
        this.db.client.table.update({
          where: { id: targetTable.id },
          data: { status: 'OCCUPIED' },
        }),
      ]);
      return createSuccessResult(undefined, `Combined onto table ${targetTable.label}`);
    }

    await this.db.client.$transaction([
      this.db.client.orderItem.updateMany({
        where: { orderId: sourceOrder.id },
        data: { orderId: targetOrder.id },
      }),
      this.db.client.order.delete({ where: { id: sourceOrder.id } }),
      this.db.client.table.update({
        where: { id: sourceTable.id },
        data: { status: 'AVAILABLE' },
      }),
      this.db.client.table.update({
        where: { id: targetTable.id },
        data: { status: 'OCCUPIED' },
      }),
    ]);

    return createSuccessResult(undefined, `Merged into table ${targetTable.label}`);
  }

  async reassignOrderWaiter(input: ReassignOrderWaiterDto): Promise<ServiceResult> {
    const [order, waiter] = await Promise.all([
      getActiveOrderForTable(this.db, input.tableId),
      this.db.client.user.findFirst({
        where: { id: input.waiterId, role: 'WAITER' },
      }),
    ]);

    if (!order) {
      return createErrorResult(
        { name: 'badRequest', message: 'No active order on this table' },
        'No active order on this table',
      );
    }
    if (!waiter) {
      return createErrorResult(
        { name: 'badRequest', message: 'Waiter not found' },
        'Waiter not found',
      );
    }

    await this.db.client.order.update({
      where: { id: order.id },
      data: { waiterId: waiter.id },
    });

    return createSuccessResult(undefined, `Assigned to ${waiter.name}`);
  }

  async splitOrderItems(
    input: SplitOrderItemsDto,
  ): Promise<ServiceResult<{ newOrderId: string }>> {
    const order = await this.db.client.order.findFirst({
      where: {
        id: input.orderId,
        tableId: input.tableId,
        status: 'OPEN',
      },
      include: { items: true },
    });

    if (!order) {
      return createErrorResult(
        { name: 'badRequest', message: 'Open order not found' },
        'Open order not found',
      ) as ServiceResult<{ newOrderId: string }>;
    }
    if (order.items.length < 2) {
      return createErrorResult(
        { name: 'badRequest', message: 'Need at least two items to split' },
        'Need at least two items to split',
      ) as ServiceResult<{ newOrderId: string }>;
    }

    const activeItems = order.items.filter((i) => !i.voidedAt);
    const itemIdSet = new Set(input.itemIds);
    const toMove = activeItems.filter((i) => itemIdSet.has(i.id));
    const staying = activeItems.filter((i) => !itemIdSet.has(i.id));

    if (toMove.length === 0) {
      return createErrorResult(
        { name: 'badRequest', message: 'No matching items selected' },
        'No matching items selected',
      ) as ServiceResult<{ newOrderId: string }>;
    }
    if (staying.length === 0) {
      return createErrorResult(
        { name: 'badRequest', message: 'Leave at least one item on the original check' },
        'Leave at least one item on the original check',
      ) as ServiceResult<{ newOrderId: string }>;
    }

    const newOrder = await this.db.client.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          tableId: order.tableId,
          waiterId: order.waiterId,
          source: order.source,
          status: 'OPEN',
        },
      });

      await tx.orderItem.updateMany({
        where: { id: { in: toMove.map((i) => i.id) } },
        data: { orderId: created.id },
      });

      return created;
    });

    return createSuccessResult({ newOrderId: newOrder.id }, 'Split to a new check');
  }
}
