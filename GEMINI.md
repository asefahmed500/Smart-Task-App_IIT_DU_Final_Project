# Smart Task Manager - Project Context

This file serves as the foundational mandate for the Smart Task Management project. It describes the architecture, tech stack, and development conventions to ensure all future interactions are consistent with the established standards.

## Project Overview

Smart Task Manager is a premium, production-ready Kanban-based task management system built for agile teams. It prioritizes disciplined execution through Lean principles, real-time collaboration, and strict governance.

### Core Value Proposition
- **Lean Flow Enforcement:** Physical hard enforcement of Work-in-Progress (WIP) limits.
- **Real-time Awareness:** Live presence indicators and per-task editing cursors via Socket.io.
- **Role-Based Governance:** Strict 3-tier hierarchy (ADMIN, MANAGER, MEMBER).
- **Advanced Metrics:** Automated calculation of Cycle Time, Lead Time, and Throughput.
- **Resilience:** Offline action queuing and automatic synchronization.

## Tech Stack

- **Framework:** Next.js 16.1 (App Router)
- **Language:** TypeScript
- **State Management:** Redux Toolkit + RTK Query (primary data layer)
- **Database:** PostgreSQL with Prisma ORM v7
- **Authentication:** Better Auth v1.6 (JWT-based)
- **Real-time:** Socket.io (client & custom server)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Animations:** Framer Motion

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Starts the custom development server (Next.js + Socket.io) |
| `npm run build` | Builds the application for production |
| `npm run lint` | Runs ESLint for code quality checks |
| `npm run typecheck` | Runs TypeScript compiler for type validation |
| `npm run format` | Formats the codebase using Prettier |
| `npm run seed` | Seeds the database with initial data and roles |
| `npm run check-users` | Utility script to inspect users in the database |

## Architecture & Data Flow

### Request Life Cycle
1. **Frontend:** React Components utilize RTK Query hooks (e.g., `useGetTasksQuery`).
2. **State:** RTK Query manages caching, optimistic updates, and background refetching.
3. **API Layer:** Next.js Route Handlers (`app/api/**`) handle requests.
4. **Auth/Permissions:** Every API route must use `requireApiAuth()` or `requireApiRole(['ADMIN', ...])` from `lib/session.ts`.
5. **Data Layer:** Prisma ORM interacts with PostgreSQL.
6. **Real-time:** After successful mutations, API routes emit Socket.io events (via `lib/socket-server.ts`) to broadcast updates to connected clients.
7. **Sync:** Clients receive Socket.io events which trigger RTK Query cache invalidation or manual cache updates.

### Permission Hierarchy
- **ADMIN:** Platform-wide control, user management, audit access. Always counts as ADMIN on any board.
- **MANAGER:** Board-level control, WIP limit configuration, member management, task deletion, automation rules.
- **MEMBER:** Task-level execution, card movement (subject to WIP), self-assignment only. Cannot delete tasks or override WIP limits.

## Development Conventions

### Coding Standards
- **Strict Typing:** All new code must be fully typed. Avoid `any`.
- **Surgical Updates:** When modifying files, preserve surrounding logic and follow existing naming conventions (camelCase for variables/functions, PascalCase for components).
- **API Security:** Never bypass the `requireApiAuth` check. Board-level operations must additionally verify permissions using `getEffectiveBoardRole` from `lib/board-roles.ts`.
- **Real-time Integrity:** Every data-modifying action (PATCH/POST/DELETE) that affects the board state should be followed by a Socket.io broadcast to keep all clients in sync.
- **Audit Logging:** All mutations should be recorded in the `AuditLog` table using a Prisma transaction.

### State Management
- Use **RTK Query** for all server state. Define endpoints in `lib/slices/`.
- Use **Redux Slices** for purely ephemeral UI state (e.g., sidebar visibility, focus mode).
- Prefer **Zustand** only for extremely lightweight, isolated state if Redux is overkill (verify existing usage in `lib/` before adding).

### Database & Prisma
- Prisma models are defined in `prisma/schema.prisma`.
- Always run `npx prisma generate` after schema changes.
- Use `lib/prisma.ts` for the database client singleton.

## Project Structure

- `app/`: Next.js App Router (Pages, Layouts, API Routes).
- `components/`: React components categorized by feature (kanban, task, auth, ui).
- `lib/`: Core business logic, shared utilities, and state management.
- `prisma/`: Database schema and migration/seed scripts.
- `scripts/`: Maintenance and validation utilities.
- `docs/`: Technical documentation and architectural deep-dives.

## Memory & Instructions
- **Project Instructions:** Refer to this `GEMINI.md` for repo-wide mandates.
- **Private Memory:** Local setup notes should be kept in the private project memory folder (not committed).
