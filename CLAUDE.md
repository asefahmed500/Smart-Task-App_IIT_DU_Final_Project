# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking
- `npx shadcn@latest add <component>` - Add shadcn/ui components
- `npx prisma generate` - Regenerate Prisma client after schema changes
- `npx prisma db push` - Push schema changes to database
- `npx prisma studio` - Open Prisma Studio to browse database

## Tech Stack

- **Framework**: Next.js 16 with App Router, React 19
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4 (PostCSS-based, not tailwind.config.js)
- **UI Components**: shadcn/ui with class-variance-authority
- **State Management**: Redux Toolkit (@reduxjs/toolkit, react-redux)
- **Database/ORM**: Prisma v7 with PostgreSQL (pg adapter)
- **Authentication**: better-auth v1 with email/password
- **Real-time**: Socket.IO client for presence/collaboration

## Architecture

### Path Aliases
`@/*` maps to the project root (`.` in tsconfig.json)

### Role-Based Access Control (RBAC)

**Three Roles with distinct permissions:**

**ADMIN** (Platform-level):
- Access: `/admin` routes
- Features: User CRUD, role assignment, platform audit log, password reset
- Redirect target: `/admin`

**MANAGER** (Board-level):
- Access: `/manager` dashboard
- Features: Board CRUD, column management, WIP limits, automation rules, team invitations
- Redirect target: `/manager`

**MEMBER** (Task-level):
- Access: `/dashboard` (main dashboard)
- Features: Task CRUD, self-assignment only, focus mode, undo/redo
- Redirect target: `/dashboard`

**Board-Level Role Calculation (`lib/board-roles.ts`):**
Priority order for determining a user's effective role on a board:
1. Platform ADMIN → always ADMIN (global privilege)
2. Board owner → ADMIN (implicit board ownership)
3. BoardMember record → use the assigned role (ADMIN/MANAGER/MEMBER)
4. Non-member → null (no access)

**Middleware Protection:** `middleware.ts` protects `/admin` routes. Session checks in API routes enforce role permissions.

### Design System (ElevenLabs-Inspired)

The application uses an ElevenLabs-inspired design system with restrained elegance, warm undertones, and light-weight typography.

**Color Palette:**
- Primary backgrounds: `#ffffff` (white), `#f5f5f5` (light gray)
- Accent: `#f5f2ef` (warm stone) - signature warm background
- Text: `#000000` (primary), `#4e4e4e` (dark gray), `#777169` (warm gray/muted)
- Border: `#e5e5e5`

**Typography:**
- Display headings: Inter 300 (light weight) - approximates Waldenburg style
- Body text: Inter 400-500 with positive letter-spacing (+0.14px to +0.18px)
- Monospace: Geist Mono for code
- Font variables: `--font-inter`, `--font-waldenburg` (fallback to Inter), `--font-geist-mono`

**Typography Classes (in globals.css):**
- `.text-display-hero` - 48px, -0.96px letter-spacing, light weight
- `.text-section-heading` - 36px, light weight
- `.text-card-heading` - 32px, light weight
- `.text-body` - 18px, +0.18px letter-spacing
- `.text-nav` - 15px, +0.15px letter-spacing, medium weight
- `.text-button-uppercase` - 14px, +0.7px letter-spacing, bold, uppercase

**Shadows (Multi-layer at sub-0.1 opacity):**
- `--shadow-inset-border`: `rgba(0,0,0,0.075) 0px 0px 0px 0.5px inset`
- `--shadow-outline-ring`: `rgba(0,0,0,0.06) 0px 0px 0px 1px`
- `--shadow-card`: `rgba(0,0,0,0.4) 0px 0px 1px, rgba(0,0,0,0.04) 0px 4px 4px`
- `--shadow-warm`: `rgba(78,50,23,0.04) 0px 6px 16px` - warm-tinted for CTAs

