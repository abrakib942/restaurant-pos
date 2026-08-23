import { requireApiRole } from "@/lib/api/auth";
import { handleRouteError } from "@/lib/api/envelope";
import { fromService } from "@/lib/api/from-service";
import { createTableService } from "@/lib/services/tables";

export async function POST(req: Request) {
  try {
    await requireApiRole("ADMIN");
    const body = (await req.json()) as { label?: string; qrSlug?: string };
    return fromService(
      await createTableService({
        label: body.label ?? "",
        qrSlug: body.qrSlug,
      }),
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
