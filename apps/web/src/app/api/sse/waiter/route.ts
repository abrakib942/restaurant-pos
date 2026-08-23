import { getSession } from "@/lib/session";
import { createSseStream, SSE_HEADERS } from "@/lib/sse-stream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "WAITER") {
    return new Response("Unauthorized", { status: 401 });
  }

  return new Response(createSseStream("waiter", request.signal), {
    headers: SSE_HEADERS,
  });
}
