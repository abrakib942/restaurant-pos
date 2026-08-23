import { Injectable } from '@nestjs/common';
import { DbService } from '@/db/db.service';
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from '@/common/interfaces/service-result.interface';

export type ServiceRequestRow = {
  id: string;
  type: 'CALL_WAITER' | 'REQUEST_BILL';
  tableId: string;
  tableLabel: string;
  createdAt: string;
};

export type ServiceRequestsData = {
  requests: ServiceRequestRow[];
  count: number;
};

@Injectable()
export class ServiceRequestsService {
  constructor(private readonly db: DbService) {}

  async getOpenServiceRequests(): Promise<ServiceResult<ServiceRequestsData>> {
    const rows = await this.db.client.serviceRequest.findMany({
      where: { status: 'OPEN' },
      include: {
        table: { select: { label: true } },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    const requests = rows.map((row) => ({
      id: row.id,
      type: row.type,
      tableId: row.tableId,
      tableLabel: row.table.label,
      createdAt: row.createdAt.toISOString(),
    }));

    return createSuccessResult({ requests, count: requests.length });
  }

  async acknowledgeServiceRequest(requestId: string): Promise<ServiceResult> {
    const request = await this.db.client.serviceRequest.findUnique({
      where: { id: requestId },
      include: { table: { select: { id: true, qrSlug: true } } },
    });

    if (!request) {
      return createErrorResult(
        { name: 'badRequest', message: 'Request not found' },
        'Request not found',
      );
    }
    if (request.status !== 'OPEN') {
      return createErrorResult(
        { name: 'badRequest', message: 'Request already handled' },
        'Request already handled',
      );
    }

    await this.db.client.serviceRequest.update({
      where: { id: requestId },
      data: {
        status: 'DONE',
        acknowledgedAt: new Date(),
      },
    });

    return createSuccessResult(undefined, 'Request cleared');
  }
}
