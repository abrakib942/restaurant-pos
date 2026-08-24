export type GuestOrderStatusLine = {
  id: string;
  fireId: string;
  name: string;
  qty: number;
  status: "PENDING" | "IN_PROGRESS" | "READY" | "SERVED";
  queuePosition: number | null;
  estimatedMinutes: number | null;
  estimatedLabel: string | null;
  batchLabel: string;
};

export type GuestPendingRequest = {
  id: string;
  acknowledgedAt: string | null;
  lines: {
    menuItemId: string;
    name: string;
    qty: number;
    note: string | null;
  }[];
};

export type GuestOrderStatusData = {
  table: {
    qrSlug: string;
    label: string;
    status: "AVAILABLE" | "OCCUPIED" | "BILLING";
  };
  pendingRequest: GuestPendingRequest | null;
  items: GuestOrderStatusLine[];
  kitchenSummary: {
    totalPending: number;
    yourPendingCount: number;
    yourPendingFires: number;
  };
};
