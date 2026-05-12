# SmartTask Agent Guide

## Project

Real-time Kanban board with RBAC, WIP limits, offline support (`lib/store/use-offline-store.ts`), undo via audit log, and task automation.

## Verification

**Primary:** `npm run typecheck` (ESLint is less reliable for catching errors)
**Before build:** always typecheck first — `next build` fails on type errors
**No test suite** — verify via `typecheck && build`

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | `db:check` **(blocks startup if DB unreachable)**, then Socket.io (3001) + Next.js (3002) concurrently |
| `npm run socket:dev` | Standalone Socket.io server only |
| `npm run db:setup` | `prisma db push && prisma generate && npm run seed` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | `next build` |
| `npm run seed` | Seeds DB; needs `.env.local`; password: `AdminPassword123!` |
| `npm run format` | Prettier: no semicolons, double quotes, trailing commas `es5`, printWidth 80, auto-sorts Tailwind classes via `prettier-plugin-tailwindcss` |
| `npm run db:check` | Verifies DB connectivity before dev (run automatically by `dev`) |
| `npm run check-users` | Diagnostic: verify user roles/credentials in DB |
| `npm run check-boards` | Diagnostic: validate board memberships |

## Environment

`.env.local` required: `DATABASE_URL`, `JWT_SECRET`, `PORT=3002`

Optional: `ALLOWED_ORIGIN`, `EMAIL_HOST/PORT/USER/PASS/FROM`, `NEXT_PUBLIC_SOCKET_URL` (default `http://localhost:3001`), `NEXT_PUBLIC_APP_URL`, `SOCKET_PORT` (default 3001)

## Architecture

**Port 3002, not 3000.** Next.js dev server on 3002. Socket.io standalone on 3001 (configurable via `SOCKET_PORT`).

**ESM project** (`"type": "module"`). All config files use `.mjs`. Never create `.cjs` configs.

**Prisma v7** uses `@prisma/adapter-pg` (wrapping `pg.Pool`) — NOT `@prisma/adapter-neon` despite both being in `package.json`. Client output is `generated/prisma` (imported as `'../generated/prisma'` from `lib/prisma.ts`). Uses `db push` (not migrations). `prisma.config.ts` reads `DATABASE_URL` from `.env.local` via dotenv. `postinstall` runs `prisma generate`. **`generated/` is gitignored** — always run `prisma generate` after pulling schema changes.

**Socket.io is standalone** (`src/socket/server.ts` on 3001), not Next.js built-in. Also runs background jobs: due date reminders/overdue checks every 60s, 90-day audit log cleanup at midnight. `utils/socket-emitter.ts` is a Socket.io **client** — server actions emit events through it to the standalone server.

**Middleware is `proxy.ts`** at project root — not `middleware.ts`. Handles auth guards + RBAC redirects.

**Auth:** Custom JWT via `jose` (HS256, 7-day expiry), HTTP-only cookies. Login is an API route (`POST /api/auth/login`), not a server action. `lib/auth.ts` has encrypt/decrypt; `lib/auth-server.ts` is a `'use server'` module for login/logout/getSession cookie management.

**Roles:** `ADMIN`, `MANAGER`, `MEMBER` (UPPERCASE in DB).

**Tailwind CSS 4** new syntax: `@import "tailwindcss"` (not PostCSS plugin), `@theme inline` for custom properties, `@custom-variant dark` for dark mode. PostCSS uses `@tailwindcss/postcss`. See `app/globals.css`.

**Zod v4** (`zod@4.x`). Date fields from HTML forms use `z.string()` (not `z.string().datetime()`) since `<input type="date">` returns `YYYY-MM-DD`.

**shadcn** style is `radix-nova`. UI components in `components/ui/`.

**Offline:** IndexedDB-backed action queue (`lib/offline-db.ts`) stores `CREATE_TASK`, `MOVE_TASK`, `EDIT_TASK`, `ADD_COMMENT`, `UPDATE_TASK` ops. Zustand store at `lib/store/use-offline-store.ts`. UI provider at `components/providers/offline-provider.tsx`.

**Disposable workspace:** `scratch/` is gitignored and ESLint-ignored. Safe place for temporary experiments and debug output.

**GEMINI.md is partially outdated** — server actions are in `actions/`, not `lib/`. Trust AGENTS.md over GEMINI.md where they conflict.

## Code Conventions

- `@/` path alias maps to project root (`./*` in tsconfig)
- All server actions return `ActionResult<T>` (defined in `types/kanban.ts`): `{ success: boolean, data?: T, error?: string, message?: string, fieldErrors?: Record<string, string[] | undefined> }`
- Server actions live in `actions/*-actions.ts` (not `lib/`)
- `createAuditLog()` in `lib/create-audit-log.ts` auto-injects IP address — use for all mutations
- Prisma enum returns need casting (`as string`, `as Priority`) when crossing server/client boundary
- Import enums via `@/lib/prisma` (re-exports from `generated/prisma`)
- ESLint ignores `generated/` and `scratch/` directories

## Gotchas

