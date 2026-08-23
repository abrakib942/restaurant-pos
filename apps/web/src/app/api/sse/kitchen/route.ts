import { AUTH_COOKIE } from "@/lib/role-path";
import { createSseStream, SSE_HEADERS } from "@/lib/sse-stream";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  if (!cookieStore.get(AUTH_COOKIE)?.value) {
    return new Response("Unauthorized", { status: 401 });
  }

  return new Response(createSseStream("kitchen", request.signal), {
    headers: SSE_HEADERS,
  });
}
