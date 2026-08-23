"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { requireRole } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/action-result";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export type UploadMenuImageResult = ActionResult & { url?: string };

export async function uploadMenuImage(
  formData: FormData,
): Promise<UploadMenuImageResult> {
  await requireRole("ADMIN");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return actionError("Choose an image file");
  }
  if (file.size > MAX_BYTES) {
    return actionError("Image must be 2 MB or smaller");
  }

  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return actionError("Use JPEG, PNG, or WebP");
  }

  const dir = path.join(process.cwd(), "public", "uploads", "menu");
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return {
    ok: true,
    message: "Image uploaded",
    url: `/uploads/menu/${filename}`,
  };
}
