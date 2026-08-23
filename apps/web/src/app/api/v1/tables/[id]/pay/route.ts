import { requireApiRole } from "@/lib/api/auth";
import { handleRouteError } from "@/lib/api/envelope";
import { fromService } from "@/lib/api/from-service";
import { markBillPaidService } from "@/lib/services/service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    await requireApiRole("WAITER");
    const { id } = await ctx.params;
    const body = (await req.json()) as {
      paymentMethod?: "CASH" | "CARD" | "OTHER";
    };
    return fromService(
      await markBillPaidService(id, body.paymentMethod ?? "CARD"),
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
