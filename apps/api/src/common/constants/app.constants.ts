/** Kitchen may only pull this many tickets into IN_PROGRESS at once. */
export const KITCHEN_IN_PROGRESS_CAP = 3;

/** Ready tickets on the pass longer than this trigger bump/highlight. */
export const EXPO_AGING_THRESHOLD_MS = 5 * 60 * 1000;
