import { isExpoStale } from "@/lib/expo-meta";
import { getPassQueue } from "@/lib/expo";

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
  /** Ready tickets on the pass, oldest first. */
  ready: ReadyNotification[];
  /** Count for the bell badge (floor-wide). */
  count: number;
  /** How many belong to this waiter's orders. */
  mineCount: number;
  /** Tickets on pass longer than the aging threshold. */
  staleCount: number;
};

export async function getWaiterReadyNotifications(
  waiterId: string,
): Promise<WaiterNotificationsData> {
  const pass = await getPassQueue();

  const ready = pass.map((item) => ({
    id: item.id,
    name: item.name,
    qty: item.qty,
    tableLabel: item.tableLabel,
    tableId: item.tableId,
    orderId: item.orderId,
    readyAt: item.readyAt,
    mine: item.waiterId === waiterId,
  }));

  return {
    ready,
    count: ready.length,
    mineCount: ready.filter((r) => r.mine).length,
    staleCount: ready.filter((r) => isExpoStale(r.readyAt)).length,
  };
}
