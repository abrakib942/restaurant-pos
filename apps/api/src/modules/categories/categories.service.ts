import { Injectable } from '@nestjs/common';
import { DbService } from '@/db/db.service';
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from '@/common/interfaces/service-result.interface';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly db: DbService) {}

  async listCategories() {
    const categories = await this.db.client.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { items: true } } },
    });

    return createSuccessResult(
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sortOrder,
        itemCount: category._count.items,
      })),
    );
  }

  async createCategory(input: CreateCategoryDto): Promise<ServiceResult> {
    const name = input.name.trim();
    const sortOrder = input.sortOrder ?? 0;

    const existing = await this.db.client.category.findUnique({
      where: { name },
    });
    if (existing) {
      return createErrorResult(
        { name: 'badRequest', message: 'A category with that name already exists' },
        'A category with that name already exists',
      );
    }

    await this.db.client.category.create({
      data: { name, sortOrder },
    });

    return createSuccessResult(undefined, 'Category created');
  }

  async updateCategory(id: string, input: UpdateCategoryDto): Promise<ServiceResult> {
    if (!id) {
      return createErrorResult(
        { name: 'badRequest', message: 'Missing category' },
        'Missing category',
      );
    }

    const name = input.name.trim();
    const sortOrder = input.sortOrder ?? 0;

    const clash = await this.db.client.category.findFirst({
      where: { name, NOT: { id } },
    });
    if (clash) {
      return createErrorResult(
        { name: 'badRequest', message: 'A category with that name already exists' },
        'A category with that name already exists',
      );
    }

    try {
      await this.db.client.category.update({
        where: { id },
        data: { name, sortOrder },
      });
    } catch {
      return createErrorResult(
        { name: 'badRequest', message: 'Category not found' },
        'Category not found',
      );
    }

    return createSuccessResult(undefined, 'Category updated');
  }

  async deleteCategory(id: string): Promise<ServiceResult> {
    if (!id) {
      return createErrorResult(
        { name: 'badRequest', message: 'Missing category' },
        'Missing category',
      );
    }

    const category = await this.db.client.category.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });
    if (!category) {
      return createErrorResult(
        { name: 'badRequest', message: 'Category not found' },
        'Category not found',
      );
    }
    if (category._count.items > 0) {
      return createErrorResult(
        {
          name: 'badRequest',
          message: 'Remove or reassign menu items before deleting',
        },
        'Remove or reassign menu items before deleting',
      );
    }

    await this.db.client.category.delete({ where: { id } });
    return createSuccessResult(undefined, 'Category deleted');
  }
}
