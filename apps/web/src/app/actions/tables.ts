"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { suggestQrSlug } from "@/lib/tables";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const tableSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(32),
  qrSlug: z
    .string()
    .trim()
    .min(1, "QR slug is required")
    .max(64)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase letters, numbers, and hyphens",
    ),
});

export async function createTable(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN");

  const label = String(formData.get("label") ?? "");
  const rawSlug = String(formData.get("qrSlug") ?? "").trim();
  const parsed = tableSchema.safeParse({
    label,
    qrSlug: rawSlug || suggestQrSlug(label),
  });
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const [labelClash, slugClash] = await Promise.all([
    prisma.table.findUnique({ where: { label: parsed.data.label } }),
    prisma.table.findUnique({ where: { qrSlug: parsed.data.qrSlug } }),
  ]);
  if (labelClash) return actionError("A table with that label already exists");
  if (slugClash) return actionError("That QR slug is already in use");

  await prisma.table.create({
    data: {
      label: parsed.data.label,
      qrSlug: parsed.data.qrSlug,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/tables");
  revalidatePath("/waiter");
  return actionOk("Table created");
}

export async function updateTable(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return actionError("Missing table");

  const label = String(formData.get("label") ?? "");
  const rawSlug = String(formData.get("qrSlug") ?? "").trim();
  const parsed = tableSchema.safeParse({
    label,
    qrSlug: rawSlug || suggestQrSlug(label),
  });
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const [labelClash, slugClash] = await Promise.all([
    prisma.table.findFirst({
      where: { label: parsed.data.label, NOT: { id } },
    }),
    prisma.table.findFirst({
      where: { qrSlug: parsed.data.qrSlug, NOT: { id } },
    }),
  ]);
  if (labelClash) return actionError("A table with that label already exists");
  if (slugClash) return actionError("That QR slug is already in use");

  try {
    await prisma.table.update({
      where: { id },
      data: {
        label: parsed.data.label,
        qrSlug: parsed.data.qrSlug,
      },
    });
  } catch {
    return actionError("Table not found");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/tables");
  revalidatePath("/waiter");
  return actionOk("Table updated");
}

export async function deleteTable(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return actionError("Missing table");

  const table = await prisma.table.findUnique({
    where: { id },
    include: {
      orders: {
        where: { status: { in: ["OPEN", "BILLING"] } },
        take: 1,
      },
    },
  });
  if (!table) return actionError("Table not found");
  if (table.orders.length > 0) {
    return actionError("Cannot delete a table with an open or billing order");
  }

  try {
    await prisma.table.delete({ where: { id } });
  } catch {
    return actionError(
      "Cannot delete table with order history — clear related records first",
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/tables");
  revalidatePath("/waiter");
  return actionOk("Table deleted");
}
