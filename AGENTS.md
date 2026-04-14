# AGENTS.md - Developer Guidelines for This Project

This file provides guidance for AI agents operating in this repository.

## Build & Development Commands

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run typecheck   # TypeScript type checking
npx prisma generate # Generate Prisma client after schema changes
npx prisma db push  # Push schema to database
npx prisma studio   # Open database browser
npm run seed        # Seed database
```

## Tech Stack

- **Framework**: Next.js 16 with App Router, React 19
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **State**: Redux Toolkit with RTK Query APIs
- **Database**: Prisma v7 with PostgreSQL (pg adapter)
- **Auth**: better-auth v1 with email/password
- **Real-time**: Socket.IO client

## Path Aliases

`@/*` maps to the project root (`.` in tsconfig.json).

## Code Style Guidelines

### Imports

Use absolute imports via `@/` prefix. Order: external libs → internal modules → relative paths:

```typescript
import { useState } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { tasksApi } from "@/lib/slices/tasksApi"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"
import { TaskDialog } from "./task-dialog"
```

### TypeScript

- Use explicit return types for exported functions
- Use `interface` for object shapes, `type` for unions/aliases
- Avoid `any`, use `unknown` when type is uncertain
- Use strict null checks (optional `?`, `null`, `undefined`)

```typescript
interface Task {
  id: string
  title: string
  assigneeId?: string | null
}
```

### Naming Conventions

- **Files**: kebab-case (`cn.ts`), camelCase components (`task-dialog.tsx`)
- **Components**: PascalCase (`TaskDialog.tsx`)
- **React hooks**: camelCase starting with `use` (`useAppDispatch`)
- **Constants**: SCREAMING_SNAKE_CASE
- **Interfaces**: PascalCase (`CreateTaskRequest`)

### Component Structure

```typescript
interface ComponentNameProps {
  className?: string
  onAction: () => void
}

export function ComponentName({ className, onAction }: ComponentNameProps) {
  const [state, setState] = useState(false)
  return <div className={cn('base', className)}>{/* content */}</div>
}
```

### Error Handling

- Use NextResponse for API routes
- Return proper HTTP status codes
- Wrap async operations in try-catch with error logging

```typescript
return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

try {
  const result = await db.task.update(...)
  return NextResponse.json(result)
} catch (error) {
  console.error('Task update failed:', error)
  return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
}
```

### Redux Toolkit Patterns

Use RTK Query with `createApi`. Middleware registered in `lib/store.ts`:

```typescript
export const tasksApi = createApi({
  reducerPath: 'tasksApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api', credentials: 'include' }),
  tagTypes: ['Task'],
  endpoints: (builder) => ({
    getTasks: builder.query<Task[], string>({
      query: (boardId) => `/boards/${boardId}/tasks`,
      providesTags: (result) => result?.map(...) || [],
    }),
  }),
})
```

### Styling

- Use `cn()` utility (`lib/utils/cn.ts`) for conditional classes
- Follow design system from `app/globals.css`
- Use shadcn/ui components from `components/ui/`

### Database (Prisma)

Schema in `prisma/schema.prisma`. After changes: `npx prisma generate && npx prisma db push`. Use `lib/prisma.ts` for database client.

### Authentication

- Server: `lib/auth.ts` (better-auth instance)
- Client: `lib/auth-client.ts`
- Session: `lib/session.ts` (`requireAuth`, `requireRole`)

### Role-Based Access

Three roles: `ADMIN`, `MANAGER`, `MEMBER`:

```typescript
const session = await requireAuth()
if (session.user.role !== "ADMIN") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}
```

### Linting & Formatting

Run before committing: `npm run lint && npm run format && npm run typecheck`. ESLint uses next-web-vitals + typescript configs.
