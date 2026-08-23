/** Kitchen may only pull this many tickets into IN_PROGRESS at once. */
export const KITCHEN_IN_PROGRESS_CAP = 3;

/**
 * Polling interval for kitchen board and waiter notifications.
 * MVP uses TanStack Query `refetchInterval` instead of websockets.
 */
export const POLL_INTERVAL_MS = 4000;

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
