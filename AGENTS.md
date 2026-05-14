# SmartTask Agent Guide

## Project

Real-time Kanban board with RBAC, WIP limits, offline support, undo via audit log, and task automation.

**Stack:** Next.js 16 (App Router), React 19, Prisma v7 + PostgreSQL, Socket.io (standalone), Tailwind CSS 4, shadcn/radix-nova, Zustand, Zod v4

**Detailed system docs:** `docs/01-` through `docs/10-*.md` — architecture, auth, RBAC, boards, tasks, notifications, sockets, offline queue, database schema, automation engine.

## Verification

- `npm run typecheck` — primary; catches errors build won't report clearly
- `npm run build` — runs TypeScript check + page generation; do this after typecheck
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`); ignores `generated/` and `scratch/`
- `npm run format` — Prettier (no semicolons, double quotes, trailing comma `es5`, printWidth 80, auto-sorts Tailwind classes)
- **No test suite** — verify via `typecheck && build`

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | `db:check` **(blocks startup if DB unreachable)**, then Socket.io (3001) + Next.js (3002) concurrently |
| `npm run db:setup` | `prisma db push && prisma generate && npm run seed` — for Supabase, set `DATABASE_URL` and `DIRECT_URL` env vars first |
| `npm run seed` | Seeds DB; reads `.env.local` via dotenv; password: `AdminPassword123!` |
| `npm run socket:dev` | Standalone Socket.io server only |
| `npm run db:check` | Verifies DB connectivity (run automatically by `dev`) |
| `npm run check-users` | Diagnostic: verify user roles/credentials in DB |
| `npm run check-boards` | Diagnostic: validate board memberships |

## Environment

`.env.local` required: `DATABASE_URL`, `JWT_SECRET`, `PORT=3002`

Optional: `ALLOWED_ORIGIN`, `EMAIL_HOST/PORT/USER/PASS/FROM`, `NEXT_PUBLIC_SOCKET_URL` (default `http://localhost:3001`), `NEXT_PUBLIC_APP_URL`, `SOCKET_PORT` (default 3001)

For Supabase production: use `?pgbouncer=true` on `DATABASE_URL` (pooled) and separate `DIRECT_URL` (port 5432, no pgbouncer). Both require `ssl: { rejectUnauthorized: false }` — handled automatically in `lib/prisma.ts` and `src/socket/server.ts`.

## Architecture

**Port 3002, not 3000.** Next.js dev server on 3002. Socket.io standalone on 3001 (configurable via `SOCKET_PORT`).

**ESM project** (`"type": "module"`). All config files use `.mjs`. Never create `.cjs` configs.

**Prisma v7** uses `@prisma/adapter-pg` (wrapping `pg.Pool`) — NOT `@prisma/adapter-neon` despite both being in `package.json`. Client output is `generated/prisma` (imported as `'../generated/prisma'` from `lib/prisma.ts`). Uses `db push` (not migrations). `prisma.config.ts` uses `DIRECT_URL` for schema operations (falls back to `DATABASE_URL`). Loads `.env.local` in dev, `.env` in production. `postinstall` runs `prisma generate`. **`generated/` is gitignored** — always run `prisma generate` after pulling schema changes.

**Socket.io is standalone** (`src/socket/server.ts`), not Next.js built-in. Self-contained: has its own Prisma+pg pool, does NOT import from `@/` paths or `utils/notification-utils.ts`. Background jobs run inline (due date reminders/overdue checks every 60s, 90-day audit log cleanup at midnight). Has HTTP endpoints: `GET /health` → `{"status":"ok","uptime":...}` for Railway health checks, and `GET /` → `"Socket.IO server running"`. `utils/socket-emitter.ts` is a Socket.io **client** — server actions emit events through it to the standalone server.

**Middleware is `proxy.ts`** at project root — not `middleware.ts`. Next.js 16 auto-detects it. Handles auth guards + RBAC redirects.

**Auth:** Custom JWT via `jose` (HS256, 7-day expiry), HTTP-only cookies. Login is an API route (`POST /api/auth/login`), not a server action. `lib/auth.ts` has encrypt/decrypt; `lib/auth-server.ts` is a `'use server'` module for login/logout/getSession cookie management.

**Roles:** `ADMIN`, `MANAGER`, `MEMBER` (UPPERCASE in DB).

**Tailwind CSS 4:** `@import "tailwindcss"` (not PostCSS plugin), `@theme inline` for custom properties, `@custom-variant dark` for dark mode. PostCSS uses `@tailwindcss/postcss`. See `app/globals.css`.

**Zod v4** (`zod@4.x`). Date fields from HTML forms use `z.string()` (not `z.string().datetime()`) since `<input type="date">` returns `YYYY-MM-DD`.

**shadcn** style is `radix-nova`. UI components in `components/ui/`.

**Offline:** IndexedDB-backed action queue (`lib/offline-db.ts`). Zustand store at `lib/store/use-offline-store.ts`. UI provider at `components/providers/offline-provider.tsx`.

## Code Conventions

