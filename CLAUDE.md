# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` - Start development server with Socket.IO integration (uses custom server.cjs)
- `npm run build` - Build for production
- `npm run start` - Start production server with Socket.IO integration
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking
- `npm run seed` - Seed database with sample data
- `npx shadcn@latest add <component>` - Add shadcn/ui components
- `npx prisma generate` - Regenerate Prisma client after schema changes
- `npx prisma db push` - Push schema changes to database
- `npx prisma studio` - Open Prisma Studio to browse database

**Note:** The application uses a custom server (`server.cjs`) that integrates Next.js with Socket.IO. This is required for real-time features to work properly.

## Tech Stack

- **Framework**: Next.js 16.1.7 with App Router, React 19.2
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4 (PostCSS-based, not tailwind.config.js)
- **UI Components**: shadcn/ui with class-variance-authority
- **State Management**: Redux Toolkit (@reduxjs/toolkit, react-redux)
- **Database/ORM**: Prisma v7 with PostgreSQL (pg adapter)
- **Authentication**: better-auth v1 with email/password
- **Real-time**: Socket.IO client for presence/collaboration
- **Validation**: Zod schemas for API request validation

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

**IMPORTANT: Always use CSS variables, never hardcoded colors.**

The application uses an ElevenLabs-inspired design system with restrained elegance, warm undertones, and light-weight typography.

**CSS Variables (defined in globals.css):**
- `--background`, `--foreground` - Main background/text
- `--card`, `--card-foreground` - Card backgrounds
- `--popover`, `--popover-foreground` - Popover/dialog
- `--primary`, `--primary-foreground` - Primary actions (black/white)
- `--secondary`, `--secondary-foreground` - Secondary actions (warm stone)
- `--muted`, `--muted-foreground` - Muted elements
- `--accent`, `--accent-foreground` - Accent highlights
- `--border` - All borders (use this, never `rgba(0,0,0,0.08)` or similar)
- `--input` - Input backgrounds

**Always use these instead of:**
- ❌ `bg-white`, `bg-black` → ✅ `bg-background`, `bg-foreground`
- ❌ `border-[rgba(0,0,0,0.08)]` → ✅ `border-border`
- ❌ `text-[#777169]` → ✅ `text-muted-foreground`
- ❌ `bg-[#f5f5f5]` → ✅ `bg-muted`

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

### Redux Store Architecture

- Store configuration: `lib/store.ts` - uses `configureStore()` with RTK Query APIs
- Typed hooks: `lib/hooks.ts` - exports `useAppDispatch`, `useAppSelector`, `useAppStore`
- RTK Query APIs in `lib/slices/`:
  - `authApi.ts` - Authentication endpoints
  - `boardsApi.ts` - Board/column management, automation rules
  - `tasksApi.ts` - Task CRUD operations, comments, attachments
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

### API Validation Pattern (Required for all new API routes)

**Always use Zod validation for API requests.**

1. Import the validation middleware:
```typescript
import { validateRequest } from '@/lib/api/validation-middleware'
import { createTaskSchema } from '@/lib/validations/task'
```

2. Use it in your route handler:
```typescript
export async function POST(req: NextRequest) {
  const validation = await validateRequest(req, createTaskSchema)
  if (!validation.success) return validation.error

  const { title, description } = validation.data
  // ... rest of handler
}
```

3. Define schemas in `lib/validations/`:
- `task.ts` - Task-related schemas (createTaskSchema, updateTaskSchema, moveTaskSchema, etc.)
- `board.ts` - Board-related schemas (createBoardSchema, updateBoardSchema, etc.)
- `user.ts` - User-related schemas
- `notification.ts` - Notification schemas
- `automation.ts` - Automation rule schemas (createAutomationSchema, updateAutomationSchema)

### Database (Prisma)

