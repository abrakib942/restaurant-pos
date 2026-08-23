# Optional `/api/v1` sketch (Nest later)

This folder is an **optional** Nest-shaped sketch. The live app still uses:

- **Server Actions** under `src/app/actions/*` for staff mutations
- **Poll routes** `GET /api/kitchen/board` and `GET /api/waiter/notifications`

When you extract a NestJS backend, you can promote `src/lib/services/*` + these route shapes. Until then, prefer Server Actions for new Next.js features.
