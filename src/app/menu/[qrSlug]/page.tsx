import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RESTAURANT_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";

type MenuPageProps = {
  params: Promise<{ qrSlug: string }>;
};

async function getTableMenu(qrSlug: string) {
  const table = await prisma.table.findUnique({
    where: { qrSlug },
  });
  if (!table) return null;

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });

  return { table, categories };
}

export async function generateMetadata({
  params,
}: MenuPageProps): Promise<Metadata> {
  const { qrSlug } = await params;
  const table = await prisma.table.findUnique({
    where: { qrSlug },
    select: { label: true },
  });

  if (!table) {
    return { title: `Menu · ${RESTAURANT_NAME}` };
  }

  return {
    title: `Table ${table.label} · ${RESTAURANT_NAME}`,
    description: `Browse the ${RESTAURANT_NAME} menu for table ${table.label}.`,
  };
}

function formatPrice(price: { toFixed: (digits: number) => string } | string) {
  const value =
    typeof price === "string" ? Number(price) : Number(price.toFixed(2));
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : String(price);
}

export default async function PublicMenuPage({ params }: MenuPageProps) {
  const { qrSlug } = await params;
  const data = await getTableMenu(qrSlug);
  if (!data) notFound();

  const { table, categories } = data;
  const categoriesWithItems = categories.filter((c) => c.items.length > 0);

  return (
    <div className="min-h-dvh bg-background text-foreground">
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
          </div>
          <p className="mt-3 rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-sm leading-snug text-foreground/90">
            Please tell your waiter what you&apos;d like to order.
          </p>
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

      <main className="mx-auto max-w-lg px-4 pb-16 pt-6">
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
                  {category.items.map((item) => {
                    const unavailable = !item.isAvailable;
                    return (
                      <li
                        key={item.id}
                        className={`flex gap-3 py-4 ${unavailable ? "opacity-55" : ""}`}
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
                          ) : null}
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

      <footer className="border-t border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
        {RESTAURANT_NAME} · menu view only
      </footer>
    </div>
  );
}
