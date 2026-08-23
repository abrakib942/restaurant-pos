import { requireApiRole } from "@/lib/api/auth";
import { handleRouteError } from "@/lib/api/envelope";
import { fromService } from "@/lib/api/from-service";
import { createCategoryService } from "@/lib/services/categories";

export async function POST(req: Request) {
  try {
    await requireApiRole("ADMIN");
    const body = (await req.json()) as { name?: string; sortOrder?: number };
    return fromService(
      await createCategoryService({
        name: body.name ?? "",
        sortOrder: body.sortOrder,
      }),
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
