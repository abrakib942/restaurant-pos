export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export function actionOk(message?: string): ActionResult {
  return message ? { ok: true, message } : { ok: true };
}

export function actionError(error: string): ActionResult {
  return { ok: false, error };
}
