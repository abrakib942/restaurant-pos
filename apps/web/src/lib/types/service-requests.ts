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
