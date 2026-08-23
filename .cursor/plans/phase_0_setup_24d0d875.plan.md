---
name: Phase 0 Setup
overview: Scaffold a branded Next.js App Router app with shadcn/ui, Docker Postgres, and a Prisma 7 schema (reviewed here). After you confirm, Phase 0 will migrate and seed demo data, then stop.
todos:
  - id: scaffold
    content: Scaffold Next.js (TS, App Router, Tailwind, src/) + shadcn init + Brasa fonts/tokens + splash page
    status: completed
  - id: postgres
    content: Add docker-compose Postgres, .env, prisma.config.ts, Prisma client singleton
    status: completed
  - id: schema-seed
    content: Write reviewed Prisma schema + seed (4 users, 5 categories, 25 items, 10 tables)
    status: completed
  - id: migrate
    content: Start Postgres, migrate, seed, verify counts; stop for Phase 0 review
    status: completed
isProject: false
---

# Phase 0 — Project setup and Prisma schema

Empty repo at [`/home/atl/Projects/atl-resturant-management`](/home/atl/Projects/atl-resturant-management). Confirming this plan **approves the schema below**; implementation will then migrate and seed. After seed, Phase 0 stops until you say continue.

## Stack choices (locked)

- **pnpm** + `create-next-app@latest` in `.` (`--typescript --tailwind --eslint --app --src-dir --turbopack`)
- **shadcn/ui** via `pnpm dlx shadcn@latest init` (Radix, CSS variables), then add `button` for the stub page
- **Postgres 16** in [`docker-compose.yml`](docker-compose.yml) on `localhost:5432` (local `psql` exists but nothing is listening)
- **Prisma 7** with `@prisma/adapter-pg`, client output at `src/generated/prisma`, `moduleFormat = "cjs"` so Next.js does not need `"type": "module"`
- **TanStack Query** (`@tanstack/react-query`) for kitchen board + waiter notification polling — not installed in Phase 0; added when those screens land (Phase 6/7) with `refetchInterval: POLL_INTERVAL_MS`. No websockets.

Brand for later UI: **Brasa** (wood-fired bistro). Fonts: Fraunces (display) + Outfit (UI). Tokens: deep olive ground, bone text, brass accent — not a generic admin theme.

## Prisma schema (review this)

Written to [`prisma/schema.prisma`](prisma/schema.prisma). URL lives in [`prisma.config.ts`](prisma.config.ts) (`DATABASE_URL`), not in the schema.

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}

enum Role {
  ADMIN
  WAITER
  KITCHEN
}

enum TableStatus {
  AVAILABLE
  OCCUPIED
  BILLING
}

enum OrderStatus {
  OPEN
  BILLING
  PAID
}

enum OrderItemStatus {
  PENDING
  IN_PROGRESS
  READY
  SERVED
}

model User {
  id        String   @id @default(cuid())
  name      String
  username  String   @unique
  pinHash   String
  role      Role
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  orders    Order[]
}

model Category {
  id        String     @id @default(cuid())
  name      String     @unique
  sortOrder Int        @default(0)
  createdAt DateTime   @default(now())
  items     MenuItem[]
}

model MenuItem {
  id          String      @id @default(cuid())
  name        String
  description String
  price       Decimal     @db.Decimal(10, 2)
  imageUrl    String
  isAvailable Boolean     @default(true)
  sortOrder   Int         @default(0)
  categoryId  String
  category    Category    @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  orderItems  OrderItem[]

  @@index([categoryId])
}

model Table {
  id        String      @id @default(cuid())
  label     String      @unique
  qrSlug    String      @unique
  status    TableStatus @default(AVAILABLE)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  orders    Order[]
}

model Order {
  id        String      @id @default(cuid())
  tableId   String
  table     Table       @relation(fields: [tableId], references: [id], onDelete: Restrict)
  waiterId  String
  waiter    User        @relation(fields: [waiterId], references: [id], onDelete: Restrict)
  status    OrderStatus @default(OPEN)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  items     OrderItem[]
  bill      Bill?

  @@index([tableId])
  @@index([waiterId])
  @@index([status])
  @@index([createdAt])
}

