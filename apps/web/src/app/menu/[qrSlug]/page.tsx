import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuestMenu } from "@/components/menu/guest-menu";
import { RESTAURANT_NAME } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

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
        where: { isAvailable: true },
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
    description: `Order from the ${RESTAURANT_NAME} menu for table ${table.label}.`,
  };
}

export default async function PublicMenuPage({ params }: MenuPageProps) {
  const { qrSlug } = await params;
  const data = await getTableMenu(qrSlug);
  if (!data) notFound();

  const { table, categories } = data;

  const menuItems = categories.flatMap((category) =>
    category.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price.toFixed(2),
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      categoryId: category.id,
    })),
  );

  return (
    <GuestMenu
      table={{
        qrSlug: table.qrSlug,
        label: table.label,
        status: table.status,
      }}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      menuItems={menuItems}
    />
  );
}
