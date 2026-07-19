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

**PowerShell note:** Windows PowerShell does NOT support `&&`. Use `;` or `if ($?) { cmd2 }` for sequential commands.

## Environment

**Required** in `.env.local`: `DATABASE_URL`, `JWT_SECRET`

**Optional:** `JWT_EXPIRES_IN` (default `7d`), `ALLOWED_ORIGIN`, `EMAIL_HOST/PORT/USER/PASS/SECURE/FROM`, `NEXT_PUBLIC_SOCKET_URL` (default `http://localhost:3001`), `NEXT_PUBLIC_APP_URL`, `SOCKET_PORT` (default 3001), `PORT`, `DIRECT_URL` (for Prisma CLI)

- **`NEXT_PUBLIC_SOCKET_URL` is missing from `.env.example` but required for production.**
- **`.env.example` ships hardcoded-looking SMTP credentials (`EMAIL_USER`/`EMAIL_PASS`).** Treat them as compromised — do not reuse, rotate the mailbox's app password, and never copy `.env.example` verbatim into `.env.production`.
- `.env.local` is the dev source of truth: `lib/prisma.ts`, `prisma.config.ts`, `src/socket/server.ts`, and the `seed`/`check-*` scripts all call `dotenv.config({ path: '.env.local' })`. Production reads plain `.env`/`.env.production` via `NODE_ENV` guards.
- For Supabase: `?pgbouncer=true` on `DATABASE_URL` (pooled, port 6543), separate `DIRECT_URL` (port 5432). SSL auto-applied when URL contains `supabase.com`.

## Architecture

**Port 3002, not 3000.** Next.js dev on 3002. Socket.io standalone on 3001 (via `SOCKET_PORT`). Dev uses `concurrently` to run both.

**Landing page (`/`) auto-redirects** authenticated users to role-specific dashboards: ADMIN→`/admin`, MANAGER→`/manager`, MEMBER→`/member`. Logged-out users see a static marketing page.

**ESM project** (`"type": "module"`). All config files use `.mjs`. Never create `.cjs` configs.

### Prisma v7

Uses `@prisma/adapter-pg` (wrapping `pg.Pool`) — NOT `@prisma/adapter-neon` despite both being in `package.json`. Client output is `generated/prisma` (imported as `'../generated/prisma'` from `lib/prisma.ts`). `prisma.config.ts` uses `DIRECT_URL` for schema ops (falls back to `DATABASE_URL`). `postinstall` runs `prisma generate`.

**Migrations (production-safe):** Project now uses Prisma migrations instead of `db push`. Initial baseline migration `0001_init` covers all tables.
- **Dev:** `npx prisma migrate dev --name <description>` — creates + applies migrations locally
- **Prod:** `npx prisma migrate deploy` — applies pending migrations (runs ALTER TABLE, never drops data)
- **First time on existing prod DB:** `npx prisma migrate resolve --applied 0001_init` — marks migration as done without running SQL (preserves existing data)

**`generated/` is gitignored** — always run `prisma generate` after pulling schema changes.

Prisma client: eagerly in production, lazily in dev via `global.prisma` for hot-reload safety.

### Socket.io (standalone)

`src/socket/server.ts` — self-contained with own Prisma+pg pool. Imports from relative `../../generated/prisma` (NOT `@/` paths). Background jobs inline (due date reminders/overdue checks every 60s, 90-day audit cleanup at midnight). HTTP: `GET /health` for Railway.

**Known inconsistency:** the socket server's background worker hardcodes `column: { name: { not: 'Done' } }` for overdue/due-soon queries (it cannot import `findDoneColumnName()` since `@/` is unavailable there). App code must still use `findDoneColumnName()`; only the standalone worker is exempt.

`utils/socket-emitter.ts` is a Socket.io **client** — server actions emit through it to the standalone server.

### Middleware

**`proxy.ts`** at project root — not `middleware.ts`. Next.js 16 auto-detects it. Handles auth guards + RBAC redirects.

### Auth

Custom JWT via `jose` (HS256, 7-day expiry), HTTP-only cookies + localStorage (for Socket.IO handshake). Login is an API route (`POST /api/auth/login`), not a server action. `lib/auth.ts` has encrypt/decrypt; `lib/auth-server.ts` is `'use server'` for cookie management. **`JWT_SECRET` is required** — throws at startup if missing. JWT payload includes `passwordVersion`; `getSession()` re-validates against the DB (checks `isActive` + `passwordVersion` match) every call to invalidate tokens on password changes.

