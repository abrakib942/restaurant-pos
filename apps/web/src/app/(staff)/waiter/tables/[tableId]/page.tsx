import { notFound } from "next/navigation";
import { PosScreen } from "@/components/waiter/pos-screen";
import { requireRole } from "@/lib/auth";
import { serverApiData } from "@/lib/server-api";
import type { ServiceRequestRow } from "@/lib/types/service-requests";

type PosPageProps = {
  params: Promise<{ tableId: string }>;
  searchParams: Promise<{ requestId?: string }>;
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
  liveFire: {
    fireId: string;
    mode: "pending" | "inProgress";
    queuePosition: number | null;
    estimatedLabel: string | null;
  } | null;
  existingLines: {
    id: string;
    fireId: string;
    menuItemId: string;
    name: string;
    qty: number;
    unitPrice: string;
    status: string;
    removable?: boolean;
    queuePosition?: number | null;
    estimatedLabel?: string | null;
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

export default async function WaiterPosPage({
  params,
  searchParams,
}: PosPageProps) {
  await requireRole("WAITER");
  const { tableId } = await params;
  const { requestId } = await searchParams;

  const data = await serverApiData<PosData>(`/waiter/tables/${tableId}/pos`);
  if (!data) notFound();

  let guestRequest: ServiceRequestRow | null = null;
  if (requestId) {
    const request = await serverApiData<ServiceRequestRow>(
      `/waiter/service-requests/${requestId}`,
    );
    if (request && request.tableId === tableId) {
      guestRequest = request;
    }
  }

  return (
    <PosScreen
      table={data.table}
      categories={data.categories}
      menuItems={data.menuItems}
      existingLines={data.existingLines}
      liveFire={data.liveFire}
      floorOps={data.floorOps}
      serviceRequestId={guestRequest?.id}
      guestLines={guestRequest?.lines}
    />
  );
}
