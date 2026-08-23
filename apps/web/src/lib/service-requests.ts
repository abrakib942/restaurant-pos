import { prisma } from "@/lib/prisma";

export type ServiceRequestRow = {
  id: string;
  type: "CALL_WAITER" | "REQUEST_BILL";
  tableId: string;
  tableLabel: string;
  createdAt: string;
};

export type ServiceRequestsData = {
  requests: ServiceRequestRow[];
  count: number;
};

export async function getOpenServiceRequests(): Promise<ServiceRequestsData> {
  const rows = await prisma.serviceRequest.findMany({
    where: { status: "OPEN" },
    include: {
      table: { select: { label: true } },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  const requests = rows.map((row) => ({
    id: row.id,
    type: row.type,
    tableId: row.tableId,
    tableLabel: row.table.label,
    createdAt: row.createdAt.toISOString(),
  }));

  return { requests, count: requests.length };
}
