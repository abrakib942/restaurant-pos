import { Injectable } from '@nestjs/common';
import { DbService } from '@/db/db.service';
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from '@/common/interfaces/service-result.interface';
import { courseForCategoryName } from '@/common/utils/kitchen-meta';
import { pickDefaultWaiterId } from '@/common/utils/floor-ops';
import {
  CreateGuestServiceRequestDto,
  SubmitGuestOrderDto,
} from './dto/guest.dto';

@Injectable()
export class GuestService {
  constructor(private readonly db: DbService) {}

  async getGuestMenu(qrSlug: string) {
    const table = await this.db.client.table.findUnique({
      where: { qrSlug },
    });
    if (!table) {
      return createErrorResult(
        { name: 'badRequest', message: 'Table not found' },
        'Table not found',
      );
    }

    const categories = await this.db.client.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        items: {
          where: { isAvailable: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });

    const menuItems = categories.flatMap((category) =>
      category.items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price.toFixed(2),
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable,
        categoryId: category.id,
      })),
    );

    return createSuccessResult({
      table: {
        qrSlug: table.qrSlug,
        label: table.label,
        status: table.status,
      },
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
      menuItems,
    });
  }

  async submitGuestOrder(
    input: SubmitGuestOrderDto,
  ): Promise<ServiceResult<{ orderId: string }>> {
    const table = await this.db.client.table.findUnique({
      where: { qrSlug: input.qrSlug },
    });
    if (!table) {
      return createErrorResult(
        { name: 'badRequest', message: 'Table not found' },
        'Table not found',
      ) as ServiceResult<{ orderId: string }>;
    }
    if (table.status === 'BILLING') {
      return createErrorResult(
        {
          name: 'badRequest',
          message: 'This table is closing out — ask your waiter for help',
        },
        'This table is closing out — ask your waiter for help',
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
        priority: 'NORMAL' as const,
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
      const waiterId = await pickDefaultWaiterId(this.db);
      const order = await this.db.client.order.create({
        data: {
          tableId: table.id,
          waiterId,
          source: 'GUEST',
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
      existingOpen ? 'Added to your order' : 'Order sent to kitchen',
    );
  }

  async createGuestServiceRequest(
    input: CreateGuestServiceRequestDto,
  ): Promise<ServiceResult> {
    const table = await this.db.client.table.findUnique({
      where: { qrSlug: input.qrSlug },
    });
    if (!table) {
      return createErrorResult(
        { name: 'badRequest', message: 'Table not found' },
        'Table not found',
      );
    }

    const existing = await this.db.client.serviceRequest.findFirst({
      where: {
        tableId: table.id,
        type: input.type,
        status: 'OPEN',
      },
    });
    if (existing) {
      const label =
        input.type === 'CALL_WAITER'
          ? 'Waiter already notified'
          : 'Bill already requested';
      return createSuccessResult(undefined, label);
    }

    await this.db.client.serviceRequest.create({
      data: {
        tableId: table.id,
        type: input.type,
      },
    });

    const message =
      input.type === 'CALL_WAITER'
        ? 'Waiter called — someone will be right over'
        : 'Bill requested — your waiter will bring the check';

    return createSuccessResult(undefined, message);
  }
}
