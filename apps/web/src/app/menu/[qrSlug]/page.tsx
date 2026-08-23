import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuestMenu } from "@/components/menu/guest-menu";
import { RESTAURANT_NAME } from "@/lib/constants";
import { serverApiData } from "@/lib/server-api";

type MenuPageProps = {
  params: Promise<{ qrSlug: string }>;
};

type GuestMenuData = {
  table: {
    qrSlug: string;
    label: string;
    status: "AVAILABLE" | "OCCUPIED" | "BILLING";
  };
  categories: { id: string; name: string }[];
  menuItems: {
    id: string;
    name: string;
    description: string;
    price: string;
    imageUrl: string;
    isAvailable: boolean;
    categoryId: string;
  }[];
};

export async function generateMetadata({
  params,
}: MenuPageProps): Promise<Metadata> {
  const { qrSlug } = await params;
  const data = await serverApiData<GuestMenuData>(`/guest/menu/${qrSlug}`);

  if (!data) {
    return { title: `Menu · ${RESTAURANT_NAME}` };
  }

  return {
    title: `Table ${data.table.label} · ${RESTAURANT_NAME}`,
    description: `Order from the ${RESTAURANT_NAME} menu for table ${data.table.label}.`,
  };
}

export default async function PublicMenuPage({ params }: MenuPageProps) {
  const { qrSlug } = await params;
  const data = await serverApiData<GuestMenuData>(`/guest/menu/${qrSlug}`);
  if (!data) notFound();

  return (
    <GuestMenu
      table={data.table}
      categories={data.categories}
      menuItems={data.menuItems}
    />
  );
}
