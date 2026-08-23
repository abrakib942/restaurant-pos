import { KitchenBoard } from "@/components/kitchen/kitchen-board";
import { requireRole } from "@/lib/auth";
import { getKitchenBoard } from "@/lib/kitchen";

export default async function KitchenHomePage() {
  await requireRole("KITCHEN");
  const board = await getKitchenBoard();

  return (
    <div className="mx-auto max-w-7xl">
      <KitchenBoard initialData={board} />
    </div>
  );
}
