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