**Border Radius Scale:**
- `--radius-pill`: 9999px (primary buttons)
- `--radius-subtle`: 4px (badges, small elements)
- `--radius-standard`: 8px (inputs, form elements)
- `--radius-comfortable`: 10px (dropdowns)
- `--radius-card`: 16px (cards)
- `--radius-large`: 20px (featured cards)
- `--radius-warm-button`: 30px (warm stone CTA)

**Button Variants (`components/ui/button.tsx`):**
- `default`: Standard black background
- `black`: Black pill button (9999px radius)
- `white`: White pill with shadow stack
- `warm`: Warm stone signature button with warm shadow
- `cta`: Uppercase bold CTA (WaldenburgFH style)
- `outline`, `secondary`, `ghost`, `destructive`, `link`

**Card Variants (`components/ui/card.tsx`):**
- `default`: 20px radius, multi-layer shadow
- `elevated`: 24px radius, elevated shadow
- `warm`: 30px radius, warm stone background

### Redux Store Architecture

- Store configuration: `lib/store.ts` - uses `configureStore()` with RTK Query APIs
- Typed hooks: `lib/hooks.ts` - exports `useAppDispatch`, `useAppSelector`, `useAppStore`
- RTK Query APIs in `lib/slices/`:
  - `authApi.ts` - Authentication endpoints
  - `boardsApi.ts` - Board/column management, automation rules
  - `tasksApi.ts` - Task CRUD operations
  - `usersApi.ts` - User profile/boards
  - `adminApi.ts` - Admin operations
  - `notificationsApi.ts` - Notification system
- Custom slices:
  - `roleSlice.ts` - User role state and permissions
  - `uiSlice.ts` - UI state (online status, current board, view mode, focus mode)
  - `presenceSlice.ts` - Real-time user presence
  - `undoSlice.ts` - Undo/redo history
- Custom middleware (applied in order - this matters!):
  1. RTK Query middleware (auto-added for each API) - handles caching, invalidation
  2. `socketMiddleware` - joins/leaves board rooms on `ui/setCurrentBoard`, listens for presence
  3. `undoMiddleware` - tracks mutations, handles undo actions, clears on logout
  4. `createOfflineMiddleware()` - queues mutations when `state.ui.isOnline` is false

### Database (Prisma)

- Schema: `prisma/schema.prisma` - defines User, Board, Column, Task, TaskBlock, AuditLog, BoardMember, AutomationRule, Notification
- Client: `lib/prisma.ts` - singleton pattern with PrismaPg adapter, uses `DATABASE_URL`
- Models: Uses cuid() for IDs, PostgreSQL dialect, cascading deletes
- Key relations: User ↔ Board (owner/members), Task ↔ Column, Task ↔ Task (blockers via TaskBlock)

**Important:** After modifying `prisma/schema.prisma`, always run:
```bash
npx prisma generate
npx prisma db push
```

### Authentication (better-auth)

- Server instance: `lib/auth.ts` - uses PostgreSQL Pool directly
- Client instance: `lib/auth-client.ts` - `createAuthClient()` from better-auth/react
- API handler: `app/api/auth/[...all]/route.ts` - `toNextJsHandler(auth.handler)`
- Session utilities: `lib/session.ts` - `getSession()`, `requireAuth()`, `requireRole(['ADMIN' | 'MANAGER' | 'MEMBER'])`
- Environment: `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` in `.env`

**Session Utility Pattern:**
Two separate patterns for different contexts:
- **Server Components / Pages**: `requireAuth()` and `requireRole()` - redirect to `/login` or `/dashboard`
- **API Routes**: `requireApiAuth()` and `requireApiRole()` - return `NextResponse` with 401/403 status

This distinction prevents API routes from redirecting (which would break JSON responses).

### Socket.IO (Real-time Features)

- Client: `lib/socket.ts` - singleton socket instance with event emitters/listeners
- Server: `app/api/socket/route.ts` - Socket.IO server with authentication middleware
- Auth: Token validation via `getSession()` from better-auth
- Events: `board:join`, `board:leave`, `task:update`, `task:move`, `presence:update`, `presence:cursor`, `presence:editing:start`, `presence:editing:stop`
- Integration: `lib/socket-middleware.ts` - Redux middleware that connects presenceSlice to socket events

