import { MenuManager } from "@/components/admin/menu-manager";
import { serverApiData } from "@/lib/server-api";

type MenuPageData = {
  categories: { id: string; name: string }[];
  items: {
    id: string;
    name: string;
    description: string;
    price: string;
    imageUrl: string;
    isAvailable: boolean;
    sortOrder: number;
    categoryId: string;
    categoryName: string;
  }[];
};

export default async function AdminMenuPage() {
  const data =
    (await serverApiData<MenuPageData>("/admin/menu")) ?? {
      categories: [],
      items: [],
    };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl tracking-tight">Menu</h1>
        <p className="mt-2 text-muted-foreground">
          Single source of truth for the waiter POS and guest QR menu.
        </p>
      </div>
      <MenuManager categories={data.categories} items={data.items} />
    </div>
  );
}
