# AGENTS.md - Developer Guidelines for This Project

Guidance for AI agents. No Cursor or Copilot rules configured.

## Build & Development Commands

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint (eslint-config-next + typescript)
npm run format       # Format code with Prettier (--write)
npm run typecheck    # TypeScript type checking (tsc --noEmit)
npx prisma generate  # Generate Prisma client after schema changes
npx prisma db push   # Push schema to database
npx prisma studio    # Open database browser
npm run seed         # Seed database (admin, manager, member users)
```

**Tests**: No test framework configured.

## Tech Stack

Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, shadcn/ui, Redux Toolkit + RTK Query, Prisma v7 (PostgreSQL), better-auth v1 (JWT), Socket.IO.

## Project Structure

```
app/
  (auth)/           # Login, register pages
  (dashboard)/      # Protected pages (dashboard, board, admin, profile)
  api/              # Route handlers (auth, boards, tasks, admin, etc.)
components/
  ui/               # shadcn/ui components
  kanban/           # Board, column, task-card, metrics
  task/             # Task detail sidebar, dependency select
  layout/           # Navbar, sidebar, right-sidebar
  admin/            # Users table, boards table, audit log
lib/
  slices/           # Redux slices + RTK Query APIs
  automation/       # Engine, triggers, actions
  metrics/          # Cycle time, lead time, throughput
  utils/            # cn utility
prisma/             # Schema (13 models) and seeding
```

Path alias: `@/*` maps to project root.

## Code Style

### Imports

Absolute imports via `@/` prefix. Order: external → internal → relative:

```typescript
import { useState } from "react"
import { tasksApi } from "@/lib/slices/tasksApi"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"
import { TaskDialog } from "./task-dialog"
```

### Formatting (Prettier)

- `semi: false`, `singleQuote: false`, `tabWidth: 2`
- `trailingComma: "es5"`, `printWidth: 80`
- Plugin: `prettier-plugin-tailwindcss` (auto-sorts classes)

### TypeScript

- Explicit return types for exported functions
- `interface` for object shapes, `type` for unions/aliases
- Avoid `any`; use `unknown` when uncertain
- Strict null checks: `?`, `null`, `undefined` explicit

### Naming

- Files: `kebab-case.ts` (components: `task-dialog.tsx`)
- Components: `PascalCase` (`TaskDetailSidebar`)
- Hooks: `camelCase` with `use` prefix (`useAppDispatch`)
- Constants: `SCREAMING_SNAKE_CASE`
- Interfaces: `PascalCase` (`CreateTaskRequest`)

### API Routes

Use `requireApiAuth()` for protected routes. Handle errors with proper HTTP status:

```typescript
interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  try {
    const { id } = await params
    const task = await prisma.task.findUnique({ where: { id } })
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }
    return NextResponse.json(task)
  } catch (error) {
    console.error("Get task error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
```

### Redux Toolkit (RTK Query)

Create APIs with `createApi`. Register middleware in `lib/store.ts`:

```typescript
export const tasksApi = createApi({
  reducerPath: "tasksApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api", credentials: "include" }),
  tagTypes: ["Task"],
  endpoints: (builder) => ({
    getTasks: builder.query<Task[], string>({
      query: (boardId) => `/boards/${boardId}/tasks`,
      providesTags: (result) =>
        result?.map((task) => ({ type: "Task", id: task.id })) || [],
    }),
    updateTask: builder.mutation<Task, { id: string; data: UpdateTaskRequest }>(
      {
        query: ({ id, data }) => ({
          url: `/tasks/${id}`,
          method: "PATCH",
          body: data,
        }),
        invalidatesTags: (result) => [{ type: "Task", id: result?.id }],
      }
    ),
  }),
})
```

## Database (Prisma)

Schema: `prisma/schema.prisma`. After schema changes: `npx prisma generate && npx prisma db push`.
Client: import from `lib/prisma.ts`.

## Authentication

- Server: `lib/auth.ts` (better-auth, JWT via jose)
- Client: `lib/auth-client.ts`
- Session helpers (`lib/session.ts`):
  - `requireAuth()` - Server Components, redirects to `/login`
  - `requireApiAuth()` - API routes, returns 401 `NextResponse`
  - `requireRole(roles)` / `requireApiRole(roles)` - Role-based guard

## Role-Based Access

Roles: `ADMIN`, `MANAGER`, `MEMBER`. Use `getEffectiveBoardRole()` for board-level:

```typescript
import { getEffectiveBoardRole } from "@/lib/board-roles"

const effectiveRole = await getEffectiveBoardRole(session, boardId)
if (effectiveRole === "MEMBER") {
  return NextResponse.json(
    { error: "Only managers and admins can delete" },
    { status: 403 }
  )
}
```

Priority: Platform `ADMIN` → Board owner → `BoardMember` record.

| Action         | ADMIN | MANAGER | MEMBER       |
| -------------- | ----- | ------- | ------------ |
| Manage users   | Yes   | No      | No           |
| Manage boards  | Yes   | Yes     | Configurable |
| Manage columns | Yes   | Yes     | No           |
| Manage tasks   | Yes   | Yes     | Yes (own)    |
| Override WIP   | Yes   | Yes     | No           |

## Kanban System

- Task movement: version check, WIP limit check, dependency check, automation trigger
- WIP limits: members blocked, managers can override with `override: true`
- Blocked tasks cannot move to Done/Review columns

## Key Features

- **Automation Engine** (`lib/automation/`): Triggers (TASK_MOVED, TASK_ASSIGNED), conditions, actions (NOTIFY_USER, AUTO_ASSIGN)
- **Real-Time** (`lib/socket.ts`): Socket.IO for presence cursors, editing indicators
- **Undo System**: Middleware in `lib/undo-middleware.ts`, revert handlers track mutations
- **Offline Support**: `lib/offlineQueue.ts` queues mutations, replays on reconnect
- **Metrics**: Cycle time (inProgress→Done), lead time (created→Done), throughput heatmap

## Pre-commit

Run before committing: `npm run lint && npm run format && npm run typecheck`
