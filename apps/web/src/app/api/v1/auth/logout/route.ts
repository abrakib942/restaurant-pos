import { handleRouteError } from "@/lib/api/envelope";
import { fromService } from "@/lib/api/from-service";
import { logoutService } from "@/lib/services/auth";

export async function POST() {
  try {
    return fromService(await logoutService());
  } catch (err) {
    return handleRouteError(err);
  }
}
