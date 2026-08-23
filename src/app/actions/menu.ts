"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { actionError, actionOk, type ActionResult } from "@/lib/action-result";

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
  isAvailable: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v !== "false"),
});

function parseMenuItem(formData: FormData) {
  return menuItemSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    imageUrl: formData.get("imageUrl"),
    categoryId: formData.get("categoryId"),
    sortOrder: formData.get("sortOrder") || 0,
    isAvailable: formData.get("isAvailable") ?? "true",
  });
}

async function revalidateMenuPaths() {
  revalidatePath("/admin/menu");
  revalidatePath("/admin/categories");
}

export async function createMenuItem(
  formData: FormData,
): Promise<ActionResult> {
  await requireRole("ADMIN");

  const parsed = parseMenuItem(formData);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
  });
  if (!category) return actionError("Category not found");

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

  await revalidateMenuPaths();
  return actionOk("Menu item created");
}

export async function updateMenuItem(
  formData: FormData,
): Promise<ActionResult> {
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return actionError("Missing menu item");

  const parsed = parseMenuItem(formData);
  if (!parsed.success) {
    return actionError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const category = await prisma.category.findUnique({
    where: { id: parsed.data.categoryId },
  });
  if (!category) return actionError("Category not found");

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
    return actionError("Menu item not found");
  }

  await revalidateMenuPaths();
  return actionOk("Menu item updated");
}

export async function toggleMenuItemAvailability(
  formData: FormData,
): Promise<ActionResult> {
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return actionError("Missing menu item");

  const item = await prisma.menuItem.findUnique({ where: { id } });
  if (!item) return actionError("Menu item not found");

  await prisma.menuItem.update({
    where: { id },
    data: { isAvailable: !item.isAvailable },
  });

  await revalidateMenuPaths();
  return actionOk(item.isAvailable ? "Marked unavailable" : "Marked available");
}

export async function deleteMenuItem(
  formData: FormData,
): Promise<ActionResult> {
  await requireRole("ADMIN");

  const id = String(formData.get("id") ?? "");
  if (!id) return actionError("Missing menu item");

  try {
    await prisma.menuItem.delete({ where: { id } });
  } catch {
    return actionError(
      "Cannot delete an item that appears on past orders — mark it unavailable instead",
    );
  }

  await revalidateMenuPaths();
  return actionOk("Menu item deleted");
}
