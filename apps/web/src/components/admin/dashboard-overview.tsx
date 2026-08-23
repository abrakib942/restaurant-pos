import Link from "next/link";
import {
  Armchair,
  CircleDollarSign,
  ClipboardList,
  UtensilsCrossed,
} from "lucide-react";
import type { AdminDashboardData } from "@/lib/dashboard";
import { formatMoney } from "@/lib/money";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const quickLinks = [
  {
    href: "/admin/menu",
    title: "Menu",
    description: "Dishes, prices, availability",
  },
  {
    href: "/admin/tables",
    title: "Tables",
    description: "Floor layout and QR codes",
  },
  {
    href: "/admin/staff",
    title: "Staff",
    description: "Waiter and kitchen PINs",
  },
  {
    href: "/admin/categories",
    title: "Categories",
    description: "Menu grouping",
  },
] as const;

type DashboardOverviewProps = {
  welcomeName: string;
  data: AdminDashboardData;
};

export function DashboardOverview({
  welcomeName,
  data,
}: DashboardOverviewProps) {
  const maxQty = Math.max(...data.topItems.map((item) => item.qty), 1);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">
            Welcome, {welcomeName}
          </h1>
          <p className="mt-2 text-muted-foreground">
            House overview for {data.dateLabel}
          </p>
        </div>
        <Badge variant="secondary" className="rounded-md font-normal">
          Live floor · {data.tables.occupied + data.tables.billing} active
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<CircleDollarSign className="size-4 text-primary" />}
          label="Sales today"
          value={formatMoney(data.salesToday)}
          hint={`${data.paidOrdersToday} paid check${data.paidOrdersToday === 1 ? "" : "s"}`}
        />
        <StatCard
          icon={<ClipboardList className="size-4 text-primary" />}
          label="Open tickets"
          value={String(data.openOrders)}
          hint={
            data.billingOrders > 0
              ? `${data.billingOrders} in billing`
              : "No tables waiting on the check"
          }
        />
        <StatCard
          icon={<Armchair className="size-4 text-primary" />}
          label="Floor"
          value={`${data.tables.occupied}/${data.tables.total}`}
          hint={`${data.tables.available} free · ${data.tables.billing} billing`}
        />
        <StatCard
          icon={<UtensilsCrossed className="size-4 text-primary" />}
          label="Top movers"
          value={data.topItems[0] ? `${data.topItems[0].qty}×` : "—"}
          hint={
            data.topItems[0] ? data.topItems[0].name : "No paid items yet today"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="shadow-none lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-heading text-2xl tracking-tight">
              Top items today
            </CardTitle>
            <CardDescription>
              From paid checks — quantity sold by dish name
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.topItems.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-4 py-12 text-center">
                <p className="font-heading text-xl">No sales yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Run a table through order → kitchen → checkout to populate
                  this chart.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {data.topItems.map((item, index) => {
                  const width = Math.max((item.qty / maxQty) * 100, 8);
                  return (
                    <li key={item.name} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate">
                          <span className="mr-2 tabular-nums text-muted-foreground">
                            {index + 1}.
                          </span>
                          {item.name}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {item.qty}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-2xl tracking-tight">
              Shortcuts
            </CardTitle>
            <CardDescription>Jump into house controls</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md border border-border px-3 py-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
              >
                <p className="text-sm font-medium">{link.title}</p>
                <p className="text-xs text-muted-foreground">
                  {link.description}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="font-heading text-3xl tracking-tight tabular-nums">
          {value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
