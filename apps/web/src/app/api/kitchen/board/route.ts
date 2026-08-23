import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getKitchenBoard } from "@/lib/kitchen";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "KITCHEN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const board = await getKitchenBoard();
  return NextResponse.json(board, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
