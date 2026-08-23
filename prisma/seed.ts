import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

function unsplash(id: string) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;
}

const users = [
  { name: "Amelia Reed", username: "admin", pin: "1111", role: Role.ADMIN },
  { name: "Maya Chen", username: "maya", pin: "2222", role: Role.WAITER },
  { name: "Julian Ortiz", username: "julian", pin: "3333", role: Role.WAITER },
  { name: "Kenji Sato", username: "kenji", pin: "4444", role: Role.KITCHEN },
];

const menu = [
  {
    name: "Small Plates",
    sortOrder: 1,
    items: [
      {
        name: "Charred Octopus",
        description: "Fennel pollen, lemon, smoked paprika oil.",
        price: "18.00",
        imageUrl: unsplash("1559339352-11d035aa65de"),
        sortOrder: 1,
      },
      {
        name: "Bone Marrow Toast",
        description: "Grilled sourdough, parsley salad, sea salt.",
        price: "16.00",
        imageUrl: unsplash("1482049016688-2d3e1b311543"),
        sortOrder: 2,
      },
      {
        name: "Whipped Ricotta",
        description: "Hot honey, cracked pepper, grilled bread.",
        price: "14.00",
        imageUrl: unsplash("1488477181946-6428a0291777"),
        sortOrder: 3,
      },
      {
        name: "Smoked Almonds",
        description: "Rosemary, chile, finishing salt.",
        price: "8.00",
        imageUrl: unsplash("1508061253366-f7da158b6d46"),
        sortOrder: 4,
        isAvailable: false,
      },
      {
        name: "Beef Tartare",
        description: "Cured yolk, capers, rye crumbs.",
        price: "19.00",
        imageUrl: unsplash("1544025162-d76694265947"),
        sortOrder: 5,
      },
    ],
  },
  {
    name: "Wood-Fired",
    sortOrder: 2,
    items: [
      {
        name: "Heritage Chicken",
        description: "Half bird, pan drippings, grilled lemon.",
        price: "28.00",
        imageUrl: unsplash("1604908176997-125f25cc6f3d"),
        sortOrder: 1,
      },
      {
        name: "Brasa Burger",
        description: "Dry-aged beef, taleggio, onion jam, brioche.",
        price: "22.00",
        imageUrl: unsplash("1550547660-d9450f859349"),
        sortOrder: 2,
      },
      {
        name: "Dry-Aged Ribeye",
        description: "Bone-in, chimichurri, wood smoke.",
        price: "48.00",
        imageUrl: unsplash("1600891964092-4316aa2a0060"),
        sortOrder: 3,
      },
      {
        name: "Whole Branzino",
        description: "Citrus, herbs, olive oil, charred skin.",
        price: "36.00",
        imageUrl: unsplash("1519708227418-c8fd9a32b7a2"),
        sortOrder: 4,
      },
      {
        name: "Wood-Roasted Cauliflower",
        description: "Tahini, pomegranate, toasted seeds.",
        price: "19.00",
        imageUrl: unsplash("1512621776951-a57141f2eefd"),
        sortOrder: 5,
      },
    ],
  },
  {
    name: "Greens & Sides",
    sortOrder: 3,
    items: [
      {
        name: "Little Gem Salad",
        description: "Anchovy dressing, breadcrumbs, pecorino.",
        price: "14.00",
        imageUrl: unsplash("1540189549336-e6e99c3679fe"),
        sortOrder: 1,
      },
      {
        name: "Charred Broccolini",
        description: "Garlic, chili, lemon zest.",
        price: "12.00",
        imageUrl: unsplash("1628773927403-6462f43b2d2a"),
        sortOrder: 2,
      },
      {
        name: "Duck Fat Potatoes",
        description: "Crisp edges, rosemary, flaky salt.",
        price: "11.00",
        imageUrl: unsplash("1518013431420-2418468c0d22"),
        sortOrder: 3,
      },
      {
        name: "Grilled Sourdough",
        description: "Cultured butter, sea salt.",
        price: "7.00",
        imageUrl: unsplash("1509440159596-0249088772ff"),
        sortOrder: 4,
      },
      {
        name: "Citrus Fennel Slaw",
        description: "Orange, olive oil, cracked pepper.",
        price: "10.00",
        imageUrl: unsplash("1490474418585-ba9bad8fd0ea"),
        sortOrder: 5,
        isAvailable: false,
      },
    ],
  },
  {
    name: "Sweets",
    sortOrder: 4,
    items: [
      {
        name: "Olive Oil Cake",
        description: "Citrus syrup, whipped cream.",
        price: "12.00",
        imageUrl: unsplash("1578985545062-69928b1d9587"),
        sortOrder: 1,
      },
      {
        name: "Burnt Basque Cheesecake",
        description: "Vanilla bean, caramelized top.",
        price: "13.00",
        imageUrl: unsplash("1565958011703-44f9829ba187"),
        sortOrder: 2,
      },
      {
        name: "Dark Chocolate Pot",
        description: "Sea salt, olive oil, cacao nibs.",
        price: "11.00",
        imageUrl: unsplash("1541783245831-57d6fb0926d3"),
        sortOrder: 3,
      },
      {
        name: "Affogato",
        description: "Vanilla gelato, espresso.",
        price: "9.00",
        imageUrl: unsplash("1495474472287-4d71bcdd2085"),
        sortOrder: 4,
      },
      {
        name: "Seasonal Crostata",
        description: "Buttery crust, tonight's fruit.",
        price: "12.00",
        imageUrl: unsplash("1464305795204-46e049a3d71a"),
        sortOrder: 5,
      },
    ],
  },
  {
    name: "Bar",
    sortOrder: 5,
    items: [
      {
        name: "House Negroni",
        description: "Gin, vermouth, bitter, orange.",
        price: "14.00",
        imageUrl: unsplash("1514362545857-3bc16c4c7d1b"),
        sortOrder: 1,
      },
      {
        name: "Smoked Old Fashioned",
        description: "Bourbon, demerara, orange oil.",
        price: "16.00",
        imageUrl: unsplash("1470337458703-46ad1756a187"),
        sortOrder: 2,
      },
      {
        name: "Skin-Contact Pour",
        description: "Orange wine, by the glass.",
        price: "13.00",
        imageUrl: unsplash("1510812430274-5e88e73bdc38"),
        sortOrder: 3,
      },
      {
        name: "Sparkling Water",
        description: "Bottle, citrus.",
        price: "5.00",
        imageUrl: unsplash("1548835322-f44070cd50c6"),
        sortOrder: 4,
      },
      {
        name: "Cold Brew",
        description: "House concentrate, served over ice.",
        price: "6.00",
        imageUrl: unsplash("1497935586351-b67a3183aef9"),
        sortOrder: 5,
      },
    ],
  },
];

