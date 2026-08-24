import {
  KITCHEN_IN_PROGRESS_FIRE_CAP,
  QUEUE_LOAD_MINUTES,
  QUEUE_MINUTES_PER_EXTRA_ITEM,
  QUEUE_MINUTES_PER_PENDING,
} from "@/common/constants/app.constants";

export type QueueableFire = {
  id: string;
  priority: "NORMAL" | "RUSH";
  courseMin: number;
  createdAt: string;
  itemCount: number;
};

export type QueuedFire<T extends QueueableFire> = T & {
  queuePosition: number;
  estimatedMinutes: number;
  estimatedLabel: string;
};

/** @deprecated Prefer QueueableFire — kept for any transitional callers. */
export type QueueableTicket = {
  id: string;
  priority: "NORMAL" | "RUSH";
  course: number;
  createdAt: string;
};

export type QueuedTicket<T extends QueueableTicket> = T & {
  queuePosition: number;
  estimatedMinutes: number;
  estimatedLabel: string;
};

export function comparePendingFires<T extends QueueableFire>(
  a: T,
  b: T,
): number {
  if (a.priority !== b.priority) {
    return a.priority === "RUSH" ? -1 : 1;
  }
  if (a.courseMin !== b.courseMin) return a.courseMin - b.courseMin;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

/**
 * Point estimate: 6 min per fire at or ahead of this position,
 * plus 2 min per extra item in this fire,
 * plus kitchen-load 3 min × (inProgressFireCount / fireCap).
 */
export function estimateFireMinutes(
  queuePosition: number,
  inProgressFireCount: number,
  itemCount: number,
  cap = KITCHEN_IN_PROGRESS_FIRE_CAP,
): number {
  const position = Math.max(1, queuePosition);
  const loadRatio = cap > 0 ? Math.min(1, inProgressFireCount / cap) : 0;
  const sizeBonus = Math.max(0, itemCount - 1) * QUEUE_MINUTES_PER_EXTRA_ITEM;
  return Math.max(
    1,
    Math.round(
      position * QUEUE_MINUTES_PER_PENDING +
        sizeBonus +
        QUEUE_LOAD_MINUTES * loadRatio,
    ),
  );
}

export function formatEtaRange(minutes: number): string {
  const min = Math.max(1, Math.round(minutes * 0.8));
  const max = Math.max(min, Math.round(minutes * 1.2));
  return `~${min}–${max} min`;
}

export function buildPendingFireQueue<T extends QueueableFire>(
  fires: T[],
  inProgressFireCount: number,
  cap = KITCHEN_IN_PROGRESS_FIRE_CAP,
): QueuedFire<T>[] {
  const sorted = [...fires].sort(comparePendingFires);
  return sorted.map((fire, index) => {
    const queuePosition = index + 1;
    const estimatedMinutes = estimateFireMinutes(
      queuePosition,
      inProgressFireCount,
      fire.itemCount,
      cap,
    );
    return {
      ...fire,
      queuePosition,
      estimatedMinutes,
      estimatedLabel: formatEtaRange(estimatedMinutes),
    };
  });
}

export function fireQueueLookup<T extends QueueableFire>(
  queued: QueuedFire<T>[],
): Map<string, QueuedFire<T>> {
  return new Map(queued.map((fire) => [fire.id, fire]));
}

/** Legacy item-level helpers — prefer fire queue. */
export function comparePendingTickets<T extends QueueableTicket>(
  a: T,
  b: T,
): number {
  if (a.priority !== b.priority) {
    return a.priority === "RUSH" ? -1 : 1;
  }
  if (a.course !== b.course) return a.course - b.course;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

export function estimateMinutes(
  queuePosition: number,
  inProgressCount: number,
  cap = KITCHEN_IN_PROGRESS_FIRE_CAP,
): number {
  return estimateFireMinutes(queuePosition, inProgressCount, 1, cap);
}

export function buildPendingQueue<T extends QueueableTicket>(
  items: T[],
  inProgressCount: number,
  cap = KITCHEN_IN_PROGRESS_FIRE_CAP,
): QueuedTicket<T>[] {
  const sorted = [...items].sort(comparePendingTickets);
  return sorted.map((item, index) => {
    const queuePosition = index + 1;
    const estimatedMinutes = estimateMinutes(
      queuePosition,
      inProgressCount,
      cap,
    );
    return {
      ...item,
      queuePosition,
      estimatedMinutes,
      estimatedLabel: formatEtaRange(estimatedMinutes),
    };
  });
}

export function queueLookup<T extends QueueableTicket>(
  queued: QueuedTicket<T>[],
): Map<string, QueuedTicket<T>> {
  return new Map(queued.map((ticket) => [ticket.id, ticket]));
}
