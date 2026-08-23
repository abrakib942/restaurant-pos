import { NextResponse } from "next/server";

export type ApiOk<T = undefined> = {
  ok: true;
  message?: string;
  data?: T;
};

export type ApiErr = {
  ok: false;
  error: string;
};

export type ApiBody<T = undefined> = ApiOk<T> | ApiErr;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function jsonOk<T>(
  data?: T,
  init?: { message?: string; status?: number; headers?: HeadersInit },
) {
  const body: ApiOk<T> = { ok: true };
  if (init?.message) body.message = init.message;
  if (data !== undefined) body.data = data;
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: init?.headers,
  });
}

export function jsonError(error: string, status = 400) {
  const body: ApiErr = { ok: false, error };
  return NextResponse.json(body, { status });
}

export function handleRouteError(err: unknown) {
  if (err instanceof ApiError) {
    return jsonError(err.message, err.status);
  }
  console.error(err);
  return jsonError("Internal server error", 500);
}
