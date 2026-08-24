"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Minus, Plus, Trash2, Zap } from "lucide-react";
import { ApiClientError, apiMutate } from "@/lib/api-client";
import {
  FloorOpsPanel,
  type FloorOpsTable,
  type FloorOpsWaiter,
} from "@/components/waiter/floor-ops-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type PosMenuItem = {
  id: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  isAvailable: boolean;
  categoryId: string;
  categoryName: string;
};

export type PosCategory = {
  id: string;
  name: string;
};

export type ExistingOrderLine = {
  id: string;
  fireId: string;
  menuItemId: string;
  name: string;
  qty: number;
  unitPrice: string;
  status: string;
  removable?: boolean;
  queuePosition?: number | null;
  estimatedLabel?: string | null;
};

export type LiveFireInfo = {
  fireId: string;
  mode: "pending" | "inProgress";
  queuePosition: number | null;
  estimatedLabel: string | null;
};

type CartLine = {
  menuItemId: string;
  name: string;
  unitPrice: string;
  qty: number;
  rush: boolean;
  note?: string;
};

export type GuestPrefillLine = {
  menuItemId: string;
  name: string;
  qty: number;
  note: string | null;
};

type PosScreenProps = {
  table: {
    id: string;
    label: string;
    status: "AVAILABLE" | "OCCUPIED" | "BILLING";
  };
  categories: PosCategory[];
  menuItems: PosMenuItem[];
  existingLines: ExistingOrderLine[];
  liveFire?: LiveFireInfo | null;
  floorOps?: {
    hasActiveOrder: boolean;
    currentWaiterId: string | null;
    tables: FloorOpsTable[];
    waiters: FloorOpsWaiter[];
  };
  serviceRequestId?: string;
  guestLines?: GuestPrefillLine[];
};

function formatPrice(price: string) {
  const n = Number(price);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : price;
}

function cartFromGuestLines(
  guestLines: GuestPrefillLine[] | undefined,
  menuItems: PosMenuItem[],
): CartLine[] {
  if (!guestLines?.length) return [];
  const byId = new Map(menuItems.map((item) => [item.id, item]));
  const merged = new Map<string, CartLine>();
  for (const line of guestLines) {
    const menuItem = byId.get(line.menuItemId);
    const existing = merged.get(line.menuItemId);
    const qty = existing ? existing.qty + line.qty : line.qty;
    merged.set(line.menuItemId, {
      menuItemId: line.menuItemId,
      name: menuItem?.name ?? line.name,
      unitPrice: menuItem?.price ?? "0.00",
      qty: Math.min(99, qty),
      rush: existing?.rush ?? false,
      note: line.note ?? existing?.note,
    });
  }
  return [...merged.values()];
}

