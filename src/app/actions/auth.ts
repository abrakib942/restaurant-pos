"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, roleHomePath } from "@/lib/session";
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

export type LoginState = {
  error?: string;
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    pin: formData.get("pin"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid credentials" };
  }

  const username = parsed.data.username.toLowerCase();
  const headerStore = await headers();
  const ip = getClientIp(headerStore);

  const lock = await checkLoginLockout(username, ip);
  if (lock.locked) {
    await writeAuditLog({
      action: AuditAction.LoginLocked,
      actorName: username,
      meta: { ip },
    });
    return { error: lock.message };
  }

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    await recordLoginAttempt({ username, ip, success: false });
    await writeAuditLog({
      action: AuditAction.LoginFailed,
      actorName: username,
      meta: { ip, reason: "unknown_user" },
    });
    return { error: "Invalid username or PIN" };
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
    return { error: "Invalid username or PIN" };
  }

  await recordLoginAttempt({ username, ip, success: true });
  await writeAuditLog({
    action: AuditAction.LoginSuccess,
    actorId: user.id,
    actorName: user.name,
    meta: { ip, role: user.role },
  });

  await createSession({
    userId: user.id,
    role: user.role,
    name: user.name,
    username: user.username,
  });

  redirect(roleHomePath(user.role));
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