- Schema: `prisma/schema.prisma` - defines User, Board, Column, Task, TaskBlock, AuditLog, BoardMember, AutomationRule, Notification, Comment, TaskAttachment, SystemSettings, Webhook, TimeLog, RateLimit
- Client: `lib/prisma.ts` - singleton pattern with PrismaPg adapter, uses `DATABASE_URL`
- Models: Uses cuid() for IDs, PostgreSQL dialect, cascading deletes
- Key relations: User ↔ Board (owner/members), Task ↔ Column, Task ↔ Task (blockers via TaskBlock)
- **Indexes:** Composite index on Task for stalled queries: `@@index([boardId, completedAt, lastMovedAt])`
- **AuditLog model**: Captures all mutations with actorId, action, entityType, entityId, boardId, changes (Json), ipAddress, userAgent

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
- **Email**: `lib/email.ts` - nodemailer integration for verification and password reset emails
  - `sendVerificationEmail()` - Sends verification email with 24hr expiry
  - `sendPasswordResetEmail()` - Sends reset link with 1hr expiry
  - Config: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`

**Session Utility Pattern:**
Two separate patterns for different contexts:
- **Server Components / Pages**: `requireAuth()` and `requireRole()` - redirect to `/login` or `/dashboard`
- **API Routes**: `requireApiAuth()` and `requireApiRole()` - return `NextResponse` with 401/403 status

This distinction prevents API routes from redirecting (which would break JSON responses).

### Environment Validation

**Module:** `lib/env-validation.ts` - Comprehensive environment variable validation using Zod

**Purpose:** Fails fast on application startup if required environment variables are missing or invalid, preventing runtime errors from configuration issues.

**Required Variables:**
- `BETTER_AUTH_SECRET` - Must be at least 64 characters
- `BETTER_AUTH_URL` - Must be a valid URL
- `DATABASE_URL` - Must be a valid URL (PostgreSQL connection string)
- `DIRECT_URL` - Must be a valid URL (for Prisma CLI)
- `ALLOWED_ORIGIN` - Required for CORS configuration

**Optional Variables:**
- `PORT` - Defaults to 3000
- `NODE_ENV` - Defaults to 'development'
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` - Email configuration

**Usage:**
```typescript
import { validateEnv, getEnv } from '@/lib/env-validation'

// Validate on startup (called automatically by module)
const env = validateEnv()

// Get validated environment variables
const env = getEnv()
```

**Integration:** Used in `lib/auth.ts` and `lib/prisma.ts` to ensure environment variables are validated before use.

### Socket.IO (Real-time Features)

- Client: `lib/socket.ts` - singleton socket instance with event emitters/listeners, exponential backoff reconnection
- **Custom Server:** `server.cjs` - Integrated Next.js + Socket.IO server (required for dev/production)
- **Path:** `/api/socket` - Socket.IO endpoint path
- **Initialization**: `components/layout/socket-initializer.tsx` - Ensures Socket.IO server initializes before any client connections (prevents "server unavailable" warnings on first load)
- Auth: Token validation via `getSession()` from better-auth with middleware
- Events: `board:join`, `board:leave`, `task:update`, `task:move`, `presence:update`, `presence:cursor`, `presence:editing:start`, `presence:editing:stop`, `comment:new`, `comment:updated`, `comment:deleted`
- Integration: `lib/socket-middleware.ts` - Redux middleware that connects presenceSlice to socket events
- **Cleanup**: `disconnectSocket()` called on logout to prevent memory leaks
- **Notifications**: Real-time delivery via `io.to(\`user:${userId}\`).emit('notification:new')`

**Socket.IO Architecture:**
The application uses a custom HTTP server (`server.cjs`) that integrates Next.js with Socket.IO. This server:
- Handles both Next.js page requests and Socket.IO WebSocket connections
- Runs on the configured PORT (default 3000)
- Includes authentication middleware for Socket.IO connections
- Replaces the default Next.js dev server for full real-time functionality

**Development vs Production:**
Both development and production use `node server.cjs` to ensure consistent Socket.IO behavior across environments.

### Comments System

**API:** `app/api/tasks/[id]/comments/route.ts` - GET/POST comments for a task
**Components:**
- `components/task/comments-panel.tsx` - Main container with Socket.IO real-time updates
- `components/task/comment-form.tsx` - Add comment form
- `components/task/comment-item.tsx` - Individual comment with edit/delete (owner only)

