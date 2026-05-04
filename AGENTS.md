# SmartTask Agent Guide

## Project

SmartTask — real-time Kanban board with RBAC, WIP limits, offline support, undo via audit log, and task automation.

## Verification Workflow

**Primary check:** `npm run typecheck` (not lint — ESLint is less reliable)
**Before build:** always `typecheck` first — `next build` will fail on type errors
**No test suite** — the project has zero tests; verify via `typecheck && build`

## Key Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Runs `db:check`, then starts Socket.io (3001) + Next.js (3002) concurrently |
| `npm run socket:dev` | Starts only the standalone Socket.io server |
| `npm run db:setup` | `prisma db push && prisma generate && npm run seed` |
| `npm run db:check` | Verifies `DATABASE_URL` connectivity before dev |
| `npm run typecheck` | `tsc --noEmit` — **primary verification** |
| `npm run build` | `next build` |
| `npm run seed` | Seeds DB (needs `.env.local`); test users share password `AdminPassword123!` |
| `npm run format` | Prettier — no semicolons, double quotes, trailing commas `es5`, printWidth 80 |
| `npm run lint` | ESLint — less reliable than typecheck |
| `npm run check-users` | Diagnostic: list all users in DB |
| `npm run check-boards` | Diagnostic: list all boards and members |

## Environment

`.env.local` required:
- `DATABASE_URL` — Neon PostgreSQL pooled connection
- `DIRECT_URL` — Prisma CLI (non-pooled)
- `JWT_SECRET`
- `PORT=3002`

Optional:
- `EMAIL_HOST/PORT/USER/PASS/FROM` — SMTP for password reset
- `NEXT_PUBLIC_SOCKET_URL` — defaults to `http://localhost:3001`
- `NEXT_PUBLIC_APP_URL`

## Architecture Gotchas

**Port 3002, not 3000.** Next.js dev server runs on 3002. Socket.io standalone server runs on 3001.

**ESM project** (`"type": "module"`). All config files use `.mjs` (`next.config.mjs`, `eslint.config.mjs`, `postcss.config.mjs`). Never create `.cjs` configs.

**Concurrently** is used in `npm run dev` and `npm run start` to run Socket.io + Next.js together. `npm run postinstall` auto-runs `prisma generate` after installs.

**Prisma v7** uses `@prisma/adapter-pg` (wrapping `pg.Pool`) — **NOT** `@prisma/adapter-neon` despite both being in `package.json`. Client output is `generated/prisma` (imported as `'../generated/prisma'` from `lib/prisma.ts`). Uses `db push` (not migrations). `prisma.config.ts` reads `DATABASE_URL` from `.env.local` via dotenv.

**Socket.io is a standalone server** (`src/socket/server.ts` on port 3001), not Next.js built-in. `utils/socket-emitter.ts` is a Socket.io **client** (not server) — server actions emit events through it to the standalone server.

**Middleware is `proxy.ts` at project root** — not `middleware.ts`. It handles auth guards + RBAC redirects.

**Auth:** Custom JWT via `jose` (HS256, 7-day expiry), HTTP-only cookies. Login uses API route (`POST /api/auth/login`), not server action. Signup auto-assigns `MEMBER` role and auto-logs in.

**Roles:** `ADMIN`, `MANAGER`, `MEMBER` (UPPERCASE in DB).

**Undo system:** `undoLastAction()` in `board-actions.ts` reverses actions within 30 seconds by reading the most recent `AuditLog`. Every mutation writes an `AuditLog` entry with full `details` (including `previousState`, `fullTask`, etc.). Undo logs a new `UNDO` audit entry — it does NOT delete the original log anymore.

**WIP limits:** Enforced on MEMBER role when moving tasks. MANAGER/ADMIN can override (logged as `UPDATE_TASK_STATUS_OVERRIDE`). `wipLimit = 0` means unlimited.

**Task version field:** Increments on every edit/move. Used for optimistic concurrency. Conflict resolution sends `version: undefined` to bypass the server-side check.

**RBAC in server actions:**
- `checkAdmin()` — ADMIN only
- `checkManager()` — ADMIN or MANAGER
- `checkBoardPermission()` — board membership + role; ADMIN always has access
- `checkTaskPermission()` — ADMIN full access; owner/manager on board full access; MEMBER can only edit tasks they are **assigned to** (not created by), unless `MEMBER_ALL` is in `allowedRoles`

**@mention regex:** `/@([\w\s]+?)(?=\s|$|[,.!?:;])/g` — supports multi-word names like `@John Doe`

## Style Conventions

- Prettier: no semicolons, double quotes, trailing commas `es5`, printWidth 80
- `@/` path alias maps to project root (`./*` in tsconfig)
- Prisma enum returns need casting (`as string`, `as Priority`) when crossing server/client boundary
- Import enums from `@/generated/prisma` or use `Role`/`Priority` from `@/lib/prisma`
- All server actions return `ActionResult<T>`: `{ success: boolean, data?: T, error?: string, fieldErrors?: Record<string, string[]> }`
- Server actions live in `actions/*-actions.ts` (not `lib/`)
- `createAuditLog()` wrapper in `lib/create-audit-log.ts` auto-injects IP address — use it for all mutations

## Feature Specs

The canonical feature requirements are in:
- `systemtodo.md` — feature checklist with dependencies
- `roledependent.md` — role-based feature checklist

Refer to these when implementing or verifying features.

## Known Issues / Recent Fixes

- Real-time `task:updated`, `task:created`, `task:deleted` events are now handled in `useKanbanBoard` (previously only `task:moved` worked)
- `AddTaskDialog` now includes due date picker and assignee dropdown (for Admin/Manager)
- Attachments now show image previews and have download links
- 10MB file upload limit enforced on client and server
- Members can no longer create tags (was incorrectly allowed)
- Manager "Create Board" button now links to `/manager/boards` (was dead link to `/admin/boards`)
- `/profile/notifications` page exists but previously had no navigation link (now linked from profile sidebar)
- `NotificationBell` was missing from profile layout (now added)
- `@mention` regex now supports multi-word names
- Time entries can now be edited/deleted by owner/Admin/Manager
- `/manager/logs` and `/member/logs` pages created for role-scoped audit logs
- CSV/PDF export buttons added to admin reports and manager analytics
- Offline guards added for file upload, board delete, and WIP limit changes
- `LOGIN` audit event now recorded on successful login

## File Quick Reference

| Purpose | Path |
|---------|------|
| DB client | `lib/prisma.ts` |
| Auth (JWT encrypt/decrypt) | `lib/auth.ts` |
| Auth (server actions) | `lib/auth-server.ts` |
| Middleware | `proxy.ts` (project root) |
| Prisma schema | `prisma/schema.prisma` |
| Zod schemas | `lib/schemas.ts` |
| Server actions | `actions/*-actions.ts` |
| Socket server | `src/socket/server.ts` |
| Socket client emitter | `utils/socket-emitter.ts` |
| Offline store | `lib/store/use-offline-store.ts` |
| Kanban board hook | `hooks/use-kanban-board.ts` |
| Shared types | `types/kanban.ts` |
| CSS theme | `app/globals.css` |

## Seed Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@smarttask.com | AdminPassword123! | ADMIN |
| manager@smarttask.com | AdminPassword123! | MANAGER |
| member@smarttask.com | AdminPassword123! | MEMBER |
