"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const staffRoleSchema = z.enum(["WAITER", "KITCHEN"]);

const createStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  username: z
    .string()
    .trim()
    .min(2, "Username is required")
    .max(32)
    .regex(
      /^[a-z0-9._-]+$/,
      "Username must be lowercase letters, numbers, ., _, or -",
    ),
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits"),
  role: staffRoleSchema,
});

const updateStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  username: z
    .string()
    .trim()
    .min(2, "Username is required")
    .max(32)
    .regex(
      /^[a-z0-9._-]+$/,
      "Username must be lowercase letters, numbers, ., _, or -",
    ),
  pin: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{4}$/.test(v), "PIN must be 4 digits"),
  role: staffRoleSchema,
});

export async function createStaff(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN");

  const parsed = createStaffSchema.safeParse({
    name: formData.get("name"),
    username: String(formData.get("username") ?? "")
      .trim()
      .toLowerCase(),
    pin: formData.get("pin"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const existing = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });
  if (existing) return actionError("That username is already taken");

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      username: parsed.data.username,
      pinHash: await bcrypt.hash(parsed.data.pin, 10),
      role: parsed.data.role,
    },
  });

  revalidatePath("/admin/staff");
  return actionOk("Staff account created");
}

export async function updateStaff(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return actionError("Missing staff member");

  const parsed = updateStaffSchema.safeParse({
    name: formData.get("name"),
    username: String(formData.get("username") ?? "")
      .trim()
      .toLowerCase(),
    pin: String(formData.get("pin") ?? "") || undefined,
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return actionError("Staff member not found");
  if (user.role === "ADMIN") {
    return actionError("Admin accounts cannot be edited here");
  }

  const clash = await prisma.user.findFirst({
    where: { username: parsed.data.username, NOT: { id } },
  });
  if (clash) return actionError("That username is already taken");

  await prisma.user.update({
    where: { id },
    data: {
      name: parsed.data.name,
      username: parsed.data.username,
      role: parsed.data.role,
      ...(parsed.data.pin
        ? { pinHash: await bcrypt.hash(parsed.data.pin, 10) }
        : {}),
    },
  });

  revalidatePath("/admin/staff");
  return actionOk("Staff account updated");
}

export async function deleteStaff(formData: FormData): Promise<ActionResult> {
  const session = await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return actionError("Missing staff member");
  if (id === session.userId) {
    return actionError("You cannot delete your own account");
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      orders: {
        where: { status: { in: ["OPEN", "BILLING"] } },
        take: 1,
      },
    },
  });
  if (!user) return actionError("Staff member not found");
  if (user.role === "ADMIN") {
    return actionError("Admin accounts cannot be deleted here");
  }
  if (user.orders.length > 0) {
    return actionError("Cannot delete a waiter with open or billing orders");
  }

  try {
    await prisma.user.delete({ where: { id } });
  } catch {
    return actionError(
      "Cannot delete staff with order history — clear related records first",
    );
  }

  revalidatePath("/admin/staff");
  return actionOk("Staff account deleted");
}
