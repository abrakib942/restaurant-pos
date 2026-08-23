import { requireApiRole } from "@/lib/api/auth";
import { handleRouteError } from "@/lib/api/envelope";
import { fromService } from "@/lib/api/from-service";
import {
  deleteMenuItemService,
  updateMenuItemService,
} from "@/lib/services/menu";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  try {
    await requireApiRole("ADMIN");
    const { id } = await ctx.params;
    const body = await req.json();
    return fromService(await updateMenuItemService(id, body));
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    await requireApiRole("ADMIN");
    const { id } = await ctx.params;
    return fromService(await deleteMenuItemService(id));
  } catch (err) {
    return handleRouteError(err);
  }
}
