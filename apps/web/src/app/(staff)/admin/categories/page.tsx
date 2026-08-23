import { CategoriesManager } from "@/components/admin/categories-manager";
import { serverApiData } from "@/lib/server-api";

type CategoryRow = {
  id: string;
  name: string;
  sortOrder: number;
  itemCount: number;
};

export default async function AdminCategoriesPage() {
  const categories =
    (await serverApiData<CategoryRow[]>("/admin/categories")) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">Categories</h1>
        <p className="mt-2 text-muted-foreground">
          Organize the menu for the floor and guest QR view.
        </p>
      </div>
      <CategoriesManager categories={categories} />
    </div>
  );
}
