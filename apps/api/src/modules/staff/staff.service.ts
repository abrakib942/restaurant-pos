import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DbService } from '@/db/db.service';
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from '@/common/interfaces/service-result.interface';
import { CreateStaffDto, StaffQueryDto, UpdateStaffDto } from './dto/staff.dto';

@Injectable()
export class StaffService {
  constructor(private readonly db: DbService) {}

  async listStaff(query: StaffQueryDto) {
    const staff = await this.db.client.user.findMany({
      where: {
        role: query.role ? query.role : { in: ['WAITER', 'KITCHEN'] },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    return createSuccessResult(
      staff.map((user) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      })),
    );
  }

  async createStaff(input: CreateStaffDto): Promise<ServiceResult> {
    const username = input.username.trim().toLowerCase();

    const existing = await this.db.client.user.findUnique({
      where: { username },
    });
    if (existing) {
      return createErrorResult(
        { name: 'badRequest', message: 'That username is already taken' },
        'That username is already taken',
      );
    }

    await this.db.client.user.create({
      data: {
        name: input.name.trim(),
        username,
        pinHash: await bcrypt.hash(input.pin, 10),
        role: input.role,
      },
    });

    return createSuccessResult(undefined, 'Staff account created');
  }

  async updateStaff(id: string, input: UpdateStaffDto): Promise<ServiceResult> {
    if (!id) {
      return createErrorResult(
        { name: 'badRequest', message: 'Missing staff member' },
        'Missing staff member',
      );
    }

    const username = input.username.trim().toLowerCase();

    const user = await this.db.client.user.findUnique({ where: { id } });
    if (!user) {
      return createErrorResult(
        { name: 'badRequest', message: 'Staff member not found' },
        'Staff member not found',
      );
    }
    if (user.role === 'ADMIN') {
      return createErrorResult(
        { name: 'badRequest', message: 'Admin accounts cannot be edited here' },
        'Admin accounts cannot be edited here',
      );
    }

    const clash = await this.db.client.user.findFirst({
      where: { username, NOT: { id } },
    });
    if (clash) {
      return createErrorResult(
        { name: 'badRequest', message: 'That username is already taken' },
        'That username is already taken',
      );
    }

    await this.db.client.user.update({
      where: { id },
      data: {
        name: input.name.trim(),
        username,
        role: input.role,
        ...(input.pin ? { pinHash: await bcrypt.hash(input.pin, 10) } : {}),
      },
    });

    return createSuccessResult(undefined, 'Staff account updated');
  }

  async deleteStaff(id: string, actorUserId: string): Promise<ServiceResult> {
    if (!id) {
      return createErrorResult(
        { name: 'badRequest', message: 'Missing staff member' },
        'Missing staff member',
      );
    }
    if (id === actorUserId) {
      return createErrorResult(
        { name: 'badRequest', message: 'You cannot delete your own account' },
        'You cannot delete your own account',
      );
    }

    const user = await this.db.client.user.findUnique({
      where: { id },
      include: {
        orders: {
          where: { status: { in: ['OPEN', 'BILLING'] } },
          take: 1,
        },
      },
    });
    if (!user) {
      return createErrorResult(
        { name: 'badRequest', message: 'Staff member not found' },
        'Staff member not found',
      );
    }
    if (user.role === 'ADMIN') {
      return createErrorResult(
        { name: 'badRequest', message: 'Admin accounts cannot be deleted here' },
        'Admin accounts cannot be deleted here',
      );
    }
    if (user.orders.length > 0) {
      return createErrorResult(
        {
          name: 'badRequest',
          message: 'Cannot delete a waiter with open or billing orders',
        },
        'Cannot delete a waiter with open or billing orders',
      );
    }

    try {
      await this.db.client.user.delete({ where: { id } });
    } catch {
      return createErrorResult(
        {
          name: 'badRequest',
          message: 'Cannot delete staff with order history — clear related records first',
        },
        'Cannot delete staff with order history — clear related records first',
      );
    }

    return createSuccessResult(undefined, 'Staff account deleted');
  }
}
