"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, BarChart3, Clock, Users } from "lucide-react";
import type { AdminReportsData, VoidableItemRow } from "@/lib/reports";
import { ApiClientError, apiMutate } from "@/lib/api-client";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type AdminReportsProps = {
  data: AdminReportsData;
  voidable: VoidableItemRow[];
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AdminReports({ data, voidable }: AdminReportsProps) {
  const router = useRouter();
  const [from, setFrom] = useState(data.from);
  const [to, setTo] = useState(data.to);
  const [voidTarget, setVoidTarget] = useState<VoidableItemRow | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [pending, startTransition] = useTransition();

  function applyRange() {
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    router.push(`/admin/reports?${params.toString()}`);
  }

  function confirmVoid() {
    if (!voidTarget) return;
    startTransition(async () => {
      try {
        const result = await apiMutate("/admin/reports/void", "POST", {
          orderItemId: voidTarget.id,
          reason: voidReason || undefined,
        });
        toast.success(result.message ?? "Voided");
        setVoidTarget(null);
        setVoidReason("");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof ApiClientError ? err.message : "Request failed",
        );
      }
    });
  }

  const maxWaiterSales = Math.max(...data.byWaiter.map((w) => w.sales), 1);
  const maxHourSales = Math.max(...data.byHour.map((h) => h.sales), 1);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">
          Reports
        </h1>
        <p className="mt-2 text-muted-foreground">
          Sales and voids for {data.label}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Date range</CardTitle>
          <CardDescription>
            Paid checks and voids in this window
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              applyRange();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={pending}>
              Apply
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<BarChart3 className="size-4 text-primary" />}
          label="Net sales"
          value={formatMoney(data.salesTotal)}
          hint={`${data.paidChecks} paid check${data.paidChecks === 1 ? "" : "s"}`}
        />
        <StatCard
          icon={<Users className="size-4 text-primary" />}
          label="Waiters"
          value={String(data.byWaiter.length)}
          hint="With paid checks in range"
        />
        <StatCard
          icon={<Ban className="size-4 text-primary" />}
          label="Voids"
          value={String(data.voidCount)}
          hint={formatMoney(data.voidAmount) + " removed"}
        />
        <StatCard
          icon={<Clock className="size-4 text-primary" />}
          label="Peak hour"
          value={
            data.byHour.length > 0
              ? [...data.byHour].sort((a, b) => b.sales - a.sales)[0]!.label
              : "—"
          }
          hint={
            data.byHour.length > 0
              ? formatMoney(
                  [...data.byHour].sort((a, b) => b.sales - a.sales)[0]!.sales,
                )
              : "No paid checks"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales by waiter</CardTitle>
            <CardDescription>Paid check totals</CardDescription>
          </CardHeader>
          <CardContent>
            {data.byWaiter.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paid checks.</p>
            ) : (
              <div className="space-y-3">
                {data.byWaiter.map((row) => (
                  <div key={row.waiterId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{row.waiterName}</span>
                      <span className="text-muted-foreground">
                        {formatMoney(row.sales)} · {row.checks} check
                        {row.checks === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${(row.sales / maxWaiterSales) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by hour</CardTitle>
            <CardDescription>When checks were paid</CardDescription>
          </CardHeader>
          <CardContent>
            {data.byHour.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paid checks.</p>
            ) : (
              <div className="space-y-3">
                {data.byHour.map((row) => (
                  <div key={row.hour} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{row.label}</span>
                      <span className="text-muted-foreground">
                        {formatMoney(row.sales)} · {row.checks} check
                        {row.checks === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/80"
                        style={{
                          width: `${(row.sales / maxHourSales) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Void open lines</CardTitle>
          <CardDescription>
            Remove mistaken items before billing — kitchen stops seeing them
          </CardDescription>
        </CardHeader>
        <CardContent>
          {voidable.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No open checks with voidable lines.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="w-24 text-right"> </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {voidable.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.tableLabel}</TableCell>
                      <TableCell>
                        {item.qty}× {item.name}
                      </TableCell>
                      <TableCell>
                        {formatMoney(item.unitPrice * item.qty)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setVoidTarget(item)}
                          disabled={pending}
                        >
                          Void
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Void history</CardTitle>
          <CardDescription>Lines voided in the selected range</CardDescription>
        </CardHeader>
        <CardContent>
          {data.voids.length === 0 ? (
            <p className="text-sm text-muted-foreground">No voids recorded.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.voids.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(row.voidedAt)}
                      </TableCell>
                      <TableCell>{row.tableLabel}</TableCell>
                      <TableCell>
                        {row.qty}× {row.name}
                      </TableCell>
                      <TableCell>{row.voidedByName ?? "—"}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-muted-foreground">
                        {row.voidReason ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(row.unitPrice * row.qty)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={voidTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setVoidTarget(null);
            setVoidReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void line item?</DialogTitle>
            <DialogDescription>
              {voidTarget
                ? `${voidTarget.qty}× ${voidTarget.name} on ${voidTarget.tableLabel} will be removed from the check and kitchen.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="voidReason">Reason (optional)</Label>
            <Textarea
              id="voidReason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Wrong item, guest changed mind…"
              rows={2}
              disabled={pending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmVoid}
              disabled={pending}
            >
              {pending ? "Voiding…" : "Void item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="font-heading text-2xl">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
