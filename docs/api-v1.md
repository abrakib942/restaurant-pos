# Brasa Nest API

## Layout

| Package / app | Role |
|---------------|------|
| `apps/web` | Next.js UI only — guest menu, admin, waiter, kitchen |
| `apps/api` | NestJS REST API (JWT in httpOnly cookie, Swagger at `/api/docs`) |
| `packages/db` | Shared Prisma schema + client (`@repo/db`) |

## Auth

Staff sign-in: `POST /auth/login` with `{ username, pin }`. Nest sets httpOnly cookie `brasa_token` (12h, SameSite=Lax).

- `GET /auth/me` — current staff user (layouts)
- `POST /auth/logout` — clears cookie
- JWT also accepted via `Authorization: Bearer` (Swagger)

Guest routes (`/guest/*`) are public (`@Public()`).

## Dev

| Service | URL |
|---------|-----|
| Web | `http://localhost:3000` |
| API | `http://localhost:5002` |
| Swagger | `http://localhost:5002/api/docs` |

**Cookie proxy (recommended):** web rewrites `/backend/*` → `:5002`. Client code uses `/backend/...` (same origin). Server components call the API directly via `NEXT_PUBLIC_API_BASE_URL`.

## Env

**Web (`apps/web/.env`):**

- `NEXT_PUBLIC_APP_URL` — public web origin
- `NEXT_PUBLIC_API_BASE_URL` — API origin for RSC server fetches (default `http://localhost:5002`)

**API (`apps/api/.env`):**

- `POSTGRES_DATABASE_URL`
- `JWT_SECRET` (≥ 32 chars)
- `CORS_ORIGINS` — e.g. `http://localhost:3000`

## Route catalog

### Auth

| Method | Route | Role |
|--------|-------|------|
| POST | `/auth/login` | Public |
| POST | `/auth/logout` | Public |
| GET | `/auth/me` | Staff |

### Admin reads

| Method | Route | Query |
|--------|-------|-------|
| GET | `/admin/dashboard` | — |
| GET | `/admin/reports` | `from`, `to` (YYYY-MM-DD) |
| GET | `/admin/reports/voidable-items` | — |
| GET | `/admin/audit` | `limit` |
| GET | `/admin/categories` | — |
| GET | `/admin/menu` | `categoryId?` |
| GET | `/admin/tables` | — |
| GET | `/admin/staff` | `role?` |
| GET | `/admin/waitlist` | — |
| GET | `/admin/waitlist/available-tables` | — |

### Admin mutations

| Method | Route |
|--------|-------|
| POST | `/admin/categories` |
| PATCH | `/admin/categories/:id` |
| DELETE | `/admin/categories/:id` |
| POST | `/admin/menu` |
| PATCH | `/admin/menu/:id` |
| DELETE | `/admin/menu/:id` |
| POST | `/admin/menu/:id/toggle` |
| POST | `/admin/menu/upload` (multipart) |
| POST/PATCH/DELETE | `/admin/tables`, `/admin/staff` |
| POST | `/admin/waitlist` |
| POST | `/admin/waitlist/:id/notify`, `/seat`, `/cancel`, `/no-show` |
| POST | `/admin/reports/void` |

### Waiter

| Method | Route |
|--------|-------|
| GET | `/waiter/floor` |
| GET | `/waiter/tables/:id/pos` |
| GET | `/waiter/tables/:id/checkout` |
| GET | `/waiter/waitlist/active` |
| GET | `/waiter/notifications` |
| GET | `/waiter/service-requests` |
| POST | `/waiter/orders` |
| POST | `/waiter/items/:id/served` |
| POST | `/waiter/tables/:id/bill` |
| POST | `/waiter/tables/:id/pay` |
| POST | `/waiter/floor/transfer`, `/merge`, `/reassign`, `/split` |
| POST | `/waiter/service-requests/:id/acknowledge` |

### Kitchen

| Method | Route |
|--------|-------|
| GET | `/kitchen/board` |
| POST | `/kitchen/items/:id/start` |
| POST | `/kitchen/items/:id/ready` |

### Guest (public)

| Method | Route |
|--------|-------|
| GET | `/guest/menu/:qrSlug` |
| POST | `/guest/orders` |
| POST | `/guest/service-requests` |

### Health

| Method | Route |
|--------|-------|
| GET | `/health`, `/health/ping` |

All JSON responses use `{ ok: true, data?, message? }` or `{ ok: false, error }`.
