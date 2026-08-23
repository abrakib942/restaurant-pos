import { RESTAURANT_NAME } from "@/lib/constants";

export type ReceiptLine = {
  qty: number;
  name: string;
  lineTotal: number;
};

export type ReceiptData = {
  restaurantName: string;
  tableLabel: string;
  lines: ReceiptLine[];
  subtotal: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
  paymentMethod?: string | null;
  paidAt?: Date | null;
};

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

function paymentLabel(method: string | null | undefined): string {
  if (!method) return "—";
  return method.charAt(0) + method.slice(1).toLowerCase();
}

export function formatReceiptText(data: ReceiptData): string {
  const lines: string[] = [
    data.restaurantName,
    `Table ${data.tableLabel}`,
    "—".repeat(28),
  ];

  for (const line of data.lines) {
    lines.push(`${line.qty}× ${line.name}`.padEnd(22) + money(line.lineTotal));
  }

  lines.push("—".repeat(28));
  lines.push(`Subtotal`.padEnd(22) + money(data.subtotal));
  if (data.discount > 0) {
    lines.push(`Discount`.padEnd(22) + `−${money(data.discount).slice(1)}`);
  }
  lines.push(`Tax`.padEnd(22) + money(data.tax));
  if (data.tip > 0) {
    lines.push(`Tip`.padEnd(22) + money(data.tip));
  }
  lines.push(`Total`.padEnd(22) + money(data.total));

  if (data.paymentMethod) {
    lines.push("");
    lines.push(`Paid: ${paymentLabel(data.paymentMethod)}`);
  }
  if (data.paidAt) {
    lines.push(data.paidAt.toLocaleString());
  }

  lines.push("");
  lines.push("Thank you for dining with us!");

  return lines.join("\n");
}

export function receiptMailtoUrl(body: string): string {
  const subject = encodeURIComponent(`${RESTAURANT_NAME} receipt`);
  return `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;
}

export function receiptWhatsAppUrl(body: string): string {
  return `https://wa.me/?text=${encodeURIComponent(body)}`;
}

export function buildReceiptData(input: {
  tableLabel: string;
  lines: { qty: number; name: string; unitPrice: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  tip: number;
  total: number;
  paymentMethod?: string | null;
  paidAt?: Date | null;
}): ReceiptData {
  return {
    restaurantName: RESTAURANT_NAME,
    tableLabel: input.tableLabel,
    lines: input.lines.map((line) => ({
      qty: line.qty,
      name: line.name,
      lineTotal: line.qty * line.unitPrice,
    })),
    subtotal: input.subtotal,
    discount: input.discount,
    tax: input.tax,
    tip: input.tip,
    total: input.total,
    paymentMethod: input.paymentMethod,
    paidAt: input.paidAt,
  };
}
