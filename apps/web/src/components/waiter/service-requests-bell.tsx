"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { HandHelping, Receipt } from "lucide-react";
import { ApiClientError, apiFetch, apiMutate } from "@/lib/api-client";
import type { ServiceRequestsData } from "@/lib/types/service-requests";
import { POLL_INTERVAL_MS } from "@/lib/constants";
import { playNewTicketChime } from "@/lib/chimes";
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

async function fetchServiceRequests(): Promise<ServiceRequestsData> {
  const body = await apiFetch<ServiceRequestsData>("/waiter/service-requests");
  return body.data ?? { requests: [], count: 0 };
}

function requestLabel(type: ServiceRequestsData["requests"][number]["type"]) {
  return type === "CALL_WAITER" ? "Call waiter" : "Request bill";
}

export function ServiceRequestsBell() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const sseConnected = useSseConnected();
  const prevCartCalls = useRef(0);

  const { data, isPending } = useQuery({
    queryKey: ["waiter-service-requests"],
    queryFn: fetchServiceRequests,
    refetchInterval: sseConnected ? false : POLL_INTERVAL_MS,
  });

  const requests = data?.requests ?? [];
  const count = data?.count ?? 0;

  const cartCallCount = useMemo(
    () => requests.filter((r) => (r.lineCount ?? 0) > 0).length,
    [requests],
  );

  useEffect(() => {
    if (cartCallCount > prevCartCalls.current) {
      playNewTicketChime();
    }
    prevCartCalls.current = cartCallCount;
  }, [cartCallCount]);

  function ack(id: string) {
    startTransition(async () => {
      try {
        const result = await apiMutate(
          `/waiter/service-requests/${id}/acknowledge`,
          "POST",
        );
        toast.success(result.message ?? "Cleared");
        await queryClient.invalidateQueries({
          queryKey: ["waiter-service-requests"],
        });
      } catch (err) {
        toast.error(
          err instanceof ApiClientError ? err.message : "Request failed",
        );
      }
    });
  }

  function takeOrder(tableId: string, requestId: string) {
    startTransition(async () => {
      try {
        await apiMutate(
          `/waiter/service-requests/${requestId}/acknowledge`,
          "POST",
        );
        await queryClient.invalidateQueries({
          queryKey: ["waiter-service-requests"],
        });
        setOpen(false);
        router.push(`/waiter/tables/${tableId}?requestId=${requestId}`);
      } catch (err) {
        toast.error(
          err instanceof ApiClientError ? err.message : "Request failed",
        );
      }
    });
  }

  const billCount = useMemo(
    () => requests.filter((r) => r.type === "REQUEST_BILL").length,
    [requests],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="relative gap-1.5"
        >
          <HandHelping className="size-4" />
          <span className="hidden sm:inline">Calls</span>
          {count > 0 ? (
            <Badge className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full px-1 tabular-nums">
              {count}
            </Badge>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Service calls</DialogTitle>
          <DialogDescription>
            Guest requests from QR menus
            {billCount > 0
              ? ` · ${billCount} bill request${billCount === 1 ? "" : "s"}`
              : ""}
            {cartCallCount > 0 ? ` · ${cartCallCount} with items` : ""}.
          </DialogDescription>
        </DialogHeader>
        {isPending && !data ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading calls…
          </p>
        ) : requests.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No open calls right now.
          </p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {requests.map((request) => {
              const hasItems = (request.lineCount ?? 0) > 0;
              return (
                <li
                  key={request.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {request.type === "REQUEST_BILL" ? (
                        <Receipt className="size-3.5 shrink-0 text-primary" />
                      ) : (
                        <HandHelping className="size-3.5 shrink-0 text-primary" />
                      )}
                      <p className="font-medium">
                        {requestLabel(request.type)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Table {request.tableLabel}
                      {request.acknowledgedAt ? " · on the way" : ""}
                    </p>
                    {hasItems && request.linesPreview ? (
                      <p className="mt-1 text-xs text-foreground/80">
                        {request.linesPreview}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                    {request.type === "REQUEST_BILL" ? (
                      <Button asChild size="sm" variant="default">
                        <Link
                          href={`/waiter/tables/${request.tableId}/checkout`}
                        >
                          Checkout
                        </Link>
                      </Button>
                    ) : null}
                    {hasItems ? (
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() => takeOrder(request.tableId, request.id)}
                      >
                        Take order
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => ack(request.id)}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
