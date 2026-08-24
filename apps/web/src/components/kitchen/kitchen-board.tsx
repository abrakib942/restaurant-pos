"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flame, Check, ChefHat, Zap, AlertTriangle } from "lucide-react";
import { ApiClientError, apiFetch, apiMutate } from "@/lib/api-client";
import type {
  KitchenBoardData,
  KitchenFireCard,
  KitchenTicket,
} from "@/lib/types/kitchen";
import { COURSE_LABELS, formatElapsedMs } from "@/lib/kitchen-meta";
import { isExpoStale } from "@/lib/expo-meta";
import { playExpoBumpChime, playNewTicketChime } from "@/lib/chimes";
import {
  EXPO_AGING_THRESHOLD_MS,
  KITCHEN_IN_PROGRESS_FIRE_CAP,
  POLL_INTERVAL_MS,
} from "@/lib/constants";
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
      cap: KITCHEN_IN_PROGRESS_FIRE_CAP,
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

function fireElapsed(fire: KitchenFireCard, now: number): string | null {
  if (!fire.startedAt && fire.queuePosition != null) {
    return formatElapsedMs(now - new Date(fire.createdAt).getTime());
  }
  if (fire.readyAt) {
    return formatElapsedMs(now - new Date(fire.readyAt).getTime());
  }
  if (fire.startedAt) {
    return formatElapsedMs(now - new Date(fire.startedAt).getTime());
  }
  return formatElapsedMs(now - new Date(fire.createdAt).getTime());
}

function itemActionLabel(item: KitchenTicket): string | null {
  if (item.status === "PENDING") return "Start";
  if (item.status === "IN_PROGRESS") return "Mark ready";
  return null;
}

type KitchenBoardProps = {
  initialData: KitchenBoardData;
};

