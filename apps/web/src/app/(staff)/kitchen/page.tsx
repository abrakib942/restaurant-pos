import { KitchenBoard } from "@/components/kitchen/kitchen-board";
import { requireRole } from "@/lib/auth";
import { KITCHEN_IN_PROGRESS_FIRE_CAP } from "@/lib/constants";
import type { KitchenBoardData } from "@/lib/types/kitchen";
import { serverApiData } from "@/lib/server-api";

export default async function KitchenHomePage() {
  await requireRole("KITCHEN");
  const board = (await serverApiData<KitchenBoardData>("/kitchen/board")) ?? {
    stations: [],
    pending: [],
    inProgress: [],
    ready: [],
    inProgressCount: 0,
    cap: KITCHEN_IN_PROGRESS_FIRE_CAP,
  };

  return (
    <div className="mx-auto max-w-7xl">
      <KitchenBoard initialData={board} />
    </div>
  );
}
