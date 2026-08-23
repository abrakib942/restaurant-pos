import "server-only";

import { redirect } from "next/navigation";
import type { Role } from "@/lib/role-path";
import { serverApiData } from "@/lib/server-api";
import { roleHomePath, type SessionPayload } from "@/lib/role-path";

type MeResponse = SessionPayload;

export async function requireSession(): Promise<SessionPayload> {
  const session = await serverApiData<MeResponse>("/auth/me");
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