### Other

- **Roles:** `ADMIN`, `MANAGER`, `MEMBER` (UPPERCASE in DB)
- **Tailwind CSS 4:** `@import "tailwindcss"`, `@plugin "../node_modules/tailwindcss-animate"`, `@custom-variant dark`, **dual `@theme` + `@theme inline`** (see Design System below). PostCSS via `@tailwindcss/postcss`
- **Zod v4:** Date fields from HTML forms use `z.string()` (not `z.string().datetime()`) — `<input type="date">` returns `YYYY-MM-DD`
- **shadcn** style `radix-nova`, components in `components/ui/`
- **Offline:** IndexedDB queue (`lib/offline-db.ts`), Zustand store (`lib/store/use-offline-store.ts`), sync via `lib/offline-sync.ts`, `<OfflineProvider>` wrapper in root layout (`app/layout.tsx`), service worker at `public/sw.js`

## Code Conventions

- `@/` path alias maps to project root (`./*` in tsconfig)
- Server actions return `ActionResult<T>` (defined in `types/kanban.ts`): `{ success, data?, error?, message?, fieldErrors? }`
- Server actions live in `actions/*-actions.ts` (barrel in `actions/index.ts` — **`notification-preferences-actions.ts` is NOT in the barrel**)
- `createAuditLog()` in `lib/create-audit-log.ts` auto-injects IP — use for all mutations
- Password reset uses `PasswordResetToken` model + nodemailer (`utils/mail.ts`); dev logs link to console
- Prisma enum returns need casting (`as string`, `as Priority`) when crossing server/client boundary
- Import enums via `@/lib/prisma` (re-exports from `generated/prisma`)
- `tsconfig.json` excludes `scripts/` and `scratch/` — files there use `npx tsx`, don't import from app code
- **No semicolons, double quotes, `printWidth: 80`, `trailingComma: "es5"`, `endOfLine: "lf"`** — see `.prettierrc` for full config
- **Shared board query:** use `getUserBoards(sessionId)` from `actions/board-actions.ts` instead of duplicating the `OR: [{ ownerId }, { members }]` pattern

## Design System (Attio-inspired)

Defined in `app/globals.css`. Uses **named Tailwind tokens** via dual `@theme` + `@theme inline` — prefer these over hardcoded hex.

| Token | Utility | Value |
|-------|---------|-------|
| `--color-canvas` | `bg-canvas` | `#ffffff` |
| `--color-canvas-soft` | `bg-canvas-soft` | `#fafafa` |
| `--color-ink` | `text-ink` | `#1a1a1a` |
| `--color-body-text` | `text-body-text` | `#5a5a5a` |
| `--color-muted-text` | `text-muted-text` | `#8a8a8a` |
| `--color-accent` | `bg-accent` / `text-accent` | `#2c67f2` |
| `--color-accent-soft` | `bg-accent-soft` | `#eaf1fe` |
| `--color-accent-strong` | `hover:bg-accent-strong` | `#1d50d6` |
| `--color-hairline` | `border-hairline` | `#e8e8eb` |
| `--color-success` | `text-success` | `#16a34a` |
| `--color-warning` | | `#d97706` |
| `--color-error` | | `#dc2626` |
| `--color-on-primary` | `text-on-primary` (text on dark/accent bg) | `#ffffff` |

- **Display utility classes:** `.display-mega`, `.display-xl`, `.display-lg`, `.display-md`, `.display-sm` — fluid responsive at `md:` breakpoint
- **`@theme` block:** static design tokens (canvas, ink, accent, hairline, radii, shadows, animations)
- **`@theme inline` block:** maps shadcn semantic tokens (`--color-background: var(--background)`, etc.) — needed for shadcn components to generate `bg-background`, `text-foreground`, `border-border` utilities
- **Accent is for UI/data/CTA only** — not for marketing headline text
- **Landing page components:** `FloatingHero` (`components/floating-hero.tsx`), `DemoKanban` (`components/demo-kanban.tsx`), `MobileNav` (`components/mobile-nav.tsx`), `LogoIcon` (`components/logo-icon.tsx`), `MotionDiv` (`components/motion-div.tsx`)
- **Landing page section order:** Hero (floating cards) → Social proof → Demo Kanban → Features → Bento Grid → AI Features → Pricing → CTA → Footer

## RBAC

