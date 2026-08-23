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

  const [categories, menuItems, openOrders, allTables, waiters] =
    await Promise.all([
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
      prisma.order.findMany({
        where: { tableId: table.id, status: "OPEN" },
        include: {
          items: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.table.findMany({
        orderBy: { label: "asc" },
        include: {
          orders: {
            where: { status: "OPEN" },
            take: 1,
            select: { id: true },
          },
        },
      }),
      prisma.user.findMany({
        where: { role: "WAITER" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);

  const activeOrder = await prisma.order.findFirst({
    where: {
      tableId: table.id,
      status: { in: ["OPEN", "BILLING"] },
    },
    select: { id: true, waiterId: true },
    orderBy: { createdAt: "asc" },
  });

  const existingLines = openOrders.flatMap((order) => order.items);

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
      existingLines={existingLines.map((item) => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        unitPrice: item.unitPrice.toFixed(2),
        status: item.status,
      }))}
      floorOps={{
        hasActiveOrder: !!activeOrder,
        currentWaiterId: activeOrder?.waiterId ?? null,
        tables: allTables.map((t) => ({
          id: t.id,
          label: t.label,
          status: t.status,
          hasOpenOrder: t.orders.length > 0,
        })),
        waiters,
      }}
    />
  );
}
