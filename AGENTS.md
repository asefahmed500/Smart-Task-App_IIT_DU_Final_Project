# SmartTask Agent Guide

## Project

Real-time Kanban board with RBAC, WIP limits, offline support, undo via audit log, task automation, and sprint planning.

**Stack:** Next.js 16 (App Router), React 19, Prisma v7 + PostgreSQL, Socket.io (standalone), Tailwind CSS 4, shadcn/radix-nova, Zustand, Zod v4

**System docs:** `docs/01-` through `docs/11-*.md`

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | `db:check` **(blocks startup if DB unreachable)**, then Socket.io (3001) + Next.js (3002) concurrently |
| `npm run build` | Production build — run after typecheck |
| `npm run start` | Production: Socket.io (3001) + Next.js concurrently |
| `npm run typecheck` | `tsc --noEmit` — primary verification; catches errors build won't report clearly |
| `npm run lint` | ESLint (flat config, `eslint.config.mjs`); ignores `generated/` and `scratch/` |
| `npm run format` | Prettier — no semicolons, double quotes, `trailingComma: "es5"`, `printWidth: 80`, auto-sorts Tailwind via `cn`/`cva` |
| `npm run db:setup` | `prisma db push && prisma generate && npm run seed` — set `DATABASE_URL` and `DIRECT_URL` first |
| `npm run seed` | Seeds DB; reads `.env.local`; seed password: `AdminPassword123!` |
| `npm run socket:dev` | Standalone Socket.io server only (`npx tsx src/socket/server.ts`) |
| `npm run db:check` | Verifies DB connectivity (auto-run by `dev`) |
| `npm run check-users` | Diagnostic: verify user roles/credentials in DB |
| `npm run check-boards` | Diagnostic: validate board memberships |

**Verification order:** `typecheck` → `build` — **no test suite**.

## Environment

**Required** in `.env.local`: `DATABASE_URL`, `JWT_SECRET`

**Optional:** `ALLOWED_ORIGIN`, `EMAIL_HOST/PORT/USER/PASS/FROM`, `NEXT_PUBLIC_SOCKET_URL` (default `http://localhost:3001`), `NEXT_PUBLIC_APP_URL`, `SOCKET_PORT` (default 3001), `PORT` (Railway auto-injects — do NOT set manually; `.env.example` has `PORT=3002` for local dev)

**`NEXT_PUBLIC_SOCKET_URL` is missing from `.env.example` but required for production.**

For Supabase: `?pgbouncer=true` on `DATABASE_URL` (pooled, port 6543), separate `DIRECT_URL` (port 5432). SSL auto-applied when URL contains `supabase.com` — handled in `lib/prisma.ts` and `src/socket/server.ts`.

## Architecture

**Port 3002, not 3000.** Next.js dev on 3002. Socket.io standalone on 3001 (via `SOCKET_PORT`).

**ESM project** (`"type": "module"`). All config files use `.mjs`. Never create `.cjs` configs.

### Prisma v7

Uses `@prisma/adapter-pg` (wrapping `pg.Pool`) — NOT `@prisma/adapter-neon` despite both being in `package.json`. Client output is `generated/prisma` (imported as `'../generated/prisma'` from `lib/prisma.ts`). Uses `db push` (not migrations). `prisma.config.ts` uses `DIRECT_URL` for schema ops (falls back to `DATABASE_URL`). Loads `.env.local` in dev, `.env` in production. `postinstall` runs `prisma generate`.

**`generated/` is gitignored** — always run `prisma generate` after pulling schema changes.

Prisma client: eagerly in production, lazily in dev via `global.prisma` for hot-reload safety.

### Socket.io (standalone)

`src/socket/server.ts` — self-contained with own Prisma+pg pool. Imports from relative `../../generated/prisma` (NOT `@/` paths). Background jobs inline (due date reminders/overdue checks every 60s, 90-day audit cleanup at midnight). HTTP: `GET /health` for Railway, `GET /` returns status string.

`utils/socket-emitter.ts` is a Socket.io **client** — server actions emit through it to the standalone server.

### Middleware

**`proxy.ts`** at project root — not `middleware.ts`. Next.js 16 auto-detects it. Handles auth guards + RBAC redirects.

### Auth

Custom JWT via `jose` (HS256, 7-day expiry), HTTP-only cookies. Login is an API route (`POST /api/auth/login`), not a server action. `lib/auth.ts` has encrypt/decrypt; `lib/auth-server.ts` is `'use server'` for cookie management. `JWT_SECRET` has a dev fallback — **must be set in production**.

### Other

