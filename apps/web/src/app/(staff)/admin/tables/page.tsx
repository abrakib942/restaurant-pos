import { TablesManager } from "@/components/admin/tables-manager";
import { prisma } from "@/lib/prisma";

export default async function AdminTablesPage() {
  const tables = await prisma.table.findMany({
    orderBy: { label: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">Tables</h1>
        <p className="mt-2 text-muted-foreground">
          Floor tables and their guest menu QR codes.
        </p>
      </div>
      <TablesManager
        tables={tables.map((table) => ({
          id: table.id,
          label: table.label,
          qrSlug: table.qrSlug,
          status: table.status,
        }))}
      />
    </div>
  );
}
