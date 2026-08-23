import { prisma } from "@/lib/prisma";

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
export const LOGIN_IP_MAX_FAILURES = 30;

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "";
  }
  return headers.get("x-real-ip") ?? "";
}

export type LoginLockStatus =
  | { locked: false }
  | { locked: true; message: string; retryAfterMs: number };

export async function checkLoginLockout(
  username: string,
  ip: string,
): Promise<LoginLockStatus> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);

  const [userFailures, ipFailures] = await Promise.all([
    prisma.loginAttempt.findMany({
      where: {
        username,
        success: false,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: LOGIN_MAX_FAILURES,
      select: { createdAt: true },
    }),
    ip
      ? prisma.loginAttempt.count({
          where: {
            ip,
            success: false,
            createdAt: { gte: since },
          },
        })
      : Promise.resolve(0),
  ]);

  if (ipFailures >= LOGIN_IP_MAX_FAILURES) {
    return lockMessage(Date.now());
  }

  if (userFailures.length < LOGIN_MAX_FAILURES) {
    return { locked: false };
  }

  const oldestRelevant = userFailures[userFailures.length - 1]?.createdAt;
  if (!oldestRelevant) return { locked: false };

  const lockEndsAt =
    userFailures[0]!.createdAt.getTime() + LOGIN_LOCKOUT_MS;
  if (Date.now() < lockEndsAt) {
    return {
      locked: true,
      message: formatLockMessage(lockEndsAt - Date.now()),
      retryAfterMs: lockEndsAt - Date.now(),
    };
  }

  return { locked: false };
}

function lockMessage(nowMs: number): LoginLockStatus {
  const retryAfterMs = LOGIN_LOCKOUT_MS;
  return {
    locked: true,
    message: formatLockMessage(retryAfterMs),
    retryAfterMs,
  };
}

function formatLockMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
  return `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}

export async function recordLoginAttempt(input: {
  username: string;
  ip: string;
  success: boolean;
}) {
  await prisma.loginAttempt.create({
    data: {
      username: input.username,
      ip: input.ip,
      success: input.success,
    },
  });
}
