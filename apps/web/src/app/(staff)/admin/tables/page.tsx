import { TablesManager } from "@/components/admin/tables-manager";
import { serverApiData } from "@/lib/server-api";

type TableRow = {
  id: string;
  label: string;
  qrSlug: string;
  status: "AVAILABLE" | "OCCUPIED" | "BILLING";
};

export default async function AdminTablesPage() {
  const tables = (await serverApiData<TableRow[]>("/admin/tables")) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">Tables</h1>
        <p className="mt-2 text-muted-foreground">
          Floor tables and their guest menu QR codes.
        </p>
      </div>
      <TablesManager tables={tables} />
    </div>
  );
}
