# SmartTask — Real-Time Kanban Board

A production-ready project management platform with real-time collaboration, role-based access control, task automation, and offline support.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui (radix-nova) |
| Backend | Next.js API Routes (Server Actions) |
| Database | PostgreSQL via Prisma ORM v7 |
| Real-time | Socket.io (standalone server on port 3001) |
| Auth | Custom JWT (jose, HS256, HTTP-only cookies) |
| State | Zustand (offline queue with IndexedDB) |
| Validation | Zod v4 |
| Drag & Drop | @dnd-kit/core |

## Quick Start

```bash
# 1. Clone and install
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and JWT_SECRET

# 3. Setup database
npm run db:setup

# 4. Run development servers (Socket.io + Next.js)
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) to access the app.

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Starts Socket.io (3001) + Next.js (3002) concurrently |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript validation (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run format` | Prettier formatting |
| `npm run db:setup` | Push schema + generate client + seed |

## Seed Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@smarttask.com | AdminPassword123! | ADMIN |
| manager@smarttask.com | AdminPassword123! | MANAGER |
| member@smarttask.com | AdminPassword123! | MEMBER |

## Roles & Permissions

| Role | Access |
|------|--------|
| ADMIN | Full system access — users, boards, automation, audit logs |
| MANAGER | Own boards — manage columns, members, approve tasks |
| MEMBER | Assigned boards — create/edit tasks, comments, reviews |

## Key Features

- **Real-time Kanban board** with drag-and-drop, WIP limits, conflict resolution
- **Task management** — priorities, due dates, tags, checklists, attachments, comments, @mentions
- **Review workflow** — submit for review, approve/request changes/reject, auto-column move on completion
- **Time tracking** — log time entries with undo support
- **Task automation** — rules engine triggers on TASK_CREATED, TASK_MOVED, TASK_UPDATED, TASK_ASSIGNED
- **Notifications** — real-time bell with preference controls, due date reminders, overdue alerts
- **Audit log** — 30-second undo window for 20+ action types
- **Offline support** — actions queued in IndexedDB, synced on reconnect
- **Role-based access control** — board membership + owner + hierarchical permissions

## Project Structure

```
actions/          Server actions (board, task, admin, manager, member, automation, notification)
components/      React components (kanban UI, admin pages, shared UI)
hooks/            Custom hooks (useKanbanBoard, useTask*)
lib/              Auth, Prisma client, schemas, offline store, utils
prisma/           Schema, seed
src/socket/       Standalone Socket.io server
types/            Shared TypeScript types
utils/            Socket emitter, notification helpers, mail
app/              Next.js pages (dashboard, admin, manager, member, profile)
```