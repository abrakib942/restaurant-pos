export type ReadyFireLine = {
  id: string;
  name: string;
  qty: number;
};

export type ReadyNotification = {
  fireId: string;
  tableLabel: string;
  tableId: string;
  orderId: string;
  itemCount: number;
  name: string;
  qty: number;
  items: ReadyFireLine[];
  readyAt: string | null;
  mine: boolean;
};

export type WaiterNotificationsData = {
  ready: ReadyNotification[];
  count: number;
  mineCount: number;
  staleCount: number;
};
