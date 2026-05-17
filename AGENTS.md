# SmartTask Agent Guide

## Project

Real-time Kanban board with RBAC, WIP limits, offline support, undo via audit log, task automation, and sprint planning.

**Stack:** Next.js 16 (App Router), React 19, Prisma v7 + PostgreSQL, Socket.io (standalone), Tailwind CSS 4, shadcn/radix-nova, Zustand, Zod v4

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | `db:check` **(blocks if DB unreachable)**, then Socket.io (3001) + Next.js (3002) |
| `npm run build` | Production build — run after typecheck |
| `npm run typecheck` | `tsc --noEmit` — primary verification |
| `npm run lint` | ESLint; ignores `generated/` and `scratch/` |
| `npm run format` | Prettier — no semicolons, double quotes, `printWidth: 80`, auto-sorts Tailwind via `cn`/`cva` |
| `npm run db:setup` | `prisma db push && prisma generate && npm run seed` |
| `npm run seed` | Seeds DB from `.env.local`; seed password: `AdminPassword123!` |
| `npm run socket:dev` | Standalone Socket.io server only (`npx tsx src/socket/server.ts`) |
| `npm run db:check` | Verifies DB connectivity (auto-run by `dev`) |
| `npm run check-users` | Diagnostic: verify user roles/credentials in DB |
| `npm run check-boards` | Diagnostic: validate board memberships |

**Verification order:** `typecheck` → `build` — **no test suite**.

## Environment

**Required** in `.env.local`: `DATABASE_URL`, `JWT_SECRET`

**Optional:** `ALLOWED_ORIGIN`, `EMAIL_HOST/PORT/USER/PASS/FROM`, `NEXT_PUBLIC_SOCKET_URL` (default `http://localhost:3001`), `NEXT_PUBLIC_APP_URL`, `SOCKET_PORT` (default 3001), `PORT`

- **`NEXT_PUBLIC_SOCKET_URL` is missing from `.env.example` but required for production.**
- For Supabase: `?pgbouncer=true` on `DATABASE_URL` (pooled, port 6543), separate `DIRECT_URL` (port 5432). SSL auto-applied when URL contains `supabase.com`.

## Architecture

**Port 3002, not 3000.** Next.js dev on 3002. Socket.io standalone on 3001 (via `SOCKET_PORT`).

**ESM project** (`"type": "module"`). All config files use `.mjs`. Never create `.cjs` configs.

### Prisma v7

Uses `@prisma/adapter-pg` (wrapping `pg.Pool`) — NOT `@prisma/adapter-neon` despite both being in `package.json`. Client output is `generated/prisma` (imported as `'../generated/prisma'` from `lib/prisma.ts`). Uses `db push` (not migrations). `prisma.config.ts` uses `DIRECT_URL` for schema ops (falls back to `DATABASE_URL`). `postinstall` runs `prisma generate`.

**`generated/` is gitignored** — always run `prisma generate` after pulling schema changes.

Prisma client: eagerly in production, lazily in dev via `global.prisma` for hot-reload safety.

### Socket.io (standalone)

`src/socket/server.ts` — self-contained with own Prisma+pg pool. Imports from relative `../../generated/prisma` (NOT `@/` paths). Background jobs inline (due date reminders/overdue checks every 60s, 90-day audit cleanup at midnight). HTTP: `GET /health` for Railway.

`utils/socket-emitter.ts` is a Socket.io **client** — server actions emit through it to the standalone server.

### Middleware

**`proxy.ts`** at project root — not `middleware.ts`. Next.js 16 auto-detects it. Handles auth guards + RBAC redirects.

### Auth

Custom JWT via `jose` (HS256, 7-day expiry), HTTP-only cookies. Login is an API route (`POST /api/auth/login`), not a server action. `lib/auth.ts` has encrypt/decrypt; `lib/auth-server.ts` is `'use server'` for cookie management. `JWT_SECRET` has a dev fallback — **must be set in production**.

### Other

- **Roles:** `ADMIN`, `MANAGER`, `MEMBER` (UPPERCASE in DB)
- **Tailwind CSS 4:** `@import "tailwindcss"`, `@theme inline`, `@custom-variant dark`, PostCSS via `@tailwindcss/postcss`
- **Zod v4:** Date fields from HTML forms use `z.string()` (not `z.string().datetime()`) — `<input type="date">` returns `YYYY-MM-DD`
- **shadcn** style `radix-nova`, components in `components/ui/`
- **Offline:** IndexedDB queue (`lib/offline-db.ts`), Zustand store (`lib/store/use-offline-store.ts`), sync via `lib/offline-sync.ts`

## Code Conventions

- `@/` path alias maps to project root (`./*` in tsconfig)
- Server actions return `ActionResult<T>` (`types/kanban.ts:171`): `{ success, data?, error?, message?, fieldErrors? }`
- Server actions live in `actions/*-actions.ts` (barrel in `actions/index.ts` — **`notification-preferences-actions.ts` is NOT in the barrel**)
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

