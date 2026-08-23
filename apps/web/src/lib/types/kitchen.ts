export type KitchenStationInfo = {
  id: string;
  name: string;
};

export type KitchenTicket = {
  id: string;
  name: string;
  qty: number;
  status: "PENDING" | "IN_PROGRESS" | "READY";
  priority: "NORMAL" | "RUSH";
  course: number;
  stationId: string | null;
  stationName: string | null;
  tableLabel: string;
  waiterName: string;
  createdAt: string;
  startedAt: string | null;
  readyAt: string | null;
};

export type KitchenBoardData = {
  stations: KitchenStationInfo[];
  pending: KitchenTicket[];
  inProgress: KitchenTicket[];
  ready: KitchenTicket[];
  inProgressCount: number;
  cap: number;
};
