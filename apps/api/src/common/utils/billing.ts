/** Default sales tax rate for checkout preview (8.875%). */
export const DEFAULT_TAX_RATE = 0.08875;

export type BillTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
};

export function computeBillTotals(input: {
  subtotal: number;
  discount: number;
  taxRate?: number;
  tip?: number;
}): BillTotals {
  const subtotal = Math.max(0, input.subtotal);
  const discount = Math.min(Math.max(0, input.discount), subtotal);
  const afterDiscount = Math.max(0, subtotal - discount);
  const tax = roundMoney(afterDiscount * (input.taxRate ?? DEFAULT_TAX_RATE));
  const tip = roundMoney(Math.max(0, input.tip ?? 0));
  const total = roundMoney(afterDiscount + tax + tip);

  return { subtotal, discount, tax, tip, total };
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function parseMoneyInput(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  return Number(trimmed);
}

export function parseTaxRatePercent(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,3})?$/.test(trimmed)) return null;
  const pct = Number(trimmed);
  if (pct < 0 || pct > 30) return null;
  return pct / 100;
}
