import { notFound } from "next/navigation";
import { CheckoutScreen } from "@/components/waiter/checkout-screen";
import { requireRole } from "@/lib/auth";
import { serverApiData } from "@/lib/server-api";

type CheckoutPageProps = {
  params: Promise<{ tableId: string }>;
  searchParams: Promise<{ orderId?: string }>;
};

type CheckoutData = {
  table: {
    id: string;
    label: string;
    status: "AVAILABLE" | "OCCUPIED" | "BILLING";
  };
  checks: {
    id: string;
    label: string;
    status: "OPEN" | "BILLING" | "PAID";
  }[];
  order: {
    id: string;
    status: "OPEN" | "BILLING" | "PAID";
  } | null;
  lines: {
    id: string;
    name: string;
    qty: number;
    unitPrice: string;
    status: string;
    voided: boolean;
  }[];
  bill: {
    subtotal: string;
    discount: string;
    tax: string;
    tip: string;
    total: string;
    paymentMethod: "CASH" | "CARD" | "OTHER" | null;
    paidAt: string | null;
  } | null;
};

export default async function WaiterCheckoutPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  await requireRole("WAITER");
  const { tableId } = await params;
  const { orderId: orderIdParam } = await searchParams;

  const qs = orderIdParam
    ? `?orderId=${encodeURIComponent(orderIdParam)}`
    : "";
  const data = await serverApiData<CheckoutData>(
    `/waiter/tables/${tableId}/checkout${qs}`,
  );
  if (!data) notFound();

  return (
    <CheckoutScreen
      table={data.table}
      checks={data.checks}
      order={data.order}
      lines={data.lines}
      bill={data.bill}
    />
  );
}