**Real-time events:** `comment:new`, `comment:updated`, `comment:deleted`

### File Attachments System

**API:** 
- `app/api/tasks/[id]/attachments/route.ts` - GET/POST attachments
- `app/api/tasks/[id]/attachments/upload/route.ts` - Multipart file upload

**Components:**
- `components/task/file-upload.tsx` - Drag-and-drop upload with validation (10MB limit, type restrictions)
- `components/task/attachment-list.tsx` - Display attachments with download/delete

**Validation:**
- Max file size: 10MB
- Allowed types: Images (jpeg, png, gif, webp), PDF, Documents (doc, docx, xls, xlsx), TXT, ZIP
- Files stored in: `public/uploads/attachments/`

### Automation Rules System

**Engine:** `lib/automation/engine.ts` - Evaluates and executes automation rules with Zod validation
**Triggers:** `lib/automation/triggers.ts` - Trigger handlers (TASK_MOVED, TASK_ASSIGNED, PRIORITY_CHANGED, TASK_STALLED)
**Actions:** `lib/automation/actions.ts` - Action execution (NOTIFY, AUTO_ASSIGN, CHANGE_PRIORITY, ADD_LABEL)
**API:** `app/api/boards/[id]/automations/route.ts` - List/create rules
**UI:** `components/automation/rules-list.tsx`, `components/automation/rule-builder-dialog.tsx`
**Security:** JSON parsing uses `safeJSONParse()` with Zod schema validation to prevent injection attacks

### Board Export System

**API:** `app/api/boards/[id]/export/route.ts` - Export board data
**Formats:** JSON (default) or CSV (`?format=csv` query param)
**Access:** Board members only (verified via `verifyBoardAccess()`)
**CSV Export:** Flattens columns and tasks with assignee info, labels, dates
**Usage:** `GET /api/boards/{id}/export?format=csv`

### Webhooks System

**API:** `app/api/boards/[id]/webhooks/route.ts` - Board-level webhooks
**Management:** MANAGER/ADMIN only (enforced via `getEffectiveBoardRole()`)
**Events:** TASK_MOVED, TASK_ASSIGNED, COMMENT_ADDED, TASK_BLOCKED, TASK_UNBLOCKED, AUTOMATION_TRIGGER
**Security:** Optional HMAC SHA-256 secret for payload verification
**UI:** `components/board/webhook-settings.tsx` - Create/delete webhooks, toggle active status
**Schema:** `Webhook` model in Prisma with events array, isActive flag

### Time Tracking System

**API:** `app/api/tasks/[id]/time-logs/route.ts` - Task time logging
**Actions:**
- `start` - Start timer (creates log with startTime)
- `stop` - Stop timer (calculates duration, increments Task.totalTimeSpent)
- `manual` - Add manual time entry
**Schema:** `TimeLog` model with taskId, userId, startTime, endTime, duration, description
**Real-time:** Broadcasts `broadcastTimeLogUpdate()` and `broadcastTaskUpdate()` after changes
**Constraints:** Only one running timer per user per task

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

### Theme (Dark Mode)

- Provider: `components/theme-provider.tsx` wraps root layout
- Hotkey: Press `d` to toggle dark/light mode (ignores input fields)
- Toggle button: In navbar (Sun/Moon icons)
- CSS: Custom variant `@custom-variant dark (&:is(.dark *))` in `app/globals.css`
- **Always test new components in both light and dark modes**

### Offline Support

- Queue: `lib/offlineQueue.ts` - localStorage-based action queue for offline mutations
- Replay: `replayQueue()` function restores queued actions when back online
- Visual indicator: `components/offline-banner.tsx`
- Middleware: Auto-queues mutation actions when `state.ui.isOnline` is false

### Security Features

**CRITICAL: Always use board-level role checks for board operations:**

For any board-related API route (tasks, columns, members), use `getEffectiveBoardRole()` from `lib/board-roles.ts` instead of `session.user.role`:

