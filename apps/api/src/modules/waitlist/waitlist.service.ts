import { Injectable } from '@nestjs/common';
import { DbService } from '@/db/db.service';
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from '@/common/interfaces/service-result.interface';
import { AuditAction, AuditService } from '@/modules/audit/audit.service';
import { CreateWaitlistEntryDto, SeatWaitlistEntryDto } from './dto/waitlist.dto';

export type WaitlistParty = {
  id: string;
  partyName: string;
  partySize: number;
  phone: string | null;
  status: 'WAITING' | 'NOTIFIED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW';
  quotedMinutes: number | null;
  seatedTableLabel: string | null;
  seatedAt: string | null;
  createdAt: string;
  waitMinutes: number;
};

function waitMinutes(createdAt: Date) {
  return Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 60_000));
}

const entryInclude = {
  seatedTable: { select: { label: true } },
} as const;

function mapEntry(entry: {
  id: string;
  partyName: string;
  partySize: number;
  phone: string | null;
  status: WaitlistParty['status'];
  quotedMinutes: number | null;
  seatedAt: Date | null;
  createdAt: Date;
  seatedTable: { label: string } | null;
}): WaitlistParty {
  return {
    id: entry.id,
    partyName: entry.partyName,
    partySize: entry.partySize,
    phone: entry.phone,
    status: entry.status,
    quotedMinutes: entry.quotedMinutes,
    seatedTableLabel: entry.seatedTable?.label ?? null,
    seatedAt: entry.seatedAt?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    waitMinutes: waitMinutes(entry.createdAt),
  };
}

@Injectable()
export class WaitlistService {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async getActiveWaitlist(limit?: number) {
    const entries = await this.db.client.waitlistEntry.findMany({
      where: { status: { in: ['WAITING', 'NOTIFIED'] } },
      orderBy: [{ createdAt: 'asc' }],
      take: limit,
      include: entryInclude,
    });
    return createSuccessResult(entries.map(mapEntry));
  }

  async getWaitlistForAdmin() {
    const entries = await this.db.client.waitlistEntry.findMany({
      orderBy: [{ createdAt: 'desc' }],
      take: 50,
      include: entryInclude,
    });

    const active = entries
      .filter((e) => e.status === 'WAITING' || e.status === 'NOTIFIED')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(mapEntry);

    const history = entries
      .filter((e) => !['WAITING', 'NOTIFIED'].includes(e.status))
      .map(mapEntry);

    return createSuccessResult({ active, history });
  }

  async getAvailableTablesForSeating() {
    const tables = await this.db.client.table.findMany({
      where: { status: 'AVAILABLE' },
      orderBy: { label: 'asc' },
      select: { id: true, label: true },
    });
    return createSuccessResult(tables);
  }

  async createEntry(input: CreateWaitlistEntryDto): Promise<ServiceResult> {
    await this.db.client.waitlistEntry.create({
      data: {
        partyName: input.partyName.trim(),
        partySize: input.partySize,
        phone: input.phone?.trim() || null,
        quotedMinutes: input.quotedMinutes ?? null,
      },
    });
    return createSuccessResult(undefined, 'Party added to waitlist');
  }

  async notifyEntry(entryId: string): Promise<ServiceResult> {
    const entry = await this.db.client.waitlistEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry) {
      return createErrorResult(
        { name: 'badRequest', message: 'Party not found' },
        'Party not found',
      );
    }
    if (entry.status !== 'WAITING') {
      return createErrorResult(
        { name: 'badRequest', message: 'Only waiting parties can be notified' },
        'Only waiting parties can be notified',
      );
    }

    await this.db.client.waitlistEntry.update({
      where: { id: entryId },
      data: { status: 'NOTIFIED' },
    });

    return createSuccessResult(undefined, 'Party notified');
  }

  async seatEntry(
    entryId: string,
    input: SeatWaitlistEntryDto,
    actor: { userId: string; name: string },
  ): Promise<ServiceResult> {
    const entry = await this.db.client.waitlistEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry) {
      return createErrorResult(
        { name: 'badRequest', message: 'Party not found' },
        'Party not found',
      );
    }
    if (!['WAITING', 'NOTIFIED'].includes(entry.status)) {
      return createErrorResult(
        { name: 'badRequest', message: 'This party is no longer in the queue' },
        'This party is no longer in the queue',
      );
    }

    const table = await this.db.client.table.findUnique({
      where: { id: input.tableId },
    });
    if (!table) {
      return createErrorResult(
        { name: 'badRequest', message: 'Table not found' },
        'Table not found',
      );
    }
    if (table.status !== 'AVAILABLE') {
      return createErrorResult(
        { name: 'badRequest', message: 'Table is not available — pick another' },
        'Table is not available — pick another',
      );
    }

    await this.db.client.$transaction([
      this.db.client.waitlistEntry.update({
        where: { id: entryId },
        data: {
          status: 'SEATED',
          seatedTableId: table.id,
          seatedAt: new Date(),
        },
      }),
      this.db.client.table.update({
        where: { id: table.id },
        data: { status: 'OCCUPIED' },
      }),
    ]);

    await this.audit.writeAuditLog({
      action: AuditAction.WaitlistSeated,
      actorId: actor.userId,
      actorName: actor.name,
      target: entry.partyName,
      meta: {
        entryId: entry.id,
        tableLabel: table.label,
        partySize: entry.partySize,
      },
    });

    return createSuccessResult(undefined, `Seated at table ${table.label}`);
  }

  async cancelEntry(entryId: string): Promise<ServiceResult> {
    const entry = await this.db.client.waitlistEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry) {
      return createErrorResult(
        { name: 'badRequest', message: 'Party not found' },
        'Party not found',
      );
    }
    if (!['WAITING', 'NOTIFIED'].includes(entry.status)) {
      return createErrorResult(
        { name: 'badRequest', message: 'Only active queue entries can be cancelled' },
        'Only active queue entries can be cancelled',
      );
    }

    await this.db.client.waitlistEntry.update({
      where: { id: entryId },
      data: { status: 'CANCELLED' },
    });

    return createSuccessResult(undefined, 'Party removed from waitlist');
  }

  async markNoShow(entryId: string): Promise<ServiceResult> {
    const entry = await this.db.client.waitlistEntry.findUnique({
      where: { id: entryId },
    });
    if (!entry) {
      return createErrorResult(
        { name: 'badRequest', message: 'Party not found' },
        'Party not found',
      );
    }
    if (entry.status !== 'NOTIFIED') {
      return createErrorResult(
        { name: 'badRequest', message: 'Mark no-show only after notifying the party' },
        'Mark no-show only after notifying the party',
      );
    }

    await this.db.client.waitlistEntry.update({
      where: { id: entryId },
      data: { status: 'NO_SHOW' },
    });

    return createSuccessResult(undefined, 'Marked no-show');
  }
}
