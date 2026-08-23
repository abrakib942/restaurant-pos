import "server-only";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  roleHomePath,
  type SessionPayload,
} from "@/lib/session";
import { fail, ok, type ServiceResult } from "@/lib/services/result";
import {
  checkLoginLockout,
  getClientIp,
  recordLoginAttempt,
} from "@/lib/auth-lockout";
import { AuditAction, writeAuditLog } from "@/lib/audit";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(64),
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits"),
});

export async function loginService(input: {
  username: string;
  pin: string;
  ip?: string;
}): Promise<
  ServiceResult<{ redirectTo: string; user: Omit<SessionPayload, never> }>
> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid credentials");
  }

  const username = parsed.data.username.toLowerCase();
  const ip = input.ip ?? "";

  const lock = await checkLoginLockout(username, ip);
  if (lock.locked) {
    await writeAuditLog({
      action: AuditAction.LoginLocked,
      actorName: username,
      meta: { ip },
    });
    return fail(lock.message);
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    await recordLoginAttempt({ username, ip, success: false });
    await writeAuditLog({
      action: AuditAction.LoginFailed,
      actorName: username,
      meta: { ip, reason: "unknown_user" },
    });
    return fail("Invalid username or PIN");
  }

  const pinOk = await bcrypt.compare(parsed.data.pin, user.pinHash);
  if (!pinOk) {
    await recordLoginAttempt({ username, ip, success: false });
    await writeAuditLog({
      action: AuditAction.LoginFailed,
      actorId: user.id,
      actorName: user.name,
      meta: { ip, reason: "bad_pin" },
    });
    return fail("Invalid username or PIN");
  }

  await recordLoginAttempt({ username, ip, success: true });
  await writeAuditLog({
    action: AuditAction.LoginSuccess,
    actorId: user.id,
    actorName: user.name,
    meta: { ip, role: user.role },
  });

  const session: SessionPayload = {
    userId: user.id,
    role: user.role,
    name: user.name,
    username: user.username,
  };
  await createSession(session);

  return ok("Signed in", {
    redirectTo: roleHomePath(user.role),
    user: session,
  });
}

export async function logoutService(): Promise<ServiceResult> {
  await destroySession();
  return ok("Logged out");
}
