# AGENTS.md - SmartTask Developer Guide

## Quick Commands

```bash
npm run dev          # Dev server (port 3000, falls to 3001 if busy)
npm run lint        # ESLint
npm run format      # Prettier --write
npm run typecheck   # tsc --noEmit
npx prisma generate && npx prisma db push  # Schema sync (both required)
```

**Order matters**: `lint -> format -> typecheck` before commits.

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript (strict)
- Tailwind CSS v4, shadcn/ui
- Redux Toolkit + RTK Query
- Prisma v7 (PostgreSQL/Neon), better-auth v1 (JWT)
- Socket.IO (real-time)

## Project Structure

```
app/                    # Pages + API routes (Next.js 16 App Router)
├── (auth)/            # /login, /register
├── (dashboard)/       # /admin, /manager, /member, /board/[id]
├── api/              # 50+ route handlers
components/          # React components (ui/, kanban/, task/, admin/)
lib/
├── slices/           # Redux + RTK Query APIs
├── automation/      # Engine, triggers, actions
├── board-access.ts # Board access helper (CRITICAL for RBAC)
├── board-roles.ts   # getEffectiveBoardRole() - Board-specific role resolver
├── session.ts      # Auth helpers (requireApiAuth, etc.)
└── constants/      # Magic number constants
prisma/
└── schema.prisma  # 17 models
```

**Path alias**: `@/*` = project root.

## Database

- Schema: `prisma/schema.prisma`
- After ANY schema change: `npx prisma generate && npx prisma db push`
- Check sync: `npx prisma validate && npx prisma db pull`
- New model = update both commands

## Auth Flow

- Token stored in `auth_token` cookie (httpOnly, 7-day expiry)
- Verify with: `requireApiAuth()` → returns `SessionUser`
- Session helpers: `lib/session.ts` (`requireAuth`, `getApiSession`, `getServerSession`)

## CRITICAL: Board-Specific Role System

**NEVER use platform role (`session.user.role`) for board-level authorization.** Always resolve board-specific role:

```typescript
// WRONG - uses platform role
if (session.user.role === 'MEMBER') { ... }

// CORRECT - uses board-specific role
const effectiveRole = await getEffectiveBoardRole(session, boardId)
if (effectiveRole === 'MEMBER') { ... }

// Use verifyBoardAccess for board access checks
const board = await verifyBoardAccess(userId, boardId)
if (!board) { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
```

**Helper functions:**
- `lib/board-roles.ts`: `getEffectiveBoardRole(session, boardId)` → `'ADMIN' | 'MANAGER' | 'MEMBER' | null`
- `lib/board-access.ts`: `verifyBoardAccess(userId, boardId)` → Board or null

## Role-Based Access

| Role    | Dashboard | Can Create Board | Can Manage Users |
|---------|-----------|-----------------|-----------------|
| ADMIN   | /admin    | Yes             | Yes             |
| MANAGER | /manager  | Yes             | No              |
| MEMBER  | /member   | No              | No              |

**Priority**: Platform ADMIN > Board Owner > BoardMember role.

## Kanban System

- **Version locking**: Every task has `version` field for optimistic concurrency
- **WIP limits**: Columns have `wipLimit` - members blocked, managers can override with `{ override: true }`
- **Dependencies**: Blocked tasks cannot move to terminal columns (Done, Review)
- **Triggers**: `TASK_MOVED`, `TASK_ASSIGNED`, `PRIORITY_CHANGED`, `TASK_STALLED`

## API Patterns

```typescript
// Route params are Promises in Next.js 16
interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params
  // ...
}
```

## Board Member Management

- Platform ADMINs can access all boards
- Board Owner is always ADMIN for their board
- BoardMember role is independent of platform role
- Use `getEffectiveBoardRole()` not `session.user.role`

## Common Gotchas

1. **Rate limiter**: Uses hybrid in-memory + Prisma `RateLimit` table
2. **Dashboard redirect**: Profile loads async - show skeleton until `profileLoading` is false
3. **Prisma pull resets schema**: Run `prisma db pull` overwrites local schema
4. **Port conflicts**: `npm run dev` auto-finds port if 3000 busy
5. **.next cache**: Delete `.next` folder when typecheck generates false errors
6. **Socket token**: Stored in localStorage for Socket.IO (httpOnly cookie inaccessible to JS)

## Code Style

- Imports: external → `@/` → relative
- Components: `PascalCase`, files: `kebab-case.tsx`
- No `any` - use `unknown` if uncertain
- API errors: return `{ error: "message" }` with proper HTTP status
- Use constants from `lib/constants/index.ts` for magic numbers

## Pre-commit Checklist

```bash
npm run lint && npm run format && npm run typecheck
```

Tests: None configured.