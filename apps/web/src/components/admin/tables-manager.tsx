"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Pencil, Plus, QrCode, Trash2 } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";
import { tableMenuUrl } from "@/lib/constants";
import { suggestQrSlug } from "@/lib/tables";
import { createTable, deleteTable, updateTable } from "@/app/actions/tables";
import { QrCodeImage } from "@/components/admin/qr-code-image";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type TableRow = {
  id: string;
  label: string;
  qrSlug: string;
  status: "AVAILABLE" | "OCCUPIED" | "BILLING";
};

type TablesManagerProps = {
  tables: TableRow[];
};

async function handleResult(result: ActionResult, close?: () => void) {
  if (result.ok) {
    toast.success(result.message ?? "Saved");
    close?.();
  } else {
    toast.error(result.error);
  }
}

function statusVariant(status: TableRow["status"]) {
  switch (status) {
    case "OCCUPIED":
      return "default" as const;
    case "BILLING":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

export function TablesManager({ tables }: TablesManagerProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TableRow | null>(null);
  const [qrTable, setQrTable] = useState<TableRow | null>(null);
  const [label, setLabel] = useState("");
  const [qrSlug, setQrSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setLabel("");
    setQrSlug("");
    setSlugTouched(false);
    setOpen(true);
  }

  function openEdit(table: TableRow) {
    setEditing(table);
    setLabel(table.label);
    setQrSlug(table.qrSlug);
    setSlugTouched(true);
    setOpen(true);
  }

  function onLabelChange(value: string) {
    setLabel(value);
    if (!slugTouched && !editing) {
      setQrSlug(suggestQrSlug(value));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {tables.length} table{tables.length === 1 ? "" : "s"}
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="size-4" />
            Add table
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit table" : "New table"}</DialogTitle>
              <DialogDescription>
                Each table gets a unique QR slug for the guest menu.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              action={(formData) => {
                startTransition(async () => {
                  const result = editing
                    ? await updateTable(formData)
                    : await createTable(formData);
                  await handleResult(result, () => setOpen(false));
                });
              }}
            >
              {editing ? (
                <input type="hidden" name="id" value={editing.id} />
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="label">Label</Label>
                <Input
                  id="label"
                  name="label"
                  required
                  value={label}
                  onChange={(e) => onLabelChange(e.target.value)}
                  placeholder="1"
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qrSlug">QR slug</Label>
                <Input
                  id="qrSlug"
                  name="qrSlug"
                  required
                  value={qrSlug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setQrSlug(e.target.value);
                  }}
                  placeholder="t-01"
                  disabled={pending}
                />
                <p className="text-xs text-muted-foreground">
                  Guest URL: /menu/{qrSlug || "…"}
                </p>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : editing ? "Save changes" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {tables.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <p className="font-heading text-xl">No tables yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add floor tables and print their QR codes for guests.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>QR slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((table) => (
                <TableRow key={table.id}>
                  <TableCell className="font-medium">{table.label}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {table.qrSlug}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariant(table.status)}
                      className="rounded-md capitalize"
                    >
                      {table.status.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => setQrTable(table)}
                      >
                        <QrCode className="size-4" />
                        <span className="sr-only">Show QR</span>
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => openEdit(table)}
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" size="icon-sm" variant="ghost">
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete table?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes table {table.label} and its QR slug.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                const formData = new FormData();
                                formData.set("id", table.id);
                                startTransition(async () => {
                                  await handleResult(
                                    await deleteTable(formData),
                                  );
                                });
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={!!qrTable}
        onOpenChange={(next) => {
          if (!next) setQrTable(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          {qrTable ? (
            <>
              <DialogHeader>
                <DialogTitle>Table {qrTable.label}</DialogTitle>
                <DialogDescription>
                  Guests scan this code for the read-only menu.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-2">
                <QrCodeImage
                  value={tableMenuUrl(qrTable.qrSlug)}
                  className="rounded-md border border-border"
                />
                <p className="break-all text-center font-mono text-xs text-muted-foreground">
                  {tableMenuUrl(qrTable.qrSlug)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5"
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      tableMenuUrl(qrTable.qrSlug),
                    );
                    toast.success("Link copied");
                  }}
                >
                  <Copy className="size-4" />
                  Copy link
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
