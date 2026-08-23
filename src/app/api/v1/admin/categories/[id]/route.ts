import { requireApiRole } from "@/lib/api/auth";
import { handleRouteError } from "@/lib/api/envelope";
import { fromService } from "@/lib/api/from-service";
import {
  deleteCategoryService,
  updateCategoryService,
} from "@/lib/services/categories";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  try {
    await requireApiRole("ADMIN");
    const { id } = await ctx.params;
    const body = (await req.json()) as { name?: string; sortOrder?: number };
    return fromService(
      await updateCategoryService(id, {
        name: body.name ?? "",
        sortOrder: body.sortOrder,
      }),
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    await requireApiRole("ADMIN");
    const { id } = await ctx.params;
    return fromService(await deleteCategoryService(id));
  } catch (err) {
    return handleRouteError(err);
  }
}
