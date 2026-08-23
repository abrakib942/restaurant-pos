"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeftRight, Merge, UserRound } from "lucide-react";
import {
  mergeTableOrders,
  reassignOrderWaiter,
  transferTableOrder,
} from "@/app/actions/floor-ops";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type FloorOpsTable = {
  id: string;
  label: string;
  status: "AVAILABLE" | "OCCUPIED" | "BILLING";
  hasOpenOrder: boolean;
};

export type FloorOpsWaiter = {
  id: string;
  name: string;
};

type FloorOpsPanelProps = {
  tableId: string;
  tableLabel: string;
  hasActiveOrder: boolean;
  currentWaiterId: string | null;
  tables: FloorOpsTable[];
  waiters: FloorOpsWaiter[];
};

export function FloorOpsPanel({
  tableId,
  tableLabel,
  hasActiveOrder,
  currentWaiterId,
  tables,
  waiters,
}: FloorOpsPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [mergeFrom, setMergeFrom] = useState("");
  const [waiterId, setWaiterId] = useState(currentWaiterId ?? "");
  const [pending, startTransition] = useTransition();

  const transferTargets = tables.filter(
    (t) => t.id !== tableId && t.status === "AVAILABLE",
  );
  const mergeSources = tables.filter(
    (t) => t.id !== tableId && t.hasOpenOrder && t.status === "OCCUPIED",
  );

  function run(
    action: () => Promise<{ ok: boolean; error?: string; message?: string }>,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Done");
      setOpen(false);
      router.refresh();
    });
  }

  if (!hasActiveOrder && mergeSources.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <ArrowLeftRight className="size-4" />
          Floor ops
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Floor ops · Table {tableLabel}</DialogTitle>
          <DialogDescription>
            Transfer, merge, or reassign the active check.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {hasActiveOrder ? (
            <>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <ArrowLeftRight className="size-3.5" />
                  Transfer to empty table
                </Label>
                <Select value={transferTo} onValueChange={setTransferTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Available table" />
                  </SelectTrigger>
                  <SelectContent>
                    {transferTargets.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        Table {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={pending || !transferTo}
                  onClick={() =>
                    run(() =>
                      transferTableOrder({
                        fromTableId: tableId,
                        toTableId: transferTo,
                      }),
                    )
                  }
                >
                  Transfer order
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <UserRound className="size-3.5" />
                  Reassign waiter
                </Label>
                <Select value={waiterId} onValueChange={setWaiterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Waiter" />
                  </SelectTrigger>
                  <SelectContent>
                    {waiters.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  disabled={pending || !waiterId}
                  onClick={() =>
                    run(() => reassignOrderWaiter({ tableId, waiterId }))
                  }
                >
                  Reassign
                </Button>
              </div>
            </>
          ) : null}

          {mergeSources.length > 0 ? (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Merge className="size-3.5" />
                Merge another table into this one
              </Label>
              <Select value={mergeFrom} onValueChange={setMergeFrom}>
                <SelectTrigger>
                  <SelectValue placeholder="Source table" />
                </SelectTrigger>
                <SelectContent>
                  {mergeSources.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      Table {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="w-full"
                disabled={pending || !mergeFrom}
                onClick={() =>
                  run(() =>
                    mergeTableOrders({
                      sourceTableId: mergeFrom,
                      targetTableId: tableId,
                    }),
                  )
                }
              >
                Merge checks
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
