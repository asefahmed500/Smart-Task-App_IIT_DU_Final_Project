# smart-task Agent Guide

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Runs `db:check` first, then starts Next.js dev server |
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
- Actions: `lib/{board,task,admin}-actions.ts`
- Components: `components/`, UI: `components/ui/`
- Prisma schema: `prisma/schema.prisma`
- Middleware: `proxy.ts` (root level, handles auth + RBAC)

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
- Socket.io runs on port 3001 (dev only)

## Verification

- `npm run typecheck` - Use instead of lint (lint has false positives from `generated/` and `scratch/` folders)
- `npm run build` - Always passes if typecheck passes