```typescript
// ❌ WRONG - checks platform role only
if (session.user.role === 'MEMBER') { ... }

// ✅ CORRECT - checks board-level role
const effectiveRole = await getEffectiveBoardRole(session, boardId)
if (effectiveRole === 'MEMBER') { ... }
```

This ensures platform MEMBERS who are board MANAGERs or ADMINs have proper permissions.

**Audit Logging:**
Comprehensive audit logging across mutations (actorId, entityType, action, changes, boardId):
- Tasks: `app/api/tasks/[id]/route.ts`, `app/api/tasks/[id]/move/route.ts`, `app/api/tasks/[id]/assign/route.ts`
- Comments/Attachments: `app/api/tasks/[id]/comments/route.ts`, `app/api/tasks/[id]/attachments/route.ts`
- Dependencies: `app/api/tasks/[id]/dependencies/route.ts`
- Boards: `app/api/boards/route.ts`, `app/api/boards/[id]/route.ts` (BOARD_CREATED, UPDATED, DELETED, ARCHIVED)
- Columns: `app/api/columns/[id]/route.ts`, `app/api/columns/reorder/route.ts` (COLUMN_UPDATED, DELETED, REORDERED)
- Members: `app/api/boards/[id]/members/route.ts` (MEMBER_INVITED, ROLE_CHANGED, REMOVED)
- Automations: `app/api/boards/[id]/automations/route.ts`, `app/api/automations/[id]/route.ts`
- Users: `app/api/users/change-password/route.ts`, `app/api/admin/settings/route.ts`

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

**File Upload Security:**
- **Extension Validation:** Uses `path.extname()` instead of `.split('.').pop()` to prevent double-extension attacks
- **MIME Type Validation:** Validates that file extensions match declared MIME types
- **Allowed Extensions:** jpg, jpeg, png, gif, webp, pdf, txt, doc, docx, xls, xlsx, zip
- **Implementation:** `app/api/tasks/[id]/attachments/upload/route.ts`

**Task Assignment Security:**
- **Self-Assignment:** Members can assign tasks to themselves OR unassign themselves
- **Assignment Restriction:** Members cannot assign tasks to other users
- **Implementation:** `app/api/tasks/[id]/route.ts` (PATCH endpoint)

**IP Address Extraction:**
- **Correct Method:** Uses `headers.get()` for `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`
- **Anti-Pattern:** Never read IP addresses from cookies (user-controlled)
- **Implementation:** `lib/auth.ts` - `getClientIp(headers?: Headers)`

**JSON Parsing Security:**
- **Automation Engine:** Uses Zod schema validation before parsing JSON from database
- **Safe Parse Function:** `safeJSONParse()` in `lib/automation/engine.ts` prevents injection attacks
- **Fallback Values:** Provides safe defaults when validation fails

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

### Socket.IO Real-time Patterns

**Adding real-time listeners to components:**

```typescript
import { onTaskUpdate, onTaskDelete } from '@/lib/socket'

useEffect(() => {
  const unsubscribeTaskUpdate = onTaskUpdate(() => {
    // RTK Query auto-refetches via cache invalidation
  })
  return () => unsubscribeTaskUpdate()
}, [boardId])
```

**Broadcasting updates after API changes:**

```typescript
import { broadcastTaskUpdate } from '@/lib/socket-server'

// After database mutation:
broadcastTaskUpdate(boardId, updatedData)
```

**Common events:** `task:updated`, `task:deleted`, `board:updated`, `members:updated`, `automations:updated`, `comment:new`

### File Upload/Delete Pattern

**Upload:** Files stored in `public/uploads/attachments/` with UUID names
**Delete:** Always delete physical file AND database record:

```typescript
import { unlink } from 'fs/promises'
import { join } from 'path'

const filePath = join(process.cwd(), 'public', attachment.url)
await unlink(filePath) // Delete from disk
await prisma.taskAttachment.delete({ where: { id } }) // Delete from DB
```

### Notification Pattern

**Always use `refetch()` instead of `window.location.reload()`:**

```typescript
const { data, refetch } = useGetNotificationsQuery()

useEffect(() => {
  const cleanup = onNotification(() => {
    refetch() // ✅ Correct - cache invalidation
    // window.location.reload() // ❌ Wrong - jarring UX
  })
  return cleanup
}, [refetch])
```

