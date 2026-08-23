import { Injectable } from '@nestjs/common';
import { DbService } from '@/db/db.service';
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from '@/common/interfaces/service-result.interface';
import { suggestQrSlug } from '@/common/utils/tables';
import { CreateTableDto, UpdateTableDto } from './dto/table.dto';

@Injectable()
export class TablesService {
  constructor(private readonly db: DbService) {}

  async listTables() {
    const tables = await this.db.client.table.findMany({
      orderBy: { label: 'asc' },
    });

    return createSuccessResult(
      tables.map((table) => ({
        id: table.id,
        label: table.label,
        qrSlug: table.qrSlug,
        status: table.status,
      })),
    );
  }

  async createTable(input: CreateTableDto): Promise<ServiceResult> {
    const label = input.label.trim();
    const qrSlug = (input.qrSlug?.trim() || suggestQrSlug(label)).toLowerCase();

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(qrSlug)) {
      return createErrorResult(
        {
          name: 'badRequest',
          message: 'Slug must be lowercase letters, numbers, and hyphens',
        },
        'Slug must be lowercase letters, numbers, and hyphens',
      );
    }

    const [labelClash, slugClash] = await Promise.all([
      this.db.client.table.findUnique({ where: { label } }),
      this.db.client.table.findUnique({ where: { qrSlug } }),
    ]);
    if (labelClash) {
      return createErrorResult(
        { name: 'badRequest', message: 'A table with that label already exists' },
        'A table with that label already exists',
      );
    }
    if (slugClash) {
      return createErrorResult(
        { name: 'badRequest', message: 'That QR slug is already in use' },
        'That QR slug is already in use',
      );
    }

    await this.db.client.table.create({ data: { label, qrSlug } });
    return createSuccessResult(undefined, 'Table created');
  }

  async updateTable(id: string, input: UpdateTableDto): Promise<ServiceResult> {
    if (!id) {
      return createErrorResult(
        { name: 'badRequest', message: 'Missing table' },
        'Missing table',
      );
    }

    const label = input.label.trim();
    const qrSlug = (input.qrSlug?.trim() || suggestQrSlug(label)).toLowerCase();

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(qrSlug)) {
      return createErrorResult(
        {
          name: 'badRequest',
          message: 'Slug must be lowercase letters, numbers, and hyphens',
        },
        'Slug must be lowercase letters, numbers, and hyphens',
      );
    }

    const [labelClash, slugClash] = await Promise.all([
      this.db.client.table.findFirst({
        where: { label, NOT: { id } },
      }),
      this.db.client.table.findFirst({
        where: { qrSlug, NOT: { id } },
      }),
    ]);
    if (labelClash) {
      return createErrorResult(
        { name: 'badRequest', message: 'A table with that label already exists' },
        'A table with that label already exists',
      );
    }
    if (slugClash) {
      return createErrorResult(
        { name: 'badRequest', message: 'That QR slug is already in use' },
        'That QR slug is already in use',
      );
    }

    try {
      await this.db.client.table.update({
        where: { id },
        data: { label, qrSlug },
      });
    } catch {
      return createErrorResult(
        { name: 'badRequest', message: 'Table not found' },
        'Table not found',
      );
    }

    return createSuccessResult(undefined, 'Table updated');
  }

  async deleteTable(id: string): Promise<ServiceResult> {
    if (!id) {
      return createErrorResult(
        { name: 'badRequest', message: 'Missing table' },
        'Missing table',
      );
    }

    const table = await this.db.client.table.findUnique({
      where: { id },
      include: {
        orders: {
          where: { status: { in: ['OPEN', 'BILLING'] } },
          take: 1,
        },
      },
    });
    if (!table) {
      return createErrorResult(
        { name: 'badRequest', message: 'Table not found' },
        'Table not found',
      );
    }
    if (table.orders.length > 0) {
      return createErrorResult(
        {
          name: 'badRequest',
          message: 'Cannot delete a table with an open or billing order',
        },
        'Cannot delete a table with an open or billing order',
      );
    }

    try {
      await this.db.client.table.delete({ where: { id } });
    } catch {
      return createErrorResult(
        {
          name: 'badRequest',
          message: 'Cannot delete table with order history — clear related records first',
        },
        'Cannot delete table with order history — clear related records first',
      );
    }

    return createSuccessResult(undefined, 'Table deleted');
  }
}