Checks live inside server action files (not a shared lib):
- `checkAdmin()` (private, `actions/admin-actions.ts`) — ADMIN only
- `checkManager()` (private, `actions/manager-actions.ts`) — ADMIN or MANAGER
- `checkBoardPermission()` (exported, `actions/board-actions.ts`) — board membership + owner + role; ADMIN always has access
- `checkTaskPermission()` (private, `actions/task-actions.ts`) — board membership + ownership + role; ADMIN always has access
- MEMBER can edit/delete/add tasks in ANY board they belong to (collaboration model); MEMBER cannot create boards
- Board header `canEditBoard` includes ADMIN, MANAGER, and owner (not just ADMIN + owner)

## Socket Architecture

`useSocket` hook (`components/kanban/socket-hooks.ts`): module-level singleton, joins/leaves board rooms on `boardId` change, `useMemo` for user prop, unmount cleanup via ref. Checks `socket.connected` on init to avoid stale `isConnected` after navigation.

**Notification flow:** Server action → `sendNotification()` in `utils/notification-utils.ts` (checks prefs, writes DB) → `emitNotification()` (Socket.IO client → server) → server relays to `user:${userId}` room → browser `useNotificationListener` in `notification-bell.tsx`. **Must call `sendNotification()`** — just emitting a socket event is not enough (no DB record = no bell badge, no persistence). `sendNotification()` is wrapped in try/catch — notification failures don't crash parent actions.

**Adding a new notification type requires:** `NotifType` union member, `notifTypeToPrefKey` entry, `booleanPrefKeys` entry, `NotificationPreference` schema field in `prisma/schema.prisma`, and `NotificationPreference` interface field in `types/kanban.ts`. Sprint types map to `taskAssigned`/`statusChanged`. Epic types map to `epicUpdated`. IssueLink types map to `issueLinkUpdated`.

**Socket event standardization:** `task:moved` events use `newColumnId`/`oldColumnId` and include `userId`/`userName`. `task:updated` events also skip self-echo via `data.userId` check. Column events (`column:created`, `column:updated`, `column:deleted`) relay only `boardId` + `columnId` (NOT full objects). Sprint events are relayed by socket server.

**Socket emitter waits for connection:** `emitBoardEvent` checks `s.connected` and queues via `s.once('connect', ...)` if not yet connected.

## Gotchas

- **PowerShell `&&` not supported:** Use `;` or `if ($?) { cmd2 }` for sequential commands. `npm run db:setup` in package.json uses `&&` which works in npm scripts but not in direct PowerShell commands.
- **Stray duplicate at repo root:** `check-users.ts` exists at the project root AND in `scripts/check-users.ts`. The root copy is matched by tsconfig's `**/*.ts` (not excluded) — don't extend it; use `scripts/check-users.ts` (invoked by `npm run check-users`).
- **DnD socket self-echo:** `handleBoardEvent` for `task:moved` checks `data.userId === currentUser.id` and skips. Also skips during active drag via `isDraggingRef`. `task:updated` events also skip self-echo via `data.userId` check.
- **`onDragOver` infinite loop:** DndKit fires `onDragOver` rapidly. Use `useRef` to track `activeId→targetColumnId` and skip `setBoard` if already moved. `onDragStart`/`onDragOver` wrapped in `useCallback`.
- **`onDragEnd` stale closure:** Uses `boardRef.current` (not `board` state) to avoid stale indices during rapid drags.
- **Failure recovery:** On drag/reorder failure, use `router.refresh()` — NOT `setBoard(initialBoard)` which discards all optimistic updates.
- **Sprint detail crash:** `getSprintDetail` query MUST include `column: { select: { id: true, name: true } }` in the tasks include. Missing it causes "Cannot read properties of undefined (reading 'name')" on the sprint detail page.
- **Done column detection:** Always use `findDoneColumnName()` from `sprint-actions.ts` (checks "done"/"completed"/"resolved", falls back to last column). Never hardcode column name checks — column names are user-defined.
- **Epic detail gets `doneColumnName` from server:** `getEpicDetail` returns `{ ...epic, doneColumnName }` — the client must use this field, not hardcode "done".
- **Server action schema shape matters:** Always check whether an action expects `z.string()` (bare) or `z.object({ ... })` (object). Mismatched calls silently fail (ZodError caught, returns `{ success: false }`).
- **Never pass object refs as useEffect deps.** `useSocket` uses `useMemo` to stabilize `user` prop — raw objects cause infinite join/leave loops
- **All Dialog components must include `<DialogDescription>`** (even with `className="sr-only"`). Radix throws without it
- **Recharts `ResponsiveContainer` needs explicit pixel dimensions.** `height="100%"` causes negative dimension errors. Use `height={300}`
- **`dnd-kit` SSR hydration mismatches** (`DndDescribedBy-0` vs `DndDescribedBy-1`). Do not use `next/dynamic` with `ssr: false` in Server Components — wrap DndContext in a Client Component boundary
- **After mutations, call `router.refresh()`.** `revalidatePath` alone isn't enough for client updates
- **API routes must use `auth-server.ts` for cookies** — do NOT import `cookies` from `next/headers` directly in route handlers (Turbopack returns 404 at runtime). Use `login()`/`logout()`/`getSession()` from `@/lib/auth-server.ts`
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
- **`notification-utils.ts` is NOT a server action** — `'use server'` was removed. Functions are called from server actions and API routes only.
- **Dev server cold start:** First page load after `.next` deletion takes 30-40 seconds (Turbopack compilation). Subsequent loads are 200-500ms.
- **Task card click:** dnd-kit `{...listeners}` must NOT be spread on the Card element — it intercepts `onClick`. Spread on a drag handle element (e.g., `MoreVertical` icon) instead.
- **SidebarMenuButton with Link:** When using `asChild` with Next.js `Link`, cast props as `any` to avoid type conflicts between `<button>` and `<a>` ref types.
- **Sidebar collapse:** Use `group-data-[collapsible=icon]:hidden` on text labels that should hide when sidebar is collapsed to icon-only mode. Header/footer must use `group-data-[collapsible=icon]:justify-center` and `group-data-[collapsible=icon]:px-0` to center icons properly.
- **Theme tokens in new code:** Always use named tokens (`bg-canvas`, `text-ink`, `text-body-text`, `bg-accent`, `bg-accent-soft`, `border-hairline`) instead of hardcoded hex values. Only auth pages and dashboards still have legacy hex that hasn't been migrated yet.

