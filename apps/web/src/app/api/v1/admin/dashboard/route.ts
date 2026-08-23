import { requireApiRole } from "@/lib/api/auth";
import { handleRouteError, jsonOk } from "@/lib/api/envelope";
import { getAdminDashboard } from "@/lib/dashboard";

export async function GET() {
  try {
    await requireApiRole("ADMIN");
    const data = await getAdminDashboard();
    return jsonOk(data);
  } catch (err) {
    return handleRouteError(err);
  }
}
