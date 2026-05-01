# smart-task Agent Guide

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Runs `db:check`, starts Socket.io server (3001), then Next.js dev server (3002) |
| `npm run db:setup` | Prisma push + generate + seed |
| `npm run db:check` | Verifies DATABASE_URL connection before dev |
| `npm run check-users` | Debug: lists users from DB via tsx |
| `npm run check-boards` | Debug: lists member boards |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (tailwindcss plugin included) |
| `npm run typecheck` | TypeScript noEmit |

## Setup Requirements

- **Required**: `.env.local` with `DATABASE_URL` (Neon PostgreSQL)
- Dev server will fail immediately if DB not reachable (db:check runs first)
- Run `npm run db:setup` on fresh clone before development
- `npm run postinstall` runs automatically after install (prisma generate)
- **Port**: Default is 3002 (not 3000) - set in `.env.local`
- **Auth**: JWT-based (not session), HTTP-only cookies

## Architecture

- **Framework**: Next.js 16 with App Router (React 19)
- **Database**: Prisma 7 with `@prisma/adapter-neon` driver
- **Auth**: Better Auth (skills in `.agents/skills/better-auth-*`)
- **UI**: shadcn/ui (`components/ui/`) with radix-nova style
- **State**: Redux Toolkit + Zustand
- **Real-time**: Socket.io

## Routes

- `/` - Landing
- `/login`, `/signup` - Auth pages
- `/dashboard` - User dashboard
- `/dashboard/board/[id]` - Board view with drag-drop
- `/manager` - Task manager
- `/member` - Member view
- `/profile` - User profile
- `/admin/*` - Admin panel (automation, boards, logs, reports, users)
- `/api/*` - API routes

## File Locations

- DB client: `lib/prisma.ts`
- Auth config: `lib/auth.ts`
- Actions: `lib/{board,task,admin,notification,dashboard}-actions.ts`
- Kanban components: `components/kanban/` (board, column, task-card, dialogs, socket-hooks)
- Dashboard components: `components/dashboard/` (manager/member clients)
- UI components: `components/ui/`
- Prisma schema: `prisma/schema.prisma`
- Middleware: `proxy.ts` (root level, handles auth + RBAC)

## Role-Based Dashboards

- `/admin` - User management, audit logs, all boards, system stats (ADMIN only)
- `/admin/users` - User table with edit, delete, role change
- `/admin/logs` - System-wide audit log viewer with search/filter
- `/manager` - Team boards, performance metrics, bottlenecks, unassigned tasks (MANAGER)
- `/member` - My tasks, focus mode (3 tasks), activity feed, notifications (MEMBER)

## Testing

- No test suite configured - verify with `npm run typecheck && npm run build`

## RBAC Roles

- `ADMIN` - Full access
- `MANAGER` - /manager, /dashboard, /member
- `MEMBER` - /dashboard, /member

## Local Skills Available

Project-specific skills exist in `.agents/skills/` covering:
- Next.js best practices
- shadcn/ui
- Prisma 7 (upgrade path, postgres setup, client API, CLI)
- Better Auth (auth setup, email/password, 2FA, organizations)

## Important Quirks

- Next.js 16 requires Node.js with runtimes support
- Prisma 7 uses driver adapters (not traditional provider)
- shadcn config uses `style: "radix-nova"` not default
- TailwindCSS v4 with `@tailwindcss/postcss`
- Socket.io runs on port 3001 (dev only) - starts automatically via `npm run dev`
- Task versioning: version increments on each edit, used for conflict detection in drag-drop
- WIP limits on columns: enforced on members, overridable by Manager/Admin

## Real-time Features

- Socket server: `src/socket/server.ts` - handles board rooms, task events
- Client hooks: `components/kanban/socket-hooks.ts`
- Events: `task:moved`, `task:created`, `task:updated`, `task:deleted`, `column:created`
- Conflict resolution: passing `clientVersion` to server action rejects stale updates

## Notifications

- Bell icon in dashboard header (`components/notification-bell.tsx`)
- Polls every 30 seconds, mark as read on click
- Types: TASK_ASSIGNED, COMMENT_MENTION, TASK_STATUS_CHANGED

## Board & Column Management

- Create board (Admin/Manager only) with default columns: To Do, In Progress, Done
- Add/rename/delete/reorder columns via column dropdown menu
- WIP limits per column (visual indicator when exceeded)
- Delete board (Admin/owner only) - cascades to tasks/comments/attachments
- Member management UI at `/admin/boards` - add/remove members

## Verification

- `npm run typecheck` - Use instead of lint (lint has false positives from `generated/` and `scratch/` folders)
- `npm run build` - Always passes if typecheck passes