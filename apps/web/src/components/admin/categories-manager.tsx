"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ApiClientError, apiMutate } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";

export type CategoryRow = {
  id: string;
  name: string;
  sortOrder: number;
  itemCount: number;
};

type CategoriesManagerProps = {
  categories: CategoryRow[];
};

export function CategoriesManager({ categories }: CategoriesManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(category: CategoryRow) {
    setEditing(category);
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {categories.length} categor{categories.length === 1 ? "y" : "ies"}
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="size-4" />
            Add category
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit category" : "New category"}
              </DialogTitle>
              <DialogDescription>
                Categories group items on the waiter POS and guest menu.
              </DialogDescription>
            </DialogHeader>
            <form
              key={editing?.id ?? "new"}
              className="space-y-4"
              action={(formData) => {
                startTransition(async () => {
                  const name = String(formData.get("name") ?? "");
                  const sortOrder = Number(formData.get("sortOrder") ?? 0);
                  try {
                    if (editing) {
                      await apiMutate(
                        `/admin/categories/${editing.id}`,
                        "PATCH",
                        { name, sortOrder },
                      );
                    } else {
                      await apiMutate("/admin/categories", "POST", {
                        name,
                        sortOrder,
                      });
                    }
                    toast.success("Saved");
                    setOpen(false);
                    router.refresh();
                  } catch (err) {
                    toast.error(
                      err instanceof ApiClientError
                        ? err.message
                        : "Request failed",
                    );
                  }
                });
              }}
            >
              {editing ? (
                <input type="hidden" name="id" value={editing.id} />
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={editing?.name ?? ""}
                  placeholder="Small Plates"
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort order</Label>
                <Input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  min={0}
                  defaultValue={editing?.sortOrder ?? 0}
                  disabled={pending}
                />
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

      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <p className="font-heading text-xl">No categories yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your first category to start organizing the menu.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-24">Order</TableHead>
                <TableHead className="w-28">Items</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.sortOrder}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-md">
                      {category.itemCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => openEdit(category)}
                      >
                        <Pencil className="size-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            disabled={category.itemCount > 0}
                            title={
                              category.itemCount > 0
                                ? "Remove menu items first"
                                : "Delete"
                            }
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete category?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes “{category.name}” permanently.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                startTransition(async () => {
                                  try {
                                    await apiMutate(
                                      `/admin/categories/${category.id}`,
                                      "DELETE",
                                    );
                                    toast.success("Category deleted");
                                    router.refresh();
                                  } catch (err) {
                                    toast.error(
                                      err instanceof ApiClientError
                                        ? err.message
                                        : "Request failed",
                                    );
                                  }
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
    </div>
  );
}
