import { requireApiRole } from "@/lib/api/auth";
import { handleRouteError } from "@/lib/api/envelope";
import { fromService } from "@/lib/api/from-service";
import { createMenuItemService } from "@/lib/services/menu";

export async function POST(req: Request) {
  try {
    await requireApiRole("ADMIN");
    const body = await req.json();
    return fromService(await createMenuItemService(body));
  } catch (err) {
    return handleRouteError(err);
  }
}
