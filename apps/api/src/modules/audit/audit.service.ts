import { Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/db';
import { DbService } from '@/db/db.service';

export const AuditAction = {
  LoginSuccess: 'auth.login.success',
  LoginFailed: 'auth.login.failed',
  LoginLocked: 'auth.login.locked',
  BillGenerated: 'bill.generated',
  BillPaid: 'bill.paid',
  OrderVoid: 'order.void',
  WaitlistSeated: 'waitlist.seated',
} as const;

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction];

@Injectable()
export class AuditService {
  constructor(private readonly db: DbService) {}

  async writeAuditLog(input: {
    action: AuditActionValue | string;
    actorId?: string | null;
    actorName?: string | null;
    target?: string | null;
    meta?: Record<string, unknown> | null;
  }) {
    await this.db.client.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        target: input.target ?? null,
        meta: (input.meta ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async getAdminAuditLog(limit = 100) {
    const rows = await this.db.client.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      actorName: row.actorName,
      target: row.target,
      meta:
        row.meta && typeof row.meta === 'object' && !Array.isArray(row.meta)
          ? (row.meta as Record<string, unknown>)
          : null,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
