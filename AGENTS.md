# SmartTask Agent Guide

## Project

SmartTask — real-time Kanban board with RBAC, WIP limits, offline support, undo via audit log, and task automation.

## Verification Workflow

**Primary check:** `npm run typecheck` (not lint — ESLint is less reliable)
**Before build:** always `typecheck` first — `next build` will fail on type errors
**No test suite** — verify via `typecheck && build`

## Key Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Runs `db:check`, then starts Socket.io (3001) + Next.js (3002) concurrently |
| `npm run socket:dev` | Starts only the standalone Socket.io server |
| `npm run db:setup` | `prisma db push && prisma generate && npm run seed` |
| `npm run typecheck` | `tsc --noEmit` — **primary verification** |
| `npm run build` | `next build` |
| `npm run seed` | Seeds DB (needs `.env.local`); test users share password `AdminPassword123!` |
| `npm run format` | Prettier — no semicolons, double quotes, trailing commas `es5`, printWidth 80 |

## Environment

`.env.local` required: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `PORT=3002`

Optional: `EMAIL_HOST/PORT/USER/PASS/FROM`, `NEXT_PUBLIC_SOCKET_URL` (defaults to `http://localhost:3001`), `NEXT_PUBLIC_APP_URL`

## Architecture Gotchas

**Port 3002, not 3000.** Next.js dev server on 3002. Socket.io standalone on 3001.

**ESM project** (`"type": "module"`). All config files use `.mjs`. Never create `.cjs` configs.

**Prisma v7** uses `@prisma/adapter-pg` (wrapping `pg.Pool`) — NOT `@prisma/adapter-neon` despite both being in `package.json`. Client output is `generated/prisma` (imported as `'../generated/prisma'` from `lib/prisma.ts`). Uses `db push` (not migrations). `prisma.config.ts` reads `DATABASE_URL` from `.env.local` via dotenv.

**Socket.io is standalone** (`src/socket/server.ts` on 3001), not Next.js built-in. `utils/socket-emitter.ts` is a Socket.io **client** — server actions emit events through it to the standalone server.

**Middleware is `proxy.ts`** at project root — not `middleware.ts`. Handles auth guards + RBAC redirects.

**Auth:** Custom JWT via `jose` (HS256, 7-day expiry), HTTP-only cookies. Login is an API route (`POST /api/auth/login`), not server action.

**Roles:** `ADMIN`, `MANAGER`, `MEMBER` (UPPERCASE in DB).

## Critical Code Conventions

- `@/` path alias maps to project root (`./*` in tsconfig)
- All server actions return `ActionResult<T>`: `{ success: boolean, data?: T, error?: string, fieldErrors?: Record<string, string[]> }`
- Server actions live in `actions/*-actions.ts` (not `lib/`)
- `createAuditLog()` in `lib/create-audit-log.ts` auto-injects IP address — use it for all mutations
- Prisma enum returns need casting (`as string`, `as Priority`) when crossing server/client boundary
- Import enums from `@/generated/prisma` or use `Role`/`Priority` from `@/lib/prisma`

## Critical Bugs / Patterns to Avoid

**Never pass object references as useEffect dependencies.** The `useSocket` hook must use `useMemo` to stabilize the `user` prop. Raw objects cause infinite join/leave loops because every render creates a new reference.

**Zod `z.string().datetime()` rejects HTML date input.** `<input type="date">` returns `YYYY-MM-DD`, not ISO 8601 datetime. Use `z.string()` for date fields from HTML forms.

**All Dialog components must include `<DialogDescription>`** (even with `className="sr-only"`). Radix throws a console warning and accessibility error without it.

**Recharts `ResponsiveContainer` needs explicit pixel dimensions.** Using `height="100%"` causes negative dimension errors when the parent hasn't rendered. Use `height={300}` or similar fixed values.

**After mutations, call `router.refresh()`** to ensure Next.js server components re-render with fresh data. Server actions use `revalidatePath` but the client needs `router.refresh()` to pick up changes.

**Comment `@mention` matching must be case-insensitive and partial.** Use `{ contains: name, mode: 'insensitive' }` not `{ in: exactNames }` for user lookup after regex extraction.

**Socket event field names must match.** When emitting `task:moved`, use `newColumnId`/`oldColumnId` — not `columnId`/`previousColumnId`.

**Board queries must include owner.** Use `OR: [{ members: { some: { id } } }, { ownerId: id }]` to include boards the user owns.

**Real-time emits after database commits.** Emit socket events AFTER `await prisma.task.update()` so clients receive the updated task object.

**`dnd-kit` generates SSR hydration mismatches** (`DndDescribedBy-0` vs `DndDescribedBy-1`). This is a known dnd-kit issue. Do not use `next/dynamic` with `ssr: false` in a Server Component — it causes a runtime error. Either accept the warning or wrap DndContext in a Client Component boundary.

**AuditLog `details` is a JSON object, not a string.** Never render it directly as `{log.details}` — it will throw "Objects are not valid as React child". Format it with a helper function based on the `action` type.

**Props-to-state sync:** When a client component receives props from a server component (e.g., `useKanbanBoard({ initialBoard })`), use `useEffect` to sync internal state when props change. `useState(initialBoard)` only uses initialBoard on first render.

**Radix Select crash on empty value:** `<SelectItem value="">` crashes. Always use non-empty value like `value="__none__"` or handle empty in onValueChange.

## RBAC in Server Actions

- `checkAdmin()` — ADMIN only
- `checkManager()` — ADMIN or MANAGER
- `checkBoardPermission()` — board membership + owner + role; ADMIN always has access
- `checkTaskPermission()` — ADMIN/owner/manager full access; **MEMBER can edit/delete/add to ANY task in their board** (collaboration model)
- Board visibility: users see boards where they are member OR owner (OR query in Prisma)

## Socket Architecture

`useSocket` hook (`components/kanban/socket-hooks.ts`):
- Keeps a module-level singleton socket
- Joins/leaves board rooms when `boardId` changes
- Uses `useMemo` for the user object to prevent infinite re-render loops
- Unmount cleanup emits `leave-board` via ref (not dependency array)

Server actions emit via `emitBoardEvent()` and `emitNotification()` (both in `utils/socket-emitter.ts`), which connects as a Socket.io client to port 3001.

## Feature Specs

Canonical feature requirements in `systemtodo.md` and `roledependent.md`.

## File Quick Reference

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
| Kanban board hook | `hooks/use-kanban-board.ts` |
| Kanban socket hooks | `components/kanban/socket-hooks.ts` |
| Shared types | `types/kanban.ts` |

## Seed Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@smarttask.com | AdminPassword123! | ADMIN |
| manager@smarttask.com | AdminPassword123! | MANAGER |
| member@smarttask.com | AdminPassword123! | MEMBER |