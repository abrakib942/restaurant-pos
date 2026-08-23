import { EXPO_AGING_THRESHOLD_MS } from "@/lib/constants";

export function readyAgeMs(
  readyAt: string | null,
  now = Date.now(),
): number | null {
  if (!readyAt) return null;
  return Math.max(0, now - new Date(readyAt).getTime());
}

export function isExpoStale(readyAt: string | null, now = Date.now()): boolean {
  const age = readyAgeMs(readyAt, now);
  return age !== null && age >= EXPO_AGING_THRESHOLD_MS;
}
