"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChefHat } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import {
  KITCHEN_IN_PROGRESS_FIRE_CAP,
  POLL_INTERVAL_MS,
} from "@/lib/constants";
import { useSseConnected } from "@/components/providers/realtime-listener";
import type { WaiterKitchenQueueData } from "@/lib/types/waiter-kitchen-queue";
import { Badge } from "@/components/ui/badge";

async function fetchKitchenQueue(): Promise<WaiterKitchenQueueData> {
  const body = await apiFetch<WaiterKitchenQueueData>("/waiter/kitchen-queue");
  return (
    body.data ?? {
      totalPending: 0,
      inProgressCount: 0,
      cap: KITCHEN_IN_PROGRESS_FIRE_CAP,
      items: [],
    }
  );
}

export function KitchenQueueStrip() {
  const sseConnected = useSseConnected();
  const { data } = useQuery({
    queryKey: ["waiter-kitchen-queue"],
    queryFn: fetchKitchenQueue,
    refetchInterval: sseConnected ? false : POLL_INTERVAL_MS,
  });

  const items = data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className="rounded-lg border border-border bg-card/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ChefHat className="size-4 text-primary" />
          <h2 className="font-heading text-lg tracking-tight">Kitchen queue</h2>
        </div>
        <Badge variant="secondary" className="rounded-md tabular-nums">
          {data?.totalPending ?? 0} fires pending house-wide
        </Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Your sends — one serial per fire, not per dish.
      </p>
      <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <li key={item.fireId} className="min-w-[10rem] shrink-0">
            <Link
              href={`/waiter/tables/${item.tableId}`}
              className="block rounded-md border border-border bg-background/60 px-3 py-2 hover:border-primary/50"
            >
              <p className="text-xs tabular-nums text-muted-foreground">
                {item.queuePosition != null
                  ? `#${item.queuePosition}`
                  : "Cooking"}
                {item.estimatedLabel ? ` · ${item.estimatedLabel}` : ""}
              </p>
              <p className="truncate font-medium">
                {item.itemCount} item{item.itemCount === 1 ? "" : "s"} ·{" "}
                {item.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Table {item.tableLabel}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
