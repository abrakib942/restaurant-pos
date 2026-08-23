# Brasa — production deploy checklist

Use this before pointing real staff at a hosted instance.

## Environment

- [ ] Copy `.env.example` → production env (Vercel/Railway/Fly secrets, not committed).
- [ ] `DATABASE_URL` — managed Postgres with TLS in production.
- [ ] `SESSION_SECRET` — cryptographically random, **≥ 32 characters**; rotate invalidates all sessions.
- [ ] `NEXT_PUBLIC_APP_URL` — exact public origin (`https://your-domain.com`), no trailing slash. QR codes and receipts use this.

## Database

- [ ] Run migrations: `pnpm prisma migrate deploy` (never `migrate dev` on prod).
- [ ] Seed **only** for demos/staging: `pnpm db:seed`. Production should create real staff PINs via admin UI.
- [ ] Confirm Postgres backups / point-in-time recovery are enabled with your host.

## Build & run

```bash
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm prisma migrate deploy
pnpm build
pnpm start   # or platform start command
```

- [ ] Health: `/login` loads, staff can sign in, guest menu `/menu/t-01` loads without auth.

## Security

- [ ] HTTPS only; platform should redirect HTTP → HTTPS.
- [ ] Login lockout is on by default (5 failures / 15 min → 15 min lockout per username; IP cap 30 failures / 15 min).
- [ ] Change demo PINs before any real service (`admin`, `maya`, etc.).
- [ ] `.env`, `.cursor/`, and `public/uploads/` stay out of git.
- [ ] Menu uploads are stored on local disk — on serverless hosts, use object storage instead (not in MVP).

## Observability

- [ ] Platform logs for app crashes and 5xx responses.
- [ ] Admin **Audit** (`/admin/audit`) — spot-check sign-ins, seating, billing, voids after go-live.
- [ ] Admin **Reports** — reconcile paid checks against your POS expectations.

## E2E smoke (staging)

With DB seeded and app running on `http://localhost:3000`:

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

- In-memory SSE pub/sub — single instance only; multi-node needs Redis (Phase 18+).
- No card processing — payment method is recorded, not charged.
- Local menu image uploads — not durable on ephemeral disks.
