import { requireApiRole } from "@/lib/api/auth";
import { handleRouteError } from "@/lib/api/envelope";
import { fromService } from "@/lib/api/from-service";
import { deleteStaffService, updateStaffService } from "@/lib/services/staff";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  try {
    await requireApiRole("ADMIN");
    const { id } = await ctx.params;
    const body = (await req.json()) as {
      name?: string;
      username?: string;
      pin?: string;
      role?: string;
    };
    return fromService(
      await updateStaffService(id, {
        name: body.name ?? "",
        username: body.username ?? "",
        pin: body.pin,
        role: body.role ?? "",
      }),
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const session = await requireApiRole("ADMIN");
    const { id } = await ctx.params;
    return fromService(await deleteStaffService(id, session.userId));
  } catch (err) {
    return handleRouteError(err);
  }
}
