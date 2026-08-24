import { Injectable } from "@nestjs/common";
import { DbService } from "@/db/db.service";
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from "@/common/interfaces/service-result.interface";

export type ServiceRequestLineRow = {
  id: string;
  menuItemId: string;
  name: string;
  qty: number;
  note: string | null;
};

export type ServiceRequestRow = {
  id: string;
  type: "CALL_WAITER" | "REQUEST_BILL";
  tableId: string;
  tableLabel: string;
  createdAt: string;
  acknowledgedAt: string | null;
  lineCount: number;
  linesPreview: string;
  lines: ServiceRequestLineRow[];
};

export type ServiceRequestsData = {
  requests: ServiceRequestRow[];
  count: number;
};

function mapRequest(row: {
  id: string;
  type: "CALL_WAITER" | "REQUEST_BILL";
  tableId: string;
  createdAt: Date;
  acknowledgedAt: Date | null;
  table: { label: string };
  lines: {
    id: string;
    menuItemId: string;
    name: string;
    qty: number;
    note: string | null;
  }[];
}): ServiceRequestRow {
  const lines = row.lines.map((line) => ({
    id: line.id,
    menuItemId: line.menuItemId,
    name: line.name,
    qty: line.qty,
    note: line.note,
  }));
  return {
    id: row.id,
    type: row.type,
    tableId: row.tableId,
    tableLabel: row.table.label,
    createdAt: row.createdAt.toISOString(),
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    lineCount: lines.length,
    linesPreview: lines.map((line) => `${line.qty}× ${line.name}`).join(", "),
    lines,
  };
}

@Injectable()
export class ServiceRequestsService {
  constructor(private readonly db: DbService) {}

  async getOpenServiceRequests(): Promise<ServiceResult<ServiceRequestsData>> {
    const rows = await this.db.client.serviceRequest.findMany({
      where: { status: "OPEN" },
      include: {
        table: { select: { label: true } },
        lines: { orderBy: { name: "asc" } },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    const requests = rows.map(mapRequest);
    return createSuccessResult({ requests, count: requests.length });
  }

  async getServiceRequest(
    requestId: string,
  ): Promise<ServiceResult<ServiceRequestRow>> {
    const row = await this.db.client.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        table: { select: { label: true } },
        lines: { orderBy: { name: "asc" } },
      },
    });

    if (!row) {
      return createErrorResult(
        { name: "badRequest", message: "Request not found" },
        "Request not found",
      ) as ServiceResult<ServiceRequestRow>;
    }

    return createSuccessResult(mapRequest(row));
  }

  async acknowledgeServiceRequest(requestId: string): Promise<ServiceResult> {
    const request = await this.db.client.serviceRequest.findUnique({
      where: { id: requestId },
      include: { lines: { select: { id: true } } },
    });

    if (!request) {
      return createErrorResult(
        { name: "badRequest", message: "Request not found" },
        "Request not found",
      );
    }
    if (request.status !== "OPEN") {
      return createErrorResult(
        { name: "badRequest", message: "Request already handled" },
        "Request already handled",
      );
    }

    const hasLines = request.lines.length > 0;
    const now = new Date();

    if (hasLines) {
      await this.db.client.serviceRequest.update({
        where: { id: requestId },
        data: {
          acknowledgedAt: request.acknowledgedAt ?? now,
        },
      });
      return createSuccessResult(
        undefined,
        "Waiter on the way — confirm items at the table",
      );
    }

    await this.db.client.serviceRequest.update({
      where: { id: requestId },
      data: {
        status: "DONE",
        acknowledgedAt: now,
      },
    });

    return createSuccessResult(undefined, "Request cleared");
  }
}
