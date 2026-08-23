import { getAppUrl } from "@/lib/constants";
import type { ApiBody } from "@/lib/api/envelope";

function apiBase() {
  const env =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  return env || "http://localhost:5002";
}

export class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
  }
}

export async function apiFetch<T = undefined>(
  path: string,
  init?: RequestInit,
): Promise<ApiBody<T>> {
  const url = `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  let body: ApiBody<T>;
  try {
    body = (await res.json()) as ApiBody<T>;
  } catch {
    throw new ApiClientError("Invalid response from API", res.status);
  }

  if ("ok" in body) {
    if (!body.ok) {
      throw new ApiClientError(body.error || "Request failed", res.status);
    }
    return body;
  }

  if (!res.ok) {
    const legacy = body as { message?: string; error?: string };
    throw new ApiClientError(
      legacy.error || legacy.message || "Request failed",
      res.status,
    );
  }

  const legacy = body as { data?: T; message?: string };
  return {
    ok: true,
    data: legacy.data,
    message: legacy.message,
  };
}

export async function apiMutate<T = undefined>(
  path: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<ApiBody<T>> {
  return apiFetch<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Absolute app origin for docs / Nest cutover notes. */
export function documentedApiOrigin() {
  const env =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  return env || getAppUrl();
}

export function clientApiBase() {
  return apiBase();
}