### Automation Rules System

**Engine:** `lib/automation/engine.ts` - Evaluates and executes automation rules
**Triggers:** `lib/automation/triggers.ts` - Trigger handlers (TASK_MOVED, TASK_ASSIGNED, PRIORITY_CHANGED, TASK_STALLED)
**Actions:** `lib/automation/actions.ts` - Action execution (NOTIFY, AUTO_ASSIGN, CHANGE_PRIORITY, ADD_LABEL)
**API:** `app/api/boards/[id]/automations/route.ts` - List/create rules
**UI:** `components/automation/rules-list.tsx`, `components/automation/rule-builder-dialog.tsx`

### WIP Limit Enforcement

**Hard enforcement:** Members cannot move tasks to full columns. Managers/Admins can override.
**API:** `app/api/tasks/[id]/move/route.ts` - Checks WIP limit before allowing move
**Board-level role:** Uses `getEffectiveBoardRole()` from `lib/board-roles.ts` to determine permissions
**Override:** Manager/Admin can pass `override: true` to bypass WIP limit
**Visual feedback:** Column headers show count/limit, red pulse when full

**Self-Assignment Restriction:**
**API:** `app/api/tasks/[id]/route.ts` (PATCH endpoint)
**Rule:** Members can only assign tasks to themselves (or unassign)
**Implementation:** Lines 112-119 enforce this - if MEMBER and assigneeId !== userId, keeps existing assignment

### Notification System

**API:** `app/api/notifications/route.ts`, `app/api/notifications/[id]/route.ts`
**UI:** `components/notifications/notification-center.tsx` - Bell icon with unread count badge
**Real-time:** Socket.IO broadcasts `notification:new` events

### Advanced Metrics

**Throughput Calendar:** `components/metrics/throughput-calendar.tsx` - 90-day GitHub-style heatmap
**Flow Metrics:** `components/metrics/flow-metrics.tsx` - Cycle time, lead time calculations
**Calculations:** `lib/metrics/throughput.ts`, `lib/metrics/cycle-time.ts`, `lib/metrics/lead-time.ts`

### Swimlane View

**Component:** `components/kanban/swimlane-view.tsx` - Groups tasks by assignee/priority/label
**Selector:** `components/kanban/swimlane-group-select.tsx` - Group selection dropdown
**Toggle:** View mode toggle in navbar (Board/Swimlane/Metrics)

### Dependency Management

**Data Model:** TaskBlock in Prisma schema (already exists)
**Visualization:** `components/kanban/dependency-arrows.tsx` - SVG arrow overlay
**Management:** `components/task/dependency-select.tsx` - Add blocking task dialog

### Theme (Dark Mode)

- Provider: `components/theme-provider.tsx` wraps root layout
- Hotkey: Press `d` to toggle dark/light mode (ignores input fields)
- CSS: Custom variant `@custom-variant dark (&:is(.dark *))` in `app/globals.css`

### Offline Support

- Queue: `lib/offlineQueue.ts` - localStorage-based action queue for offline mutations
- Replay: `replayQueue()` function restores queued actions when back online
- Visual indicator: `components/offline-banner.tsx`
- Middleware: Auto-queues mutation actions when `state.ui.isOnline` is false

### Security Features

