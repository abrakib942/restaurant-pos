import { notFound } from "next/navigation";
import { CheckoutScreen } from "@/components/waiter/checkout-screen";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type CheckoutPageProps = {
  params: Promise<{ tableId: string }>;
  searchParams: Promise<{ orderId?: string }>;
};

export default async function WaiterCheckoutPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  await requireRole("WAITER");
  const { tableId } = await params;
  const { orderId: orderIdParam } = await searchParams;

  const table = await prisma.table.findUnique({ where: { id: tableId } });
  if (!table) notFound();

  const orders = await prisma.order.findMany({
    where: {
      tableId: table.id,
      status: { in: ["OPEN", "BILLING"] },
    },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      bill: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const selected =
    orders.find((o) => o.id === orderIdParam) ?? orders[0] ?? null;

  return (
    <CheckoutScreen
      table={{
        id: table.id,
        label: table.label,
        status: table.status,
      }}
      checks={orders.map((order, index) => ({
        id: order.id,
        label: `Check ${index + 1}`,
        status: order.status,
      }))}
      order={selected ? { id: selected.id, status: selected.status } : null}
      lines={
        selected?.items.map((item) => ({
          id: item.id,
          name: item.name,
          qty: item.qty,
          unitPrice: item.unitPrice.toFixed(2),
          status: item.status,
          voided: item.voidedAt != null,
        })) ?? []
      }
      bill={
        selected?.bill
          ? {
              subtotal: selected.bill.subtotal.toFixed(2),
              discount: selected.bill.discount.toFixed(2),
              tax: selected.bill.tax.toFixed(2),
              tip: selected.bill.tip.toFixed(2),
              total: selected.bill.total.toFixed(2),
              paymentMethod: selected.bill.paymentMethod,
              paidAt: selected.bill.paidAt?.toISOString() ?? null,
            }
          : null
      }
    />
  );
}
