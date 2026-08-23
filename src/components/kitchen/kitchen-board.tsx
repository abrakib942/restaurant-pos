"use client";

import { useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flame, Check, ChefHat } from "lucide-react";
import { markKitchenItemReady, startKitchenItem } from "@/app/actions/kitchen";
import type { KitchenBoardData, KitchenTicket } from "@/lib/kitchen";
import { POLL_INTERVAL_MS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

async function fetchBoard(): Promise<KitchenBoardData> {
  const res = await fetch("/api/kitchen/board", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load kitchen board");
  return res.json();
}

type KitchenBoardProps = {
  initialData: KitchenBoardData;
};

function TicketCard({
  ticket,
  action,
  actionLabel,
  actionDisabled,
  pending,
  accent,
}: {
  ticket: KitchenTicket;
  action?: () => void;
  actionLabel?: string;
  actionDisabled?: boolean;
  pending?: boolean;
  accent: "pending" | "progress" | "ready";
}) {
  return (
    <article
      className={cn(
        "rounded-lg border p-3",
        accent === "pending" && "border-border bg-card/50",
        accent === "progress" && "border-primary/40 bg-primary/10",
        accent === "ready" && "border-chart-2/40 bg-chart-2/10",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium leading-snug">
            {ticket.qty}× {ticket.name}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Table {ticket.tableLabel} · {ticket.waiterName}
          </p>
        </div>
        <Badge variant="secondary" className="rounded-md capitalize">
          {ticket.status.toLowerCase().replaceAll("_", " ")}
        </Badge>
      </div>
      {action && actionLabel ? (
        <Button
          className="mt-3 w-full"
          size="sm"
          disabled={actionDisabled || pending}
          onClick={action}
        >
          {actionLabel}
        </Button>
      ) : null}
    </article>
  );
}

function Column({
  title,
  icon,
  count,
  children,
  hint,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <section className="flex min-h-72 flex-1 flex-col rounded-lg border border-border bg-background/40 md:min-h-[28rem]">
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-heading text-lg tracking-tight">{title}</h2>
        </div>
        <Badge variant="outline" className="rounded-md tabular-nums">
          {count}
        </Badge>
      </header>
      {hint ? (
        <p className="border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {children}
      </div>
    </section>
  );
}

export function KitchenBoard({ initialData }: KitchenBoardProps) {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  const { data = initialData } = useQuery({
    queryKey: ["kitchen-board"],
    queryFn: fetchBoard,
    initialData,
    refetchInterval: POLL_INTERVAL_MS,
  });

  const capFull = data.inProgressCount >= data.cap;

  function runAction(
    action: () => Promise<
      { ok: true; message?: string } | { ok: false; error: string }
    >,
    blockedMessage?: string,
  ) {
    if (blockedMessage) {
      toast.error(blockedMessage);
      return;
    }
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Updated");
      await queryClient.invalidateQueries({ queryKey: ["kitchen-board"] });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl tracking-tight">Pass</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live board · refreshes every {POLL_INTERVAL_MS / 1000}s
          </p>
        </div>
        <Badge
          variant={capFull ? "destructive" : "secondary"}
          className="rounded-md px-3 py-1 text-sm"
        >
          In progress {data.inProgressCount}/{data.cap}
        </Badge>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
        <Column
          title="Pending"
          icon={<ChefHat className="size-4 text-muted-foreground" />}
          count={data.pending.length}
        >
          {data.pending.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No pending tickets
            </p>
          ) : (
            data.pending.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                accent="pending"
                pending={pending}
                actionDisabled={capFull}
                actionLabel={capFull ? "Cap full" : "Start"}
                action={() =>
                  runAction(
                    () => startKitchenItem(ticket.id),
                    capFull
                      ? `Only ${data.cap} tickets can be in progress`
                      : undefined,
                  )
                }
              />
            ))
          )}
        </Column>

        <Column
          title="In progress"
          icon={<Flame className="size-4 text-primary" />}
          count={data.inProgress.length}
          hint={`Hard cap: ${data.cap} across the whole kitchen`}
        >
          {data.inProgress.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Pull from Pending
            </p>
          ) : (
            data.inProgress.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                accent="progress"
                pending={pending}
                actionLabel="Mark ready"
                action={() => runAction(() => markKitchenItemReady(ticket.id))}
              />
            ))
          )}
        </Column>

        <Column
          title="Ready"
          icon={<Check className="size-4 text-chart-2" />}
          count={data.ready.length}
          hint="Waiting for waiter to serve"
        >
          {data.ready.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nothing ready yet
            </p>
          ) : (
            data.ready.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} accent="ready" />
            ))
          )}
        </Column>
      </div>
    </div>
  );
}
