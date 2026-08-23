import { Injectable } from '@nestjs/common';
import { DbService } from '@/db/db.service';
import {
  createErrorResult,
  createSuccessResult,
  ServiceResult,
} from '@/common/interfaces/service-result.interface';
import {
  computeBillTotals,
  parseMoneyInput,
  parseTaxRatePercent,
} from '@/common/utils/billing';
import { AuditAction, AuditService } from '@/modules/audit/audit.service';
import { GenerateBillDto, PayBillDto } from './dto/service.dto';

@Injectable()
export class ServiceService {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async markItemServed(orderItemId: string): Promise<ServiceResult> {
    const item = await this.db.client.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: {
          select: { id: true, waiterId: true, tableId: true, status: true },
        },
      },
    });

    if (!item) {
      return createErrorResult(
        { name: 'badRequest', message: 'Item not found' },
        'Item not found',
      );
    }
    if (item.voidedAt) {
      return createErrorResult(
        { name: 'badRequest', message: 'Item was voided' },
        'Item was voided',
      );
    }
    if (!['OPEN', 'BILLING'].includes(item.order.status)) {
      return createErrorResult(
        { name: 'badRequest', message: 'Order is no longer active' },
        'Order is no longer active',
      );
    }
    if (item.status !== 'READY') {
      return createErrorResult(
        { name: 'badRequest', message: 'Only ready items can be marked served' },
        'Only ready items can be marked served',
      );
    }

    await this.db.client.orderItem.update({
      where: { id: orderItemId },
      data: {
        status: 'SERVED',
        servedAt: new Date(),
      },
    });

    return createSuccessResult(undefined, 'Marked served');
  }

  async generateBill(
    input: GenerateBillDto,
    actor: { userId: string; name: string },
  ): Promise<ServiceResult> {
    const discount = parseMoneyInput(input.discount);
    if (discount === null) {
      return createErrorResult(
        { name: 'badRequest', message: 'Discount must be a valid amount' },
        'Discount must be a valid amount',
      );
    }

    const taxRate = parseTaxRatePercent(input.taxRatePercent);
    if (taxRate === null) {
      return createErrorResult(
        { name: 'badRequest', message: 'Tax rate must be between 0 and 30%' },
        'Tax rate must be between 0 and 30%',
      );
    }

    const tip = parseMoneyInput(input.tip || '0');
    if (tip === null) {
      return createErrorResult(
        { name: 'badRequest', message: 'Tip must be a valid amount' },
        'Tip must be a valid amount',
      );
    }

    const order = await this.db.client.order.findFirst({
      where: {
        id: input.orderId,
        tableId: input.tableId,
        status: 'OPEN',
      },
      include: { items: true, bill: true },
    });

    if (!order) {
      return createErrorResult(
        { name: 'badRequest', message: 'No open order for this check' },
        'No open order for this check',
      );
    }

    const billableItems = order.items.filter((item) => !item.voidedAt);
    if (billableItems.length === 0) {
      return createErrorResult(
        { name: 'badRequest', message: 'No billable items on this check' },
        'No billable items on this check',
      );
    }
    if (order.bill) {
      return createErrorResult(
        { name: 'badRequest', message: 'Bill already exists' },
        'Bill already exists',
      );
    }

    const subtotal = billableItems.reduce(
      (sum, item) => sum + Number(item.unitPrice) * item.qty,
      0,
    );

    const totals = computeBillTotals({ subtotal, discount, taxRate, tip });

    await this.db.client.$transaction([
      this.db.client.bill.create({
        data: {
          orderId: order.id,
          subtotal: totals.subtotal.toFixed(2),
          discount: totals.discount.toFixed(2),
          tax: totals.tax.toFixed(2),
          tip: totals.tip.toFixed(2),
          total: totals.total.toFixed(2),
        },
      }),
      this.db.client.order.update({
        where: { id: order.id },
        data: { status: 'BILLING' },
      }),
      this.db.client.table.update({
        where: { id: input.tableId },
        data: { status: 'BILLING' },
      }),
      this.db.client.serviceRequest.updateMany({
        where: {
          tableId: input.tableId,
          type: 'REQUEST_BILL',
          status: 'OPEN',
        },
        data: {
          status: 'DONE',
          acknowledgedAt: new Date(),
        },
      }),
    ]);

    await this.audit.writeAuditLog({
      action: AuditAction.BillGenerated,
      actorId: actor.userId,
      actorName: actor.name,
      target: order.id,
      meta: {
        tableId: input.tableId,
        total: totals.total.toFixed(2),
      },
    });

    return createSuccessResult(undefined, 'Bill generated');
  }

  async markBillPaid(
    input: PayBillDto,
    actor: { userId: string; name: string },
  ): Promise<ServiceResult> {
    const order = await this.db.client.order.findFirst({
      where: {
        id: input.orderId,
        tableId: input.tableId,
        status: 'BILLING',
      },
      include: { bill: true },
    });

    if (!order) {
      return createErrorResult(
        { name: 'badRequest', message: 'No billing check for this order' },
        'No billing check for this order',
      );
    }
    if (!order.bill) {
      return createErrorResult(
        { name: 'badRequest', message: 'Generate a bill first' },
        'Generate a bill first',
      );
    }
    if (order.bill.paidAt) {
      return createErrorResult(
        { name: 'badRequest', message: 'Bill already paid' },
        'Bill already paid',
      );
    }

    await this.db.client.$transaction([
      this.db.client.bill.update({
        where: { id: order.bill.id },
        data: {
          paidAt: new Date(),
          paymentMethod: input.paymentMethod,
        },
      }),
      this.db.client.order.update({
        where: { id: order.id },
        data: { status: 'PAID' },
      }),
    ]);

    const remaining = await this.db.client.order.findMany({
      where: {
        tableId: input.tableId,
        status: { in: ['OPEN', 'BILLING'] },
      },
      select: { status: true },
    });

    const tableStatus = remaining.some((o) => o.status === 'BILLING')
      ? ('BILLING' as const)
      : remaining.some((o) => o.status === 'OPEN')
        ? ('OCCUPIED' as const)
        : ('AVAILABLE' as const);

    await this.db.client.table.update({
      where: { id: input.tableId },
      data: { status: tableStatus },
    });

    await this.audit.writeAuditLog({
      action: AuditAction.BillPaid,
      actorId: actor.userId,
      actorName: actor.name,
      target: order.id,
      meta: {
        tableId: input.tableId,
        paymentMethod: input.paymentMethod,
        total: order.bill.total.toFixed(2),
      },
    });

    return createSuccessResult(
      undefined,
      tableStatus === 'AVAILABLE'
        ? 'Payment recorded — table is free'
        : 'Payment recorded',
    );
  }
}
