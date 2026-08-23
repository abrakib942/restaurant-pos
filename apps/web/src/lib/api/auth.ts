import "server-only";

import type { Role } from "@repo/db";
import { getSession, type SessionPayload } from "@/lib/session";
import { ApiError } from "@/lib/api/envelope";

export async function requireApiSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new ApiError("Unauthorized", 401);
  }
  return session;
}

export async function requireApiRole(
  ...roles: Role[]
): Promise<SessionPayload> {
  const session = await requireApiSession();
  if (!roles.includes(session.role)) {
    throw new ApiError("Forbidden", 403);
  }
  return session;
}
