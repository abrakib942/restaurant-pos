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
  name: string;
  qty: number;
  unitPrice: string;
  status: string;
};

type CartLine = {
  menuItemId: string;
  name: string;
  unitPrice: string;
  qty: number;
  rush: boolean;
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
  floorOps?: {
    hasActiveOrder: boolean;
    currentWaiterId: string | null;
    tables: FloorOpsTable[];
    waiters: FloorOpsWaiter[];
  };
};

function formatPrice(price: string) {
  const n = Number(price);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : price;
}

export function PosScreen({
  table,
  categories,
  menuItems,
  existingLines,
  floorOps,
}: PosScreenProps) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<string>(
    categories[0]?.id ?? "all",
  );
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pending, startTransition] = useTransition();

  const billingLocked = table.status === "BILLING";

  const visibleItems = useMemo(() => {
    if (categoryId === "all") return menuItems;
    return menuItems.filter((item) => item.categoryId === categoryId);
  }, [menuItems, categoryId]);

  const cartTotal = cart.reduce(
    (sum, line) => sum + Number(line.unitPrice) * line.qty,
    0,
  );

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
    if (cart.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    startTransition(async () => {
      try {
        const result = await apiMutate("/waiter/orders", "POST", {
          tableId: table.id,
          items: cart.map((line) => ({
            menuItemId: line.menuItemId,
            qty: line.qty,
            rush: line.rush,
          })),
        });
        toast.success(result.message ?? "Order submitted");
        setCart([]);
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof ApiClientError ? err.message : "Request failed",
        );
      }
    });
  }

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

        {existingLines.length > 0 ? (
          <div className="rounded-lg border border-border p-3">
            <p className="text-sm font-medium">Current tickets</p>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {existingLines.map((line) => (
                <li
                  key={line.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span>
                    {line.qty}× {line.name}
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
          New items send to the kitchen as Pending. Toggle Rush per line if
          needed.
        </p>
        <Separator className="my-3" />

        {cart.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Tap menu items to build this round.
          </p>
        ) : (
          <ul className="space-y-3">
            {cart.map((line) => (
              <li key={line.menuItemId} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{line.name}</p>
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
          <span className="text-muted-foreground">This round</span>
          <span className="font-medium tabular-nums">
            {formatPrice(cartTotal.toFixed(2))}
          </span>
        </div>
        <Button
          className="mt-4 h-11 w-full"
          disabled={pending || cart.length === 0 || billingLocked}
          onClick={onSubmit}
        >
          {pending ? "Sending…" : "Send to kitchen"}
        </Button>
      </aside>
    </div>
  );
}
