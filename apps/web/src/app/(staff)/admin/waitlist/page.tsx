import { WaitlistManager } from "@/components/admin/waitlist-manager";
import { AdminWaitlistRealtime } from "@/components/admin/admin-waitlist-realtime";
import type { WaitlistParty } from "@/lib/types/waitlist";
import { serverApiData } from "@/lib/server-api";

type WaitlistData = {
  active: WaitlistParty[];
  history: WaitlistParty[];
};

type AvailableTable = {
  id: string;
  label: string;
};

export default async function AdminWaitlistPage() {
  const [waitlist, availableTables] = await Promise.all([
    serverApiData<WaitlistData>("/admin/waitlist"),
    serverApiData<AvailableTable[]>("/admin/waitlist/available-tables"),
  ]);

  const { active = [], history = [] } = waitlist ?? {};

  return (
    <AdminWaitlistRealtime>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="font-heading text-3xl tracking-tight">Waitlist</h1>
          <p className="mt-2 text-muted-foreground">
            Door queue for walk-ins — notify, seat onto a free table, then POS
            as usual.
          </p>
        </div>
        <WaitlistManager
          active={active}
          history={history}
          availableTables={availableTables ?? []}
        />
      </div>
    </AdminWaitlistRealtime>
  );
}
