import { requireApiRole } from "@/lib/api/auth";
import { handleRouteError, jsonOk } from "@/lib/api/envelope";
import { getWaiterReadyNotifications } from "@/lib/waiter-notifications";

export async function GET() {
  try {
    const session = await requireApiRole("WAITER");
    const data = await getWaiterReadyNotifications(session.userId);
    return jsonOk(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
