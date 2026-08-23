import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok, type ServiceResult } from "@/lib/services/result";

const menuItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  description: z.string().trim().min(1, "Description is required").max(500),
  price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Price must be a valid amount")
    .refine((v) => Number(v) > 0, "Price must be greater than 0"),
  imageUrl: z.string().trim().url("Image URL must be valid"),
  categoryId: z.string().min(1, "Category is required"),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isAvailable: z.boolean().default(true),
});

export type MenuItemInput = z.input<typeof menuItemSchema>;

export async function createMenuItemService(
  input: MenuItemInput,
): Promise<ServiceResult> {
  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
  });
  if (!category) return fail("Category not found");

  await prisma.menuItem.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      imageUrl: parsed.data.imageUrl,
      categoryId: parsed.data.categoryId,
      sortOrder: parsed.data.sortOrder,
      isAvailable: parsed.data.isAvailable,
    },
  });
  return ok("Menu item created");
}

export async function updateMenuItemService(
  id: string,
  input: MenuItemInput,
): Promise<ServiceResult> {
  if (!id) return fail("Missing menu item");
  const parsed = menuItemSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
  });
  if (!category) return fail("Category not found");

  try {
    await prisma.menuItem.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        price: parsed.data.price,
        imageUrl: parsed.data.imageUrl,
        categoryId: parsed.data.categoryId,
        sortOrder: parsed.data.sortOrder,
        isAvailable: parsed.data.isAvailable,
      },
    });
  } catch {
    return fail("Menu item not found");
  }
  return ok("Menu item updated");
}

export async function toggleMenuItemAvailabilityService(
  id: string,
): Promise<ServiceResult> {
  if (!id) return fail("Missing menu item");
  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item) return fail("Menu item not found");

  await prisma.menuItem.update({
    where: { id },
    data: { isAvailable: !item.isAvailable },
  });
  return ok(item.isAvailable ? "Marked unavailable" : "Marked available");
}

export async function deleteMenuItemService(id: string): Promise<ServiceResult> {
  if (!id) return fail("Missing menu item");
  try {
    await prisma.menuItem.delete({ where: { id } });
  } catch {
    return fail(
      "Cannot delete an item that appears on past orders — mark it unavailable instead",
    );
  }
  return ok("Menu item deleted");
}