### Offline Mode Implementation Notes

**What works:**
- Detection via `ConnectivityListener` component
- localStorage queue in `lib/offlineQueue.ts`
- Visual indicators in `OfflineBanner`

**Limitations:**
- Only RTK Query mutations with patterns `tasksApi/`, `boardsApi/`, etc. are queued
- Replay mechanism calls `initiate()` - requires proper action structure
- Actions pass through for optimistic UI updates even when offline

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
    - `app/api/boards/[id]/export/` - Board export (JSON/CSV)
    - `app/api/boards/[id]/webhooks/` - Board webhook management
    - `app/api/tasks/[id]/time-logs/` - Time tracking for tasks
- `components/` - React components
  - `ui/` - shadcn/ui base components
  - `auth/` - Authentication components
  - `admin/` - Admin dashboard components
  - `automation/` - Automation rule components
  - `board/` - Board management components (settings, webhooks, members, activity feed)
  - `kanban/` - Kanban board components
  - `metrics/` - Metrics visualization components
  - `notifications/` - Notification components
  - `task/` - Task-related components (comments-panel, comment-form, comment-item, file-upload, attachment-list)
  - `layout/` - Layout components (navbar, sidebar)
- `lib/` - Utility functions, Redux slices, middleware
  - `lib/api/` - API utilities (validation-middleware)
  - `lib/automation/` - Automation system
  - `lib/metrics/` - Metrics calculation utilities
  - `lib/validations/` - Zod validation schemas
  - `prisma/` - Database schema and migrations

### Performance Optimization Patterns

**Eliminate Waterfalls in API Routes:**
Use `Promise.all()` for parallel independent operations:
```typescript
// ❌ Wrong - sequential awaits
const cycleTime = await calculateCycleTime(id)
const leadTime = await calculateLeadTime(id)
const totalTasks = await prisma.task.count({ where: { boardId: id } })

// ✅ Correct - parallel execution
const [cycleTime, leadTime, totalTasks] = await Promise.all([
  calculateCycleTime(id),
  calculateLeadTime(id),
  prisma.task.count({ where: { boardId: id } }),
])
```

**Memoize Components to Prevent Unnecessary Re-renders:**
Use `React.memo()` with custom comparison for components that receive frequent updates:
```typescript
export default memo(function Column({ column, tasks, activeId }) {
  // component logic
}, (prev, next) => {
  return prev.column.id === next.column.id &&
         prev.tasks.length === next.tasks.length &&
         prev.activeId === next.activeId
})
```

**RTK Query Cache Invalidation:**
Never use `window.location.reload()` for refreshes after mutations. RTK Query auto-invalidates caches via tag invalidation.

### Select Component Best Practices

**Avoid Controlled/Uncontrolled Warnings:**
Always initialize Select values with a defined state (never empty string `''`):
```typescript
// ❌ Wrong - causes controlled/uncontrolled warning
const [assigneeId, setAssigneeId] = useState('')
<Select value={assigneeId || 'unassigned'} />

// ✅ Correct - always controlled
const [assigneeId, setAssigneeId] = useState('unassigned')
<Select value={assigneeId} onValueChange={setAssigneeId} />

// For optional selects, use undefined:
const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
<Select value={selectedId} onValueChange={(v) => setSelectedId(v || undefined)} />
```

### Testing Approach

**Manual Testing with next-browser:**
The project uses `next-browser` for comprehensive UI/UX testing:
- Run `next-browser open http://localhost:3000` to start testing
- Use `snapshot` to discover interactive elements
- Use `errors` to check for build/runtime errors
- Use `browser-logs` to check console warnings
- Use `network` to verify API endpoints
- Test all user flows: login, dashboard navigation, board operations, task CRUD

**Test Coverage Checklist:**
- All three role dashboards (admin/manager/member)
- Board view modes (Board/Swimlane/Metrics)
- Create/edit/delete tasks
- Real-time features (presence, cursors)
- Dark mode toggle
- Offline mode (disconnect network)

