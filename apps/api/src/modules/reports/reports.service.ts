import { Injectable } from "@nestjs/common";
import { DbService } from "@/db/db.service";
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from "@/common/interfaces/service-result.interface";
import { AuditAction, AuditService } from "@/modules/audit/audit.service";
import { VoidOrderItemDto } from "./dto/reports.dto";

export type ReportWaiterRow = {
  waiterId: string;
  waiterName: string;
  checks: number;
  sales: number;
};

export type ReportHourRow = {
  hour: number;
  label: string;
  checks: number;
  sales: number;
};

export type ReportVoidRow = {
  id: string;
  name: string;
  qty: number;
  tableLabel: string;
  voidedAt: string;
  voidReason: string | null;
  voidedByName: string | null;
  unitPrice: number;
};

export type AdminReportsData = {
  from: string;
  to: string;
  label: string;
  salesTotal: number;
  paidChecks: number;
  voidCount: number;
  voidAmount: number;
  byWaiter: ReportWaiterRow[];
  byHour: ReportHourRow[];
  voids: ReportVoidRow[];
};

export type VoidableItemRow = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  tableLabel: string;
  createdAt: string;
};

function parseDateInput(value: string | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function endExclusive(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d;
}

function defaultReportRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function formatHour(hour: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h} ${suffix}`;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async getAdminReports(input: {
    from?: string;
    to?: string;
  }): Promise<ServiceResult<AdminReportsData>> {
    const defaults = defaultReportRange();
    const fromDate = parseDateInput(input.from, new Date(defaults.from));
    const toDate = parseDateInput(input.to, new Date(defaults.to));
    const rangeStart = fromDate <= toDate ? fromDate : toDate;
    const rangeEnd = endExclusive(fromDate <= toDate ? toDate : fromDate);

    const [paidBills, voidedItems] = await Promise.all([
      this.db.client.bill.findMany({
        where: { paidAt: { gte: rangeStart, lt: rangeEnd } },
        select: {
          total: true,
          paidAt: true,
          order: {
            select: {
              waiterId: true,
              waiter: { select: { name: true } },
            },
          },
        },
      }),
      this.db.client.orderItem.findMany({
        where: { voidedAt: { gte: rangeStart, lt: rangeEnd } },
        include: {
          voidedBy: { select: { name: true } },
          order: {
            select: { table: { select: { label: true } } },
          },
        },
        orderBy: { voidedAt: "desc" },
      }),
    ]);

    const salesTotal = paidBills.reduce((sum, b) => sum + Number(b.total), 0);

    const waiterMap = new Map<string, ReportWaiterRow>();
    for (const bill of paidBills) {
      const id = bill.order.waiterId;
      const existing = waiterMap.get(id) ?? {
        waiterId: id,
        waiterName: bill.order.waiter.name,
        checks: 0,
        sales: 0,
      };
      existing.checks += 1;
      existing.sales += Number(bill.total);
      waiterMap.set(id, existing);
    }

    const hourMap = new Map<number, ReportHourRow>();
    for (const bill of paidBills) {
      if (!bill.paidAt) continue;
      const hour = bill.paidAt.getHours();
      const existing = hourMap.get(hour) ?? {
        hour,
        label: formatHour(hour),
        checks: 0,
        sales: 0,
      };
      existing.checks += 1;
      existing.sales += Number(bill.total);
      hourMap.set(hour, existing);
    }

    const voidAmount = voidedItems.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.qty,
      0,
    );

    return createSuccessResult({
      from: rangeStart.toISOString().slice(0, 10),
      to: (fromDate <= toDate ? toDate : fromDate).toISOString().slice(0, 10),
      label: `${rangeStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${toDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`,
      salesTotal,
      paidChecks: paidBills.length,
      voidCount: voidedItems.length,
      voidAmount,
      byWaiter: [...waiterMap.values()].sort(
        (a, b) => b.sales - a.sales || a.waiterName.localeCompare(b.waiterName),
      ),
      byHour: [...hourMap.values()].sort((a, b) => a.hour - b.hour),
      voids: voidedItems.map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        tableLabel: item.order.table.label,
        voidedAt: item.voidedAt!.toISOString(),
        voidReason: item.voidReason,
        voidedByName: item.voidedBy?.name ?? null,
        unitPrice: Number(item.unitPrice),
      })),
    });
  }

  async getVoidableOpenItems(): Promise<ServiceResult<VoidableItemRow[]>> {
    const items = await this.db.client.orderItem.findMany({
      where: {
        voidedAt: null,
        status: "PENDING",
        order: { status: "OPEN" },
      },
      include: {
        order: {
          select: { table: { select: { label: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return createSuccessResult(
      items.map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        unitPrice: Number(item.unitPrice),
        tableLabel: item.order.table.label,
        createdAt: item.createdAt.toISOString(),
      })),
    );
  }

  async voidOrderItem(
    input: VoidOrderItemDto,
    actor: { userId: string; name: string },
  ): Promise<ServiceResult> {
    const item = await this.db.client.orderItem.findUnique({
      where: { id: input.orderItemId },
      include: {
        order: {
          select: { id: true, status: true, tableId: true },
        },
      },
    });

    if (!item) {
      return createErrorResult(
        { name: "badRequest", message: "Line item not found" },
        "Line item not found",
      );
    }
    if (item.voidedAt) {
      return createErrorResult(
        { name: "badRequest", message: "Already voided" },
        "Already voided",
      );
    }
    if (!["OPEN", "BILLING"].includes(item.order.status)) {
      return createErrorResult(
        { name: "badRequest", message: "Cannot void on a closed order" },
        "Cannot void on a closed order",
      );
    }
    if (item.order.status === "BILLING") {
      return createErrorResult(
        {
          name: "badRequest",
          message: "Void before generating the bill, or adjust at checkout",
        },
        "Void before generating the bill, or adjust at checkout",
      );
    }
    if (item.status !== "PENDING") {
      return createErrorResult(
        {
          name: "badRequest",
          message:
            "Only pending kitchen lines can be voided — cooking or ready items stay on the fire",
        },
        "Only pending kitchen lines can be voided — cooking or ready items stay on the fire",
      );
    }

    await this.db.client.orderItem.update({
      where: { id: item.id },
      data: {
        voidedAt: new Date(),
        voidReason: input.reason?.trim() || null,
        voidedById: actor.userId,
      },
    });

    await this.audit.writeAuditLog({
      action: AuditAction.OrderVoid,
      actorId: actor.userId,
      actorName: actor.name,
      target: item.name,
      meta: {
        orderItemId: item.id,
        qty: item.qty,
        reason: input.reason?.trim() || null,
      },
    });

    return createSuccessResult(undefined, "Line voided");
  }
}
