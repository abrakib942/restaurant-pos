import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok, type ServiceResult } from "@/lib/services/result";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(64),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export async function createCategoryService(input: {
  name: string;
  sortOrder?: number;
}): Promise<ServiceResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const existing = await prisma.category.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) return fail("A category with that name already exists");

  await prisma.category.create({
    data: {
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder,
    },
  });
  return ok("Category created");
}

export async function updateCategoryService(
  id: string,
  input: { name: string; sortOrder?: number },
): Promise<ServiceResult> {
  if (!id) return fail("Missing category");
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const clash = await prisma.category.findFirst({
    where: { name: parsed.data.name, NOT: { id } },
  });
  if (clash) return fail("A category with that name already exists");

  try {
    await prisma.category.update({
      where: { id },
      data: {
        name: parsed.data.name,
        sortOrder: parsed.data.sortOrder,
      },
    });
  } catch {
    return fail("Category not found");
  }
  return ok("Category updated");
}

export async function deleteCategoryService(id: string): Promise<ServiceResult> {
  if (!id) return fail("Missing category");
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { items: true } } },
  });
  if (!category) return fail("Category not found");
  if (category._count.items > 0) {
    return fail("Remove or reassign menu items before deleting");
  }
  await prisma.category.delete({ where: { id } });
  return ok("Category deleted");
}
