/** Concurrent kitchen fires that may have items IN_PROGRESS. */
export const KITCHEN_IN_PROGRESS_FIRE_CAP = 2;

/** @deprecated Use KITCHEN_IN_PROGRESS_FIRE_CAP — item-level cap retired. */
export const KITCHEN_IN_PROGRESS_CAP = KITCHEN_IN_PROGRESS_FIRE_CAP;

/** Heuristic minutes per pending fire (self + fires ahead) in the kitchen queue. */
export const QUEUE_MINUTES_PER_PENDING = 6;

/** Extra minutes per additional item in a fire beyond the first. */
export const QUEUE_MINUTES_PER_EXTRA_ITEM = 2;

/** Extra minutes added when the kitchen in-progress fire slots are fully loaded. */
export const QUEUE_LOAD_MINUTES = 3;

/** Ready tickets on the pass longer than this trigger bump/highlight. */
export const EXPO_AGING_THRESHOLD_MS = 5 * 60 * 1000;
