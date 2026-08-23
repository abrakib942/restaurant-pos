import "server-only";

import { redirect } from "next/navigation";
import type { Role } from "@repo/db";
import { getSession, roleHomePath, type SessionPayload } from "@/lib/session";

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireRole(role: Role): Promise<SessionPayload> {
  const session = await requireSession();
  if (session.role !== role) {
    redirect(roleHomePath(session.role));
  }
  return session;
}
