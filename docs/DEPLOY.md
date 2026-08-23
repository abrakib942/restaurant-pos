# Brasa — production deploy checklist

Use this before pointing real staff at a hosted instance.

## Monorepo layout

| App / package | Port | Deploy |
|---------------|------|--------|
| `@repo/web` | 3000 | Next.js staff + guest UI (no database) |
| `@repo/api` | 5002 | NestJS REST + business logic |
| `@repo/db` | — | Prisma migrations only |

Build order: `@repo/db` generate → `@repo/api` build → `@repo/web` build.

Production runs **two processes** (web + api).

## Environment

### Web (`apps/web/.env`)

- [ ] `NEXT_PUBLIC_APP_URL` — exact public origin (`https://your-domain.com`), no trailing slash.
- [ ] `NEXT_PUBLIC_API_BASE_URL` — public API origin for server-side fetches (e.g. `https://api.your-domain.com` or internal URL).

Web no longer needs `DATABASE_URL` or `SESSION_SECRET`.

### API (`apps/api/.env`)

- [ ] `POSTGRES_DATABASE_URL` — managed Postgres with TLS in production.
- [ ] `JWT_SECRET` — cryptographically random, **≥ 32 characters**; rotation invalidates all staff sessions.
- [ ] `CORS_ORIGINS` — comma-separated web origins (e.g. `https://your-domain.com`).

### Database package (`packages/db/.env`)

- [ ] `DATABASE_URL` — for local `pnpm db:migrate` / `db:seed`.

## Cookies & proxy

**Development:** Next rewrites `/backend/*` → `http://localhost:5002/*`. Browser calls same-origin `/backend/...`; Nest sets `brasa_token` on localhost.

**Production options:**

1. Reverse proxy `/backend` or `/api` on the same parent domain as the web app.
2. Or set `NEXT_PUBLIC_API_BASE_URL` to the API subdomain and configure `CORS_ORIGINS` + cross-site cookies (not required if using a shared proxy).

Cookie name: `brasa_token` (httpOnly, 12h, path `/`).

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
pnpm start
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
- [ ] Menu uploads land in `apps/web/public/uploads/menu/` — on serverless hosts, use object storage instead.

## Observability

- [ ] Platform logs for app crashes and 5xx responses.
- [ ] Admin **Audit** (`/admin/audit`) — spot-check sign-ins, seating, billing, voids after go-live.
- [ ] Admin **Reports** — reconcile paid checks against your POS expectations.

## E2E smoke (staging)

With DB seeded, API on `:5002`, and web on `:3000`:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

Playwright starts both API and web automatically. Expect 4 passing tests (auth lockout, login, a11y, full-service flow).

## PM2 / scripts

See `scripts/deploy/` for `start.sh`, `stop.sh`, and per-app `ecosystem.config.cjs` files.
