import { requireApiRole } from "@/lib/api/auth";
import { handleRouteError } from "@/lib/api/envelope";
import { fromService } from "@/lib/api/from-service";
import { createStaffService } from "@/lib/services/staff";

export async function POST(req: Request) {
  try {
    await requireApiRole("ADMIN");
    const body = (await req.json()) as {
      name?: string;
      username?: string;
      pin?: string;
      role?: string;
    };
    return fromService(
      await createStaffService({
        name: body.name ?? "",
        username: body.username ?? "",
        pin: body.pin ?? "",
        role: body.role ?? "",
      }),
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
