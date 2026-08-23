import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getWaiterReadyNotifications } from "@/lib/waiter-notifications";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "WAITER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getWaiterReadyNotifications(session.userId);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
