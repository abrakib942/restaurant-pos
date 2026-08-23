import { Injectable } from '@nestjs/common';
import { DbService } from '@/db/db.service';
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from '@/common/interfaces/service-result.interface';
import { CreateMenuItemDto, MenuQueryDto, UpdateMenuItemDto } from './dto/menu.dto';

function validateImageUrl(value: string): boolean {
  if (value.startsWith('/uploads/')) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

@Injectable()
export class MenuService {
  constructor(private readonly db: DbService) {}

  async listMenu(query: MenuQueryDto) {
    const [categories, items] = await Promise.all([
      this.db.client.category.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.db.client.menuItem.findMany({
        where: query.categoryId ? { categoryId: query.categoryId } : undefined,
        orderBy: [
          { category: { sortOrder: 'asc' } },
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
        include: { category: { select: { id: true, name: true } } },
      }),
    ]);

    return createSuccessResult({
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price.toFixed(2),
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable,
        sortOrder: item.sortOrder,
        categoryId: item.categoryId,
        categoryName: item.category.name,
      })),
    });
  }

  private validateMenuInput(input: CreateMenuItemDto): ServiceResult | null {
    const price = Number(input.price);
    if (price <= 0) {
      return createErrorResult(
        { name: 'badRequest', message: 'Price must be greater than 0' },
        'Price must be greater than 0',
      );
    }
    if (!validateImageUrl(input.imageUrl.trim())) {
      return createErrorResult(
        { name: 'badRequest', message: 'Image must be a valid URL or uploaded file' },
        'Image must be a valid URL or uploaded file',
      );
    }
    return null;
  }

  async createMenuItem(input: CreateMenuItemDto): Promise<ServiceResult> {
    const validation = this.validateMenuInput(input);
    if (validation) return validation;

    const category = await this.db.client.category.findUnique({
      where: { id: input.categoryId },
    });
    if (!category) {
      return createErrorResult(
        { name: 'badRequest', message: 'Category not found' },
        'Category not found',
      );
    }

    await this.db.client.menuItem.create({
      data: {
        name: input.name.trim(),
        description: input.description.trim(),
        price: input.price,
        imageUrl: input.imageUrl.trim(),
        categoryId: input.categoryId,
        sortOrder: input.sortOrder ?? 0,
        isAvailable: input.isAvailable !== false,
      },
    });

    return createSuccessResult(undefined, 'Menu item created');
  }

  async updateMenuItem(id: string, input: UpdateMenuItemDto): Promise<ServiceResult> {
    if (!id) {
      return createErrorResult(
        { name: 'badRequest', message: 'Missing menu item' },
        'Missing menu item',
      );
    }

    const validation = this.validateMenuInput(input);
    if (validation) return validation;

    const category = await this.db.client.category.findUnique({
      where: { id: input.categoryId },
    });
    if (!category) {
      return createErrorResult(
        { name: 'badRequest', message: 'Category not found' },
        'Category not found',
      );
    }

    try {
      await this.db.client.menuItem.update({
        where: { id },
        data: {
          name: input.name.trim(),
          description: input.description.trim(),
          price: input.price,
          imageUrl: input.imageUrl.trim(),
          categoryId: input.categoryId,
          sortOrder: input.sortOrder ?? 0,
          isAvailable: input.isAvailable !== false,
        },
      });
    } catch {
      return createErrorResult(
        { name: 'badRequest', message: 'Menu item not found' },
        'Menu item not found',
      );
    }

    return createSuccessResult(undefined, 'Menu item updated');
  }

  async toggleAvailability(id: string): Promise<ServiceResult> {
    if (!id) {
      return createErrorResult(
        { name: 'badRequest', message: 'Missing menu item' },
        'Missing menu item',
      );
    }

    const item = await this.db.client.menuItem.findUnique({ where: { id } });
    if (!item) {
      return createErrorResult(
        { name: 'badRequest', message: 'Menu item not found' },
        'Menu item not found',
      );
    }

    await this.db.client.menuItem.update({
      where: { id },
      data: { isAvailable: !item.isAvailable },
    });

    return createSuccessResult(
      undefined,
      item.isAvailable ? 'Marked unavailable' : 'Marked available',
    );
  }

  async deleteMenuItem(id: string): Promise<ServiceResult> {
    if (!id) {
      return createErrorResult(
        { name: 'badRequest', message: 'Missing menu item' },
        'Missing menu item',
      );
    }

    try {
      await this.db.client.menuItem.delete({ where: { id } });
    } catch {
      return createErrorResult(
        {
          name: 'badRequest',
          message:
            'Cannot delete an item that appears on past orders — mark it unavailable instead',
        },
        'Cannot delete an item that appears on past orders — mark it unavailable instead',
      );
    }

    return createSuccessResult(undefined, 'Menu item deleted');
  }
}
