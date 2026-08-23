import { requireApiRole } from "@/lib/api/auth";
import { handleRouteError } from "@/lib/api/envelope";
import { fromService } from "@/lib/api/from-service";
import { toggleMenuItemAvailabilityService } from "@/lib/services/menu";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    await requireApiRole("ADMIN");
    const { id } = await ctx.params;
    return fromService(await toggleMenuItemAvailabilityService(id));
  } catch (err) {
    return handleRouteError(err);
  }
}