**Rate Limiting:**
- Implementation: `lib/rate-limiter.ts` - In-memory Map-based rate limiter
- Login endpoint: 5 attempts per 5 minutes per IP (see `app/api/auth/login/route.ts`)
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`
- IP extraction: Supports `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`

**Security Headers (`next.config.mjs`):**
- CSP: `default-src 'self'`, `script-src 'self'` (unsafe-eval/inline in dev), `style-src 'self' 'unsafe-inline'`
- HSTS: `max-age=31536000; includeSubDomains`
- X-Frame-Options: `DENY`
- X-Content-Type-Options: `nosniff`
- Referrer-Policy: `strict-origin-when-cross-origin`
- Permissions-Policy: `camera=(), microphone=(), geolocation=(), payment=()`

**Automation Whitelisting:**
- Triggers: TASK_MOVED, TASK_ASSIGNED, PRIORITY_CHANGED, TASK_STALLED (see `lib/automation/triggers.ts`)
- Actions: NOTIFY_USER, NOTIFY_ROLE, AUTO_ASSIGN, CHANGE_PRIORITY, ADD_LABEL (see `lib/automation/actions.ts`)
- Condition fields: priority, assigneeId, columnId, label, daysSinceLastMove, title, description
- Condition operators: EQ, NEQ, CONTAINS, GT, LT, GTE, LTE, EMPTY, NOT_EMPTY
- Security validation in `evaluateCondition()` (line 161-169 in `lib/automation/engine.ts`)

### Project Structure

- `app/` - Next.js App Router (pages, layouts, API routes)
  - `app/(auth)/` - Auth route group (login, register)
  - `app/(dashboard)/` - Protected dashboard route group
    - `app/(dashboard)/dashboard/page.tsx` - Member dashboard (redirects admins/managers away)
    - `app/(dashboard)/admin/page.tsx` - Admin dashboard
    - `app/(dashboard)/manager/page.tsx` - Manager dashboard
    - `app/(dashboard)/board/[id]/page.tsx` - Board/Kanban view
  - `app/(landing)/` - Public landing page
  - `app/api/` - API routes
- `components/` - React components
  - `ui/` - shadcn/ui base components
  - `auth/` - Authentication components
  - `admin/` - Admin dashboard components
  - `automation/` - Automation rule components
  - `kanban/` - Kanban board components
  - `metrics/` - Metrics visualization components
  - `notifications/` - Notification components
  - `task/` - Task-related components
  - `layout/` - Layout components (navbar, sidebar)
- `lib/` - Utility functions, Redux slices, middleware
  - `lib/automation/` - Automation system
  - `lib/metrics/` - Metrics calculation utilities
  - `prisma/` - Database schema and migrations

### Key Implementation Patterns

**Role-based API route protection:**
```typescript
const session = await requireAuth()
if (session.user.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

**Automation trigger integration:**
After successful task mutations, call `evaluateAutomations(boardId, eventType, taskData, actorId)` from `lib/automation/engine.ts`

**Real-time presence:**
- Emit `presence:editing:start` when user opens task detail modal
- Emit `presence:editing:stop` when user closes modal
- Presence slice tracks editing users per task

**WIP limit check:**
In `app/api/tasks/[id]/move/route.ts`:
```typescript
if (targetColumn.wipLimit && taskCount >= targetColumn.wipLimit && !isManagerOrAdmin) {
  return NextResponse.json({ error: 'WIP_LIMIT_EXCEEDED' }, { status: 409 })
}
```

**Undo/redo tracked actions:**
`lib/undo-middleware.ts` tracks these actions for undo history:
- `task/createTask/fulfilled`, `task/updateTask/fulfilled`, `task/deleteTask/fulfilled`
- `task/moveTask/fulfilled`, `task/assignTask/fulfilled`
- `boards/createBoard/fulfilled`, `boards/updateBoard/fulfilled`, `boards/deleteBoard/fulfilled`
- `columns/createColumn/fulfilled`, `columns/updateColumn/fulfilled`, `columns/deleteColumn/fulfilled`

Revert handlers in `lib/undo/revert-handlers.ts` define inverse operations for each action type.

**Prisma JsonValue type handling:**
Prisma's `JsonField` returns `JsonValue` (which can be `null`), but `JSON.parse()` expects `string`.
Use type assertion when parsing: `JSON.parse(rule.trigger as string)`
For null values in JSON fields, use `Prisma.JsonNull` instead of plain `null`.
