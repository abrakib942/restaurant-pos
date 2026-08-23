# Brasa — production deploy checklist

Use this before pointing real staff at a hosted instance.

## Monorepo layout

| App / package | Port | Deploy |
|---------------|------|--------|
| `@repo/web` | 3000 | Next.js staff + guest UI |
| `@repo/api` | 5002 | NestJS REST (JWT scaffold) |
| `@repo/db` | — | Prisma migrations only |

Build order: `@repo/db` generate → `@repo/api` build → `@repo/web` build.

Production runs **two processes** (web + api). No storage or separate admin app.

## Environment

### Web (`apps/web/.env`)

- [ ] `DATABASE_URL` — managed Postgres with TLS in production.
- [ ] `SESSION_SECRET` — cryptographically random, **≥ 32 characters**; rotate invalidates all sessions.
- [ ] `NEXT_PUBLIC_APP_URL` — exact public origin (`https://your-domain.com`), no trailing slash.
- [ ] `NEXT_PUBLIC_API_BASE_URL` — public API origin (e.g. `https://api.your-domain.com`).

### API (`apps/api/.env`)

- [ ] `POSTGRES_DATABASE_URL` — same database as web `DATABASE_URL`.
- [ ] `JWT_SECRET` — **≥ 32 characters**; used when web switches to JWT login.
- [ ] `CORS_ORIGINS` — comma-separated web origins.

### Database package (`packages/db/.env`)

- [ ] `DATABASE_URL` — for local `pnpm db:migrate` / `db:seed`.

## Database

- [ ] Run migrations: `pnpm db:migrate:prod` (never `migrate dev` on prod).
- [ ] Seed **only** for demos/staging: `pnpm db:seed`. Production should create real staff PINs via admin UI.
- [ ] Confirm Postgres backups / point-in-time recovery are enabled with your host.

## Build & run

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:migrate:prod
pnpm build
pnpm start                    # turbo: api + web via PM2 use scripts/deploy/start.sh
```

Or individually:

```bash
pnpm --filter @repo/api start
pnpm --filter @repo/web start
```

- [ ] Health: web `/login` loads; API `GET /health/ping` returns pong; staff can sign in; guest menu `/menu/t-01` loads without auth.

## Security

- [ ] HTTPS only; platform should redirect HTTP → HTTPS.
- [ ] Login lockout is on by default (5 failures / 15 min → 15 min lockout per username; IP cap 30 failures / 15 min).
- [ ] Change demo PINs before any real service (`admin`, `maya`, etc.).
- [ ] `.env`, `.cursor/`, and `apps/web/public/uploads/` stay out of git.
- [ ] Menu uploads are stored on local disk — on serverless hosts, use object storage instead (not in MVP).

## Observability

- [ ] Platform logs for app crashes and 5xx responses.
- [ ] Admin **Audit** (`/admin/audit`) — spot-check sign-ins, seating, billing, voids after go-live.
- [ ] Admin **Reports** — reconcile paid checks against your POS expectations.

## E2E smoke (staging)

With DB seeded and web running on `http://localhost:3000`:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

Covers: waitlist seat → waiter order → kitchen fire → expo serve → checkout pay.

## Post-deploy demo script

1. Admin: add waitlist party → seat on free table.
2. Waiter: order on that table → checkout when ready.
3. Kitchen: start ticket → mark ready.
4. Waiter: Pass → Served → Generate bill → Mark paid.
5. Admin: Reports + Audit show the session.

## Known MVP limits

- In-memory SSE pub/sub — single instance only; multi-node needs Redis.
- Web still uses cookie sessions; API JWT login is scaffolded for a follow-up migration.
- No card processing — payment method is recorded, not charged.
- Local menu image uploads — not durable on ephemeral disks.
