# smart-task Agent Guide

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Checks DB, starts Socket.io (3001), then Next.js (3002) |
| `npm run db:setup` | `prisma db push && prisma generate && npm run seed` |
| `npm run db:check` | Verifies DATABASE_URL before dev |
| `npm run typecheck` | `tsc --noEmit` - **primary verification** |
| `npm run build` | `next build` - passes if typecheck passes |
| `npm run check-users` | Debug: list users in DB |
| `npm run check-boards` | Debug: list boards for member |

## Setup

- Requires `.env.local` with `DATABASE_URL` (Neon PostgreSQL) and `DIRECT_URL` for Prisma CLI
- `npm run postinstall` auto-runs `prisma generate`
- Prisma client output: `generated/prisma` (not `node_modules/`)
- ESM project (`"type": "module"` in package.json) - use `.cjs` extension for CommonJS configs (e.g., `next.config.cjs`)

## Architecture

- **Framework**: Next.js 16 with App Router (React 19), RSC enabled
- **Database**: Prisma 7 with `@prisma/adapter-pg` driver (NOT `@prisma/adapter-neon`)
- **Auth**: Custom JWT via `jose` lib, HTTP-only cookies (`lib/auth.ts`)
- **UI**: shadcn/ui (`components/ui/`) with `radix-nova` style
- **State**: Redux Toolkit + Zustand
- **Real-time**: Socket.io on port 3001 (started via `concurrently` in dev)

## File Locations

- DB client: `lib/prisma.ts` (uses `PrismaPg` adapter with `pg.Pool`)
- Auth: `lib/auth.ts` (encrypt/decrypt with `jose`, session in cookies)
- Middleware: `proxy.ts` (root level, auth + RBAC, exports `config` for Next.js)
- Prisma schema: `prisma/schema.prisma`
- Socket server: `src/socket/server.ts`
- Kanban: `components/kanban/` (board, column, task-card, socket-hooks)
- Shared types: `types/kanban.ts` (Task, Priority, Checklist, etc.) - use these instead of redefining

## RBAC

- `ADMIN` → `/admin/*`, `/manager`, `/dashboard`, `/member`
- `MANAGER` → `/manager`, `/dashboard`, `/member`
- `MEMBER` → `/dashboard`, `/member`

## Quirks

- Port 3002 (not 3000) - set via `PORT=3002` in `.env.local`
- shadcn style: `radix-nova` (see `components.json`)
- TailwindCSS v4 with `@tailwindcss/postcss`
- Task `version` field increments on edit - used for conflict detection in drag-drop
- WIP limits per column: enforced on members, overridable by Manager/Admin
- Socket events: `task:moved`, `task:created`, `task:updated`, `task:deleted`, `column:created`
- Notifications poll every 30s: TASK_ASSIGNED, COMMENT_MENTION, TASK_STATUS_CHANGED
- TypeScript strictness: Prisma returns (e.g., `Priority` enum) often need casting (`as string`, `as Priority`) when crossing server/client boundary
- ESLint config: `eslint.config.mjs` (ESM format)
- `next.config.cjs` required for CommonJS config in ESM project

## Verification

- No test suite - verify with `npm run typecheck && npm run build`
- `npm run lint` available but `typecheck` is more reliable
- **Always run `typecheck` before `build`** - build will fail on type errors
