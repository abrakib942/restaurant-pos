# Brasa Nest API

## Layout

| Package / app | Role                                                             |
| ------------- | ---------------------------------------------------------------- |
| `apps/web`    | Next.js UI only — guest menu, admin, waiter, kitchen             |
| `apps/api`    | NestJS REST API (JWT in httpOnly cookie, Swagger at `/api/docs`) |
| `packages/db` | Shared Prisma schema + client (`@repo/db`)                       |

## Auth

Staff sign-in: `POST /auth/login` with `{ username, pin }`. Nest sets httpOnly cookie `brasa_token` (12h, SameSite=Lax).

- `GET /auth/me` — current staff user (layouts)
- `POST /auth/logout` — clears cookie
- JWT also accepted via `Authorization: Bearer` (Swagger)

Guest routes (`/guest/*`) are public (`@Public()`).

## Dev

| Service | URL                              |
| ------- | -------------------------------- |
| Web     | `http://localhost:3000`          |
| API     | `http://localhost:5002`          |
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

| Method | Route          | Role   |
| ------ | -------------- | ------ |
| POST   | `/auth/login`  | Public |
| POST   | `/auth/logout` | Public |
| GET    | `/auth/me`     | Staff  |

### Admin reads

| Method | Route                              | Query                     |
| ------ | ---------------------------------- | ------------------------- |
| GET    | `/admin/dashboard`                 | —                         |
| GET    | `/admin/reports`                   | `from`, `to` (YYYY-MM-DD) |
| GET    | `/admin/reports/voidable-items`    | —                         |
| GET    | `/admin/audit`                     | `limit`                   |
| GET    | `/admin/categories`                | —                         |
| GET    | `/admin/menu`                      | `categoryId?`             |
| GET    | `/admin/tables`                    | —                         |
| GET    | `/admin/staff`                     | `role?`                   |
| GET    | `/admin/waitlist`                  | —                         |
| GET    | `/admin/waitlist/available-tables` | —                         |

### Admin mutations

| Method            | Route                                                        |
| ----------------- | ------------------------------------------------------------ |
| POST              | `/admin/categories`                                          |
| PATCH             | `/admin/categories/:id`                                      |
| DELETE            | `/admin/categories/:id`                                      |
| POST              | `/admin/menu`                                                |
| PATCH             | `/admin/menu/:id`                                            |
| DELETE            | `/admin/menu/:id`                                            |
| POST              | `/admin/menu/:id/toggle`                                     |
| POST              | `/admin/menu/upload` (multipart)                             |
| POST/PATCH/DELETE | `/admin/tables`, `/admin/staff`                              |
| POST              | `/admin/waitlist`                                            |
| POST              | `/admin/waitlist/:id/notify`, `/seat`, `/cancel`, `/no-show` |
| POST              | `/admin/reports/void`                                        |

### Waiter

| Method | Route                                                     |
| ------ | --------------------------------------------------------- |
| GET    | `/waiter/floor`                                           |
| GET    | `/waiter/tables/:id/pos`                                  |
| GET    | `/waiter/tables/:id/checkout`                             |
| GET    | `/waiter/waitlist/active`                                 |
| GET    | `/waiter/notifications` (ready **fires**, not items)      |
| GET    | `/waiter/service-requests`                                |
| GET    | `/waiter/service-requests/:id`                            |
| GET    | `/waiter/kitchen-queue`                                   |
| POST   | `/waiter/orders` (optional `serviceRequestId`)            |
| POST   | `/waiter/items/:id/served`                                |
| POST   | `/waiter/fires/:id/served` (run whole ready fire)         |
| POST   | `/waiter/tables/:id/bill`                                 |
| POST   | `/waiter/tables/:id/pay`                                  |
| POST   | `/waiter/floor/transfer`, `/merge`, `/reassign`, `/split` |
| POST   | `/waiter/service-requests/:id/acknowledge`                |

### Kitchen

| Method | Route                      |
| ------ | -------------------------- |
| GET    | `/kitchen/board`           |
| POST   | `/kitchen/items/:id/start` |
| POST   | `/kitchen/items/:id/ready` |

### Guest (public)

| Method | Route                                                         |
| ------ | ------------------------------------------------------------- |
| GET    | `/guest/menu/:qrSlug`                                         |
| GET    | `/guest/order-status/:qrSlug`                                 |
| POST   | `/guest/orders` (deprecated — guests cannot send to kitchen)  |
| POST   | `/guest/service-requests` (optional `items` on `CALL_WAITER`) |

### Health

| Method | Route                     |
| ------ | ------------------------- |
| GET    | `/health`, `/health/ping` |

All JSON responses use `{ ok: true, data?, message? }` or `{ ok: false, error }`.

## Guest ordering model

Guests **do not** send food to the kitchen. Flow:

1. Guest scans QR → browses menu → optionally builds a cart.
2. Guest calls the waiter (`POST /guest/service-requests` with optional `items[]`).
3. Waiter acknowledges; cart calls stay `OPEN` with `acknowledgedAt` set (“on the way”).
4. Waiter opens POS (`/waiter/tables/:id?requestId=…`), reviews/edits, then `POST /waiter/orders` with `serviceRequestId`.
5. One **kitchen fire** is created for that send (all lines share a fire); the service request is marked `DONE`.
6. Guest polls `GET /guest/order-status/:qrSlug` for waiting/on-the-way, **fire** queue `#`, ETA, and ready/served.

Later adds while a fire is still live:

| Live fire state  | Waiter `POST /waiter/orders`                                                             |
| ---------------- | ---------------------------------------------------------------------------------------- |
| **PENDING**      | Patch same fire: add lines, `updateItems` qty, `removeItemIds` (void pending). Same `#`. |
| **IN_PROGRESS**  | Add-only to same fire. Removals/edits rejected.                                          |
| None / all READY | Create a **new** fire (next round).                                                      |

Guests never patch kitchen lines — only `CALL_WAITER` (optional cart) for the waiter to apply.

`POST /guest/orders` remains only as a deprecated error response.

### Service request acknowledge rules

| Request                     | Acknowledge                                                  |
| --------------------------- | ------------------------------------------------------------ |
| `CALL_WAITER` without lines | `DONE` immediately                                           |
| `CALL_WAITER` with lines    | set `acknowledgedAt`, stay `OPEN` until waiter submits order |
| `REQUEST_BILL`              | `DONE` (checkout path)                                       |

### Kitchen fires / queue / ETA

Kitchen **queue unit** is a **fire** = one waiter `POST /orders` send (not each line item). Items inside a fire are still started/readied individually.

- Pending fires are sorted rush → min course → oldest.
- Serial `#` and ETA are **per fire**; all items in that send share the same `#`/ETA.
- ETA heuristic: ~6 min × fire position + 2 min × (itemCount − 1) + kitchen load, shown as a range (e.g. `~12–18 min`).
- Cap: at most **2** fires may be in progress house-wide. Starting the first item of a new fire is blocked when the cap is full; sibling items in an already-active fire can still start.
- A fire is ready to run (“On pass”) when every non-voided item in that fire is `READY`. Waiter Pass lists **fires**; `POST /waiter/fires/:id/served` marks all READY lines SERVED. Waiter Pass lists **fires**; `POST /waiter/fires/:id/served` marks all READY lines SERVED.
- Admin void is limited to **PENDING** lines only (cooking/ready cannot be voided).
