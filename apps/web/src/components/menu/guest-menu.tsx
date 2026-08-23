"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Minus,
  Plus,
  ShoppingBag,
  HandHelping,
  Receipt,
  Trash2,
} from "lucide-react";
import {
  createGuestServiceRequest,
  submitGuestOrder,
} from "@/app/actions/guest";
import { RESTAURANT_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type GuestCategory = {
  id: string;
  name: string;
};

export type GuestMenuItem = {
  id: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  isAvailable: boolean;
  categoryId: string;
};

type CartLine = {
  menuItemId: string;
  name: string;
  unitPrice: string;
  qty: number;
};

type GuestMenuProps = {
  table: {
    qrSlug: string;
    label: string;
    status: "AVAILABLE" | "OCCUPIED" | "BILLING";
  };
  categories: GuestCategory[];
  menuItems: GuestMenuItem[];
};

function formatPrice(price: string) {
  const n = Number(price);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : price;
}

export function GuestMenu({ table, categories, menuItems }: GuestMenuProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [pending, startTransition] = useTransition();

  const billingLocked = table.status === "BILLING";
  const categoriesWithItems = useMemo(() => {
    const ids = new Set(menuItems.map((i) => i.categoryId));
    return categories.filter((c) => ids.has(c.id));
  }, [categories, menuItems]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, GuestMenuItem[]>();
    for (const item of menuItems) {
      const list = map.get(item.categoryId) ?? [];
      list.push(item);
      map.set(item.categoryId, list);
    }
    return map;
  }, [menuItems]);

  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const cartTotal = cart.reduce(
    (sum, line) => sum + Number(line.unitPrice) * line.qty,
    0,
  );

  function addToCart(item: GuestMenuItem) {
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

  function submitCart() {
    if (cart.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    startTransition(async () => {
      const result = await submitGuestOrder({
        qrSlug: table.qrSlug,
        items: cart.map((line) => ({
          menuItemId: line.menuItemId,
          qty: line.qty,
        })),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Order sent");
      setCart([]);
      setCartOpen(false);
    });
  }

  function sendService(type: "CALL_WAITER" | "REQUEST_BILL") {
    startTransition(async () => {
      const result = await createGuestServiceRequest({
        qrSlug: table.qrSlug,
        type,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Sent");
    });
  }

  return (
    <div className="min-h-dvh bg-background text-foreground pb-24">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-lg px-4 pb-3 pt-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-heading text-3xl leading-none tracking-tight text-primary">
                {RESTAURANT_NAME}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Table {table.label}
              </p>
            </div>
            <Dialog open={cartOpen} onOpenChange={setCartOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="relative gap-1.5"
                  disabled={billingLocked}
                >
                  <ShoppingBag className="size-4" />
                  Cart
                  {cartCount > 0 ? (
                    <Badge className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full px-1 tabular-nums">
                      {cartCount}
                    </Badge>
                  ) : null}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Your order</DialogTitle>
                  <DialogDescription>
                    Items go to the kitchen as soon as you send.
                  </DialogDescription>
                </DialogHeader>
                {cart.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Tap + on menu items to add them here.
                  </p>
                ) : (
                  <>
                    <ul className="mt-4 max-h-52 space-y-3 overflow-y-auto">
                      {cart.map((line) => (
                        <li key={line.menuItemId} className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">{line.name}</p>
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
                            <span className="ml-auto text-sm tabular-nums">
                              {formatPrice(
                                String(Number(line.unitPrice) * line.qty),
                              )}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <Separator className="my-4" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium tabular-nums">
                        {formatPrice(cartTotal.toFixed(2))}
                      </span>
                    </div>
                    <Button
                      className="mt-4 h-11 w-full"
                      disabled={pending}
                      onClick={submitCart}
                    >
                      {pending ? "Sending…" : "Send to kitchen"}
                    </Button>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
          {billingLocked ? (
            <p className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              This table is closing out — ask your waiter if you need anything.
            </p>
          ) : (
            <p className="mt-3 rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-sm leading-snug text-foreground/90">
              Order from your phone — we&apos;ll fire it to the kitchen. Need
              help? Call your waiter or request the bill below.
            </p>
          )}
        </div>

        {categoriesWithItems.length > 0 ? (
          <nav
            aria-label="Menu categories"
            className="overflow-x-auto border-t border-border/60"
          >
            <ul className="mx-auto flex max-w-lg gap-1 px-3 py-2">
              {categoriesWithItems.map((category) => (
                <li key={category.id} className="shrink-0">
                  <a
                    href={`#category-${category.id}`}
                    className="inline-flex rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {category.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto max-w-lg px-4 pb-6 pt-6">
        {categoriesWithItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
            <p className="font-heading text-2xl">Menu coming soon</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask your waiter about tonight&apos;s offerings.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {categoriesWithItems.map((category) => (
              <section
                key={category.id}
                id={`category-${category.id}`}
                className="scroll-mt-36"
              >
                <h2 className="font-heading text-2xl tracking-tight">
                  {category.name}
                </h2>
                <ul className="mt-4 divide-y divide-border/70">
                  {(itemsByCategory.get(category.id) ?? []).map((item) => {
                    const unavailable = !item.isAvailable;
                    return (
                      <li
                        key={item.id}
                        className={cn(
                          "flex gap-3 py-4",
                          unavailable && "opacity-55",
                        )}
                      >
                        <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium leading-snug">
                              {item.name}
                            </h3>
                            <p className="shrink-0 text-sm font-medium tabular-nums text-primary">
                              {formatPrice(item.price)}
                            </p>
                          </div>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {item.description}
                          </p>
                          {unavailable ? (
                            <Badge
                              variant="outline"
                              className="mt-2 rounded-md"
                            >
                              Unavailable
                            </Badge>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="mt-2 h-8 gap-1"
                              disabled={billingLocked || pending}
                              onClick={() => addToCart(item)}
                            >
                              <Plus className="size-3.5" />
                              Add
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg gap-2 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-1.5"
            disabled={pending}
            onClick={() => sendService("CALL_WAITER")}
          >
            <HandHelping className="size-4" />
            Call waiter
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-1.5"
            disabled={pending || billingLocked}
            onClick={() => sendService("REQUEST_BILL")}
          >
            <Receipt className="size-4" />
            Request bill
          </Button>
        </div>
      </footer>
    </div>
  );
}
