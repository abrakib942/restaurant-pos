"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { generateBill, markBillPaid } from "@/app/actions/service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type CheckoutLine = {
  id: string;
  name: string;
  qty: number;
  unitPrice: string;
  status: string;
};

type CheckoutScreenProps = {
  table: {
    id: string;
    label: string;
    status: "AVAILABLE" | "OCCUPIED" | "BILLING";
  };
  order: {
    id: string;
    status: "OPEN" | "BILLING" | "PAID";
  } | null;
  lines: CheckoutLine[];
  bill: {
    subtotal: string;
    discount: string;
    total: string;
    paidAt: string | null;
  } | null;
};

function formatPrice(value: number | string) {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : String(value);
}

export function CheckoutScreen({
  table,
  order,
  lines,
  bill,
}: CheckoutScreenProps) {
  const router = useRouter();
  const [discount, setDiscount] = useState(bill?.discount ?? "0");
  const [pending, startTransition] = useTransition();

  const subtotal = useMemo(
    () =>
      lines.reduce((sum, line) => sum + Number(line.unitPrice) * line.qty, 0),
    [lines],
  );

  const discountNum = Number(discount) || 0;
  const previewTotal = Math.max(0, subtotal - Math.min(discountNum, subtotal));

  if (!order || lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <p className="font-heading text-2xl">Nothing to bill</p>
        <p className="text-sm text-muted-foreground">
          Start an order from the POS first.
        </p>
        <Button asChild variant="outline">
          <Link href={`/waiter/tables/${table.id}`}>Back to POS</Link>
        </Button>
      </div>
    );
  }

  function onGenerate() {
    startTransition(async () => {
      const result = await generateBill({
        tableId: table.id,
        discount,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Bill generated");
      router.refresh();
    });
  }

  function onPay() {
    startTransition(async () => {
      const result = await markBillPaid(table.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Paid");
      router.push("/waiter");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 px-2">
          <Link href={`/waiter/tables/${table.id}`}>
            <ArrowLeft className="size-4" />
            POS
          </Link>
        </Button>
        <h1 className="font-heading text-3xl tracking-tight">
          Checkout · {table.label}
        </h1>
        <Badge variant="secondary" className="rounded-md capitalize">
          {order.status.toLowerCase()}
        </Badge>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Order</CardTitle>
          <CardDescription>
            {lines.length} line{lines.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {lines.map((line) => (
            <div
              key={line.id}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {line.qty}× {line.name}
                </p>
                <p className="text-xs capitalize text-muted-foreground">
                  {line.status.toLowerCase().replaceAll("_", " ")}
                </p>
              </div>
              <p className="tabular-nums">
                {formatPrice(Number(line.unitPrice) * line.qty)}
              </p>
            </div>
          ))}
          <Separator className="my-3" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">
              {formatPrice(bill ? bill.subtotal : subtotal)}
            </span>
          </div>
          {bill ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="tabular-nums">
                  −{formatPrice(bill.discount)}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span className="tabular-nums text-primary">
                  {formatPrice(bill.total)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2 pt-2">
                <Label htmlFor="discount">Discount (USD)</Label>
                <Input
                  id="discount"
                  inputMode="decimal"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span className="tabular-nums text-primary">
                  {formatPrice(previewTotal)}
                </span>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row">
          {order.status === "OPEN" ? (
            <Button className="w-full" disabled={pending} onClick={onGenerate}>
              {pending ? "Generating…" : "Generate bill"}
            </Button>
          ) : null}
          {order.status === "BILLING" && !bill?.paidAt ? (
            <Button className="w-full" disabled={pending} onClick={onPay}>
              {pending ? "Recording…" : "Mark paid"}
            </Button>
          ) : null}
          {bill?.paidAt ? (
            <p className="w-full text-center text-sm text-muted-foreground">
              Paid — table is available again.
            </p>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  );
}
