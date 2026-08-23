/** Kitchen may only pull this many tickets into IN_PROGRESS at once. */
export const KITCHEN_IN_PROGRESS_CAP = 3;

/** Ready tickets on the pass longer than this trigger bump/highlight. */
export const EXPO_AGING_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Polling interval when SSE is disconnected (fallback).
 * When SSE is connected, clients should set refetchInterval to false.
 */
export const POLL_INTERVAL_MS = 4000;

export const SSE_RETRY_MS = 3000;

export const RESTAURANT_NAME = "Brasa";

export function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export function tableMenuUrl(qrSlug: string) {
  return `${getAppUrl()}/menu/${qrSlug}`;
}
