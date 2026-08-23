import { notFound } from "next/navigation";
import { PosScreen } from "@/components/waiter/pos-screen";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PosPageProps = {
  params: Promise<{ tableId: string }>;
};

export default async function WaiterPosPage({ params }: PosPageProps) {
  await requireRole("WAITER");
  const { tableId } = await params;

  const table = await prisma.table.findUnique({
    where: { id: tableId },
  });
  if (!table) notFound();

  const [categories, menuItems, openOrder] = await Promise.all([
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
    prisma.order.findFirst({
      where: { tableId: table.id, status: "OPEN" },
      include: {
        items: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <PosScreen
      table={{
        id: table.id,
        label: table.label,
        status: table.status,
      }}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
      }))}
      menuItems={menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price.toFixed(2),
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable,
        categoryId: item.categoryId,
        categoryName: item.category.name,
      }))}
      existingLines={
        openOrder?.items.map((item) => ({
          id: item.id,
          name: item.name,
          qty: item.qty,
          unitPrice: item.unitPrice.toFixed(2),
          status: item.status,
        })) ?? []
      }
    />
  );
}
