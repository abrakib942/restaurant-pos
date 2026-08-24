export type ServiceRequestLineRow = {
  id: string;
  menuItemId: string;
  name: string;
  qty: number;
  note: string | null;
};

export type ServiceRequestRow = {
  id: string;
  type: "CALL_WAITER" | "REQUEST_BILL";
  tableId: string;
  tableLabel: string;
  createdAt: string;
  acknowledgedAt: string | null;
  lineCount: number;
  linesPreview: string;
  lines: ServiceRequestLineRow[];
};

export type ServiceRequestsData = {
  requests: ServiceRequestRow[];
  count: number;
};