### Agent-browser testing notes

- `click @eN` syntax fails with "Missing arguments" error in v0.27.0. Use `find text "X" click` or `eval "..."` instead.
- `fill @eN` works inconsistently. Use `find label "X" fill` or `type "selector"` for reliable input.
- Always use `--session` flag for isolated browser sessions.
- `snapshot -i` (interactive elements only) is the recommended approach.
- Clear cookies between role tests: `cookies clear` then navigate to `/login`.

## Business Logic

- **Task version conflict detection:** `version` field incremented on every update. `updateTaskSchema` and `moveTaskSchema` now accept optional `version` — `undefined` bypasses conflict check (used for force-overwrite).
- **Undo is time-limited:** 30-second window. Only deletes the specific audit log entry being undone (no longer destroys all old logs).
- **Comment editing:** Admin/manager can edit any comment. Others can only edit own comments within 5 minutes (`FIVE_MINUTES_MS` in `actions/task-actions.ts`).
- **Member task assignment:** Members can only assign to themselves and cannot unassign other users. Admins/managers can assign to anyone.
- **WIP limits:** Enforced for members only. Admin/manager override logged as `UPDATE_TASK_STATUS_OVERRIDE`. WIP check runs inside `$transaction` to prevent TOCTOU race. Automation `handleMoveTask` also checks WIP limits.
- **Review auto-moves tasks:** `APPROVED` → last column (or "Done"), `CHANGES_REQUESTED` → second column (or "In Progress"), `REJECTED` → first column (or "To Do"). Falls back to column order if names don't match.
- **Review status:** Uses `ReviewStatus` enum (`PENDING`, `APPROVED`, `CHANGES_REQUESTED`, `REJECTED`) — not a free-form string.
- **Self-review blocked:** `reviewerId` cannot equal `session.id`.
- **Only one PENDING review per task:** Creating a second returns an error.
- **Signup defaults:** `MEMBER` role + default `NotificationPreference`. Self-signup via `POST /api/auth/signup` auto-logs in. Admin-created users also get default preferences.
- **Auto-welcome-board:** On signup (or when admin creates a MEMBER user), a welcome board named `"{name}'s Board"` is auto-created with 3 default columns (To Do / In Progress / Done). The user is set as owner+member. A notification fires: "Developer assigned you a board to check the functionality of the system". Board creation failure does not block signup — wrapped in try/catch in both `app/api/auth/signup/route.ts` and `actions/admin-actions.ts:createUser`.
- **Due date display:** Uses `toLocaleDateString('en-CA')` (ISO format) — NOT `toISOString()` which shifts timezone.
- **Checklist inputs:** Per-checklist state (not shared across all checklists).
- **Tag operations sync version:** Adding/removing tags updates the task's `version` to prevent false conflicts.

