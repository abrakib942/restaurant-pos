"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import type { WaiterNotificationsData } from "@/lib/waiter-notifications";
import { apiFetch } from "@/lib/api-client";
import { isExpoStale } from "@/lib/expo-meta";
import { formatElapsedMs } from "@/lib/kitchen-meta";
import { EXPO_AGING_THRESHOLD_MS, POLL_INTERVAL_MS } from "@/lib/constants";
import { useSseConnected } from "@/components/providers/realtime-listener";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

async function fetchNotifications(): Promise<WaiterNotificationsData> {
  const body = await apiFetch<WaiterNotificationsData>("/waiter/notifications");
  return (
    body.data ?? { ready: [], count: 0, mineCount: 0, staleCount: 0 }
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

export function PassStrip() {
  const sseConnected = useSseConnected();
  const { data = { ready: [], count: 0, mineCount: 0, staleCount: 0 } } =
    useQuery({
      queryKey: ["waiter-notifications"],
      queryFn: fetchNotifications,
      refetchInterval: sseConnected ? false : POLL_INTERVAL_MS,
    });

  const now = useNowTick(data.count > 0);

  if (data.count === 0) return null;

  const thresholdMin = EXPO_AGING_THRESHOLD_MS / 60_000;
  const tickets = data.ready.slice(0, 8);

  return (
    <section
      className={cn(
        "rounded-lg border p-4",
        data.staleCount > 0
          ? "border-destructive/50 bg-destructive/5"
          : "border-border bg-card/40",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg tracking-tight">Pass</h2>
          <p className="text-xs text-muted-foreground">
            Oldest food first — run before it sits {thresholdMin}+ minutes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data.staleCount > 0 ? (
            <Badge variant="destructive" className="rounded-md gap-1">
              <AlertTriangle className="size-3" />
              {data.staleCount} aging
            </Badge>
          ) : null}
          <Badge variant="secondary" className="rounded-md tabular-nums">
            {data.count} waiting
          </Badge>
        </div>
      </div>
      <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {tickets.map((ticket, index) => {
          const stale = isExpoStale(ticket.readyAt, now);
          const ageMs = ticket.readyAt
            ? now - new Date(ticket.readyAt).getTime()
            : 0;

          return (
            <li
              key={ticket.id}
              className={cn(
                "min-w-[9rem] shrink-0 rounded-md border px-3 py-2",
                stale
                  ? "border-destructive/60 bg-destructive/10"
                  : "border-border bg-background/60",
              )}
            >
              <p className="text-xs text-muted-foreground">#{index + 1}</p>
              <p className="truncate font-medium">
                {ticket.qty}× {ticket.name}
              </p>
              <p className="text-xs text-muted-foreground">
                T{ticket.tableLabel}
                {ticket.mine ? " · yours" : ""}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-xs tabular-nums",
                  stale
                    ? "font-medium text-destructive"
                    : "text-muted-foreground",
                )}
              >
                {ticket.readyAt ? formatElapsedMs(ageMs) : "—"} on pass
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Tap Pass in the header to mark Served.
      </p>
    </section>
  );
}
