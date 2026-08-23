export function formatMoney(
  value: number | string | { toFixed: (digits: number) => string },
) {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number(value.toFixed(2));
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : String(value);
}
