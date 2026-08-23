import { KitchenBoard } from "@/components/kitchen/kitchen-board";
import { requireRole } from "@/lib/auth";
import type { KitchenBoardData } from "@/lib/types/kitchen";
import { serverApiData } from "@/lib/server-api";

export default async function KitchenHomePage() {
  await requireRole("KITCHEN");
  const board =
    (await serverApiData<KitchenBoardData>("/kitchen/board")) ?? {
      stations: [],
      pending: [],
      inProgress: [],
      ready: [],
      inProgressCount: 0,
      cap: 3,
    };

  return (
    <div className="mx-auto max-w-7xl">
      <KitchenBoard initialData={board} />
    </div>
  );
}
