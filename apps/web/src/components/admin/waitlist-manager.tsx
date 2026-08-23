"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, Plus, UserCheck, X } from "lucide-react";
import type { WaitlistParty } from "@/lib/waitlist";
import { ApiClientError, apiMutate } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AvailableTable = {
  id: string;
  label: string;
};

type WaitlistManagerProps = {
  active: WaitlistParty[];
  history: WaitlistParty[];
  availableTables: AvailableTable[];
};

function statusBadge(status: WaitlistParty["status"]) {
  switch (status) {
    case "NOTIFIED":
      return "default" as const;
    case "SEATED":
      return "secondary" as const;
    case "CANCELLED":
    case "NO_SHOW":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

export function WaitlistManager({
  active,
  history,
  availableTables,
}: WaitlistManagerProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [seatEntry, setSeatEntry] = useState<WaitlistParty | null>(null);
  const [tableId, setTableId] = useState("");
  const [pending, startTransition] = useTransition();

  async function handleMutation(
    fn: () => Promise<void>,
    close?: () => void,
  ) {
    try {
      await fn();
      toast.success("Updated");
      close?.();
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "Request failed",
      );
    }
  }

  function openSeat(entry: WaitlistParty) {
    setSeatEntry(entry);
    setTableId(availableTables[0]?.id ?? "");
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {active.length} part{active.length === 1 ? "y" : "ies"} in line
        </p>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <Button onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="size-4" />
            Add party
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to waitlist</DialogTitle>
              <DialogDescription>
                Walk-ins waiting for a free table. Party size is advisory when
                seating.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              action={(formData) => {
                startTransition(async () => {
                  await handleMutation(async () => {
                    await apiMutate("/admin/waitlist", "POST", {
                      partyName: String(formData.get("partyName") ?? ""),
                      partySize: Number(formData.get("partySize") ?? 1),
                      phone: String(formData.get("phone") ?? "") || undefined,
                      quotedMinutes: formData.get("quotedMinutes")
                        ? Number(formData.get("quotedMinutes"))
                        : undefined,
                    });
                  }, () => setAddOpen(false));
                });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="partyName">Party name</Label>
                <Input
                  id="partyName"
                  name="partyName"
                  required
                  placeholder="Chen · 4"
                  disabled={pending}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="partySize">Party size</Label>
                  <Input
                    id="partySize"
                    name="partySize"
                    type="number"
                    min={1}
                    max={20}
                    defaultValue={2}
                    required
                    disabled={pending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quotedMinutes">Quoted wait (min)</Label>
                  <Input
                    id="quotedMinutes"
                    name="quotedMinutes"
                    type="number"
                    min={0}
                    max={180}
                    placeholder="20"
                    disabled={pending}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="555-0100"
                  disabled={pending}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Adding…" : "Add to line"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {active.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <p className="font-heading text-xl">Door is clear</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add a walk-in when the line starts.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Party</TableHead>
                <TableHead className="w-20">Size</TableHead>
                <TableHead className="w-24">Wait</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-48 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <p className="font-medium">{entry.partyName}</p>
                    {entry.phone ? (
                      <p className="text-xs text-muted-foreground">
                        {entry.phone}
                      </p>
                    ) : null}
                    {entry.quotedMinutes != null ? (
                      <p className="text-xs text-muted-foreground">
                        Quoted ~{entry.quotedMinutes} min
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>{entry.partySize}</TableCell>
                  <TableCell className="tabular-nums">
                    {entry.waitMinutes}m
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusBadge(entry.status)}
                      className="rounded-md capitalize"
                    >
                      {entry.status.toLowerCase().replaceAll("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1">
                      {entry.status === "WAITING" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          disabled={pending}
                          onClick={() => {
                            startTransition(async () => {
                              await handleMutation(async () => {
                                await apiMutate(
                                  `/admin/waitlist/${entry.id}/notify`,
                                  "POST",
                                );
                              });
                            });
                          }}
                        >
                          <Bell className="size-3.5" />
                          Notify
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        className="gap-1"
                        disabled={pending || availableTables.length === 0}
                        onClick={() => openSeat(entry)}
                      >
                        <UserCheck className="size-3.5" />
                        Seat
                      </Button>
                      {entry.status === "NOTIFIED" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() => {
                            startTransition(async () => {
                              await handleMutation(async () => {
                                await apiMutate(
                                  `/admin/waitlist/${entry.id}/no-show`,
                                  "POST",
                                );
                              });
                            });
                          }}
                        >
                          No-show
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => {
                          startTransition(async () => {
                            await handleMutation(async () => {
                              await apiMutate(
                                `/admin/waitlist/${entry.id}/cancel`,
                                "POST",
                              );
                            });
                          });
                        }}
                      >
                        <X className="size-4" />
                        <span className="sr-only">Cancel</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={!!seatEntry}
        onOpenChange={(open) => {
          if (!open) setSeatEntry(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seat {seatEntry?.partyName}</DialogTitle>
            <DialogDescription>
              Party of {seatEntry?.partySize}. Only available tables are shown.
            </DialogDescription>
          </DialogHeader>
          {availableTables.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No free tables right now.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seatTable">Table</Label>
                <Select value={tableId} onValueChange={setTableId}>
                  <SelectTrigger id="seatTable" className="w-full">
                    <SelectValue placeholder="Pick a table" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTables.map((table) => (
                      <SelectItem key={table.id} value={table.id}>
                        Table {table.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  disabled={pending || !tableId}
                  onClick={() => {
                    if (!seatEntry) return;
                    startTransition(async () => {
                      await handleMutation(async () => {
                        await apiMutate(
                          `/admin/waitlist/${seatEntry.id}/seat`,
                          "POST",
                          { tableId },
                        );
                      }, () => setSeatEntry(null));
                    });
                  }}
                >
                  {pending ? "Seating…" : "Confirm seat"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {history.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-heading text-xl tracking-tight">Recent</h2>
          <div className="overflow-hidden rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Party</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Table</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.slice(0, 8).map((entry) => (
                  <TableRow key={entry.id} className="text-muted-foreground">
                    <TableCell>{entry.partyName}</TableCell>
                    <TableCell className="capitalize">
                      {entry.status.toLowerCase().replaceAll("_", " ")}
                    </TableCell>
                    <TableCell>
                      {entry.seatedTableLabel
                        ? `Table ${entry.seatedTableLabel}`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
