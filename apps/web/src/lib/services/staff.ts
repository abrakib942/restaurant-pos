import "server-only";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok, type ServiceResult } from "@/lib/services/result";

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

export async function createStaffService(input: {
  name: string;
  username: string;
  pin: string;
  role: string;
}): Promise<ServiceResult> {
  const parsed = createStaffSchema.safeParse({
    ...input,
    username: input.username.trim().toLowerCase(),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const existing = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });
  if (existing) return fail("That username is already taken");

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      username: parsed.data.username,
      pinHash: await bcrypt.hash(parsed.data.pin, 10),
      role: parsed.data.role,
    },
  });
  return ok("Staff account created");
}

export async function updateStaffService(
  id: string,
  input: { name: string; username: string; pin?: string; role: string },
): Promise<ServiceResult> {
  if (!id) return fail("Missing staff member");
  const parsed = updateStaffSchema.safeParse({
    ...input,
    username: input.username.trim().toLowerCase(),
    pin: input.pin || undefined,
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return fail("Staff member not found");
  if (user.role === "ADMIN") {
    return fail("Admin accounts cannot be edited here");
  }

  const clash = await prisma.user.findFirst({
    where: { username: parsed.data.username, NOT: { id } },
  });
  if (clash) return fail("That username is already taken");

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
  return ok("Staff account updated");
}

export async function deleteStaffService(
  id: string,
  actorUserId: string,
): Promise<ServiceResult> {
  if (!id) return fail("Missing staff member");
  if (id === actorUserId) return fail("You cannot delete your own account");

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      orders: {
        where: { status: { in: ["OPEN", "BILLING"] } },
        take: 1,
      },
    },
  });
  if (!user) return fail("Staff member not found");
  if (user.role === "ADMIN") {
    return fail("Admin accounts cannot be deleted here");
  }
  if (user.orders.length > 0) {
    return fail("Cannot delete a waiter with open or billing orders");
  }

  try {
    await prisma.user.delete({ where: { id } });
  } catch {
    return fail(
      "Cannot delete staff with order history — clear related records first",
    );
  }
  return ok("Staff account deleted");
}
