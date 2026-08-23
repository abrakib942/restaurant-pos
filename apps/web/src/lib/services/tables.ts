import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { suggestQrSlug } from "@/lib/tables";
import { fail, ok, type ServiceResult } from "@/lib/services/result";

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

export async function createTableService(input: {
  label: string;
  qrSlug?: string;
}): Promise<ServiceResult> {
  const parsed = tableSchema.safeParse({
    label: input.label,
    qrSlug: (input.qrSlug ?? "").trim() || suggestQrSlug(input.label),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const [labelClash, slugClash] = await Promise.all([
    prisma.table.findUnique({ where: { label: parsed.data.label } }),
    prisma.table.findUnique({ where: { qrSlug: parsed.data.qrSlug } }),
  ]);
  if (labelClash) return fail("A table with that label already exists");
  if (slugClash) return fail("That QR slug is already in use");

  await prisma.table.create({
    data: {
      label: parsed.data.label,
      qrSlug: parsed.data.qrSlug,
    },
  });
  return ok("Table created");
}

export async function updateTableService(
  id: string,
  input: { label: string; qrSlug?: string },
): Promise<ServiceResult> {
  if (!id) return fail("Missing table");
  const parsed = tableSchema.safeParse({
    label: input.label,
    qrSlug: (input.qrSlug ?? "").trim() || suggestQrSlug(input.label),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const [labelClash, slugClash] = await Promise.all([
    prisma.table.findFirst({
      where: { label: parsed.data.label, NOT: { id } },
    }),
    prisma.table.findFirst({
      where: { qrSlug: parsed.data.qrSlug, NOT: { id } },
    }),
  ]);
  if (labelClash) return fail("A table with that label already exists");
  if (slugClash) return fail("That QR slug is already in use");

  try {
    await prisma.table.update({
      where: { id },
      data: {
        label: parsed.data.label,
        qrSlug: parsed.data.qrSlug,
      },
    });
  } catch {
    return fail("Table not found");
  }
  return ok("Table updated");
}

export async function deleteTableService(id: string): Promise<ServiceResult> {
  if (!id) return fail("Missing table");
  const table = await prisma.table.findUnique({
    where: { id },
    include: {
      orders: {
        where: { status: { in: ["OPEN", "BILLING"] } },
        take: 1,
      },
    },
  });
  if (!table) return fail("Table not found");
  if (table.orders.length > 0) {
    return fail("Cannot delete a table with an open or billing order");
  }

  try {
    await prisma.table.delete({ where: { id } });
  } catch {
    return fail(
      "Cannot delete table with order history — clear related records first",
    );
  }
  return ok("Table deleted");
}