- **Roles:** `ADMIN`, `MANAGER`, `MEMBER` (UPPERCASE in DB)
- **Tailwind CSS 4:** `@import "tailwindcss"`, `@theme inline`, `@custom-variant dark`, PostCSS via `@tailwindcss/postcss`. Class sorting via `cn()`/`cva()` in `.prettierrc`
- **Zod v4:** Date fields from HTML forms use `z.string()` (not `z.string().datetime()`) since `<input type="date">` returns `YYYY-MM-DD`
- **shadcn** style `radix-nova`, components in `components/ui/`
- **Offline:** IndexedDB queue (`lib/offline-db.ts`), Zustand store (`lib/store/use-offline-store.ts`), sync via `lib/offline-sync.ts`

## Code Conventions

- `@/` path alias maps to project root (`./*` in tsconfig)
- Server actions return `ActionResult<T>` (`types/kanban.ts:171`): `{ success, data?, error?, message?, fieldErrors? }`
- Server actions live in `actions/*-actions.ts` (barrel in `actions/index.ts` — note: `notification-preferences-actions.ts` is not in the barrel export)
- `createAuditLog()` in `lib/create-audit-log.ts` auto-injects IP — use for all mutations
- Prisma enum returns need casting (`as string`, `as Priority`) when crossing server/client boundary
- Import enums via `@/lib/prisma` (re-exports from `generated/prisma`)
- `tsconfig.json` excludes `scripts/` and `scratch/` — files there use `npx tsx`, don't import from app code
- **No semicolons, double quotes** — see `.prettierrc` for full config

## RBAC

Checks live inside server action files (not a shared lib):
- `checkAdmin()` (private, `actions/admin-actions.ts`) — ADMIN only
- `checkManager()` (private, `actions/manager-actions.ts`) — ADMIN or MANAGER
- `checkBoardPermission()` (exported, `actions/board-actions.ts`) — board membership + owner + role; ADMIN always has access
- `checkTaskPermission()` (private, `actions/task-actions.ts`) — board membership + ownership + role; ADMIN always has access
- MEMBER can edit/delete/add tasks in ANY board they belong to (collaboration model); MEMBER cannot create boards

## Socket Architecture

`useSocket` hook (`components/kanban/socket-hooks.ts`): module-level singleton, joins/leaves board rooms on `boardId` change, `useMemo` for user prop, unmount cleanup via ref.

**Notification flow:** Server action → `sendNotification()` in `utils/notification-utils.ts` (checks prefs, writes DB) → `emitNotification()` (Socket.IO client → server) → server relays to `user:${userId}` room → browser `useNotificationListener` in `notification-bell.tsx`. **Must call `sendNotification()`** — just emitting a socket event is not enough (no DB record = no bell badge, no persistence).

**Adding a new notification type requires:** `NotifType` union member, `notifTypeToPrefKey` entry, `booleanPrefKeys` entry, `NotificationPreference` schema field in `prisma/schema.prisma`, and `NotificationPreference` interface field in `types/kanban.ts`. Currently 14 types (11 base + 3 sprint). Sprint types map to existing preference keys (`taskAssigned`, `statusChanged`).

## Gotchas

- **Never pass object refs as useEffect deps.** `useSocket` must use `useMemo` to stabilize `user` prop — raw objects cause infinite join/leave loops
- **All Dialog components must include `<DialogDescription>`** (even with `className="sr-only"`). Radix throws without it
- **Recharts `ResponsiveContainer` needs explicit pixel dimensions.** `height="100%"` causes negative dimension errors. Use `height={300}`
- **After mutations, call `router.refresh()`.** `revalidatePath` alone isn't enough for client updates
- **API routes must use `auth-server.ts` for cookies** — do NOT import `cookies` from `next/headers` directly in route handlers (Turbopack returns 404 at runtime). Use `login()`/`logout()`/`getSession()` from `@/lib/auth-server.ts`
- **Socket event field names must match exactly.** `task:moved` uses `newColumnId`/`oldColumnId` — not `columnId`/`previousColumnId`
- **Emit socket events AFTER database commits** so clients receive updated data
- **`dnd-kit` SSR hydration mismatches** (`DndDescribedBy-0` vs `DndDescribedBy-1`). Do not use `next/dynamic` with `ssr: false` in Server Components — wrap DndContext in a Client Component boundary
- **Props-to-state sync:** Client components receiving server props need `useEffect` to sync on changes. `useState(initialValue)` only uses value on first render
- **AuditLog `details` is `Json`, not a string.** Never render as `{log.details}` — format with helper based on `action` type
- **Radix Select crash on empty value:** `<SelectItem value="">` crashes. Use `value="__none__"` or handle in `onValueChange`
- **`_count` returns numbers, not relations.** If UI needs `task.checklists?.length`, include full relation: `checklists: { include: { items: true } }`
- **Board page full-width:** `app/dashboard/board/[id]/page.tsx` uses `-m-6` to cancel parent `p-6` — don't add padding wrappers inside it
- **Board queries must include owner:** `OR: [{ members: { some: { id } } }, { ownerId: id }]`
- **Schema validation limits:** `createBoardSchema` name max 50, desc max 255. `createTaskSchema` title max 100, desc max 1000
- **Node.js 22+ required** (`.nvmrc`). Prisma v7 needs `^20.19 || ^22.12 || >=24.0`. Railway sets `NIXPACKS_NODE_VERSION=22`
- **Turbopack may fail on Google Fonts** if `fonts.gstatic.com` is unreachable — retry usually succeeds
- **`scripts/` files importing `@prisma/client`** instead of `../generated/prisma` break the Next.js build
- **Socket server port resolution:** `SOCKET_PORT` → `PORT` → default `3001`. In local dev `SOCKET_PORT=3001` prevents collision with Next.js `PORT=3002`. Railway auto-injects `PORT`
- **Vercel build fails silently** (exit 1, no logs) if env vars missing — set all in dashboard

