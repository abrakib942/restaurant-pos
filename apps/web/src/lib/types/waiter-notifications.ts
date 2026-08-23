export type ReadyNotification = {
  id: string;
  name: string;
  qty: number;
  tableLabel: string;
  tableId: string;
  readyAt: string | null;
  orderId: string;
  mine: boolean;
};

export type WaiterNotificationsData = {
  ready: ReadyNotification[];
  count: number;
  mineCount: number;
  staleCount: number;
};
