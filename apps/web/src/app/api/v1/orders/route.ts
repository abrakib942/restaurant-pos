import { requireApiRole } from "@/lib/api/auth";
import { handleRouteError } from "@/lib/api/envelope";
import { fromService } from "@/lib/api/from-service";
import { submitOrderService } from "@/lib/services/orders";

export async function POST(req: Request) {
  try {
    const session = await requireApiRole("WAITER");
    const body = (await req.json()) as {
      tableId?: string;
      items?: { menuItemId: string; qty: number }[];
    };
    return fromService(
      await submitOrderService({
        tableId: body.tableId ?? "",
        items: body.items ?? [],
        waiterId: session.userId,
      }),
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
