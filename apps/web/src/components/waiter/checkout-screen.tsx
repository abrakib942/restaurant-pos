"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  MessageCircle,
  Printer,
  Scissors,
} from "lucide-react";
import { generateBill, markBillPaid } from "@/app/actions/service";
import { splitOrderItems } from "@/app/actions/floor-ops";
import {
  computeBillTotals,
  DEFAULT_TAX_RATE,
  parseMoneyInput,
  parseTaxRatePercent,
} from "@/lib/billing";
import {
  buildReceiptData,
  formatReceiptText,
  receiptMailtoUrl,
  receiptWhatsAppUrl,
} from "@/lib/receipt";
import { RESTAURANT_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  voided?: boolean;
};

export type CheckoutCheck = {
  id: string;
  label: string;
  status: "OPEN" | "BILLING" | "PAID";
};

type CheckoutScreenProps = {
  table: {
    id: string;
    label: string;
    status: "AVAILABLE" | "OCCUPIED" | "BILLING";
  };
  checks: CheckoutCheck[];
  order: {
    id: string;
    status: "OPEN" | "BILLING" | "PAID";
  } | null;
  lines: CheckoutLine[];
  bill: {
    subtotal: string;
    discount: string;
    tax: string;
    tip: string;
    total: string;
    paymentMethod: "CASH" | "CARD" | "OTHER" | null;
    paidAt: string | null;
  } | null;
};

function formatPrice(value: number | string) {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : String(value);
}

const DEFAULT_TAX_PERCENT = (DEFAULT_TAX_RATE * 100).toFixed(3);

