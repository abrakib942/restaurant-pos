import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FloorTable = {
  id: string;
  label: string;
  status: "AVAILABLE" | "OCCUPIED" | "BILLING";
  openOrderItemCount: number;
  kitchenPendingCount?: number;
  kitchenQueuePosition?: number | null;
  kitchenEstimatedLabel?: string | null;
};

type TableGridProps = {
  tables: FloorTable[];
};

function statusStyles(status: FloorTable["status"]) {
  switch (status) {
    case "OCCUPIED":
      return "border-primary/50 bg-primary/10 hover:border-primary";
    case "BILLING":
      return "border-chart-5/50 bg-chart-5/10 hover:border-chart-5";
    default:
      return "border-border bg-card/40 hover:border-primary/40";
  }
}

export function TableGrid({ tables }: TableGridProps) {
  if (tables.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
        <p className="font-heading text-2xl">No tables</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask an admin to add floor tables.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {tables.map((table) => (
        <Link
          key={table.id}
          href={`/waiter/tables/${table.id}`}
          className={cn(
            "flex min-h-28 flex-col justify-between rounded-lg border p-4 transition-colors",
            statusStyles(table.status),
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-heading text-3xl leading-none tracking-tight">
              {table.label}
            </p>
            <Badge variant="secondary" className="rounded-md capitalize">
              {table.status.toLowerCase()}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {table.status === "AVAILABLE"
              ? "Tap to start order"
              : table.status === "BILLING"
                ? "Checkout in progress"
                : `${table.openOrderItemCount} ticket${table.openOrderItemCount === 1 ? "" : "s"}`}
          </p>
          {(table.kitchenPendingCount ?? 0) > 0 &&
          table.kitchenQueuePosition != null ? (
            <p className="mt-1 text-[11px] tabular-nums text-primary">
              Kitchen #{table.kitchenQueuePosition}
              {table.kitchenEstimatedLabel
                ? ` · ${table.kitchenEstimatedLabel}`
                : ""}
            </p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
