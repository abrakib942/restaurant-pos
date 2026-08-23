import "server-only";

import { cookies } from "next/headers";
import type { ApiBody } from "@/lib/api/envelope";

function apiBase() {
  const env =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  return env || "http://localhost:5002";
}

async function forwardCookieHeader(): Promise<string> {
  const store = await cookies();
  const token = store.get("brasa_token")?.value;
  if (token) {
    return `brasa_token=${token}`;
  }
  return store
    .getAll()
    .map((entry) => `${entry.name}=${entry.value}`)
    .join("; ");
}

export async function serverApi<T = undefined>(
  path: string,
  init?: RequestInit,
): Promise<ApiBody<T>> {
  const url = `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Cookie: await forwardCookieHeader(),
    },
    cache: "no-store",
  });

  let body: ApiBody<T>;
  try {
    body = (await res.json()) as ApiBody<T>;
  } catch {
    return { ok: false, error: "Invalid response from API" };
  }

  return body;
}

export async function serverApiData<T>(
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const body = await serverApi<T>(path, init);
  if (!body.ok) {
    return null;
  }
  return body.data ?? null;
}
