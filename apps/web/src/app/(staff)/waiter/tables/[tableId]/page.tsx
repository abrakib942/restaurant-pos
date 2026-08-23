import { notFound } from "next/navigation";
import { PosScreen } from "@/components/waiter/pos-screen";
import { requireRole } from "@/lib/auth";
import { serverApiData } from "@/lib/server-api";

type PosPageProps = {
  params: Promise<{ tableId: string }>;
};

type PosData = {
  table: {
    id: string;
    label: string;
    status: "AVAILABLE" | "OCCUPIED" | "BILLING";
  };
  categories: { id: string; name: string }[];
  menuItems: {
    id: string;
    name: string;
    description: string;
    price: string;
    imageUrl: string;
    isAvailable: boolean;
    categoryId: string;
    categoryName: string;
  }[];
  existingLines: {
    id: string;
    name: string;
    qty: number;
    unitPrice: string;
    status: string;
  }[];
  floorOps: {
    hasActiveOrder: boolean;
    currentWaiterId: string | null;
    tables: {
      id: string;
      label: string;
      status: "AVAILABLE" | "OCCUPIED" | "BILLING";
      hasOpenOrder: boolean;
    }[];
    waiters: { id: string; name: string }[];
  };
};

export default async function WaiterPosPage({ params }: PosPageProps) {
  await requireRole("WAITER");
  const { tableId } = await params;

  const data = await serverApiData<PosData>(`/waiter/tables/${tableId}/pos`);
  if (!data) notFound();

  return (
    <PosScreen
      table={data.table}
      categories={data.categories}
      menuItems={data.menuItems}
      existingLines={data.existingLines}
      floorOps={data.floorOps}
    />
  );
}