## Business Logic

- **Task version conflict detection:** `version` field incremented on every update. If `clientVersion !== serverVersion` → conflict error. Pass `version: undefined` to bypass
- **Undo is time-limited:** 30-second window. Also cleans audit logs older than 5 minutes
- **Comment editing:** Non-admin/manager can only edit within 5 minutes (`FIVE_MINUTES_MS` in `actions/task-actions.ts`)
- **Member task assignment:** Members can only assign to themselves (enforced in `createTask`/`updateTask`). Admins/managers can assign to anyone
- **WIP limits only enforced for members.** Admin/manager override logged as `UPDATE_TASK_STATUS_OVERRIDE`
- **Review auto-moves tasks:** `APPROVED` → "Done", `CHANGES_REQUESTED` → "In Progress", `REJECTED` → "To Do" (case-insensitive column name match)
- **Signup defaults:** `MEMBER` role + default `NotificationPreference`. Self-signup via `POST /api/auth/signup` auto-logs in

## Sprint Planning

- **Role mapping:** MANAGER = Scrum Master/PO (creates sprints, plans backlog, manages epics), MEMBER = read-only, ADMIN = full oversight
- **Routes:** `/manager/{backlog,sprints,sprints/[id],epics}` — CRUD. `/member/{backlog,sprints,sprints/[id],epics}` — read-only
- **readOnly pattern:** Sprint components (`BacklogView`, `SprintList`, `SprintDetail`, `EpicList`) accept `readOnly?: boolean`
- **Server actions:** `actions/sprint-actions.ts`, `actions/epic-actions.ts`, `actions/issue-link-actions.ts`
- **Sprint lifecycle:** PLANNED → ACTIVE → COMPLETED (or CANCELLED). CANCELLED → PLANNED allowed. MANAGER/ADMIN only
- **Velocity:** `storyPoints` counts tasks in "done" column only (not all sprint tasks)

## Production Deployment

See [VERCEL.md](./VERCEL.md) and [RAILWAY.md](./RAILWAY.md) for full guides.

- **Vercel** (Next.js): required env vars: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_APP_URL`, `ALLOWED_ORIGIN`, `PORT=3002`
- **Railway** (Socket.IO): `railway up` — self-contained (own Prisma+pg pool, `/health` endpoint, no `@/` imports)
- **Supabase** (PostgreSQL): `DATABASE_URL` with `?pgbouncer=true` (port 6543), `DIRECT_URL` (port 5432)
- CSP `connect-src` in `next.config.mjs` built from `NEXT_PUBLIC_SOCKET_URL` — must include Railway URL

## Test Accounts

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
| Middleware | `proxy.ts` (root, not `middleware.ts`) |
| Server actions | `actions/*-actions.ts` (barrel: `actions/index.ts`) |
| Socket server | `src/socket/server.ts` (standalone, own Prisma, no `@/`) |
| Socket emitter | `utils/socket-emitter.ts` (Socket.IO **client**) |
| Notification utils | `utils/notification-utils.ts` (must call `sendNotification()`) |
| Sprint components | `components/sprint/*` (all accept `readOnly?: boolean`) |

## Specs

Feature requirements in `systemtodo.md` and `roledependent.md`.
