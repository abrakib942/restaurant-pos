import { requireApiRole } from "@/lib/api/auth";
import { handleRouteError, jsonOk } from "@/lib/api/envelope";
import { getKitchenBoard } from "@/lib/kitchen";

export async function GET() {
  try {
    await requireApiRole("KITCHEN");
    const board = await getKitchenBoard();
    return jsonOk(board, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
