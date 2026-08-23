export type TopItem = {
  name: string;
  qty: number;
};

export type AdminDashboardData = {
  dateLabel: string;
  salesToday: number;
  paidOrdersToday: number;
  openOrders: number;
  billingOrders: number;
  tables: {
    available: number;
    occupied: number;
    billing: number;
    total: number;
  };
  topItems: TopItem[];
};
