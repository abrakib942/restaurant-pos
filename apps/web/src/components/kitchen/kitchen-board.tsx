"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flame, Check, ChefHat, Zap, AlertTriangle } from "lucide-react";
import { ApiClientError, apiFetch, apiMutate } from "@/lib/api-client";
import type { KitchenBoardData, KitchenTicket } from "@/lib/kitchen";
import { COURSE_LABELS, formatElapsedMs } from "@/lib/kitchen-meta";
import { isExpoStale } from "@/lib/expo-meta";
import { playExpoBumpChime, playNewTicketChime } from "@/lib/chimes";
import { EXPO_AGING_THRESHOLD_MS, POLL_INTERVAL_MS } from "@/lib/constants";
import { useSseConnected } from "@/components/providers/realtime-listener";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

async function fetchBoard(): Promise<KitchenBoardData> {
  const body = await apiFetch<KitchenBoardData>("/kitchen/board");
  return (
    body.data ?? {
      stations: [],
      pending: [],
      inProgress: [],
      ready: [],
      inProgressCount: 0,
      cap: 3,
    }
  );
}

function useNowTick(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function ticketElapsed(ticket: KitchenTicket, now: number): string | null {
  if (ticket.status === "PENDING") {
    return formatElapsedMs(now - new Date(ticket.createdAt).getTime());
  }
  if (ticket.status === "IN_PROGRESS" && ticket.startedAt) {
    return formatElapsedMs(now - new Date(ticket.startedAt).getTime());
  }
  if (ticket.status === "READY" && ticket.readyAt) {
    return formatElapsedMs(now - new Date(ticket.readyAt).getTime());
  }
  return null;
}

function elapsedLabel(status: KitchenTicket["status"]): string {
  if (status === "PENDING") return "Waiting";
  if (status === "IN_PROGRESS") return "Cooking";
  return "On pass";
}

type KitchenBoardProps = {
  initialData: KitchenBoardData;
};

function TicketCard({
  ticket,
  now,
  action,
  actionLabel,
  actionDisabled,
  pending,
  accent,
}: {
  ticket: KitchenTicket;
  now: number;
  action?: () => void;
  actionLabel?: string;
  actionDisabled?: boolean;
  pending?: boolean;
  accent: "pending" | "progress" | "ready";
}) {
  const elapsed = ticketElapsed(ticket, now);
  const stale =
    ticket.status === "READY" &&
    ticket.readyAt !== null &&
    isExpoStale(ticket.readyAt, now);

  return (
    <article
      className={cn(
        "rounded-lg border p-3",
        accent === "pending" && "border-border bg-card/50",
        accent === "progress" && "border-primary/40 bg-primary/10",
        accent === "ready" &&
          (stale
            ? "border-destructive/60 bg-destructive/10 ring-1 ring-destructive/40"
            : "border-chart-2/40 bg-chart-2/10"),
        ticket.priority === "RUSH" &&
          accent !== "ready" &&
          "ring-1 ring-destructive/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-medium leading-snug">
              {ticket.qty}× {ticket.name}
            </p>
            {ticket.priority === "RUSH" ? (
              <Badge
                variant="destructive"
                className="rounded-md gap-0.5 px-1.5"
              >
                <Zap className="size-3" />
                Rush
              </Badge>
            ) : null}
            {stale ? (
              <Badge
                variant="destructive"
                className="rounded-md gap-0.5 px-1.5"
              >
                <AlertTriangle className="size-3" />
                Aging
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Table {ticket.tableLabel} · {ticket.waiterName}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {ticket.stationName ? (
              <Badge variant="outline" className="rounded-md text-[10px]">
                {ticket.stationName}
              </Badge>
            ) : null}
            <Badge variant="secondary" className="rounded-md text-[10px]">
              {COURSE_LABELS[ticket.course] ?? `Course ${ticket.course}`}
            </Badge>
            {elapsed ? (
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {elapsedLabel(ticket.status)} {elapsed}
              </span>
            ) : null}
          </div>
        </div>
        <Badge variant="secondary" className="shrink-0 rounded-md capitalize">
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
  flash,
  alert,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  hint?: string;
  flash?: boolean;
  alert?: boolean;
}) {
  return (
    <section
      className={cn(
        "flex min-h-72 flex-1 flex-col rounded-lg border border-border bg-background/40 md:min-h-[28rem]",
        flash && "animate-pulse border-primary/60",
        alert && "border-destructive/50",
      )}
    >
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
  const [stationId, setStationId] = useState<string>("all");
  const [pendingFlash, setPendingFlash] = useState(false);
  const prevPendingCount = useRef(initialData.pending.length);
  const prevStaleCount = useRef(0);
  const sseConnected = useSseConnected();

  const { data = initialData } = useQuery({
    queryKey: ["kitchen-board"],
    queryFn: fetchBoard,
    initialData,
    refetchInterval: sseConnected ? false : POLL_INTERVAL_MS,
  });

  const now = useNowTick(true);

  useEffect(() => {
    const count = data.pending.length;
    if (count > prevPendingCount.current) {
      playNewTicketChime();
      setPendingFlash(true);
      const timer = setTimeout(() => setPendingFlash(false), 2000);
      prevPendingCount.current = count;
      return () => clearTimeout(timer);
    }
    prevPendingCount.current = count;
  }, [data.pending.length]);

  const staleReadyCount = useMemo(
    () => data.ready.filter((t) => isExpoStale(t.readyAt, now)).length,
    [data.ready, now],
  );

  useEffect(() => {
    if (staleReadyCount > prevStaleCount.current) {
      playExpoBumpChime();
    }
    prevStaleCount.current = staleReadyCount;
  }, [staleReadyCount]);

  const filterByStation = (tickets: KitchenTicket[]) => {
    if (stationId === "all") return tickets;
    return tickets.filter((t) => t.stationId === stationId);
  };

  const pendingFiltered = useMemo(
    () => filterByStation(data.pending),
    [data.pending, stationId],
  );
  const inProgressFiltered = useMemo(
    () => filterByStation(data.inProgress),
    [data.inProgress, stationId],
  );
  const readyFiltered = useMemo(
    () => filterByStation(data.ready),
    [data.ready, stationId],
  );

  const capFull = data.inProgressCount >= data.cap;
  const expoThresholdMin = EXPO_AGING_THRESHOLD_MS / 60_000;

  function runAction(action: () => ReturnType<typeof apiMutate>, blockedMessage?: string) {
    if (blockedMessage) {
      toast.error(blockedMessage);
      return;
    }
    startTransition(async () => {
      try {
        const result = await action();
        toast.success(result.message ?? "Updated");
        await queryClient.invalidateQueries({ queryKey: ["kitchen-board"] });
      } catch (err) {
        toast.error(
          err instanceof ApiClientError ? err.message : "Request failed",
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl tracking-tight">Pass</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rush → course → fired · max {data.cap} cooking house-wide
          </p>
        </div>
        <Badge
          variant={capFull ? "destructive" : "secondary"}
          className="rounded-md px-3 py-1 text-sm"
        >
          In progress {data.inProgressCount}/{data.cap}
        </Badge>
        {staleReadyCount > 0 ? (
          <Badge
            variant="destructive"
            className="rounded-md gap-1 px-3 py-1 text-sm"
          >
            <AlertTriangle className="size-3.5" />
            {staleReadyCount} aging on pass
          </Badge>
        ) : null}
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setStationId("all")}
          className={cn(
            "shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors",
            stationId === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground",
          )}
        >
          All stations
        </button>
        {data.stations.map((station) => (
          <button
            key={station.id}
            type="button"
            onClick={() => setStationId(station.id)}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors",
              stationId === station.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {station.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
        <Column
          title="Pending"
          icon={<ChefHat className="size-4 text-muted-foreground" />}
          count={pendingFiltered.length}
          flash={pendingFlash}
        >
          {pendingFiltered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No pending tickets
            </p>
          ) : (
            pendingFiltered.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                now={now}
                accent="pending"
                pending={pending}
                actionDisabled={capFull}
                actionLabel={capFull ? "Cap full" : "Start"}
                action={() =>
                  runAction(
                    () => apiMutate(`/kitchen/items/${ticket.id}/start`, "POST"),
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
          count={inProgressFiltered.length}
          hint={`Hard cap: ${data.cap} across the whole kitchen`}
        >
          {inProgressFiltered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Pull from Pending
            </p>
          ) : (
            inProgressFiltered.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                now={now}
                accent="progress"
                pending={pending}
                actionLabel="Mark ready"
                action={() =>
                  runAction(() =>
                    apiMutate(`/kitchen/items/${ticket.id}/ready`, "POST"),
                  )
                }
              />
            ))
          )}
        </Column>

        <Column
          title="On pass"
          icon={<Check className="size-4 text-chart-2" />}
          count={readyFiltered.length}
          hint={`Expo queue · bump at ${expoThresholdMin}+ min waiting for runner`}
          alert={readyFiltered.some((t) => isExpoStale(t.readyAt, now))}
        >
          {readyFiltered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nothing on the pass
            </p>
          ) : (
            readyFiltered.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                now={now}
                accent="ready"
              />
            ))
          )}
        </Column>
      </div>
    </div>
  );
}
