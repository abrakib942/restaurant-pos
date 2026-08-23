/** Seed helpers — kept local to avoid coupling db package to apps/web. */
export function courseForCategoryName(categoryName: string): number {
  const name = categoryName.toLowerCase();
  if (name.includes("small") || name.includes("plate")) return 1;
  if (name.includes("sweet")) return 3;
  return 2;
}

export function computeBillTotals(input: {
  subtotal: number;
  discount: number;
  taxRate?: number;
  tip?: number;
}) {
  const subtotal = Math.max(0, input.subtotal);
  const discount = Math.min(Math.max(0, input.discount), subtotal);
  const afterDiscount = Math.max(0, subtotal - discount);
  const taxRate = input.taxRate ?? 0.08875;
  const tax = Math.round(afterDiscount * taxRate * 100) / 100;
  const tip = Math.round(Math.max(0, input.tip ?? 0) * 100) / 100;
  const total = Math.round((afterDiscount + tax + tip) * 100) / 100;
  return { subtotal, discount, tax, tip, total };
}
