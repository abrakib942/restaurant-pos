import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../generated/client";
import { courseForCategoryName, computeBillTotals } from "./seed-helpers";

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

const kitchenStations = [
  { name: "Grill", sortOrder: 1 },
  { name: "Cold", sortOrder: 2 },
  { name: "Bar", sortOrder: 3 },
  { name: "Dessert", sortOrder: 4 },
] as const;

const categoryStationNames: Record<string, string> = {
  "Small Plates": "Cold",
  "Wood-Fired": "Grill",
  "Greens & Sides": "Cold",
  Sweets: "Dessert",
  Bar: "Bar",
};

async function main() {
  await prisma.bill.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.kitchenFire.deleteMany();
  await prisma.order.deleteMany();
  await prisma.serviceRequest.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.kitchenStation.deleteMany();
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

  for (const station of kitchenStations) {
    await prisma.kitchenStation.create({ data: station });
  }

  const stationsByName = Object.fromEntries(
    (await prisma.kitchenStation.findMany()).map((s) => [s.name, s.id]),
  );

  for (const category of menu) {
    const stationName = categoryStationNames[category.name];
    await prisma.category.create({
      data: {
        name: category.name,
        sortOrder: category.sortOrder,
        stationId: stationName ? stationsByName[stationName] : undefined,
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

  const categories = await prisma.category.findMany();
  const categoryMeta = new Map(
    categories.map((c) => [
      c.name,
      {
        stationId: c.stationId,
        course: courseForCategoryName(c.name),
      },
    ]),
  );

  const itemMeta = (menuItem: {
    id: string;
    name: string;
    categoryId: string;
  }) => {
    const category = categories.find((c) => c.id === menuItem.categoryId);
    const meta = category ? categoryMeta.get(category.name) : undefined;
    return {
      stationId: meta?.stationId ?? null,
      course: meta?.course ?? 2,
    };
  };

  await prisma.table.createMany({
    data: Array.from({ length: 10 }, (_, index) => {
      const n = index + 1;
      return {
        label: String(n),
        qrSlug: `t-${String(n).padStart(2, "0")}`,
      };
    }),
  });

  const maya = await prisma.user.findUniqueOrThrow({
    where: { username: "maya" },
  });
  const julian = await prisma.user.findUniqueOrThrow({
    where: { username: "julian" },
  });
  const tables = await prisma.table.findMany({
    orderBy: { label: "asc" },
  });
  const items = await prisma.menuItem.findMany({
    where: { isAvailable: true },
    orderBy: { name: "asc" },
  });

  const byName = (name: string) => {
    const found = items.find((i) => i.name === name);
    if (!found) throw new Error(`Missing menu item: ${name}`);
    return found;
  };

  const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);
  const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);

  // Paid checks from earlier today → admin dashboard sales / top items
  const paidSpecs = [
    {
      table: tables[0]!,
      waiterId: maya.id,
      paidAt: hoursAgo(3),
      lines: [
        { item: byName("Heritage Chicken"), qty: 2 },
        { item: byName("Little Gem Salad"), qty: 1 },
        { item: byName("Skin-Contact Pour"), qty: 2 },
      ],
      discount: "0",
    },
    {
      table: tables[1]!,
      waiterId: julian.id,
      paidAt: hoursAgo(2),
      lines: [
        { item: byName("Brasa Burger"), qty: 2 },
        { item: byName("Charred Broccolini"), qty: 1 },
        { item: byName("Smoked Old Fashioned"), qty: 2 },
      ],
      discount: "5.00",
    },
    {
      table: tables[2]!,
      waiterId: maya.id,
      paidAt: hoursAgo(1),
      lines: [
        { item: byName("Charred Octopus"), qty: 1 },
        { item: byName("Dry-Aged Ribeye"), qty: 1 },
        { item: byName("Heritage Chicken"), qty: 1 },
      ],
      discount: "0",
    },
  ] as const;

  for (const spec of paidSpecs) {
    const subtotal = spec.lines.reduce(
      (sum, line) => sum + Number(line.item.price) * line.qty,
      0,
    );
    const discount = Math.min(Number(spec.discount), subtotal);
    const totals = computeBillTotals({
      subtotal,
      discount,
      taxRate: 0.08875,
      tip: Math.round(subtotal * 0.15 * 100) / 100,
    });

    const courses = spec.lines.map((line) => itemMeta(line.item).course);
    const order = await prisma.order.create({
      data: {
        tableId: spec.table.id,
        waiterId: spec.waiterId,
        status: "PAID",
        createdAt: hoursAgo(4),
        bill: {
          create: {
            subtotal: totals.subtotal.toFixed(2),
            discount: totals.discount.toFixed(2),
            tax: totals.tax.toFixed(2),
            tip: totals.tip.toFixed(2),
            total: totals.total.toFixed(2),
            paymentMethod: "CARD",
            paidAt: spec.paidAt,
            createdAt: spec.paidAt,
          },
        },
      },
    });
    await prisma.kitchenFire.create({
      data: {
        orderId: order.id,
        tableId: spec.table.id,
        waiterId: spec.waiterId,
        priority: "NORMAL",
        courseMin: Math.min(...courses),
        createdAt: hoursAgo(4),
        startedAt: hoursAgo(3.5),
        readyAt: hoursAgo(3.2),
        items: {
          create: spec.lines.map((line) => {
            const meta = itemMeta(line.item);
            return {
              orderId: order.id,
              menuItemId: line.item.id,
              name: line.item.name,
              unitPrice: line.item.price,
              qty: line.qty,
              status: "SERVED",
              stationId: meta.stationId,
              course: meta.course,
              startedAt: hoursAgo(3.5),
              readyAt: hoursAgo(3.2),
              servedAt: hoursAgo(3),
            };
          }),
        },
      },
    });
  }

  // Live floor: table 4 occupied with kitchen tickets
  const liveTable = tables[3]!;
  await prisma.table.update({
    where: { id: liveTable.id },
    data: { status: "OCCUPIED" },
  });

  const chicken = byName("Heritage Chicken");
  const burger = byName("Brasa Burger");
  const salad = byName("Little Gem Salad");
  const cocktail = byName("Smoked Old Fashioned");

  const liveOrder1 = await prisma.order.create({
    data: {
      tableId: liveTable.id,
      waiterId: maya.id,
      status: "OPEN",
      createdAt: minutesAgo(25),
    },
  });
  // Round 1: salad ready + chicken cooking
  await prisma.kitchenFire.create({
    data: {
      orderId: liveOrder1.id,
      tableId: liveTable.id,
      waiterId: maya.id,
      priority: "NORMAL",
      courseMin: Math.min(itemMeta(salad).course, itemMeta(chicken).course),
      createdAt: minutesAgo(25),
      startedAt: minutesAgo(18),
      items: {
        create: [
          {
            orderId: liveOrder1.id,
            menuItemId: salad.id,
            name: salad.name,
            unitPrice: salad.price,
            qty: 1,
            status: "READY",
            stationId: itemMeta(salad).stationId,
            course: itemMeta(salad).course,
            startedAt: minutesAgo(18),
            readyAt: minutesAgo(8),
          },
          {
            orderId: liveOrder1.id,
            menuItemId: chicken.id,
            name: chicken.name,
            unitPrice: chicken.price,
            qty: 1,
            status: "IN_PROGRESS",
            stationId: itemMeta(chicken).stationId,
            course: itemMeta(chicken).course,
            startedAt: minutesAgo(10),
          },
        ],
      },
    },
  });
  // Round 2: rush burger + cocktail pending
  await prisma.kitchenFire.create({
    data: {
      orderId: liveOrder1.id,
      tableId: liveTable.id,
      waiterId: maya.id,
      priority: "RUSH",
      courseMin: Math.min(itemMeta(burger).course, itemMeta(cocktail).course),
      createdAt: minutesAgo(8),
      items: {
        create: [
          {
            orderId: liveOrder1.id,
            menuItemId: burger.id,
            name: burger.name,
            unitPrice: burger.price,
            qty: 1,
            status: "PENDING",
            priority: "RUSH",
            stationId: itemMeta(burger).stationId,
            course: itemMeta(burger).course,
          },
          {
            orderId: liveOrder1.id,
            menuItemId: cocktail.id,
            name: cocktail.name,
            unitPrice: cocktail.price,
            qty: 2,
            status: "PENDING",
            stationId: itemMeta(cocktail).stationId,
            course: itemMeta(cocktail).course,
          },
        ],
      },
    },
  });

  // Second open table for julian — one ready (floor-wide serve demo)
  const liveTable2 = tables[4]!;
  await prisma.table.update({
    where: { id: liveTable2.id },
    data: { status: "OCCUPIED" },
  });
  const octopus = byName("Charred Octopus");
  const ricotta = byName("Whipped Ricotta");
  const liveOrder2 = await prisma.order.create({
    data: {
      tableId: liveTable2.id,
      waiterId: julian.id,
      status: "OPEN",
      createdAt: minutesAgo(15),
    },
  });
  await prisma.kitchenFire.create({
    data: {
      orderId: liveOrder2.id,
      tableId: liveTable2.id,
      waiterId: julian.id,
      priority: "NORMAL",
      courseMin: Math.min(itemMeta(octopus).course, itemMeta(ricotta).course),
      createdAt: minutesAgo(15),
      startedAt: minutesAgo(12),
      items: {
        create: [
          {
            orderId: liveOrder2.id,
            menuItemId: octopus.id,
            name: octopus.name,
            unitPrice: octopus.price,
            qty: 1,
            status: "READY",
            stationId: itemMeta(octopus).stationId,
            course: itemMeta(octopus).course,
            startedAt: minutesAgo(12),
            readyAt: minutesAgo(4),
          },
          {
            orderId: liveOrder2.id,
            menuItemId: ricotta.id,
            name: ricotta.name,
            unitPrice: ricotta.price,
            qty: 1,
            status: "PENDING",
            stationId: itemMeta(ricotta).stationId,
            course: itemMeta(ricotta).course,
          },
        ],
      },
    },
  });

  await prisma.waitlistEntry.createMany({
    data: [
      {
        partyName: "Rivera",
        partySize: 4,
        phone: "555-0142",
        status: "WAITING",
        quotedMinutes: 25,
        createdAt: minutesAgo(12),
      },
      {
        partyName: "Kim · 2",
        partySize: 2,
        status: "NOTIFIED",
        quotedMinutes: 15,
        createdAt: minutesAgo(28),
      },
      {
        partyName: "Okafor",
        partySize: 6,
        status: "WAITING",
        quotedMinutes: 35,
        createdAt: minutesAgo(5),
      },
    ],
  });

  // Guest QR demo: open call on table 6
  await prisma.serviceRequest.create({
    data: {
      tableId: tables[5]!.id,
      type: "CALL_WAITER",
      createdAt: minutesAgo(2),
    },
  });

  const [
    userCount,
    categoryCount,
    itemCount,
    tableCount,
    orderCount,
    billCount,
    waitlistCount,
    serviceCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.category.count(),
    prisma.menuItem.count(),
    prisma.table.count(),
    prisma.order.count(),
    prisma.bill.count(),
    prisma.waitlistEntry.count({
      where: { status: { in: ["WAITING", "NOTIFIED"] } },
    }),
    prisma.serviceRequest.count({ where: { status: "OPEN" } }),
  ]);

  console.log("Seeded Brasa demo data:");
  console.log(
    `  users: ${userCount}, categories: ${categoryCount}, items: ${itemCount}, tables: ${tableCount}`,
  );
  console.log(
    `  orders: ${orderCount}, paid bills: ${billCount}, waitlist: ${waitlistCount} active, service calls: ${serviceCount} open`,
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
