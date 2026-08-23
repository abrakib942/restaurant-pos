# API and monorepo

## Layout

| Package / app | Role |
|---------------|------|
| `apps/web` | Next.js UI — guest menu, admin, waiter, kitchen (one app) |
| `apps/api` | NestJS REST API (JWT auth, Swagger at `/api/docs`) |
| `packages/db` | Shared Prisma schema + client (`@repo/db`) |

## Current state (structure-only)

- **Live mutations** still use Server Actions in `apps/web/src/app/actions/*`.
- **`apps/api`** exposes scaffold endpoints: `GET /health`, `POST /auth/login` (JWT).
- **`/api/v1/*`** Next routes remain optional mirrors; Nest will become source of truth in a follow-up phase.

## JWT migration (next phase)

1. Web login calls `POST {NEXT_PUBLIC_API_BASE_URL}/auth/login` and stores JWT (httpOnly cookie or memory).
2. Replace Server Actions with fetch + `Authorization: Bearer` to Nest controllers.
3. Port `apps/web/src/lib/services/*` into Nest modules one domain at a time.
4. Remove cookie session (`jose`) once all staff flows use JWT.

## Dev ports

- Web: `http://localhost:3000`
- API: `http://localhost:5002`

## Env

- Web: `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_BASE_URL`
- API: `POSTGRES_DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`
