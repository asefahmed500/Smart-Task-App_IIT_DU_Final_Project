# SmartTask Agent Guide

## Project

Real-time Kanban board with RBAC, WIP limits, offline, undo via audit log, task automation, sprint planning.

**Stack:** Next.js 16 (App Router), React 19, Prisma v7 + PostgreSQL (driver adapter `@prisma/adapter-pg` wrapping `pg.Pool` — NOT `@prisma/adapter-neon`), Socket.io standalone, Tailwind CSS 4, shadcn/radix-nova, Zustand, Zod v4

**Docs:** `OVERVIEW.md` (deep architecture), `VERCEL.md` + `RAILWAY.md` (deployment), `GEMINI.md` (legacy overview).

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | `db:check` **(blocks if DB unreachable)**, then Socket.io (3001) + Next.js (3002) |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` — primary verification |
| `npm run lint` | ESLint; ignores `generated/` and `scratch/` |
| `npm run format` | Prettier — no semicolons, double quotes, `printWidth: 80`, auto-sorts via cn/cva |
| `npm run db:setup` | `prisma db push && prisma generate && npm run seed` |
| `npm run seed` | Seeds DB from `.env.local` |
| `npm run socket:dev` | Standalone Socket.io only (`npx tsx src/socket/server.ts`) |

**Verification order:** `typecheck` → `build` — no test suite (vitest installed but unused). `tsconfig.json` excludes `scripts/` and `scratch/` — code there isn't typechecked (runs via `npx tsx`); put one-off scripts there, not in `src/`.

**PowerShell:** does NOT support `&&`. Use `;` or `if ($?) { cmd2 }`.

## Environment

**Required** in `.env.local`: `DATABASE_URL`, `JWT_SECRET`, `SOCKET_INTERNAL_TOKEN`.  
**Vercel needs** env vars: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `SOCKET_INTERNAL_TOKEN`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_APP_URL`, `ALLOWED_ORIGIN`, `PORT=3002`.  
**Render (socket server) needs** the same `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `SOCKET_INTERNAL_TOKEN`, `ALLOWED_ORIGIN`, `NODE_ENV=production`. Render injects `PORT` automatically — do NOT set it manually.

- `.env.example` is gitignored and absent from the repo — README's `cp .env.example .env.local` will fail. Create `.env.local` by hand (`DATABASE_URL`, `JWT_SECRET`).
- `.env.local` is dev source of truth. Production reads `.env`/`.env.production` via `NODE_ENV` (also gitignored — set vars in the deploy dashboard instead).
- Supabase: `?pgbouncer=true` on `DATABASE_URL` (pooled, port 6543), separate `DIRECT_URL` (port 5432). `prisma.config.ts` resolves `DIRECT_URL` fallback `DATABASE_URL` for schema ops.
- `NEXT_PUBLIC_SOCKET_URL` must point at the deployed Socket.IO server or the browser won't connect.

## Architecture

- **Port 3002** (Next.js), port 3001 (Socket.io). Dev uses `concurrently`.
- **`proxy.ts`** at root (not `middleware.ts`) — Next.js 16 auto-detects it. Handles auth guards + RBAC redirects.
- **ESM** (`"type": "module"`). Config files use `.mjs`. (`scripts/update-imports.cjs` is a leftover one-off migration tool — ignore.)
- **`@/`** path alias maps to project root (`./*` in tsconfig).
- **Landing page** `/` — authenticated users redirect to role dashboard, logged-out users see static marketing.

### Auth
Custom JWT via `jose` (HS256, 7-day expiry), **httpOnly cookie only** (no localStorage). Login: `POST /api/auth/login` (API route, not server action). JWT includes `passwordVersion`; `getSession()` re-validates `isActive` + `passwordVersion` each call. API routes use `lib/auth-server.ts` for cookies — NOT `next/headers` cookies directly (Turbopack 404).

**Socket.IO auth:** The browser fetches a short-lived token from `GET /api/auth/socket-token` (same-origin, reads the httpOnly cookie, returns JWT in-memory via `utils/socket-auth.ts`). The socket client uses an `auth` callback that re-fetches on every connect/reconnect — **never localStorage** (which caused stale-JWT mismatches on role switch). Server actions use `SOCKET_INTERNAL_TOKEN` to authenticate as a trusted internal emitter (can notify any user; browser sockets can only notify themselves). `SOCKET_INTERNAL_TOKEN` must be set on **both Vercel and Render** with the same value.

**Login redirect:** Login/signup/proxy redirect **directly** to the role page (`/admin`, `/manager`, `/member`), bypassing `/dashboard` — the `/dashboard` server-component `redirect()` triggered a Next.js 16 Turbopack "negative time stamp" `performance.measure` error.

### Prisma v7
Client output: `generated/prisma` (gitignored). Import from `lib/prisma.ts`. `postinstall` runs `prisma generate`.

**Migrations:** Use `prisma migrate dev --name <desc>` locally, `prisma migrate deploy` on prod.  
**Existing prod DB:** `prisma migrate resolve --applied 0001_init` then `prisma db push` (safe ALTER TABLE ADD COLUMN only).  
**Seed prod:** `npx tsx -r dotenv/config prisma/seed.ts dotenv_config_path=.env.production`

### Socket.io (standalone)
`src/socket/server.ts` — own Prisma + pg pool. Imports from relative `../../generated/prisma` (`@/` unavailable). Background worker runs every 60s (overdue/due-date checks, 90-day audit cleanup). `GET /health` for deployment health checks.

**Known inconsistency:** socket worker hardcodes `column: { name: { not: 'Done' } }`. `findDoneColumnName()` lives only in `actions/sprint-actions.ts` and is **not exported** — never hardcode "Done" elsewhere; add the helper where you need it.

`utils/socket-emitter.ts` is a Socket.io **client** — server actions emit through it (async `getSocket()` — server uses `SOCKET_INTERNAL_TOKEN`, browser uses `fetchSocketToken()`).

### Service Worker (`public/sw.js`)
- **Network-first** for page navigations (cache-first caused stale data after create operations — the SW served the old cached page instead of fresh server data).
- **Bypasses** `/api/`, `/_next/data/`, and auth routes entirely (never cached).
- Cache version is `smart-task-vN`; bump on breaking SW changes to force activation (`skipWaiting` + `clients.claim` auto-activate).
- Users may need one hard reload (Ctrl+Shift+R) after a SW update.

### Dark Mode
**Removed** — no toggle, no `next-themes`, no ThemeProvider, no `.dark` CSS block. The class-based `@custom-variant dark` is kept in `globals.css` so shadcn `dark:` utilities stay **inert** (only activate with `.dark` on `<html>`, which never happens). Without it, Tailwind v4 falls back to `prefers-color-scheme` and dark styles would reappear.

### Typography
- **Inter** is the primary font (loaded via `next/font/google` as `--font-sans`).
- Weights: **400** body, **500** subtitles, **600** headlines (**never 700** — `font-bold` replaced with `font-semibold` app-wide).
- Headline tracking: H1 `-0.02em`, H2/H3 `-0.01em` (set in `globals.css` `@layer base`).
- `-webkit-font-smoothing: antialiased` + `-moz-osx-font-smoothing: grayscale` on `body`.

### Tailwind CSS 4
`app/globals.css`: `@import "tailwindcss"`, `@plugin "../node_modules/tailwindcss-animate"`, `@custom-variant dark` (inert — see Dark Mode above), dual `@theme` + `@theme inline`. PostCSS via `@tailwindcss/postcss`.

Named tokens: `bg-canvas`, `text-ink`, `text-body-text`, `text-muted-text`, `bg-accent`, `bg-accent-soft`, `bg-accent-strong`, `border-hairline`, `text-success`. Prefer these over hardcoded hex.

### shadcn + Radix
Style `radix-nova`. Components in `components/ui/`.  
**Gotcha:** `<SelectItem value="">` crashes — use `value="__none__"`.  
**Gotcha:** Dialogs need `<DialogDescription>` (even `className="sr-only"`).  
**Dropdown/Select items** use `text-ink` on focus (not `text-accent-foreground` — blue-on-blue invisible).

## RBAC

| Role | Capabilities |
|------|-------------|
| ADMIN | Everything across all boards |
| MANAGER | Own boards: manage columns/members, approve tasks, create sprints/epics |
| MEMBER | Assigned boards: create/edit tasks, comments, reviews, move tasks. Cannot create boards or columns |

Checks live inside server action files:
- `checkBoardPermission(boardId, allowedRoles)` — exported from `actions/board-actions.ts`
- `checkAdmin()` / `checkManager()` — private in their respective action files
- Shared board query: `getUserBoards(sessionId)` from `actions/board-actions.ts` (avoids duplicated `OR: [{ ownerId }, { members }]`)

## Server Actions Pattern

- Files in `actions/*-actions.ts`, barrel in `actions/index.ts`.
- Return `ActionResult<T>` from `types/kanban.ts`: `{ success, data?, error?, message?, fieldErrors? }`.
- All mutations use `createAuditLog()` in `lib/create-audit-log.ts` (auto-injects IP).
- Schema shape matters: some actions expect bare `z.string()`, others `z.object({...})`. Mismatch silently returns `{ success: false }`.
- After mutations, call `router.refresh()` — `revalidatePath` alone insufficient.
- Emit socket events AFTER DB commits.

## Notifications

Flow: Server action → `sendNotification()` in `utils/notification-utils.ts` (checks prefs, writes DB) → `emitNotification()` (socket client → server → `user:${userId}` room) → browser bell badge. `sendNotification()` is NOT a server action — called from server actions/API routes. Must call `sendNotification()` — socket-only emit misses DB record.

New notification type requires: `NotifType` union member, `notifTypeToPrefKey` entry, `booleanPrefKeys` entry, `NotificationPreference` schema field, and `NotificationPreference` interface field.

## Sprint Workflow

**Routes:**
| Route | Feature |
|-------|---------|
| `/manager/sprints` | Sprint list (active sorts first, pulsing green indicator) |
| `/manager/sprints/[id]` | Sprint detail + task completion metrics |
| `/manager/sprints/[id]/plan` | 2-panel planning board (backlog + sprint, drag to assign) |
| `/manager/sprints/[id]/board` | Sprint-filtered kanban with DnD |
| `/manager/sprints/[id]/review` | Demo/review notes |
| `/manager/sprints/[id]/retro` | Retro notes + action items |
| `/manager/sprints/calendar` | Month calendar with sprint bars |
| `/manager/backlog` | Unscheduled tasks (implicit: `sprintId=null`, `parentId=null`, not in done column) |

Member pages reuse the same sprint components at `/member/*` with `basePath="/member"` — but only detail, board, and calendar exist (no plan/review/retro).

**Lifecycle:** PLANNED → ACTIVE → COMPLETED (or CANCELLED). CANCELLED → PLANNED allowed. Cannot delete ACTIVE sprints.
- No overlapping sprints per board. Only one ACTIVE per board (atomic `$transaction`).
- Completion auto-moves incomplete tasks back to backlog.
- Sprint board columns show ALL board columns, even empty ones (via `useDroppable`).
- **Story points removed from UI** — metrics focus on task completion count only.
- Burndown chart defaults to task count.

**Sprint board DnD:** Uses `useDroppable` for empty columns so all columns are valid drop targets. Optimistic UI update, then `updateTaskStatus` server action.

## Business Logic

- **WIP limits:** Enforced for MEMBER only. Admin/manager override logged as `UPDATE_TASK_STATUS_OVERRIDE`. WIP check inside `$transaction`.
- **Task version conflicts:** `version` field increments on every update. Pass `version: undefined` to force-overwrite.
- **Undo:** 30-second window, deletes specific audit log entry.
- **Comment editing:** Admin/manager edit any comment. Others edit own within 5 minutes.
- **Member assignment:** Can only assign to self. Admin/manager assign to anyone.
- **Review auto-move:** APPROVED→last column, CHANGES_REQUESTED→second, REJECTED→first.
- **Self-review blocked:** `reviewerId !== session.id`.
- **Blockers on tasks:** `isBlocked` + `blockerReason` fields. Toggle via `toggleTaskBlocker()` in sprint-actions.
- **Done column detection:** Use `findDoneColumnName()` (matches "done"/"completed"/"resolved", falls back to last column). Never hardcode.
- **Signup:** Auto-creates `MEMBER` role, welcome board with 3 default columns.
- **Sprint default board:** `/member/sprints` and `/manager/sprints` default to the FIRST board that has sprints (so the list is never empty); falls back to `boards[0]`.
- **Sprint deletion:** Delete allowed for any non-ACTIVE sprint (PLANNED/COMPLETED/CANCELLED). The sprint-list card delete button shows for `status !== 'ACTIVE'`.
- **Team performance:** `getTeamMemberPerformance()` (manager-actions) returns per-member task counts (total/completed/in-progress/overdue), completion rate, and latest 20 tasks across the manager's boards. Task model has NO direct `boardId` — filter via `column: { boardId: { in: ids } }`.
- **Create/update list refresh:** `router.refresh()` is unreliable in Turbopack dev — board mutation dialogs use `window.location.reload()` after success.
- **Notification dedup:** `Notification.dedupKey` field holds `due:<taskId>` / `overdue:<taskId>`; NEVER embed `(ID: <cuid>)` in user-facing messages (cleanMessage in notification-bell strips residuals).

## DnD Gotchas

- `onDragOver` fires rapidly — use `useRef` to track `activeId→targetColumnId` and skip if already moved.
- `onDragEnd` stale closure — use `boardRef.current` not `board` state.
- Failure recovery: `router.refresh()`, NOT `setBoard(initialBoard)`.
- `{...listeners}` intercepts onClick — spread on drag handle element, not Card.
- Wrap DndContext in dynamic client import (`kanban-board-dynamic.tsx`) to avoid SSR hydration mismatch (`DndDescribedBy-0` vs `-1`).

## Key Files

| Purpose | Path |
|---------|------|
| Middleware | `proxy.ts` (root) |
| Server actions barrel | `actions/index.ts` |
| Socket server | `src/socket/server.ts` (no `@/` imports) |
| Socket emitter (client) | `utils/socket-emitter.ts` |
| Socket token fetcher | `utils/socket-auth.ts` (in-memory, no localStorage) |
| Socket token API route | `app/api/auth/socket-token/route.ts` |
| Notification helper | `utils/notification-utils.ts` (not server action) |
| Auth server | `lib/auth-server.ts` |
| Column helpers (server) | `lib/column-helpers.ts` (findDoneColumnName etc.) |
| Column utils (pure/client) | `utils/column-utils.ts` (isDoneColumn etc.) |
| Prisma client | `lib/prisma.ts` |
| DnD hook | `hooks/use-kanban-board.ts` |
| Board dynamic wrapper | `components/kanban/kanban-board-dynamic.tsx` |
| Sprint components | `components/sprint/*` |
| Sprint actions | `actions/sprint-actions.ts` (CRUD, lifecycle, metrics, burndown, review, retro, blocker) |
| Board templates | `lib/board-templates.ts` (4 templates, code-defined) |
| Design tokens | `app/globals.css` |
| Offline sync | `lib/offline-db.ts`, `lib/offline-sync.ts`, `lib/store/use-offline-store.ts` |
| Date picker | `components/ui/date-picker.tsx` |
| Service worker | `public/sw.js` (network-first nav, bypasses API) |
| Types | `types/kanban.ts` |
| Team performance action | `actions/manager-actions.ts` (`getTeamMemberPerformance`) |
| File upload route | `app/api/attachments/upload/route.ts` + `[id]/file` serve route |

## Documentation & Report

- **`REPORT.tex`** — full compilable IIT-DU project report (title page, front matter, abstract, Ch 1-7, references). Uses `\IfFileExists{...}` so images load only if present. Fill the `[INSERT ...]` placeholders (name, roll, supervisor, dates).
- **Images** — all report figures/screenshots live in the **project root** (not a `figures/` folder) so they sit beside `REPORT.tex` when compiling. `\graphicspath{{./}}`. 30 files: 5 Mermaid diagrams (`system-architecture`, `use-case-diagram`, `er-diagram`, `sequence-task-move`, `activity-sprint-lifecycle`) + 25 screenshots (`screenshot-login` … `screenshot-mobile`). `du-crest` is commented in the title page — uncomment once the student adds a crest image.
- **`TEST-REPORT.md`** — QA test report (coverage matrix, bugs found/fixed, dated updates).
- **`UPLOAD.md`** — file-upload architecture (server-side route, `FileBlob` storage, serve route).

## Production Deployment

Deployment is split: **Vercel** hosts Next.js, **Render** hosts the standalone Socket.IO server. See `VERCEL.md` for the Next.js guide.
- **Vercel:** `npx vercel --prod --yes` after `typecheck` + `build`. Required env vars listed above (including `SOCKET_INTERNAL_TOKEN`).
- **Render (socket):** build `npx prisma generate`, start `npx tsx src/socket/server.ts`. Render injects `PORT` automatically — do NOT set it manually.
- **`SOCKET_INTERNAL_TOKEN` must be identical** on both Vercel and Render (server actions authenticate with it).
- After a socket deploy, update `NEXT_PUBLIC_SOCKET_URL` on Vercel and redeploy.

## Test Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@gmail.com | admin123 | ADMIN |
| manager@gmail.com | manager123 | MANAGER |
| asefahmed500@gmail.com | asef123 | MEMBER |
| admin@smarttask.com | AdminPassword123! | ADMIN |
| manager@smarttask.com | AdminPassword123! | MANAGER |
| member@smarttask.com | AdminPassword123! | MEMBER |
