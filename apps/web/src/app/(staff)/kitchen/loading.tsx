export default function KitchenLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 animate-pulse">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-9 w-28 rounded-md bg-muted" />
          <div className="h-4 w-48 rounded-md bg-muted" />
        </div>
        <div className="h-8 w-32 rounded-md bg-muted" />
      </div>
      <div className="flex flex-col gap-3 md:flex-row">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="min-h-72 flex-1 rounded-lg border border-border bg-muted/30 md:min-h-[28rem]"
          />
        ))}
      </div>
    </div>
  );
}
