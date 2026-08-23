"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import type { ActionResult } from "@/lib/action-result";
import {
  createMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  updateMenuItem,
} from "@/app/actions/menu";
import { uploadMenuImage } from "@/app/actions/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type MenuCategoryOption = {
  id: string;
  name: string;
};

export type MenuItemRow = {
  id: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  isAvailable: boolean;
  sortOrder: number;
  categoryId: string;
  categoryName: string;
};

type MenuManagerProps = {
  items: MenuItemRow[];
  categories: MenuCategoryOption[];
};

async function handleResult(result: ActionResult, close?: () => void) {
  if (result.ok) {
    toast.success(result.message ?? "Saved");
    close?.();
  } else {
    toast.error(result.error);
  }
}

function formatPrice(price: string) {
  const n = Number(price);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : price;
}

export function MenuManager({ items, categories }: MenuManagerProps) {
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItemRow | null>(null);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [available, setAvailable] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const filtered =
    filter === "all"
      ? items
      : items.filter((item) => item.categoryId === filter);

  function openCreate() {
    if (categories.length === 0) {
      toast.error("Create a category first");
      return;
    }
    setEditing(null);
    setCategoryId(categories[0]?.id ?? "");
    setAvailable(true);
    setImageUrl("");
    setOpen(true);
  }

  function openEdit(item: MenuItemRow) {
    setEditing(item);
    setCategoryId(item.categoryId);
    setAvailable(item.isAvailable);
    setImageUrl(item.imageUrl);
    setOpen(true);
  }

  async function onImageSelected(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadMenuImage(formData);
    setUploading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.url) {
      setImageUrl(result.url);
      toast.success("Image uploaded");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length} item{filtered.length === 1 ? "" : "s"}
          </p>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="size-4" />
            Add item
          </Button>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit menu item" : "New menu item"}
              </DialogTitle>
              <DialogDescription>
                This menu feeds both the waiter POS and the guest QR view.
              </DialogDescription>
            </DialogHeader>
            <form
              key={editing?.id ?? "new"}
              className="space-y-4"
              action={(formData) => {
                formData.set("categoryId", categoryId);
                formData.set("isAvailable", available ? "true" : "false");
                formData.set("imageUrl", imageUrl);
                startTransition(async () => {
                  const result = editing
                    ? await updateMenuItem(formData)
                    : await createMenuItem(formData);
                  await handleResult(result, () => setOpen(false));
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
                  placeholder="Heritage Chicken"
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  required
                  rows={3}
                  defaultValue={editing?.description ?? ""}
                  placeholder="Half bird, pan drippings, grilled lemon."
                  disabled={pending}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input
                    id="price"
                    name="price"
                    required
                    inputMode="decimal"
                    defaultValue={editing?.price ?? ""}
                    placeholder="28.00"
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <Select
                  value={categoryId}
                  onValueChange={setCategoryId}
                  disabled={pending}
                >
                  <SelectTrigger id="categoryId" className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image</Label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt=""
                      className="size-20 rounded-md object-cover"
                    />
                  ) : null}
                  <div className="flex flex-1 flex-col gap-2">
                    <Input
                      id="imageUrl"
                      name="imageUrl"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://… or upload below"
                      disabled={pending || uploading}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          void onImageSelected(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={pending || uploading}
                        onClick={() => fileRef.current?.click()}
                      >
                        <Upload className="size-4" />
                        {uploading ? "Uploading…" : "Upload file"}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        JPEG, PNG, or WebP · max 2 MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Available</p>
                  <p className="text-xs text-muted-foreground">
                    Unavailable items stay hidden from ordering.
                  </p>
                </div>
                <Switch
                  checked={available}
                  onCheckedChange={setAvailable}
                  disabled={pending}
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={pending || uploading || !categoryId || !imageUrl}
                >
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
            Add a category before creating menu items.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <p className="font-heading text-xl">No menu items</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add dishes, drinks, and sides for the floor and guest menu.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16"> </TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-36 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="size-12 rounded-md object-cover"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium">{item.name}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.categoryName}
                  </TableCell>
                  <TableCell>{formatPrice(item.price)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={item.isAvailable ? "secondary" : "outline"}
                      className="rounded-md"
                    >
                      {item.isAvailable ? "Available" : "Unavailable"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Switch
                        size="sm"
                        checked={item.isAvailable}
                        onCheckedChange={() => {
                          const formData = new FormData();
                          formData.set("id", item.id);
                          startTransition(async () => {
                            await handleResult(
                              await toggleMenuItemAvailability(formData),
                            );
                          });
                        }}
                        disabled={pending}
                        aria-label={`Toggle ${item.name} availability`}
                      />
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => openEdit(item)}
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
                            <AlertDialogTitle>
                              Delete menu item?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes “{item.name}”. Prefer marking
                              unavailable if it has order history.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                const formData = new FormData();
                                formData.set("id", item.id);
                                startTransition(async () => {
                                  await handleResult(
                                    await deleteMenuItem(formData),
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
    </div>
  );
}
