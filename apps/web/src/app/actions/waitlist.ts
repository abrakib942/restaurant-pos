"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { notifyWaitlist } from "@/lib/realtime";
import { AuditAction, writeAuditLog } from "@/lib/audit";

function revalidateWaitlist() {
  revalidatePath("/admin/waitlist");
  revalidatePath("/waiter");
  notifyWaitlist();
}

const createSchema = z.object({
  partyName: z.string().trim().min(1, "Name is required").max(80),
  partySize: z.coerce.number().int().min(1, "At least 1 guest").max(20),
  phone: z.string().trim().max(32).optional(),
  quotedMinutes: z.coerce.number().int().min(0).max(180).optional().nullable(),
});

export async function createWaitlistEntry(
  formData: FormData,
): Promise<ActionResult> {
  await requireRole("ADMIN");

  const rawPhone = String(formData.get("phone") ?? "").trim();
  const rawQuoted = String(formData.get("quotedMinutes") ?? "").trim();

  const parsed = createSchema.safeParse({
    partyName: formData.get("partyName"),
    partySize: formData.get("partySize"),
    phone: rawPhone || undefined,
    quotedMinutes: rawQuoted ? Number(rawQuoted) : undefined,
  });

  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  await prisma.waitlistEntry.create({
    data: {
      partyName: parsed.data.partyName,
      partySize: parsed.data.partySize,
      phone: parsed.data.phone ?? null,
      quotedMinutes: parsed.data.quotedMinutes ?? null,
    },
  });

  revalidateWaitlist();
  return actionOk("Party added to waitlist");
}

export async function notifyWaitlistEntry(
  entryId: string,
): Promise<ActionResult> {
  await requireRole("ADMIN");

  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
  });
  if (!entry) return actionError("Party not found");
  if (entry.status !== "WAITING") {
    return actionError("Only waiting parties can be notified");
  }

  await prisma.waitlistEntry.update({
    where: { id: entryId },
    data: { status: "NOTIFIED" },
  });

  revalidateWaitlist();
  return actionOk("Party notified");
}

export async function seatWaitlistEntry(input: {
  entryId: string;
  tableId: string;
}): Promise<ActionResult> {
  const session = await requireRole("ADMIN");

  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: input.entryId },
  });
  if (!entry) return actionError("Party not found");
  if (!["WAITING", "NOTIFIED"].includes(entry.status)) {
    return actionError("This party is no longer in the queue");
  }

  const table = await prisma.table.findUnique({
    where: { id: input.tableId },
  });
  if (!table) return actionError("Table not found");
  if (table.status !== "AVAILABLE") {
    return actionError("Table is not available — pick another");
  }

  await prisma.$transaction([
    prisma.waitlistEntry.update({
      where: { id: input.entryId },
      data: {
        status: "SEATED",
        seatedTableId: table.id,
        seatedAt: new Date(),
      },
    }),
    prisma.table.update({
      where: { id: table.id },
      data: { status: "OCCUPIED" },
    }),
  ]);

  await writeAuditLog({
    action: AuditAction.WaitlistSeated,
    actorId: session.userId,
    actorName: session.name,
    target: entry.partyName,
    meta: {
      entryId: entry.id,
      tableLabel: table.label,
      partySize: entry.partySize,
    },
  });

  revalidateWaitlist();
  revalidatePath("/admin/tables");
  return actionOk(`Seated at table ${table.label}`);
}

export async function cancelWaitlistEntry(
  entryId: string,
): Promise<ActionResult> {
  await requireRole("ADMIN");

  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
  });
  if (!entry) return actionError("Party not found");
  if (!["WAITING", "NOTIFIED"].includes(entry.status)) {
    return actionError("Only active queue entries can be cancelled");
  }

  await prisma.waitlistEntry.update({
    where: { id: entryId },
    data: { status: "CANCELLED" },
  });

  revalidateWaitlist();
  return actionOk("Party removed from waitlist");
}

export async function markWaitlistNoShow(
  entryId: string,
): Promise<ActionResult> {
  await requireRole("ADMIN");

  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
  });
  if (!entry) return actionError("Party not found");
  if (entry.status !== "NOTIFIED") {
    return actionError("Mark no-show only after notifying the party");
  }

  await prisma.waitlistEntry.update({
    where: { id: entryId },
    data: { status: "NO_SHOW" },
  });

  revalidateWaitlist();
  return actionOk("Marked no-show");
}