- `@/` path alias maps to project root (`./*` in tsconfig)
- All server actions return `ActionResult<T>` (defined in `types/kanban.ts`): `{ success: boolean, data?: T, error?: string, message?: string, fieldErrors?: Record<string, string[] | undefined> }`
- Server actions live in `actions/*-actions.ts` (not `lib/`)
- `createAuditLog()` in `lib/create-audit-log.ts` auto-injects IP address — use for all mutations
- Prisma enum returns need casting (`as string`, `as Priority`) when crossing server/client boundary
- Import enums via `@/lib/prisma` (re-exports from `generated/prisma`)
- `tsconfig.json` excludes `scripts/` and `scratch/` from compilation — utility scripts go in `scripts/`, temp files in `scratch/`

## RBAC

RBAC checks live inside server action files (not a shared lib):
- `checkAdmin()` (private, in `actions/admin-actions.ts`) — ADMIN only
- `checkManager()` (private, in `actions/manager-actions.ts`) — ADMIN or MANAGER
- `checkBoardPermission()` (exported from `actions/board-actions.ts`) — board membership + owner + role; ADMIN always has access
- `checkTaskPermission()` (private, in `actions/task-actions.ts`) — board membership + ownership + role check; ADMIN always has access
- MEMBER can edit/delete/add to ANY task in their board (collaboration model); MEMBER cannot create boards (only ADMIN/MANAGER can)

## Socket Architecture

`useSocket` hook (`components/kanban/socket-hooks.ts`): module-level singleton, joins/leaves board rooms on `boardId` change, `useMemo` for user prop, unmount cleanup via ref.

Server actions emit via `emitBoardEvent()` and `emitNotification()` in `utils/socket-emitter.ts`.

**Notification flow:** Server action -> `sendNotification()` in `utils/notification-utils.ts` (checks prefs, writes DB) -> `emitNotification()` (Socket.IO client to server) -> server relays to `user:${userId}` room -> browser `useNotificationListener` in `notification-bell.tsx` receives it. When adding a new notification-triggering action, you must call `sendNotification()` — just emitting a socket event is not enough (no DB record = no bell badge, no persistence).

**Adding a new notification type requires:** a `NotifType` union member, a `notifTypeToPrefKey` entry, a `booleanPrefKeys` entry, a `NotificationPreference` schema field in `prisma/schema.prisma`, and a `NotificationPreference` interface field in `types/kanban.ts`. There are currently 11 notification types. Non-boolean fields (id, userId, emailEnabled, pushEnabled, createdAt, updatedAt) are excluded from the mapping.

## Gotchas

**Never pass object references as useEffect dependencies.** The `useSocket` hook must use `useMemo` to stabilize the `user` prop. Raw objects cause infinite join/leave loops.

**All Dialog components must include `<DialogDescription>`** (even with `className="sr-only"`). Radix throws without it.

**Recharts `ResponsiveContainer` needs explicit pixel dimensions.** `height="100%"` causes negative dimension errors. Use `height={300}` or fixed values.

**After mutations, call `router.refresh()`.** Server actions use `revalidatePath` but the client needs `router.refresh()` to pick up changes.

**API routes must use `auth-server.ts` for cookie operations — do NOT import `cookies` from `next/headers` directly in route handlers.** Turbopack's dev server fails to resolve `cookies()` at runtime in route files, returning 404. Always use `login()`/`logout()`/`getSession()` from `@/lib/auth-server.ts` instead (the `'use server'` module works correctly).

**Socket event field names must match exactly.** `task:moved` uses `newColumnId`/`oldColumnId` — not `columnId`/`previousColumnId`.

**Emit socket events AFTER database commits** so clients receive updated data.

**`dnd-kit` SSR hydration mismatches** (`DndDescribedBy-0` vs `DndDescribedBy-1`) are a known issue. Do not use `next/dynamic` with `ssr: false` in a Server Component — wrap DndContext in a Client Component boundary instead.

**Props-to-state sync:** Client components receiving server props need `useEffect` to sync state on prop changes. `useState(initialValue)` only uses the value on first render.

**AuditLog `details` is `Json`, not a string.** Never render as `{log.details}`. Format with a helper based on `action` type.

**Radix Select crash on empty value:** `<SelectItem value="">` crashes. Use `value="__none__"` or handle empty in `onValueChange`.

**`_count` returns numbers, not relations.** If UI needs `task.checklists?.length`, include full relation: `checklists: { include: { items: true } }`.

**Board page full-width trick:** `app/dashboard/board/[id]/page.tsx` uses `-m-6` to cancel the parent layout's `p-6` padding, making it the only dashboard page that renders edge-to-edge. Don't add margin/padding wrappers inside it.

**Board queries must include owner.** Use `OR: [{ members: { some: { id } } }, { ownerId: id }]`.

**Schema validation limits:** `createBoardSchema` name max 50, description max 255. `updateBoardSchema` same limits. `createTaskSchema` title max 100, description max 1000.

**Node.js 22+ required.** `.nvmrc` pins Node 22. Prisma v7 needs `^20.19 || ^22.12 || >=24.0`. Railway (`railway.toml`) sets `NIXPACKS_NODE_VERSION=22`. Node 20.18.x is too old — must be 20.19+.

