import { Injectable } from '@nestjs/common';
import { DbService } from '@/db/db.service';
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from '@/common/interfaces/service-result.interface';
import { courseForCategoryName } from '@/common/utils/kitchen-meta';
import { SubmitOrderDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly db: DbService) {}

  async submitOrder(
    input: SubmitOrderDto,
    waiterId: string,
  ): Promise<ServiceResult<{ orderId: string }>> {
    const table = await this.db.client.table.findUnique({
      where: { id: input.tableId },
    });
    if (!table) {
      return createErrorResult(
        { name: 'badRequest', message: 'Table not found' },
        'Table not found',
      ) as ServiceResult<{ orderId: string }>;
    }
    if (table.status === 'BILLING') {
      return createErrorResult(
        { name: 'badRequest', message: 'This table is billing — finish checkout first' },
        'This table is billing — finish checkout first',
      ) as ServiceResult<{ orderId: string }>;
    }

    const menuItemIds = [...new Set(input.items.map((i) => i.menuItemId))];
    const menuItems = await this.db.client.menuItem.findMany({
      where: { id: { in: menuItemIds }, isAvailable: true },
      include: {
        category: { select: { name: true, stationId: true } },
      },
    });
    if (menuItems.length !== menuItemIds.length) {
      return createErrorResult(
        { name: 'badRequest', message: 'One or more items are unavailable' },
        'One or more items are unavailable',
      ) as ServiceResult<{ orderId: string }>;
    }

    const menuById = new Map(menuItems.map((item) => [item.id, item]));

    const lineCreates = input.items.map((line) => {
      const menuItem = menuById.get(line.menuItemId)!;
      return {
        menuItemId: menuItem.id,
        name: menuItem.name,
        unitPrice: menuItem.price,
        qty: line.qty,
        status: 'PENDING' as const,
        stationId: menuItem.category.stationId,
        priority: line.rush ? ('RUSH' as const) : ('NORMAL' as const),
        course: courseForCategoryName(menuItem.category.name),
      };
    });

    const existingOpen = await this.db.client.order.findFirst({
      where: { tableId: table.id, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
    });

    let orderId: string;

    if (existingOpen) {
      await this.db.client.orderItem.createMany({
        data: lineCreates.map((line) => ({
          ...line,
          orderId: existingOpen.id,
        })),
      });
      orderId = existingOpen.id;
    } else {
      const order = await this.db.client.order.create({
        data: {
          tableId: table.id,
          waiterId,
          source: 'WAITER',
          status: 'OPEN',
          items: { create: lineCreates },
        },
      });
      orderId = order.id;
    }

    if (table.status === 'AVAILABLE') {
      await this.db.client.table.update({
        where: { id: table.id },
        data: { status: 'OCCUPIED' },
      });
    }

    return createSuccessResult(
      { orderId },
      existingOpen ? 'Items added to order' : 'Order submitted',
    );
  }
}
