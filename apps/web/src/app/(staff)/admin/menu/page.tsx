import { MenuManager } from "@/components/admin/menu-manager";
import { prisma } from "@/lib/prisma";

export default async function AdminMenuPage() {
  const [categories, items] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.menuItem.findMany({
      orderBy: [
        { category: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
      include: { category: { select: { id: true, name: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">Menu</h1>
        <p className="mt-2 text-muted-foreground">
          Single source of truth for the waiter POS and guest QR menu.
        </p>
      </div>
      <MenuManager
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
        items={items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price.toFixed(2),
          imageUrl: item.imageUrl,
          isAvailable: item.isAvailable,
          sortOrder: item.sortOrder,
          categoryId: item.categoryId,
          categoryName: item.category.name,
        }))}
      />
    </div>
  );
}
