import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getOpenServiceRequests } from "@/lib/service-requests";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "WAITER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getOpenServiceRequests();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
