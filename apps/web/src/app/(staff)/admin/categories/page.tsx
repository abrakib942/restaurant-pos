import { CategoriesManager } from "@/components/admin/categories-manager";
import { prisma } from "@/lib/prisma";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">Categories</h1>
        <p className="mt-2 text-muted-foreground">
          Organize the menu for the floor and guest QR view.
        </p>
      </div>
      <CategoriesManager
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          sortOrder: category.sortOrder,
          itemCount: category._count.items,
        }))}
      />
    </div>
  );
}
