# Brasa

Restaurant management MVP: admin, waiter POS, kitchen board, and a public QR menu.

## Quick start

```bash
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Postgres runs in Docker on **localhost:5433** (host 5432 is already in use), user/password/db `brasa`. Copy `.env.example` to `.env` if needed.

## Demo logins

Open `/login` (or **Staff entrance** on `/`). Username + 4-digit PIN.

| Role    | Username | Home       | PIN  |
| ------- | -------- | ---------- | ---- |
| Admin   | admin    | `/admin`   | 1111 |
| Waiter  | maya     | `/waiter`  | 2222 |
| Waiter  | julian   | `/waiter`  | 3333 |
| Kitchen | kenji    | `/kitchen` | 4444 |

Set `SESSION_SECRET` (32+ characters) and `NEXT_PUBLIC_APP_URL` in `.env` — see `.env.example`. Table QR codes encode `{NEXT_PUBLIC_APP_URL}/menu/{qrSlug}`.

QR menu (no login): `/menu/t-01` … `/menu/t-10` — read-only; guests tell their waiter to order.

## MVP notes

- Admin `/admin` shows today’s sales, open tickets, floor status, and a top-items chart (from paid checks).
- Kitchen board and waiter notifications poll every 4s with TanStack Query (`refetchInterval`). No websockets in this MVP.
- Waiter and kitchen screens are tablet-first; the QR menu is phone-first.
