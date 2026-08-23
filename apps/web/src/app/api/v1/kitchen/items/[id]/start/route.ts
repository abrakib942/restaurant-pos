import { requireApiRole } from "@/lib/api/auth";
import { handleRouteError } from "@/lib/api/envelope";
import { fromService } from "@/lib/api/from-service";
import { startKitchenItemService } from "@/lib/services/kitchen";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    await requireApiRole("KITCHEN");
    const { id } = await ctx.params;
    return fromService(await startKitchenItemService(id));
  } catch (err) {
    return handleRouteError(err);
  }
}
