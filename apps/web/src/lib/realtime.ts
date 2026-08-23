import { EventEmitter } from "node:events";

export type RealtimeChannel = "kitchen" | "waiter" | "admin-waitlist";

export type RealtimeEvent = {
  ts: number;
  reason?: string;
};

const bus = new EventEmitter();
bus.setMaxListeners(200);

export function publishRealtime(
  channel: RealtimeChannel,
  reason?: string,
): void {
  bus.emit(channel, { ts: Date.now(), reason } satisfies RealtimeEvent);
}

export function subscribeRealtime(
  channel: RealtimeChannel,
  listener: (event: RealtimeEvent) => void,
): () => void {
  bus.on(channel, listener);
  return () => bus.off(channel, listener);
}

/** Kitchen board + pass/expo on waiter. */
export function notifyKitchen(reason?: string) {
  publishRealtime("kitchen", reason);
  publishRealtime("waiter", reason);
}

/** Pass, service calls, floor SSR. */
export function notifyWaiter(reason?: string) {
  publishRealtime("waiter", reason);
}

/** Admin door queue + waiter door strip. */
export function notifyWaitlist(reason?: string) {
  publishRealtime("admin-waitlist", reason);
  publishRealtime("waiter", reason);
}