## Sprint Planning

- **Backlog is implicit:** all tasks where `sprintId = null` AND `parentId = null` AND column is NOT the "done" column. Uses `findDoneColumnName()` to identify the done column. Subtasks excluded from top-level backlog.
- **Role mapping:** MANAGER = Scrum Master/PO (creates sprints, plans backlog, manages epics). MEMBER = read-only. ADMIN = full oversight
- **Routes:** `/manager/{backlog,sprints,sprints/[id],epics}` — CRUD. `/member/{backlog,sprints,sprints/[id],epics}` — read-only
- **readOnly pattern:** All sprint components (`BacklogView`, `SprintList`, `SprintDetail`, `EpicList`) accept `readOnly?: boolean`
- **Server actions:** `actions/sprint-actions.ts`, `actions/epic-actions.ts`, `actions/issue-link-actions.ts`
- **Sprint lifecycle:** PLANNED → ACTIVE → COMPLETED (or CANCELLED). CANCELLED → PLANNED allowed. Cannot delete ACTIVE sprints. MANAGER/ADMIN only.
- **No overlapping sprints:** Creating/updating a sprint checks for date overlaps with existing PLANNED/ACTIVE sprints on the same board.
- **Only one ACTIVE sprint per board:** Transition to ACTIVE is atomic via `$transaction` — checks and updates happen in one TX to prevent race conditions.
- **Sprint completion auto-moves incomplete tasks:** Tasks not in the "done" column have `sprintId` set to `null` (back to backlog). This runs inside the same `$transaction` as the status update.
- **Sprint deletion auto-unlinks tasks:** Tasks get `sprintId: null` instead of blocking deletion.
- **Velocity:** Uses `findDoneColumnName()` helper — matches "done"/"completed"/"resolved" or falls back to the last column by order.
- **Epic status transitions:** Validated (BACKLOG→IN_PROGRESS→COMPLETED, CANCELLED→BACKLOG). Arbitrary jumps rejected.
- **Epic detail includes sprint info** for each task.
- **Backlog `_count` includes** `comments`, `attachments`, `checklists`, `subtasks`.

## Issue Links

- **Bidirectional duplicate detection:** Creating `A BLOCKS B` then `B BLOCKED_BY A` (or vice versa) is rejected.
- **Self-links rejected:** Cannot link a task to itself.
- **Same-board only:** Both tasks must be on the same board.
- **Task search for linking:** `searchBoardTasks({ boardId, query, excludeTaskId })` in `actions/issue-link-actions.ts` — board-scoped, case-insensitive title search, excludes current task.
- **`getTaskIssueLinks` expects `{ taskId: string }`** (object), NOT a bare string. Other query actions like `getSprintsByBoard` use bare `z.string()` — don't confuse them.

## Board Templates

- **4 predefined templates** in `lib/board-templates.ts`: Scrum Sprint, Kanban Board, Product Launch, Bug Tracking
- Each template defines columns (name, order, WIP limit) and sample tasks
- **Templates sidebar:** Collapsible group in `components/app-sidebar.tsx` — ADMIN and MANAGER only; MEMBER does not see it
- `createBoardFromTemplate(templateId)` in `actions/board-actions.ts` — creates board + columns + tasks inside `$transaction`
- Templates are code-defined (not DB-stored) — no Prisma schema changes needed to add/modify templates

## Production Deployment

See [VERCEL.md](./VERCEL.md) and [RAILWAY.md](./RAILWAY.md) for full guides.

**Quick deploy via Vercel CLI:** `npx vercel --prod --yes` (builds locally validated, pushes to production). Always run `npm run typecheck` then `npm run build` before deploying.

- **Vercel** (Next.js): required env vars: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_APP_URL`, `ALLOWED_ORIGIN`, `PORT=3002`
- **Render** (Socket.IO): deploy as Web Service — Build: `npm install`, Start: `npx tsx src/socket/server.ts`. **Do NOT set `PORT`** — Render injects it. Auto-detects Node 22 from `.nvmrc`.
- **Supabase** (PostgreSQL): `DATABASE_URL` with `?pgbouncer=true` (port 6543), `DIRECT_URL` (port 5432)
- CSP `connect-src` in `next.config.mjs` built from `NEXT_PUBLIC_SOCKET_URL` — must include Render/Railway URL

### Syncing schema to production Supabase

**IMPORTANT — Migration vs db push:**

On an **existing production DB** with data, `prisma migrate resolve --applied` only marks the migration as done — it does NOT run the SQL. You must follow it with `prisma db push` to apply the actual column changes:

```powershell
$env:DIRECT_URL = "postgresql://user:pass@host.supabase.com:5432/postgres"
$env:DATABASE_URL = "postgresql://user:pass@host.supabase.com:6543/postgres?pgbouncer=true"