function FireCard({
  fire,
  now,
  accent,
  pending,
  capFull,
  cap,
  onStart,
  onReady,
}: {
  fire: KitchenFireCard;
  now: number;
  accent: "pending" | "progress" | "ready";
  pending?: boolean;
  capFull?: boolean;
  cap: number;
  onStart: (itemId: string) => void;
  onReady: (itemId: string) => void;
}) {
  const elapsed = fireElapsed(fire, now);
  const stale =
    accent === "ready" &&
    fire.readyAt !== null &&
    isExpoStale(fire.readyAt, now);

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
        fire.priority === "RUSH" &&
          accent !== "ready" &&
          "ring-1 ring-destructive/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-medium leading-snug">
              Table {fire.tableLabel}
              <span className="font-normal text-muted-foreground">
                {" "}
                · {fire.itemCount} item{fire.itemCount === 1 ? "" : "s"}
              </span>
            </p>
            {fire.priority === "RUSH" ? (
              <Badge
                variant="destructive"
                className="rounded-md gap-0.5 px-1.5"
              >
                <Zap className="size-3" />
                Rush
              </Badge>
            ) : null}
            {accent === "ready" ? (
              <Badge variant="secondary" className="rounded-md px-1.5">
                Run food
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
            {fire.waiterName}
            {fire.estimatedLabel ? ` · ${fire.estimatedLabel}` : ""}
            {elapsed
              ? ` · ${accent === "ready" ? "On pass" : accent === "progress" ? "Cooking" : "Waiting"} ${elapsed}`
              : ""}
          </p>
        </div>
        {fire.queuePosition != null ? (
          <Badge variant="outline" className="shrink-0 rounded-md tabular-nums">
            #{fire.queuePosition}
          </Badge>
        ) : (
          <Badge variant="secondary" className="shrink-0 rounded-md capitalize">
            {accent === "ready"
              ? "ready"
              : accent === "progress"
                ? "cooking"
                : "pending"}
          </Badge>
        )}
      </div>

      <ul className="mt-3 space-y-2">
        {fire.items.map((item) => {
          const label = itemActionLabel(item);
          return (
            <li
              key={item.id}
              className="rounded-md border border-border/60 bg-background/40 px-2.5 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">
                    {item.qty}× {item.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {item.stationName ? (
                      <Badge
                        variant="outline"
                        className="rounded-md text-[10px]"
                      >
                        {item.stationName}
                      </Badge>
                    ) : null}
                    <Badge
                      variant="secondary"
                      className="rounded-md text-[10px]"
                    >
                      {COURSE_LABELS[item.course] ?? `Course ${item.course}`}
                    </Badge>
                    <span className="text-[10px] capitalize text-muted-foreground">
                      {item.status.toLowerCase().replaceAll("_", " ")}
                    </span>
                  </div>
                </div>
                {label ? (
                  <Button
                    size="sm"
                    className="shrink-0"
                    disabled={
                      pending ||
                      (label === "Start" && accent === "pending" && !!capFull)
                    }
                    onClick={() =>
                      label === "Start" ? onStart(item.id) : onReady(item.id)
                    }
                  >
                    {label === "Start" && accent === "pending" && capFull
                      ? "Cap full"
                      : label}
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {accent === "pending" && capFull ? (
        <p className="mt-2 text-[10px] text-muted-foreground">
          Max {cap} fires cooking — finish one before starting another fire
        </p>
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

function fireMatchesStation(fire: KitchenFireCard, stationId: string) {
  if (stationId === "all") return true;
  return fire.items.some((item) => item.stationId === stationId);
}

function filterItemsByStation(
  fire: KitchenFireCard,
  stationId: string,
): KitchenFireCard {
  if (stationId === "all") return fire;
  return {
    ...fire,
    items: fire.items.filter((item) => item.stationId === stationId),
    itemCount: fire.items.filter((item) => item.stationId === stationId).length,
  };
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
    () => data.ready.filter((f) => isExpoStale(f.readyAt, now)).length,
    [data.ready, now],
  );

  useEffect(() => {
    if (staleReadyCount > prevStaleCount.current) {
      playExpoBumpChime();
    }
    prevStaleCount.current = staleReadyCount;
  }, [staleReadyCount]);

  const pendingFiltered = useMemo(
    () =>
      data.pending
        .filter((f) => fireMatchesStation(f, stationId))
        .map((f) => filterItemsByStation(f, stationId))
        .filter((f) => f.items.length > 0),
    [data.pending, stationId],
  );
  const inProgressFiltered = useMemo(
    () =>
      data.inProgress
        .filter((f) => fireMatchesStation(f, stationId))
        .map((f) => filterItemsByStation(f, stationId))
        .filter((f) => f.items.length > 0),
    [data.inProgress, stationId],
  );
  const readyFiltered = useMemo(
    () =>
      data.ready
        .filter((f) => fireMatchesStation(f, stationId))
        .map((f) => filterItemsByStation(f, stationId))
        .filter((f) => f.items.length > 0),
    [data.ready, stationId],
  );

  const cookingFireCount = data.inProgress.filter((fire) =>
    fire.items.some((item) => item.status === "IN_PROGRESS"),
  ).length;
  const capFull = cookingFireCount >= data.cap;
  const expoThresholdMin = EXPO_AGING_THRESHOLD_MS / 60_000;

  function runAction(
    action: () => ReturnType<typeof apiMutate>,
    blockedMessage?: string,
  ) {
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
            Queue by fire (one send) · work items inside · max {data.cap} fires
            cooking
          </p>
        </div>
        <Badge
          variant={capFull ? "destructive" : "secondary"}
          className="rounded-md px-3 py-1 text-sm"
        >
          Fires cooking {cookingFireCount}/{data.cap}
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
              No pending fires
            </p>
          ) : (
            pendingFiltered.map((fire) => (
              <FireCard
                key={fire.fireId}
                fire={fire}
                now={now}
                accent="pending"
                pending={pending}
                capFull={capFull}
                cap={data.cap}
                onStart={(itemId) =>
                  runAction(
                    () => apiMutate(`/kitchen/items/${itemId}/start`, "POST"),
                    capFull
                      ? `Only ${data.cap} fires can be in progress`
                      : undefined,
                  )
                }
                onReady={(itemId) =>
                  runAction(() =>
                    apiMutate(`/kitchen/items/${itemId}/ready`, "POST"),
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
          hint={`Hard cap: ${data.cap} fires across the whole kitchen`}
        >
          {inProgressFiltered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Pull from Pending
            </p>
          ) : (
            inProgressFiltered.map((fire) => (
              <FireCard
                key={fire.fireId}
                fire={fire}
                now={now}
                accent="progress"
                pending={pending}
                cap={data.cap}
                onStart={(itemId) =>
                  runAction(() =>
                    apiMutate(`/kitchen/items/${itemId}/start`, "POST"),
                  )
                }
                onReady={(itemId) =>
                  runAction(() =>
                    apiMutate(`/kitchen/items/${itemId}/ready`, "POST"),
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
          hint={`Run when fire complete · bump at ${expoThresholdMin}+ min`}
          alert={readyFiltered.some((f) => isExpoStale(f.readyAt, now))}
        >
          {readyFiltered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nothing on the pass
            </p>
          ) : (
            readyFiltered.map((fire) => (
              <FireCard
                key={fire.fireId}
                fire={fire}
                now={now}
                accent="ready"
                cap={data.cap}
                onStart={() => undefined}
                onReady={() => undefined}
              />
            ))
          )}
        </Column>
      </div>
    </div>
  );
}
