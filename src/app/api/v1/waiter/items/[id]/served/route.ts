import { requireApiRole } from "@/lib/api/auth";
import { handleRouteError } from "@/lib/api/envelope";
import { fromService } from "@/lib/api/from-service";
import { markItemServedService } from "@/lib/services/service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    await requireApiRole("WAITER");
    const { id } = await ctx.params;
    return fromService(await markItemServedService(id));
  } catch (err) {
    return handleRouteError(err);
  }
}
