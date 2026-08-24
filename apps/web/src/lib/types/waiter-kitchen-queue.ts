export type WaiterKitchenQueueItem = {
  fireId: string;
  itemCount: number;
  name: string;
  qty: number;
  status: "PENDING" | "IN_PROGRESS";
  tableId: string;
  tableLabel: string;
  orderId: string;
  queuePosition: number | null;
  estimatedMinutes: number | null;
  estimatedLabel: string | null;
};

export type WaiterKitchenQueueData = {
  totalPending: number;
  inProgressCount: number;
  cap: number;
  items: WaiterKitchenQueueItem[];
};
