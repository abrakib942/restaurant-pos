import { notFound } from "next/navigation";
import { CheckoutScreen } from "@/components/waiter/checkout-screen";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type CheckoutPageProps = {
  params: Promise<{ tableId: string }>;
};

export default async function WaiterCheckoutPage({
  params,
}: CheckoutPageProps) {
  await requireRole("WAITER");
  const { tableId } = await params;

  const table = await prisma.table.findUnique({ where: { id: tableId } });
  if (!table) notFound();

  const order = await prisma.order.findFirst({
    where: {
      tableId: table.id,
      status: { in: ["OPEN", "BILLING"] },
    },
    include: {
      items: { orderBy: { createdAt: "asc" } },
      bill: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <CheckoutScreen
      table={{
        id: table.id,
        label: table.label,
        status: table.status,
      }}
      order={order ? { id: order.id, status: order.status } : null}
      lines={
        order?.items.map((item) => ({
          id: item.id,
          name: item.name,
          qty: item.qty,
          unitPrice: item.unitPrice.toFixed(2),
          status: item.status,
        })) ?? []
      }
      bill={
        order?.bill
          ? {
              subtotal: order.bill.subtotal.toFixed(2),
              discount: order.bill.discount.toFixed(2),
              total: order.bill.total.toFixed(2),
              paidAt: order.bill.paidAt?.toISOString() ?? null,
            }
          : null
      }
    />
  );
}