# Step 1: Mark initial migration as applied (no SQL executed)
npx prisma migrate resolve --applied 0001_init

# Step 2: Push schema changes to production (ALTER TABLE ADD COLUMN only — data safe)
npx prisma db push
```

For **future schema changes**, use proper migrations:
```powershell
# Dev: create migration locally
npx prisma migrate dev --name <description>

# Prod: apply migration (runs ALTER TABLE, never drops data)
npx prisma migrate deploy
```

To seed production: `npx tsx -r dotenv/config prisma/seed.ts dotenv_config_path=.env.production`

- `DIRECT_URL` (port 5432) required for schema ops — needs direct connection, not pgbouncer
- `DATABASE_URL` (port 6543, pgbouncer) only for app runtime queries
- `prisma db push` is safe on existing data — it only ADDs columns/indexes, never DROPs

### Render Socket Server Setup

Deploy as **Web Service** (not Static Site). Fix the autofilled Next.js defaults:

| Field | Change To |
|-------|-----------|
| Build Command | `npm install` (triggers `prisma generate` via postinstall) |
| Start Command | `npx tsx src/socket/server.ts` |

**Required env vars:** `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `ALLOWED_ORIGIN` (Vercel URL), `NODE_ENV=production`

**Do NOT set `PORT`** — Render auto-injects it. The socket server reads `process.env.PORT` first (`src/socket/server.ts`).

After deploy, update `NEXT_PUBLIC_SOCKET_URL` in Vercel to the Render URL and redeploy Vercel.

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
| Socket emitter | `utils/socket-emitter.ts` (Socket.IO **client**, waits for connection) |
| Notification utils | `utils/notification-utils.ts` (NOT a server action, try/catch wrapped) |
| Sprint components | `components/sprint/*` (all accept `readOnly?: boolean`) |
| DnD hook (infinite loop prone) | `hooks/use-kanban-board.ts` (uses `boardRef` for stale safety) |
| Board (client-only wrapper) | `components/kanban/kanban-board-dynamic.tsx` (dynamic import with `ssr: false` — fixes dnd-kit hydration mismatch) |
| Board templates | `lib/board-templates.ts` |
| Shared board query | `getUserBoards()` in `actions/board-actions.ts` |
| Offline sync | `lib/offline-db.ts` (IndexedDB), `lib/offline-sync.ts`, `lib/store/use-offline-store.ts` |
| Service worker | `public/sw.js` (triggers sync on reconnect) |
| Landing page | `app/page.tsx` (hero + floating cards + demo + pricing) |
| Design tokens | `app/globals.css` (`@theme` + `@theme inline`) |

## Notification Types

All types in `utils/notification-utils.ts` with preference keys:

| Type | Pref Key | Icon |
|------|----------|------|
| TASK_ASSIGNED | taskAssigned | 📋 |
| TASK_STATUS_CHANGED | statusChanged | 🔄 |
| COMMENT_MENTION | commentMention | 💬 |
| REVIEW_REQUESTED | reviewRequested | 🔍 |
| REVIEW_COMPLETED | reviewCompleted | ✅ |
| AUTOMATION_TRIGGERED | automationTriggered | ⚡ |
| DUE_DATE_REMINDER | dueDateReminder | ⏰ |
| OVERDUE | overdueReminder | ⚠️ |
| NEW_USER_SIGNUP | newUserSignup | 🎉 |
| BOARD_MEMBER_ADDED | boardMemberAdded | 👥 |
| BOARD_MEMBER_REMOVED | boardMemberRemoved | 👋 |
| SPRINT_STARTED | taskAssigned | 🚀 |
| SPRINT_COMPLETED | statusChanged | 🏁 |
| TASK_ADDED_TO_SPRINT | taskAssigned | 📅 |
| EPIC_CREATED | epicUpdated | 🎯 |
| EPIC_UPDATED | epicUpdated | 📊 |
| EPIC_DELETED | epicUpdated | 🗑️ |
| ISSUE_LINK_CREATED | issueLinkUpdated | 🔗 |
| ISSUE_LINK_DELETED | issueLinkUpdated | 🔓 |