export function PosScreen({
  table,
  categories,
  menuItems,
  existingLines,
  liveFire = null,
  floorOps,
  serviceRequestId,
  guestLines,
}: PosScreenProps) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<string>(
    categories[0]?.id ?? "all",
  );
  const [cart, setCart] = useState<CartLine[]>(() =>
    cartFromGuestLines(guestLines, menuItems),
  );
  const [pendingQty, setPendingQty] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const line of existingLines) {
      if (line.removable) init[line.id] = line.qty;
    }
    return init;
  });
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();

  const billingLocked = table.status === "BILLING";
  const canEditPending = liveFire?.mode === "pending";
  const cookingAddOnly = liveFire?.mode === "inProgress";

  const visibleItems = useMemo(() => {
    if (categoryId === "all") return menuItems;
    return menuItems.filter((item) => item.categoryId === categoryId);
  }, [menuItems, categoryId]);

  const livePendingLines = useMemo(
    () =>
      existingLines.filter(
        (line) =>
          liveFire &&
          line.fireId === liveFire.fireId &&
          line.status === "PENDING" &&
          !removedIds.has(line.id),
      ),
    [existingLines, liveFire, removedIds],
  );

  const lockedLines = useMemo(
    () =>
      existingLines.filter(
        (line) =>
          !(
            liveFire &&
            line.fireId === liveFire.fireId &&
            line.status === "PENDING"
          ),
      ),
    [existingLines, liveFire],
  );

  const cartTotal = cart.reduce(
    (sum, line) => sum + Number(line.unitPrice) * line.qty,
    0,
  );

  const pendingEdits =
    canEditPending &&
    (removedIds.size > 0 ||
      livePendingLines.some(
        (line) => (pendingQty[line.id] ?? line.qty) !== line.qty,
      ));

  const canSubmit = !billingLocked && (cart.length > 0 || pendingEdits);

  function addToCart(item: PosMenuItem) {
    if (!item.isAvailable || billingLocked) return;
    setCart((prev) => {
      const existing = prev.find((line) => line.menuItemId === item.id);
      if (existing) {
        return prev.map((line) =>
          line.menuItemId === item.id
            ? { ...line, qty: Math.min(99, line.qty + 1) }
            : line,
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          unitPrice: item.price,
          qty: 1,
          rush: false,
        },
      ];
    });
  }

  function updateQty(menuItemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((line) =>
          line.menuItemId === menuItemId
            ? { ...line, qty: line.qty + delta }
            : line,
        )
        .filter((line) => line.qty > 0),
    );
  }

  function removeLine(menuItemId: string) {
    setCart((prev) => prev.filter((line) => line.menuItemId !== menuItemId));
  }

  function toggleRush(menuItemId: string) {
    setCart((prev) =>
      prev.map((line) =>
        line.menuItemId === menuItemId ? { ...line, rush: !line.rush } : line,
      ),
    );
  }

  function onSubmit() {
    if (!canSubmit) {
      toast.error("Add or change at least one item");
      return;
    }
    startTransition(async () => {
      try {
        const removeItemIds = canEditPending ? [...removedIds] : [];
        const updateItems = canEditPending
          ? livePendingLines
              .filter((line) => {
                const qty = pendingQty[line.id] ?? line.qty;
                return qty !== line.qty && qty > 0;
              })
              .map((line) => ({
                orderItemId: line.id,
                qty: pendingQty[line.id] ?? line.qty,
              }))
          : [];

        const result = await apiMutate("/waiter/orders", "POST", {
          tableId: table.id,
          serviceRequestId,
          items: cart.map((line) => ({
            menuItemId: line.menuItemId,
            qty: line.qty,
            rush: line.rush,
          })),
          removeItemIds,
          updateItems,
        });
        toast.success(result.message ?? "Order submitted");
        setCart([]);
        setRemovedIds(new Set());
        if (serviceRequestId) {
          router.replace(`/waiter/tables/${table.id}`);
        }
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof ApiClientError ? err.message : "Request failed",
        );
      }
    });
  }

  const submitLabel = pending
    ? "Sending…"
    : cookingAddOnly
      ? "Add to cooking fire"
      : canEditPending && (cart.length > 0 || pendingEdits)
        ? "Update kitchen"
        : "Send to kitchen";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-start">
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 px-2">
            <Link href="/waiter">
              <ArrowLeft className="size-4" />
              Floor
            </Link>
          </Button>
          <h1 className="font-heading text-3xl tracking-tight">
            Table {table.label}
          </h1>
          <Badge variant="secondary" className="rounded-md capitalize">
            {table.status.toLowerCase()}
          </Badge>
          {liveFire ? (
            <Badge variant="outline" className="rounded-md">
              {liveFire.mode === "pending" ? "Pending fire" : "Cooking fire"}
              {liveFire.queuePosition != null
                ? ` · #${liveFire.queuePosition}`
                : ""}
              {liveFire.estimatedLabel ? ` · ${liveFire.estimatedLabel}` : ""}
            </Badge>
          ) : null}
          {floorOps ? (
            <FloorOpsPanel
              tableId={table.id}
              tableLabel={table.label}
              hasActiveOrder={floorOps.hasActiveOrder}
              currentWaiterId={floorOps.currentWaiterId}
              tables={floorOps.tables}
              waiters={floorOps.waiters}
            />
          ) : null}
          {existingLines.length > 0 || billingLocked ? (
            <Button asChild size="sm" variant="outline" className="ml-auto">
              <Link href={`/waiter/tables/${table.id}/checkout`}>Checkout</Link>
            </Button>
          ) : null}
        </div>

        {billingLocked ? (
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            This table is in billing. New items are locked — finish checkout to
            free the table.
          </p>
        ) : null}

        {cookingAddOnly ? (
          <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
            Kitchen is cooking this fire — you can add items only. Existing
            lines stay until ready.
          </p>
        ) : null}

        {canEditPending && livePendingLines.length > 0 ? (
          <div className="rounded-lg border border-border p-3">
            <p className="text-sm font-medium">Pending fire (editable)</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Change qty or remove before kitchen starts — same queue #
            </p>
            <ul className="mt-2 space-y-2">
              {livePendingLines.map((line) => (
                <li
                  key={line.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 font-medium">{line.name}</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        setPendingQty((prev) => {
                          const next = (prev[line.id] ?? line.qty) - 1;
                          if (next <= 0) {
                            setRemovedIds((ids) => new Set(ids).add(line.id));
                            return prev;
                          }
                          return { ...prev, [line.id]: next };
                        })
                      }
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="w-6 text-center tabular-nums">
                      {pendingQty[line.id] ?? line.qty}
                    </span>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="outline"
                      disabled={
                        pending || (pendingQty[line.id] ?? line.qty) >= 99
                      }
                      onClick={() =>
                        setPendingQty((prev) => ({
                          ...prev,
                          [line.id]: Math.min(
                            99,
                            (prev[line.id] ?? line.qty) + 1,
                          ),
                        }))
                      }
                    >
                      <Plus className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        setRemovedIds((ids) => new Set(ids).add(line.id))
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {lockedLines.length > 0 ? (
          <div className="rounded-lg border border-border p-3">
            <p className="text-sm font-medium">
              {canEditPending ? "Other tickets" : "Current tickets"}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {lockedLines.map((line) => (
                <li
                  key={line.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span>
                    {line.qty}× {line.name}
                    {line.queuePosition != null
                      ? ` · #${line.queuePosition}`
                      : ""}
                    {line.estimatedLabel ? ` · ${line.estimatedLabel}` : ""}
                  </span>
                  <span className="capitalize">
                    {line.status.toLowerCase().replaceAll("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex gap-1 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategoryId("all")}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors",
              categoryId === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategoryId(category.id)}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-sm transition-colors",
                categoryId === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => {
            const disabled = !item.isAvailable || billingLocked;
            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled || pending}
                onClick={() => addToCart(item)}
                className={cn(
                  "flex gap-3 rounded-lg border border-border p-3 text-left transition-colors",
                  disabled
                    ? "cursor-not-allowed opacity-50"
                    : "hover:border-primary/50 hover:bg-muted/30",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt=""
                  className="size-16 shrink-0 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-snug">{item.name}</p>
                    <p className="shrink-0 text-sm text-primary">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                  {!item.isAvailable ? (
                    <Badge variant="outline" className="mt-2 rounded-md">
                      Unavailable
                    </Badge>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="w-full shrink-0 rounded-lg border border-border bg-card/40 p-4 lg:sticky lg:top-20 lg:w-80">
        <p className="font-heading text-xl">Ticket</p>
        <p className="text-xs text-muted-foreground">
          {guestLines && guestLines.length > 0
            ? "Guest selections are prefilled — edit, then send."
            : cookingAddOnly
              ? "New lines join the cooking fire."
              : canEditPending
                ? "New lines update the pending fire (same #)."
                : "New items send to the kitchen as a fire."}
        </p>
        <Separator className="my-3" />

        {cart.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Tap menu items to add.
          </p>
        ) : (
          <ul className="space-y-3">
            {cart.map((line) => (
              <li key={line.menuItemId} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{line.name}</p>
                    {line.note ? (
                      <p className="text-xs text-muted-foreground">
                        {line.note}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(line.unitPrice)} each
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => removeLine(line.menuItemId)}
                    disabled={pending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="outline"
                    onClick={() => updateQty(line.menuItemId, -1)}
                    disabled={pending}
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="w-6 text-center text-sm tabular-nums">
                    {line.qty}
                  </span>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="outline"
                    onClick={() => updateQty(line.menuItemId, 1)}
                    disabled={pending || line.qty >= 99}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant={line.rush ? "destructive" : "outline"}
                    className="gap-1"
                    onClick={() => toggleRush(line.menuItemId)}
                    disabled={pending}
                  >
                    <Zap className="size-3" />
                    Rush
                  </Button>
                  <span className="ml-auto text-sm tabular-nums">
                    {formatPrice(String(Number(line.unitPrice) * line.qty))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Separator className="my-3" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">New lines</span>
          <span className="font-medium tabular-nums">
            {formatPrice(cartTotal.toFixed(2))}
          </span>
        </div>
        <Button
          className="mt-4 h-11 w-full"
          disabled={pending || !canSubmit}
          onClick={onSubmit}
        >
          {submitLabel}
        </Button>
      </aside>
    </div>
  );
}
