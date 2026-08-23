"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(64),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export async function createCategory(
  formData: FormData,
): Promise<ActionResult> {
  await requireRole("ADMIN");

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const existing = await prisma.category.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) {
    return actionError("A category with that name already exists");
  }

  await prisma.category.create({
    data: {
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder,
    },
  });

  revalidatePath("/admin/categories");
  return actionOk("Category created");
}

export async function updateCategory(
  formData: FormData,
): Promise<ActionResult> {
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return actionError("Missing category");

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") || 0,
  });
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const clash = await prisma.category.findFirst({
    where: { name: parsed.data.name, NOT: { id } },
  });
  if (clash) {
    return actionError("A category with that name already exists");
  }

  try {
    await prisma.category.update({
      where: { id },
      data: {
        name: parsed.data.name,
        sortOrder: parsed.data.sortOrder,
      },
    });
  } catch {
    return actionError("Category not found");
  }

  revalidatePath("/admin/categories");
  return actionOk("Category updated");
}

export async function deleteCategory(
  formData: FormData,
): Promise<ActionResult> {
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return actionError("Missing category");

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { items: true } } },
  });
  if (!category) return actionError("Category not found");
  if (category._count.items > 0) {
    return actionError("Remove or reassign menu items before deleting");
  }

  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/categories");
  return actionOk("Category deleted");
}