**Never pass object references as useEffect dependencies.** The `useSocket` hook must use `useMemo` to stabilize the `user` prop. Raw objects cause infinite join/leave loops.

**All Dialog components must include `<DialogDescription>`** (even with `className="sr-only"`). Radix throws without it.

**Recharts `ResponsiveContainer` needs explicit pixel dimensions.** `height="100%"` causes negative dimension errors. Use `height={300}` or fixed values.

**After mutations, call `router.refresh()`.** Server actions use `revalidatePath` but the client needs `router.refresh()` to pick up changes.

**Turbopack build may fail on Google Fonts** if `fonts.gstatic.com` is unreachable (common in restricted networks). The error is `Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'`. Retrying usually succeeds once network resolves.

**Comment `@mention` matching:** use `{ contains: name, mode: 'insensitive' }` not `{ in: exactNames }`.

**Socket event field names must match exactly.** `task:moved` uses `newColumnId`/`oldColumnId` — not `columnId`/`previousColumnId`. `handleBoardEvent` in `useKanbanBoard` uses fallbacks for both variants.

**Reviewer dropdown** shows only board members filtered by role (MANAGER/ADMIN for MEMBER submitter). `eligibleReviewers` in `task-details-dialog.tsx` derives this from `boardMembers` (not `allUsers`).

**Board queries must include owner.** Use `OR: [{ members: { some: { id } } }, { ownerId: id }]`.

**Emit socket events AFTER database commits** so clients receive updated data.

**`dnd-kit` SSR hydration mismatches** (`DndDescribedBy-0` vs `DndDescribedBy-1`) are a known issue. Do not use `next/dynamic` with `ssr: false` in a Server Component — wrap DndContext in a Client Component boundary instead.

**Props-to-state sync:** Client components receiving server props (e.g., `useKanbanBoard({ initialBoard })`) need `useEffect` to sync state on prop changes. `useState(initialBoard)` only uses the value on first render.

**AuditLog `details` is `Json`, not a string.** Never render as `{log.details}`. Format with a helper based on `action` type.

**completeReview flow:** Single `COMPLETE_REVIEW` audit log contains both review status and column move data (including `previousColumnId`). The audit log is created AFTER the task is moved so undo can reverse both.

**Inline title editing:** `TaskHeader` uses local `useState` for title to prevent `setTask` during `onChange` (which triggers re-renders). Only calls `onUpdate` on `onBlur`.

**Radix Select crash on empty value:** `<SelectItem value="">` crashes. Use `value="__none__"` or handle empty in `onValueChange`.

**`_count` returns numbers, not relations.** If UI needs `task.checklists?.length`, include full relation: `checklists: { include: { items: true } }`.

**Board page full-width trick:** The board page (`app/dashboard/board/[id]/page.tsx`) uses `-m-6` to cancel the parent layout's `p-6` padding, making it the only dashboard page that renders edge-to-edge. Don't add margin/padding wrappers inside it.

**Notification preference typing:** `notifTypeToPrefKey` in `utils/notification-utils.ts` maps 11 `NotifType` variants to their `NotificationPreference` boolean keys. Non-boolean fields (id, userId, emailEnabled, pushEnabled, createdAt, updatedAt) are excluded. New notification types need: a `NotifType` union member, a `notifTypeToPrefKey` entry, a `booleanPrefKeys` entry, a `NotificationPreference` schema field in `prisma/schema.prisma`, and a `NotificationPreference` interface field in `types/kanban.ts`.

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

**Notification flow:** Server action → `sendNotification()` in `utils/notification-utils.ts` (checks prefs, writes DB) → `emitNotification()` (Socket.IO client to server) → server relays to `user:${userId}` room → browser `useNotificationListener` in `notification-bell.tsx` receives it. When adding a new notification-triggering action, you must call `sendNotification()` — just emitting a socket event is not enough (no DB record = no bell badge, no persistence).

## Key Files

| Purpose | Path |
|---------|------|
| DB client | `lib/prisma.ts` |
| Auth (JWT) | `lib/auth.ts`, `lib/auth-server.ts` |
| Middleware | `proxy.ts` (project root) |
| Prisma schema | `prisma/schema.prisma` |
| Zod schemas | `lib/schemas.ts` |
| Server actions | `actions/*-actions.ts` |
| Socket server | `src/socket/server.ts` |
| Socket client | `utils/socket-emitter.ts` |
| Notification utils | `utils/notification-utils.ts` |
| Kanban board hook | `hooks/use-kanban-board.ts` |
| Kanban socket hooks | `components/kanban/socket-hooks.ts` |
| Shared types | `types/kanban.ts` |
| Offline store | `lib/store/use-offline-store.ts` |
| Offline DB | `lib/offline-db.ts` |
| Offline UI | `components/providers/offline-provider.tsx` |

## Seed Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@smarttask.com | AdminPassword123! | ADMIN |
| manager@smarttask.com | AdminPassword123! | MANAGER |
| member@smarttask.com | AdminPassword123! | MEMBER |

## Specs

Feature requirements in `systemtodo.md` and `roledependent.md`.