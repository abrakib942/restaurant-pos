export type ServiceResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string };

export function ok<T = undefined>(
  message?: string,
  data?: T,
): ServiceResult<T> {
  if (data !== undefined) {
    return message ? { ok: true, message, data } : { ok: true, data };
  }
  return message ? { ok: true, message } : { ok: true };
}

export function fail(error: string): ServiceResult<never> {
  return { ok: false, error };
}

export function serviceToHttpStatus(result: ServiceResult): number {
  if (result.ok) return 200;
  const e = result.error.toLowerCase();
  if (e.includes("not found")) return 404;
  if (e.includes("unauthorized") || e.includes("forbidden")) return 403;
  return 400;
}
