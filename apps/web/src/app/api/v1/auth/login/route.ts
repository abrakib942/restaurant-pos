import { handleRouteError } from "@/lib/api/envelope";
import { fromService } from "@/lib/api/from-service";
import { getClientIp } from "@/lib/auth-lockout";
import { loginService } from "@/lib/services/auth";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { username?: string; pin?: string };
    return fromService(
      await loginService({
        username: body.username ?? "",
        pin: body.pin ?? "",
        ip: getClientIp(req.headers),
      }),
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