model OrderItem {
  id         String          @id @default(cuid())
  orderId    String
  order      Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  menuItemId String
  menuItem   MenuItem        @relation(fields: [menuItemId], references: [id], onDelete: Restrict)
  name       String
  unitPrice  Decimal         @db.Decimal(10, 2)
  qty        Int
  status     OrderItemStatus @default(PENDING)
  startedAt  DateTime?
  readyAt    DateTime?
  servedAt   DateTime?
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt

  @@index([orderId])
  @@index([menuItemId])
  @@index([status])
}

model Bill {
  id        String    @id @default(cuid())
  orderId   String    @unique
  order     Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  subtotal  Decimal   @db.Decimal(10, 2)
  discount  Decimal   @default(0) @db.Decimal(10, 2)
  total     Decimal   @db.Decimal(10, 2)
  paidAt    DateTime?
  createdAt DateTime  @default(now())
}
```

```mermaid
erDiagram
  User ||--o{ Order : takes
  Table ||--o{ Order : has
  Order ||--o{ OrderItem : contains
  Order ||--o| Bill : billedAs
  Category ||--o{ MenuItem : groups
  MenuItem ||--o{ OrderItem : snapshotOn
```

### Assumptions baked into the schema

- Login (Phase 1) is **username + 4-digit PIN**; PIN stored as bcrypt `pinHash`
- `OrderItem.name` + `unitPrice` snapshot the menu at submit so bills stay stable if prices change
- `servedAt` is extra vs your list so Phase 7 does not need another migration
- Kitchen cap of 3 is **app-level**: count of `OrderItem` rows with `IN_PROGRESS` (one ticket = one row, not `qty`)
- One open order per table is **app-level** (Prisma cannot express a partial unique index cleanly)
- `discount` is a money amount, not a percent (Phase 7 UI can still accept a percent and convert)
- `imageUrl` is required; seed always supplies Unsplash URLs
- Currency is USD

## Seed ([`prisma/seed.ts`](prisma/seed.ts))

Wipe-and-fill (deleteMany in FK-safe order). Console-prints demo logins.

- Users: `admin`/`1111`, waiters `maya`/`2222` + `julian`/`3333`, kitchen `kenji`/`4444`
- Categories: Small Plates, Wood-Fired, Greens & Sides, Sweets, Bar (`sortOrder` 1–5)
- 25 items (5 each): names, descriptions, prices, Unsplash `imageUrl`, `isAvailable: true` except 2 marked unavailable to demo the toggle
- Tables `1`–`10` with `qrSlug` `t-01` … `t-10`, all `AVAILABLE`
- No orders/bills yet

## Other Phase 0 files

- [`docker-compose.yml`](docker-compose.yml) — `postgres:16-alpine`, db/user/pass `brasa`
- [`.env`](.env) + [`.env.example`](.env.example) — `DATABASE_URL=postgresql://brasa:brasa@localhost:5432/brasa`
- [`src/lib/prisma.ts`](src/lib/prisma.ts) — Next.js singleton + `PrismaPg` adapter
- [`src/lib/constants.ts`](src/lib/constants.ts) — `KITCHEN_IN_PROGRESS_CAP = 3`, `POLL_INTERVAL_MS = 4000` (TanStack Query `refetchInterval`, not websockets)
- [`src/app/layout.tsx`](src/app/layout.tsx) + [`src/app/page.tsx`](src/app/page.tsx) — branded Brasa splash only (no login yet)
- README demo PINs + the polling simplification note
- Later: a client `QueryClientProvider` wrapper around the staff app (not the public QR page)
- `package.json` scripts: `db:up`, `db:migrate`, `db:seed`, `postinstall`: `prisma generate`

## Out of scope (later phases)

Auth, route shells, admin CRUD, QR page, POS, kitchen board, billing, dashboard chart. TanStack Query provider + `useQuery` polling ships with kitchen/waiter live screens, not Phase 0.
