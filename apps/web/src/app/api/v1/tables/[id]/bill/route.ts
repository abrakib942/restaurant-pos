import { requireApiRole } from "@/lib/api/auth";
import { handleRouteError } from "@/lib/api/envelope";
import { fromService } from "@/lib/api/from-service";
import { generateBillService } from "@/lib/services/service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    await requireApiRole("WAITER");
    const { id } = await ctx.params;
    const body = (await req.json()) as {
      discount?: string;
      taxRatePercent?: string;
      tip?: string;
    };
    return fromService(
      await generateBillService({
        tableId: id,
        discount: body.discount ?? "0",
        taxRatePercent: body.taxRatePercent,
        tip: body.tip,
      }),
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
