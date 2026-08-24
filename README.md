# Brasa

Restaurant management MVP: admin, waiter POS, kitchen board, and a public QR menu.

Guests browse and call the waiter (optionally with a cart). **Only waiters** send orders to the kitchen. Guests can watch queue position and ETA on **My order**.

**Monorepo:** Turbo + pnpm with `apps/web` (Next.js), `apps/api` (NestJS), and `packages/db` (Prisma).

## Quick start

```bash
pnpm install
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:5002 (Swagger at `/api/docs`)

Copy env files:

- `apps/web/.env.example` → `apps/web/.env`
- `apps/api/.env.example` → `apps/api/.env`
- `packages/db/.env.example` → `packages/db/.env` (or symlink `DATABASE_URL` from web)

Postgres runs in Docker on **localhost:5433**, user/password/db `brasa`.

## Demo logins

Open `/login` (or **Staff entrance** on `/`). Username + 4-digit PIN.

| Role    | Username | Home       | PIN  |
| ------- | -------- | ---------- | ---- |
| Admin   | admin    | `/admin`   | 1111 |
| Waiter  | maya     | `/waiter`  | 2222 |
| Waiter  | julian   | `/waiter`  | 3333 |
| Kitchen | kenji    | `/kitchen` | 4444 |

Set `JWT_SECRET` (32+ characters) on the API and `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_API_BASE_URL` in `apps/web/.env`.

QR menu (no login): `/menu/t-01` … `/menu/t-10`. Guests call the waiter; they cannot fire the kitchen directly.

## Scripts

| Command         | Description             |
| --------------- | ----------------------- |
| `pnpm dev`      | Start web + api (turbo) |
| `pnpm dev:web`  | Next.js only            |
| `pnpm dev:api`  | NestJS only             |
| `pnpm build`    | Build all packages      |
| `pnpm test:e2e` | Playwright (web)        |
| `pnpm db:*`     | Prisma via `@repo/db`   |

## Production & tests

See [docs/DEPLOY.md](docs/DEPLOY.md) and [docs/api-v1.md](docs/api-v1.md).

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```