**Turbopack build may fail on Google Fonts** if `fonts.gstatic.com` is unreachable. Retrying usually succeeds.

**`scripts/` and `scratch/` are excluded from TypeScript compilation** (`tsconfig.json`). Files there use `npx tsx` to run directly — don't import from them in app code. Files in `scripts/` that import `@prisma/client` instead of `../generated/prisma` will break the Next.js build.

**GEMINI.md is partially outdated** — server actions are in `actions/`, not `lib/`. Trust AGENTS.md over GEMINI.md where they conflict.

**`.env.production` is gitignored.** Never commit it. Production env vars go in Vercel/Railway dashboards only.

**Socket server `process.env.PORT` for Railway.** Railway auto-injects `PORT` and health-checks it. The socket server reads `PORT` first, then `SOCKET_PORT`, then defaults to `3001`. Do NOT manually set `PORT` in Railway env vars. The server has a `/health` endpoint at `GET /health` returning `{"status":"ok","uptime":...}` — this is required for Railway to mark the deployment as healthy.

## Business Logic Constraints

- **Task version conflict detection:** Tasks have a `version` field incremented on every update. If `clientVersion !== serverVersion`, the server returns a conflict error. Pass `version: undefined` to bypass (used by the conflict resolution dialog).
- **Undo is time-limited:** `undoLastAction()` only works within 30 seconds of the original action. It also cleans up audit logs older than 5 minutes for the user.
- **Comment editing:** Non-admin/manager users can only edit comments within 5 minutes of creation (`FIVE_MINUTES_MS` in `actions/task-actions.ts`).
- **Member task assignment:** Members can only assign tasks to themselves — enforced server-side in `createTask` and `updateTask`. Admins/managers can assign to anyone.
- **WIP limits only enforced for members:** Admin/manager can move tasks into columns that have exceeded their WIP limit. The override is logged as `UPDATE_TASK_STATUS_OVERRIDE` instead of `UPDATE_TASK_STATUS`.
- **Review auto-moves tasks:** Completing a review with `APPROVED` moves the task to "Done", `CHANGES_REQUESTED` to "In Progress", `REJECTED` to "To Do" — the server finds columns by case-insensitive name match.
- **Signup defaults:** New users get `MEMBER` role and default `NotificationPreference` record. Self-signup via `POST /api/auth/signup` auto-logs them in.

## Production Deployment

**See [VERCEL.md](./VERCEL.md) and [RAILWAY.md](./RAILWAY.md) for full deployment guides.**

- **Vercel** (Next.js app): `vercel --prod` — env vars in dashboard, `.env.production` is gitignored
- **Railway** (Socket.IO server): `railway up` — uses `railway.toml`, env vars in dashboard or `railway variables set`
- **Supabase** (PostgreSQL): `DATABASE_URL` with `?pgbouncer=true` (port 6543) for queries, `DIRECT_URL` (port 5432) for schema ops
- SSL for Supabase is auto-applied in `lib/prisma.ts`, `src/socket/server.ts`, `prisma/seed.ts`, `scripts/db-check.ts` when URL contains `supabase.com`
- Socket server is self-contained — no `@/` imports, own Prisma+pg pool, `/health` endpoint for Railway

### Test Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@smarttask.com | AdminPassword123! | ADMIN (seed) |
| manager@smarttask.com | AdminPassword123! | MANAGER (seed) |
| member@smarttask.com | AdminPassword123! | MEMBER (seed) |
| admin@gmail.com | admin123 | ADMIN |
| manager@gmail.com | manager123 | MANAGER |

## Key Files

| Purpose | Path |
|---------|------|
| DB client + enums | `lib/prisma.ts` |
| Auth (JWT) | `lib/auth.ts`, `lib/auth-server.ts` |
| Middleware | `proxy.ts` (project root) |
| Prisma schema | `prisma/schema.prisma` |
| Prisma config | `prisma.config.ts` (uses `DIRECT_URL` for schema ops) |
| Zod schemas | `lib/schemas.ts` |
| Server actions | `actions/*-actions.ts` |
| Socket server | `src/socket/server.ts` (standalone, `/health` endpoint) |
| Socket client (emitter) | `utils/socket-emitter.ts` |
| Notification utils | `utils/notification-utils.ts` |
| Kanban board hook | `hooks/use-kanban-board.ts` |
| Kanban socket hooks | `components/kanban/socket-hooks.ts` |
| Shared types | `types/kanban.ts` |
| Offline store | `lib/store/use-offline-store.ts` |
| Offline DB | `lib/offline-db.ts` |
| Offline sync | `lib/offline-sync.ts` |
| Audit log helper | `lib/create-audit-log.ts` |
| Railway config | `railway.toml` |
| Deployment guides | `VERCEL.md`, `RAILWAY.md` |
| Node version pin | `.nvmrc` (Node 22) |
| System design docs | `docs/01-*.md` through `docs/10-*.md` |

## Specs

Feature requirements in `systemtodo.md` and `roledependent.md`.