export function CheckoutScreen({
  table,
  checks,
  order,
  lines,
  bill,
}: CheckoutScreenProps) {
  const router = useRouter();
  const [discount, setDiscount] = useState(bill?.discount ?? "0");
  const [taxRatePercent, setTaxRatePercent] = useState(DEFAULT_TAX_PERCENT);
  const [tip, setTip] = useState(bill?.tip ?? "0");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "OTHER">(
    bill?.paymentMethod ?? "CARD",
  );
  const [splitIds, setSplitIds] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const billableLines = useMemo(
    () => lines.filter((line) => !line.voided),
    [lines],
  );

  const subtotal = useMemo(
    () =>
      billableLines.reduce(
        (sum, line) => sum + Number(line.unitPrice) * line.qty,
        0,
      ),
    [billableLines],
  );

  const preview = useMemo(() => {
    const discountNum = parseMoneyInput(discount) ?? 0;
    const rate = parseTaxRatePercent(taxRatePercent) ?? DEFAULT_TAX_RATE;
    const tipNum = parseMoneyInput(tip || "0") ?? 0;
    return computeBillTotals({
      subtotal,
      discount: discountNum,
      taxRate: rate,
      tip: tipNum,
    });
  }, [subtotal, discount, taxRatePercent, tip]);

  const receiptText = useMemo(() => {
    if (!bill) return "";
    return formatReceiptText(
      buildReceiptData({
        tableLabel: table.label,
        lines: lines.map((l) => ({
          qty: l.qty,
          name: l.name,
          unitPrice: Number(l.unitPrice),
        })),
        subtotal: Number(bill.subtotal),
        discount: Number(bill.discount),
        tax: Number(bill.tax),
        tip: Number(bill.tip),
        total: Number(bill.total),
        paymentMethod: bill.paymentMethod,
        paidAt: bill.paidAt ? new Date(bill.paidAt) : null,
      }),
    );
  }, [bill, table.label, lines]);

  if (!order || billableLines.length === 0) {
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
    if (!order) return;
    startTransition(async () => {
      const result = await generateBill({
        tableId: table.id,
        orderId: order.id,
        discount,
        taxRatePercent,
        tip: tip || "0",
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
    if (!order) return;
    startTransition(async () => {
      const result = await markBillPaid({
        tableId: table.id,
        orderId: order.id,
        paymentMethod,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Paid");
      router.push("/waiter");
      router.refresh();
    });
  }

  function onSplit() {
    if (!order || splitIds.length === 0) return;
    startTransition(async () => {
      const result = await splitOrderItems({
        tableId: table.id,
        orderId: order.id,
        itemIds: splitIds,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Check split");
      setSplitIds([]);
      if (result.newOrderId) {
        router.push(
          `/waiter/tables/${table.id}/checkout?orderId=${result.newOrderId}`,
        );
      }
      router.refresh();
    });
  }

  function toggleSplit(id: string) {
    setSplitIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function onPrint() {
    window.print();
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
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

      {checks.length > 1 ? (
        <div className="flex flex-wrap gap-2 print:hidden">
          {checks.map((check) => (
            <Button
              key={check.id}
              asChild
              size="sm"
              variant={order?.id === check.id ? "default" : "outline"}
            >
              <Link
                href={`/waiter/tables/${table.id}/checkout?orderId=${check.id}`}
              >
                {check.label}
                <span className="ml-1.5 capitalize opacity-70">
                  {check.status.toLowerCase()}
                </span>
              </Link>
            </Button>
          ))}
        </div>
      ) : null}

      <Card className="shadow-none print:border-0 print:shadow-none">
        <CardHeader className="print:pb-2">
          <CardTitle className="print:text-xl">{RESTAURANT_NAME}</CardTitle>
          <CardDescription className="print:text-foreground">
            Table {table.label} · {billableLines.length} line
            {billableLines.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {lines.map((line) => (
            <div
              key={line.id}
              className="flex items-start justify-between gap-3 text-sm print:text-base"
            >
              <div className="flex min-w-0 items-start gap-2">
                {order?.status === "OPEN" &&
                billableLines.length >= 2 &&
                !bill &&
                !line.voided ? (
                  <input
                    type="checkbox"
                    className="mt-1 print:hidden"
                    checked={splitIds.includes(line.id)}
                    onChange={() => toggleSplit(line.id)}
                    disabled={pending}
                  />
                ) : null}
                <div>
                  <p
                    className={
                      line.voided
                        ? "font-medium text-muted-foreground line-through"
                        : "font-medium"
                    }
                  >
                    {line.qty}× {line.name}
                    {line.voided ? (
                      <span className="ml-2 text-xs font-normal no-underline">
                        (voided)
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs capitalize text-muted-foreground print:hidden">
                    {line.status.toLowerCase().replaceAll("_", " ")}
                  </p>
                </div>
              </div>
              <p
                className={
                  line.voided
                    ? "tabular-nums text-muted-foreground line-through"
                    : "tabular-nums"
                }
              >
                {formatPrice(Number(line.unitPrice) * line.qty)}
              </p>
            </div>
          ))}
          {order?.status === "OPEN" && billableLines.length >= 2 && !bill ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 gap-1.5 print:hidden"
              disabled={pending || splitIds.length === 0}
              onClick={onSplit}
            >
              <Scissors className="size-4" />
              Split selected to new check
            </Button>
          ) : null}
          <Separator className="my-3" />
          {bill ? (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">
                  {formatPrice(bill.subtotal)}
                </span>
              </div>
              {Number(bill.discount) > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="tabular-nums">
                    −{formatPrice(bill.discount)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="tabular-nums">{formatPrice(bill.tax)}</span>
              </div>
              {Number(bill.tip) > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tip</span>
                  <span className="tabular-nums">{formatPrice(bill.tip)}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span className="tabular-nums text-primary">
                  {formatPrice(bill.total)}
                </span>
              </div>
              {bill.paymentMethod ? (
                <p className="pt-1 text-sm capitalize text-muted-foreground">
                  Paid · {bill.paymentMethod.toLowerCase()}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">
                  {formatPrice(preview.subtotal)}
                </span>
              </div>
              <div className="grid gap-3 pt-2 print:hidden sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount</Label>
                  <Input
                    id="discount"
                    inputMode="decimal"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    disabled={pending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax %</Label>
                  <Input
                    id="taxRate"
                    inputMode="decimal"
                    value={taxRatePercent}
                    onChange={(e) => setTaxRatePercent(e.target.value)}
                    disabled={pending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tip">Tip</Label>
                  <Input
                    id="tip"
                    inputMode="decimal"
                    value={tip}
                    onChange={(e) => setTip(e.target.value)}
                    disabled={pending}
                    placeholder="0.00"
                  />
                </div>
              </div>
              {preview.discount > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="tabular-nums">
                    −{formatPrice(preview.discount)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span className="tabular-nums">{formatPrice(preview.tax)}</span>
              </div>
              {preview.tip > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tip</span>
                  <span className="tabular-nums">
                    {formatPrice(preview.tip)}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span className="tabular-nums text-primary">
                  {formatPrice(preview.total)}
                </span>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 print:hidden">
          {order.status === "OPEN" ? (
            <Button className="w-full" disabled={pending} onClick={onGenerate}>
              {pending ? "Generating…" : "Generate bill"}
            </Button>
          ) : null}
          {order.status === "BILLING" && !bill?.paidAt ? (
            <>
              <div className="w-full space-y-2">
                <Label htmlFor="paymentMethod">Payment method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) =>
                    setPaymentMethod(v as "CASH" | "CARD" | "OTHER")
                  }
                >
                  <SelectTrigger id="paymentMethod" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" disabled={pending} onClick={onPay}>
                {pending ? "Recording…" : "Mark paid"}
              </Button>
            </>
          ) : null}
          {bill && !bill.paidAt ? (
            <div className="flex w-full flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={onPrint}
              >
                <Printer className="size-4" />
                Print
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <a href={receiptMailtoUrl(receiptText)}>
                  <Mail className="size-4" />
                  Email
                </a>
              </Button>
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <a
                  href={receiptWhatsAppUrl(receiptText)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4" />
                  WhatsApp
                </a>
              </Button>
            </div>
          ) : null}
          {bill?.paidAt ? (
            <p className="w-full text-center text-sm text-muted-foreground">
              Paid — table is available again.
            </p>
          ) : null}
        </CardFooter>
      </Card>

      {bill && !bill.paidAt ? (
        <pre className="hidden whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs print:block">
          {receiptText}
        </pre>
      ) : null}
    </div>
  );
}
