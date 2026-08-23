import "server-only";

import type { Prisma } from "@repo/db";
import { prisma } from "@/lib/prisma";
import type { AuditLogRow } from "@/lib/audit-meta";

export { type AuditLogRow, formatAuditAction } from "@/lib/audit-meta";

export const AuditAction = {
  LoginSuccess: "auth.login.success",
  LoginFailed: "auth.login.failed",
  LoginLocked: "auth.login.locked",
  BillGenerated: "bill.generated",
  BillPaid: "bill.paid",
  OrderVoid: "order.void",
  WaitlistSeated: "waitlist.seated",
} as const;

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction];

export async function writeAuditLog(input: {
  action: AuditActionValue | string;
  actorId?: string | null;
  actorName?: string | null;
  target?: string | null;
  meta?: Record<string, unknown> | null;
}) {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      actorId: input.actorId ?? null,
      actorName: input.actorName ?? null,
      target: input.target ?? null,
      meta: (input.meta ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function getAdminAuditLog(limit = 100): Promise<AuditLogRow[]> {
  const rows = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    actorName: row.actorName,
    target: row.target,
    meta:
      row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
        ? (row.meta as Record<string, unknown>)
        : null,
    createdAt: row.createdAt.toISOString(),
  }));
}
