import { requireApiRole } from "@/lib/api/auth";
import { handleRouteError } from "@/lib/api/envelope";
import { fromService } from "@/lib/api/from-service";
import { deleteTableService, updateTableService } from "@/lib/services/tables";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  try {
    await requireApiRole("ADMIN");
    const { id } = await ctx.params;
    const body = (await req.json()) as { label?: string; qrSlug?: string };
    return fromService(
      await updateTableService(id, {
        label: body.label ?? "",
        qrSlug: body.qrSlug,
      }),
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    await requireApiRole("ADMIN");
    const { id } = await ctx.params;
    return fromService(await deleteTableService(id));
  } catch (err) {
    return handleRouteError(err);
  }
}
