"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { markItemServed } from "@/app/actions/service";
import type { WaiterNotificationsData } from "@/lib/waiter-notifications";
import { POLL_INTERVAL_MS } from "@/lib/constants";
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

async function fetchNotifications(): Promise<WaiterNotificationsData> {
  const res = await fetch("/api/waiter/notifications", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load notifications");
  return res.json();
}

export function WaiterNotifications() {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();

  const { data } = useQuery({
    queryKey: ["waiter-notifications"],
    queryFn: fetchNotifications,
    refetchInterval: POLL_INTERVAL_MS,
    initialData: { ready: [], count: 0 },
  });

  function serve(id: string) {
    startTransition(async () => {
      const result = await markItemServed(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Served");
      await queryClient.invalidateQueries({
        queryKey: ["waiter-notifications"],
      });
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="relative gap-1.5"
        >
          <Bell className="size-4" />
          <span className="hidden sm:inline">Ready</span>
          {data.count > 0 ? (
            <Badge className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full px-1 tabular-nums">
              {data.count}
            </Badge>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ready to serve</DialogTitle>
          <DialogDescription>
            Kitchen marked these for your tables. Polls every{" "}
            {POLL_INTERVAL_MS / 1000}s.
          </DialogDescription>
        </DialogHeader>
        {data.ready.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No ready tickets right now.
          </p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {data.ready.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {item.qty}× {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Table {item.tableLabel}
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
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