- **DnD socket self-echo:** `handleBoardEvent` for `task:moved` must check `data.userId === currentUser.id` and skip — the optimistic update already moved the task. Without this guard the task gets duplicated in the target column. Also block socket events during active drag via `isDraggingRef`.
- **`onDragOver` infinite loop:** DndKit fires `onDragOver` rapidly during a drag. Use `useRef` to track `activeId→targetColumnId` and skip `setBoard` if the task was already moved to that column. Wrap `onDragStart`/`onDragOver` in `useCallback`.
- **Sprint detail crash:** `getSprintDetail` query MUST include `column: { select: { id: true, name: true } }` in the tasks include. Missing it causes "Cannot read properties of undefined (reading 'name')" on the sprint detail page.
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
- **Node.js 22+ required** (`.nvmrc`). Prisma v7 needs `^20.19 || ^22.12 || >=24.0`
- **`scripts/` files importing `@prisma/client`** instead of `../generated/prisma` break the Next.js build
- **Vercel build fails silently** (exit 1, no logs) if env vars missing — set all in dashboard
- **Turbopack may fail on Google Fonts** if `fonts.gstatic.com` is unreachable — retry usually succeeds

## Business Logic

- **Task version conflict detection:** `version` field incremented on every update. If `clientVersion !== serverVersion` → conflict error. Pass `version: undefined` to bypass
- **Undo is time-limited:** 30-second window. Also cleans audit logs older than 5 minutes
- **Comment editing:** Non-admin/manager can only edit within 5 minutes (`FIVE_MINUTES_MS` in `actions/task-actions.ts`)
- **Member task assignment:** Members can only assign to themselves. Admins/managers can assign to anyone
- **WIP limits only enforced for members.** Admin/manager override logged as `UPDATE_TASK_STATUS_OVERRIDE`
- **Review auto-moves tasks:** `APPROVED` → "Done", `CHANGES_REQUESTED` → "In Progress", `REJECTED` → "To Do" (case-insensitive column name match)
- **Signup defaults:** `MEMBER` role + default `NotificationPreference`. Self-signup via `POST /api/auth/signup` auto-logs in

## Sprint Planning

- **Backlog is implicit:** all tasks where `sprintId = null` on a board. No separate Backlog model; queried as `sprintId: null` in `getBacklogTasks`
- **Role mapping:** MANAGER = Scrum Master/PO (creates sprints, plans backlog, manages epics). MEMBER = read-only. ADMIN = full oversight
- **Routes:** `/manager/{backlog,sprints,sprints/[id],epics}` — CRUD. `/member/{backlog,sprints,sprints/[id],epics}` — read-only
- **readOnly pattern:** All sprint components (`BacklogView`, `SprintList`, `SprintDetail`, `EpicList`) accept `readOnly?: boolean`
- **Server actions:** `actions/sprint-actions.ts`, `actions/epic-actions.ts`, `actions/issue-link-actions.ts`
- **Sprint lifecycle:** PLANNED → ACTIVE → COMPLETED (or CANCELLED). CANCELLED → PLANNED allowed. Cannot delete ACTIVE sprints. MANAGER/ADMIN only.
- **Velocity:** `storyPoints` counts tasks in "done" column only (not all sprint tasks)

## Board Templates

- **4 predefined templates** in `lib/board-templates.ts`: Scrum Sprint, Kanban Board, Product Launch, Bug Tracking
- Each template defines columns (name, order, WIP limit) and sample tasks
- **Templates sidebar:** Collapsible group in `components/app-sidebar.tsx` — ADMIN and MANAGER only; MEMBER does not see it
- `createBoardFromTemplate(templateId)` in `actions/board-actions.ts` — creates board + columns + tasks via `prisma.task.createMany`
- Templates are code-defined (not DB-stored) — no Prisma schema changes needed to add/modify templates

## Production Deployment

See [VERCEL.md](./VERCEL.md) and [RAILWAY.md](./RAILWAY.md) for full guides.

- **Vercel** (Next.js): required env vars: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_APP_URL`, `ALLOWED_ORIGIN`, `PORT=3002`
- **Railway** (Socket.IO): `railway up` — self-contained (own Prisma+pg pool, `/health` endpoint, no `@/` imports)
- **Supabase** (PostgreSQL): `DATABASE_URL` with `?pgbouncer=true` (port 6543), `DIRECT_URL` (port 5432)
- CSP `connect-src` in `next.config.mjs` built from `NEXT_PUBLIC_SOCKET_URL` — must include Railway URL

### Syncing schema to production Supabase

```powershell
$env:DIRECT_URL = "postgresql://user:pass@host.supabase.com:5432/postgres"
$env:DATABASE_URL = "postgresql://user:pass@host.supabase.com:6543/postgres?pgbouncer=true"
npx prisma db push
```

To seed production: `npx tsx -r dotenv/config prisma/seed.ts dotenv_config_path=.env.production`

- `DIRECT_URL` (port 5432) required for `prisma db push` — needs direct connection, not pgbouncer
- `DATABASE_URL` (port 6543, pgbouncer) only for app runtime queries

## Test Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@smarttask.com | AdminPassword123! | ADMIN |
| manager@smarttask.com | AdminPassword123! | MANAGER |
| member@smarttask.com | AdminPassword123! | MEMBER |
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
| DnD hook (infinite loop prone) | `hooks/use-kanban-board.ts` |
| Board templates | `lib/board-templates.ts` |
