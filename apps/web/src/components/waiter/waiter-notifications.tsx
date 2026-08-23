"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Bell } from "lucide-react";
import { ApiClientError, apiFetch, apiMutate } from "@/lib/api-client";
import type { WaiterNotificationsData } from "@/lib/types/waiter-notifications";
import { isExpoStale } from "@/lib/expo-meta";
import { formatElapsedMs } from "@/lib/kitchen-meta";
import { playExpoBumpChime } from "@/lib/chimes";
import { EXPO_AGING_THRESHOLD_MS, POLL_INTERVAL_MS } from "@/lib/constants";
import { useSseConnected } from "@/components/providers/realtime-listener";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

export function WaiterNotifications() {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const prevStaleCount = useRef(0);
  const sseConnected = useSseConnected();

  const { data = { ready: [], count: 0, mineCount: 0, staleCount: 0 } } =
    useQuery({
      queryKey: ["waiter-notifications"],
      queryFn: fetchNotifications,
      refetchInterval: sseConnected ? false : POLL_INTERVAL_MS,
    });

  const now = useNowTick(open || data.staleCount > 0);

  useEffect(() => {
    if (data.staleCount > prevStaleCount.current) {
      playExpoBumpChime();
    }
    prevStaleCount.current = data.staleCount;
  }, [data.staleCount]);

  function serve(id: string) {
    startTransition(async () => {
      try {
        const result = await apiMutate(`/waiter/items/${id}/served`, "POST");
        toast.success(result.message ?? "Served");
        await queryClient.invalidateQueries({
          queryKey: ["waiter-notifications"],
        });
        await queryClient.invalidateQueries({ queryKey: ["kitchen-board"] });
      } catch (err) {
        toast.error(
          err instanceof ApiClientError ? err.message : "Request failed",
        );
      }
    });
  }

  const thresholdMin = EXPO_AGING_THRESHOLD_MS / 60_000;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "relative gap-1.5",
            data.staleCount > 0 && "border-destructive/60",
          )}
        >
          <Bell className="size-4" />
          <span className="hidden sm:inline">Pass</span>
          {data.count > 0 ? (
            <Badge
              variant={data.staleCount > 0 ? "destructive" : "default"}
              className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full px-1 tabular-nums"
            >
              {data.count}
            </Badge>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pass — ready to run</DialogTitle>
          <DialogDescription>
            Oldest first · any waiter can serve
            {data.mineCount > 0 ? ` · ${data.mineCount} on your tables` : ""}.
            Bump at {thresholdMin}+ minutes on pass.
          </DialogDescription>
        </DialogHeader>
        {data.ready.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing on the pass right now.
          </p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {data.ready.map((item) => {
              const stale = isExpoStale(item.readyAt, now);
              const ageMs = item.readyAt
                ? now - new Date(item.readyAt).getTime()
                : 0;

              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border p-3",
                    stale
                      ? "border-destructive/60 bg-destructive/10"
                      : "border-border",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-medium">
                        {item.qty}× {item.name}
                      </p>
                      {stale ? (
                        <Badge
                          variant="destructive"
                          className="rounded-md gap-0.5 text-[10px]"
                        >
                          <AlertTriangle className="size-3" />
                          Aging
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Table {item.tableLabel}
                      {item.mine ? " · yours" : ""}
                      {item.readyAt
                        ? ` · ${formatElapsedMs(ageMs)} on pass`
                        : ""}
                    </p>
                    <Link
                      href={`/waiter/tables/${item.tableId}`}
                      className="text-xs text-primary hover:underline"
                    >
                      Open table
                    </Link>
                  </div>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => serve(item.id)}
                  >
                    Served
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
