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
  createdAt: string;
  startedAt: string | null;
  readyAt: string | null;
};

export type KitchenFireCard = {
  fireId: string;
  tableLabel: string;
  waiterName: string;
  priority: "NORMAL" | "RUSH";
  courseMin: number;
  createdAt: string;
  startedAt: string | null;
  readyAt: string | null;
  queuePosition: number | null;
  estimatedMinutes: number | null;
  estimatedLabel: string | null;
  itemCount: number;
  items: KitchenTicket[];
};

export type KitchenBoardData = {
  stations: KitchenStationInfo[];
  pending: KitchenFireCard[];
  inProgress: KitchenFireCard[];
  ready: KitchenFireCard[];
  inProgressCount: number;
  cap: number;
};
