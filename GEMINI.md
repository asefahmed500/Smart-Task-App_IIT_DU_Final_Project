# GEMINI.md - Smart Task Manager

## Project Overview
**Smart Task Manager** is a full-stack, real-time Kanban board application designed for collaborative task management with strict Work-In-Progress (WIP) limit enforcement. It provides a robust, role-based environment for teams to visualize workflows, automate repetitive tasks, and analyze performance metrics.

### Key Features
- **Role-Based Access Control (RBAC):** Distinct dashboards and capabilities for Admins, Team Managers, and Team Members.
- **Real-Time Collaboration:** Instant updates across all clients via Socket.io for task moves, edits, and presence.
- **WIP Limit Enforcement:** Configurable column limits to prevent bottlenecks, with override capabilities for Managers/Admins.
- **Automation Engine:** No-code rules for triggering actions (e.g., auto-assignment, notifications) based on task events.
- **Offline Support:** Planned synchronization using Service Workers and IndexedDB for uninterrupted work.
- **Audit & Reporting:** Immutable audit logs for all data-modifying actions and visual flow metrics (cycle time, throughput).

## Tech Stack
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4, Radix UI, Lucide Icons, Framer Motion.
- **Backend:** Next.js Route Handlers & Server Actions, Socket.io (Standalone Server).
- **Database:** PostgreSQL with Prisma ORM.
- **Authentication:** Custom JWT-based session management using `jose` and `bcryptjs`.
- **State Management:** Zustand (Primary) and Redux Toolkit.
- **Visualization:** Recharts for reporting dashboards.

## Architecture
- `app/`: Core routing logic.
    - `(auth)/`: Login and signup flows.
    - `admin/`: System-wide user and audit log management.
    - `manager/`: Team board creation, metrics, and automation.
    - `member/`: Focused task views and personal activity feeds.
    - `dashboard/`: Shared Kanban board interface.
    - `api/`: REST endpoints (primarily for auth and complex queries).
- `components/`:
    - `kanban/`: Core board logic, drag-and-drop (dnd-kit), and task dialogs.
    - `ui/`: Reusable primitive components (Shadcn/ui).
    - `admin/`, `dashboard/`: Role-specific UI modules.
- `lib/`: Server-side logic and actions.
    - `*-actions.ts`: Targeted server actions for boards, tasks, automation, etc.
    - `auth.ts`: JWT encryption/decryption and session handling.
    - `prisma.ts`: Singleton Prisma client.
- `prisma/`: Database schema (`schema.prisma`) and seed data (`seed.ts`).
- `src/socket/`: Real-time server implementation using Socket.io.
- `scripts/`: Maintenance and diagnostic utilities.

## Getting Started

### Prerequisites
- Node.js installed.
- PostgreSQL database (e.g., Neon.tech or local instance).

### Setup
1.  **Environment Variables:** Create a `.env.local` file based on `.env.example`.
    ```env
    DATABASE_URL="your-postgresql-url"
    JWT_SECRET="your-random-secret"
    NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Database Initialization:**
    ```bash
    npm run db:setup
    ```
    *This runs prisma push, generates the client, and seeds initial users.*

### Development Commands
- `npm run dev`: Starts the Next.js dev server AND the Socket.io server concurrently.
- `npm run socket:dev`: Starts only the Socket.io server (port 3001 by default).
- `npm run lint`: Runs ESLint for code quality.
- `npm run format`: Formats code using Prettier.
- `npm run typecheck`: Performs TypeScript type checking.

### Diagnostic Scripts
- `npm run check-users`: Verifies user roles and credentials in the database.
- `npm run check-boards`: Validates board memberships and visibility.

## Development Conventions
- **Server Actions:** Use Server Actions located in `lib/` for all data mutations to ensure consistent audit logging and type safety.
- **Real-Time Events:** Emit events through the Socket.io server for any state changes that should be visible to other members of the same board room.
- **Audit Logging:** Every mutation MUST be recorded in the `AuditLog` table. Ensure actions are wrapped in the appropriate middleware or helper.
- **Styling:** Use Tailwind CSS 4 utility classes. Prefer CSS variables for theme-consistent colors.
- **Type Safety:** Maintain strict TypeScript types in `types/kanban.ts` and leverage generated Prisma types for database interactions.

## Deployment
The application is designed for Vercel deployment with a separate hosting solution for the Socket.io server (e.g., Railway, Heroku, or a VPS), as Vercel's serverless functions do not support persistent WebSocket connections.