async function main() {
  await prisma.bill.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.table.deleteMany();
  await prisma.user.deleteMany();

  for (const user of users) {
    await prisma.user.create({
      data: {
        name: user.name,
        username: user.username,
        pinHash: await bcrypt.hash(user.pin, 10),
        role: user.role,
      },
    });
  }

  for (const category of menu) {
    await prisma.category.create({
      data: {
        name: category.name,
        sortOrder: category.sortOrder,
        items: {
          create: category.items.map((item) => ({
            name: item.name,
            description: item.description,
            price: item.price,
            imageUrl: item.imageUrl,
            sortOrder: item.sortOrder,
            isAvailable: item.isAvailable ?? true,
          })),
        },
      },
    });
  }

  await prisma.table.createMany({
    data: Array.from({ length: 10 }, (_, index) => {
      const n = index + 1;
      return {
        label: String(n),
        qrSlug: `t-${String(n).padStart(2, "0")}`,
      };
    }),
  });

  const [userCount, categoryCount, itemCount, tableCount] = await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.menuItem.count(),
    prisma.table.count(),
  ]);

  console.log("Seeded Brasa demo data:");
  console.log(
    `  users: ${userCount}, categories: ${categoryCount}, items: ${itemCount}, tables: ${tableCount}`,
  );
  console.log("Demo logins (username / PIN):");
  console.log("  admin / 1111  (ADMIN)");
  console.log("  maya  / 2222  (WAITER)");
  console.log("  julian / 3333 (WAITER)");
  console.log("  kenji / 4444  (KITCHEN)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
