"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { POLL_INTERVAL_MS } from "@/lib/constants";
import type { GuestOrderStatusData } from "@/lib/types/guest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

async function fetchOrderStatus(qrSlug: string): Promise<GuestOrderStatusData> {
  const body = await apiFetch<GuestOrderStatusData>(
    `/guest/order-status/${qrSlug}`,
  );
  return (
    body.data ?? {
      table: { qrSlug, label: "", status: "AVAILABLE" },
      pendingRequest: null,
      items: [],
      kitchenSummary: {
        totalPending: 0,
        yourPendingCount: 0,
        yourPendingFires: 0,
      },
    }
  );
}

function statusLabel(status: GuestOrderStatusData["items"][number]["status"]) {
  if (status === "PENDING") return "In kitchen";
  if (status === "IN_PROGRESS") return "Cooking";
  if (status === "READY") return "Ready";
  return "Served";
}

export function GuestOrderStatus({ qrSlug }: { qrSlug: string }) {
  const { data } = useQuery({
    queryKey: ["guest-order-status", qrSlug],
    queryFn: () => fetchOrderStatus(qrSlug),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const pendingRequest = data?.pendingRequest ?? null;
  const items = data?.items ?? [];
  const waiting = items.filter(
    (item) => item.status === "PENDING" || item.status === "IN_PROGRESS",
  );
  const done = items.filter(
    (item) => item.status === "READY" || item.status === "SERVED",
  );

  const waitingFires = useMemo(() => {
    const byFire = new Map<
      string,
      {
        fireId: string;
        batchLabel: string;
        queuePosition: number | null;
        estimatedLabel: string | null;
        items: typeof waiting;
      }
    >();
    for (const item of waiting) {
      const current = byFire.get(item.fireId) ?? {
        fireId: item.fireId,
        batchLabel: item.batchLabel,
        queuePosition: item.queuePosition,
        estimatedLabel: item.estimatedLabel,
        items: [],
      };
      current.items.push(item);
      if (item.queuePosition != null) {
        current.queuePosition = item.queuePosition;
        current.estimatedLabel = item.estimatedLabel;
      }
      byFire.set(item.fireId, current);
    }
    return [...byFire.values()];
  }, [waiting]);

  const badgeCount =
    (pendingRequest ? 1 : 0) +
    waitingFires.length +
    done.filter((i) => i.status === "READY").length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="relative gap-1.5"
        >
          <ClipboardList className="size-4" />
          My order
          {badgeCount > 0 ? (
            <Badge className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full px-1 tabular-nums">
              {badgeCount}
            </Badge>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your order</DialogTitle>
          <DialogDescription>
            Status updates until everything is served. Your waiter sends items
            to the kitchen.
          </DialogDescription>
        </DialogHeader>

        {!pendingRequest && items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing on this table yet. Add items and call your waiter, or just
            call them over.
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            {pendingRequest ? (
              <section>
                <h3 className="text-sm font-medium">
                  {pendingRequest.acknowledgedAt
                    ? "Waiter on the way"
                    : "Waiting for waiter"}
                </h3>
                {pendingRequest.lines.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    They will take your order at the table.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {pendingRequest.lines.map((line) => (
                      <li key={`${line.menuItemId}-${line.name}`}>
                        {line.qty}× {line.name}
                        {line.note ? (
                          <span className="block text-xs text-muted-foreground">
                            {line.note}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}

            {waitingFires.length > 0 ? (
              <section>
                <h3 className="text-sm font-medium">In the kitchen</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data?.kitchenSummary.yourPendingFires ?? waitingFires.length}{" "}
                  of {data?.kitchenSummary.totalPending ?? 0} fires waiting
                </p>
                <ul className="mt-2 space-y-3">
                  {waitingFires.map((fire) => (
                    <li
                      key={fire.fireId}
                      className="rounded-md border border-border/80 px-3 py-2 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium">{fire.batchLabel}</p>
                        <Badge
                          variant="secondary"
                          className="shrink-0 rounded-md"
                        >
                          {fire.queuePosition != null
                            ? `#${fire.queuePosition}`
                            : "Cooking"}
                        </Badge>
                      </div>
                      {fire.estimatedLabel || fire.queuePosition == null ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {fire.estimatedLabel ?? "Being prepared"}
                        </p>
                      ) : null}
                      <ul className="mt-2 space-y-1 text-sm">
                        {fire.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-2"
                          >
                            <span>
                              {item.qty}× {item.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {statusLabel(item.status)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {done.length > 0 ? (
              <section>
                <h3 className="text-sm font-medium">Ready / served</h3>
                <ul className="mt-2 space-y-2">
                  {done.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>
                        {item.qty}× {item.name}
                      </span>
                      <Badge variant="outline" className="rounded-md">
                        {statusLabel(item.status)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
