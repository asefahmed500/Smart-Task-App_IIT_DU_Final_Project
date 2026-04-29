# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**User Preference:** This project owner often uses `/caveman` mode for terse, direct communication. The mode can be toggled with `/caveman full|lite|ultra` or disabled with "stop caveman" / "normal mode". When in caveman mode, drop filler words, articles, and pleasantries while keeping all technical substance accurate.

## Commands

- `npm run dev` - Start development server with Socket.IO integration (uses `server.ts` with tsx)
- `npm run build` - Build for production
- `npm run start` - Start production server with Socket.IO integration
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking
- `npm run seed` - Seed database with sample data

**Note:** No test suite is currently configured. Add testing before implementing critical features.
- `npm run check-users` - List all users in database (development helper)
- `npm run check-boards` - Show board memberships for a user (development helper)
- `npx shadcn@latest add <component>` - Add shadcn/ui components
- `npx prisma generate` - Regenerate Prisma client after schema changes
- `npx prisma db push` - Push schema changes to database
- `npx prisma studio` - Open Prisma Studio to browse database

**Note:** The application uses a custom server (`server.ts`) that integrates Next.js with Socket.IO. This is required for real-time features to work properly. **Never use `next dev` directly** - always use `npm run dev` which starts the custom server.

**Note:** All TypeScript scripts (like those in `scripts/`) require dotenv loading. Use pattern: `npx tsx -r dotenv/config <script> dotenv_config_path=.env.local`

### Getting Started

**First-time setup:**
1. Copy `.env.example` to `.env.local` and configure:
   - `BETTER_AUTH_SECRET` (generate: `openssl rand -base64 64`)
   - `DATABASE_URL` (PostgreSQL connection string - pooled connection)
   - `DIRECT_URL` (PostgreSQL connection string - direct connection for Prisma migrations)
   - `BETTER_AUTH_URL` (typically `http://localhost:3000`)
   - `NEXT_PUBLIC_APP_URL` (typically `http://localhost:3001` - important for email verification links)
   - `ALLOWED_ORIGIN` (for CORS configuration)
   - Required for auth: Email configuration (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`)
2. Install dependencies: `npm install`
3. Generate Prisma client: `npx prisma generate`
4. Setup database: `npx prisma db push`
5. Seed data (optional): `npm run seed`
6. Start development server: `npm run dev`

**Environment validation runs automatically** on startup - missing or invalid environment variables will cause immediate failures with clear error messages.

**Email Configuration Required:** The auth system requires email to be configured for verification codes and password reset to work. Use `EMAIL_*` prefix variables in `.env.local`.

## Tech Stack

- **Framework**: Next.js 16.1.7 with App Router, React 19.2
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4 (PostCSS-based, not tailwind.config.js)
- **UI Components**: shadcn/ui with class-variance-authority
- **State Management**: Redux Toolkit (@reduxjs/toolkit, react-redux)
- **Database/ORM**: Prisma v7 with PostgreSQL (Neon adapter)
- **Authentication**: better-auth v1.6 with email/password, 6-digit code verification
- **Real-time**: Socket.IO with cookie-based authentication
- **Validation**: Zod schemas for API request validation

## Architecture

### Path Aliases & Route Groups
`@/*` maps to the project root (`.` in tsconfig.json)

**Next.js App Router Structure:**
- `(auth)` - Route group for auth pages (login, register) - uses centered layout
- `(dashboard)` - Route group for protected pages - includes Navbar, Sidebar, RightSidebar
- `(landing)` - Route group for landing page - public access
- Route groups don't affect URL paths but allow shared layouts

**When using dynamic imports in server.ts or outside Next.js context:**
- Use `.js` extension even for TypeScript files: `await import('./lib/auth.js')`
- This is required because the server runs outside Next.js's module resolution

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
- Access: `/member` routes (not `/dashboard` - see routing note below)
- Features: Task CRUD, self-assignment only, focus mode, undo/redo
- Redirect target: `/member`

**Board-Level Role Calculation (`lib/board-roles.ts`):**
Priority order for determining a user's effective role on a board:
1. Platform ADMIN → always ADMIN (global privilege)
2. Board owner → ADMIN (implicit board ownership)
3. BoardMember record → use the assigned role (ADMIN/MANAGER/MEMBER)
4. Non-member → null (no access)

**Board Access Utilities (`lib/board-access.ts`):**
- `verifyBoardAccess(userId, boardId)` - Check if user is owner or member
- `verifyBoardAccessOrFail(userId, boardId)` - Same but throws if no access
- Note: These don't return role - use `getEffectiveBoardRole()` for permission checks

**Routing Note:** `/dashboard` redirects users based on role (ADMIN→`/admin`, MANAGER→`/manager`, MEMBER→`/member`). Members should always use `/member` for their dashboard.

**Middleware Protection:** `middleware.ts` protects routes by checking for `better-auth.session_token` cookie. API routes are excluded from middleware (they handle their own auth via `requireApiAuth()` and `requireApiRole()` - returning 401/403 JSON responses instead of redirects).

**Feature Permissions Reference:**
See `FEATURE_PERMISSIONS.md` for complete breakdown of all features and role-based access control. Includes:
- Quick reference matrix table
- Detailed permissions for 40+ features across 10 categories
- API route file references
- Security patterns and critical implementation notes

### Library Organization
`lib/` directory structure:
- `api/` - API utilities (error handler, validation middleware)
- `automation/` - Automation engine, triggers, and actions
- `metrics/` - Cycle time, lead time, throughput calculations
- `slices/` - Redux Toolkit slices and RTK Query APIs (NO authApi - removed during Better Auth migration)
- `validations/` - Zod schemas for API validation
- `auth.ts`, `auth-client.ts` - better-auth configuration
- `use-session.ts` - Backward-compatible session hook for components
- `board-roles.ts` - Board-level role calculation
- `email.ts` - Email sending (nodemailer)
- `env-validation.ts` - Environment variable validation
- `offlineQueue.ts` - Offline action queue
- `prisma.ts` - Database client singleton
- `rate-limiter.ts` - In-memory rate limiting
- `session.ts` - Session utilities (requireAuth, requireRole, etc.)
- `socket.ts`, `socket-middleware.ts` - Socket.IO client and Redux integration
- `store.ts` - Redux store configuration
- `undo-middleware.ts` - Undo/redo middleware
- `utils.ts` - Utility functions (cn for classnames)
- `webhooks.ts` - Webhook utilities

### Component Organization
Components are organized by domain in `components/`:
- `admin/*` - Platform admin components (users table, audit log, settings)
- `auth/*` - Authentication forms (login, register)
- `automation/*` - Automation rule builders and lists
- `board/*` - Board-level components (settings, members, webhooks)
- `dashboard/*` - Dashboard widgets (stats, metrics, board cards)
- `kanban/*` - Kanban board views and task cards
- `layout/*` - App layout (navbar, sidebars, command palette)
- `metrics/*` - Analytics and flow metrics
- `notifications/*` - Notification center
- `profile/*` - User profile pages
- `task/*` - Task details (comments, attachments, dependencies)
- `ui/*` - shadcn/ui base components (add via `npx shadcn@latest add <component>`)

**Auth Pages (App Router):**
- `app/register/` - Registration form (name + email only)
- `app/login/` - Login form (email + password)
- `app/verify-email/` - Enter 6-digit verification code
- `app/verify-email-sent/` - Confirmation page with resend option
- `app/set-password/` - Set password after email verification
- `app/forgot-password/` - Request password reset code
- `app/reset-password/` - Enter reset code → set new password

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

**Typography Scale (text-* classes):**
- `text-display-hero` - 3rem, hero headings
- `text-section-heading` - 2.25rem, section titles
- `text-card-heading` - 2rem, card titles
- `text-body-large` - 1.25rem, emphasized body
- `text-body` - 1.13rem, standard body
- `text-body-standard` - 1rem, default body
- `text-body-medium` - 1rem, medium weight body
- `text-nav` - 0.94rem, navigation items
- `text-button` - 0.94rem, button text
- `text-button-uppercase` - 0.88rem, uppercase buttons
- `text-caption` - 0.88rem, captions/labels
- `text-small` - 0.81rem, small text
- `text-code` - 0.81rem, monospace code
- `text-micro` - 0.75rem, tiny labels
- `text-tiny` - 0.63rem, smallest text

**Font Families:**
- `font-waldenburg` - Headings (light, elegant)
- `font-waldenburg-fh` - Uppercase headings
- `font-inter` - Body text
- `font-geist-mono` - Code/technical

### Redux Store Architecture

- Store configuration: `lib/store.ts` - uses `configureStore()` with RTK Query APIs
- Typed hooks: `lib/hooks.ts` - exports `useAppDispatch`, `useAppSelector`, `useAppStore`
- RTK Query APIs in `lib/slices/`:
  - `boardsApi.ts` - Board/column management, automation rules
  - `tasksApi.ts` - Task CRUD operations, comments, attachments
  - `usersApi.ts` - User profile/boards
  - `adminApi.ts` - Admin operations
  - `notificationsApi.ts` - Notification system
  - **NOTE**: `authApi.ts` was removed during Better Auth migration - use `lib/use-session.ts` instead
- Custom slices:
  - `roleSlice.ts` - User role state and permissions
  - `uiSlice.ts` - UI state (online status, current board, view mode, focus mode)
  - `presenceSlice.ts` - Real-time user presence
  - `undoSlice.ts` - Undo/redo history
- Custom middleware (applied in order - this matters!):
  1. RTK Query middleware (auto-added for each API) - handles caching, invalidation
  2. `socketMiddleware` - joins/leaves board rooms on `ui/setCurrentBoard`, listens for presence
  3. `undoMiddleware` - tracks mutations for undo/redo, clears on logout
  4. `createOfflineMiddleware()` - queues mutations when `state.ui.isOnline` is false, replays on reconnect

**Undo/redo system:**
- Tracks: Task and board mutations (create, update, delete, move, assign)
- Clears: On logout
- Inverse operations: `lib/undo/revert-handlers.ts`
- Actions tracked: `/fulfilled` actions only (successful mutations)

**Offline queue:**
- Stores queued mutations in `localStorage` (`smarttask_offline_queue`)
- Queues RTK Query mutations ending in `/pending` when offline
- Max queue size: 100 actions, max retry count: 3
- Replays automatically when connection restored (handled by `NetworkStatusListener` component)
- **IMPORTANT**: localStorage is ONLY used for offline queue, NOT for auth tokens (auth uses httpOnly cookies only)

### API Response Format Patterns

**Critical**: The application uses inconsistent API response formats across endpoints. Understanding this pattern is essential for working with RTK Query.

**Wrapped Response Format** (with pagination):
```typescript
// API returns: { data: [...], pagination: {...} }
// RTK Query uses transformResponse to extract data
{
  query: () => '/boards',
  transformResponse: (response: { data: Board[] }) => response.data,
}
```

Endpoints using wrapped responses:
- `/api/boards` → `{ data: Board[], pagination: {...} }`
- `/api/boards/{id}/tasks` → `{ data: Task[], pagination: {...} }`
- `/api/users` → `{ data: User[], pagination: {...} }`

**Direct Array/Object Format** (no wrapping):
```typescript
// API returns: [...] directly
// No transformResponse needed
{
  query: () => '/columns',
  // No transformResponse - data used directly
}
```

Endpoints using direct responses:
- `/api/boards/{id}/columns` → `Column[]`
- `/api/tasks/assigned` → `Task[]`
- `/api/tasks/search` → `Task[]`
- `/api/tasks/dashboard` → `Task[]`
- `/api/boards/{id}/webhooks` → `Webhook[]`

### RTK Query providesTags Type Guards

**Critical**: Always add type guards to providesTags functions that use `.map()` to prevent "result?.map is not a function" errors when API calls fail or return errors.

```typescript
// ❌ WRONG - crashes when result is error object
providesTags: (result) => 
  result?.map(item => ({ type: 'Task', id: item.id })) || []

// ✅ CORRECT - type guard prevents crash
providesTags: (result) => {
  if (!result || !Array.isArray(result)) return []
  return result.map(item => ({ type: 'Task', id: item.id }))
}
```

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
- `automation.ts` - Automation rule schemas

### API Error Handling Pattern

**Standardized error responses via `lib/api/error-handler.ts`.**

```typescript
import { ApiErrorHandler, HttpStatus } from '@/lib/api/error-handler'

// Common error responses
return ApiErrorHandler.unauthorized('Authentication required')
return ApiErrorHandler.forbidden('Access denied')
return ApiErrorHandler.notFound('Resource not found')
return ApiErrorHandler.badRequest('Invalid input', { field: 'title' })
return ApiErrorHandler.conflict('Resource already exists')
return ApiErrorHandler.serverError('Internal server error')
```

### Database (Prisma)

- Schema: `prisma/schema.prisma` - defines User, Board, Column, Task, TaskBlock, AuditLog, BoardMember, AutomationRule, Notification, Comment, TaskAttachment, SystemSettings, Webhook, TimeLog, RateLimit, Verification (for email/password reset codes)
- Client: `lib/prisma.ts` - singleton pattern with PrismaNeon adapter
- **Connection URLs**: `DATABASE_URL` (pooled connection for app usage), `DIRECT_URL` (direct connection for Prisma migrations/maintenance)
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

**IMPORTANT: This project uses Better Auth v1 as the SINGLE authentication system. All custom JWT code has been removed.**

- Server instance: `lib/auth.ts` - Better Auth configuration with lazy-loaded email functions
- Client instance: `lib/auth-client.ts` - `createAuthClient()` from better-auth/react
- Session hook: `lib/use-session.ts` - Backward-compatible wrapper that maps Better Auth session to old API structure
- API handler: `app/api/auth/[...all]/route.ts` - `toNextJsHandler(auth.handler)`
- Session utilities: `lib/session.ts` - `getSession()`, `requireAuth()`, `requireRole(['ADMIN' | 'MANAGER' | 'MEMBER'])`
- Token management: `better-auth.session_token` cookie (httpOnly, secure in production, 7-day expiry)
- Environment: `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` in `.env.local`
- **Email**: `lib/email.ts` - nodemailer integration for verification and password reset emails

**Custom Auth Flow (Registration → Email Verification → Set Password):**
1. User registers at `/register` with name + email only (no password)
2. System creates account with temporary password and sends 6-digit verification code
3. User enters code at `/verify-email`
4. User sets their password at `/set-password`
5. User can now login at `/login`
6. First user automatically becomes ADMIN

**Password Reset Flow:**
1. User requests reset at `/forgot-password`
2. Email sends 6-digit reset code
3. User enters code at `/reset-password` (two-step: code → new password form)
4. User sets new password
5. User can login with new password

**Auth API Routes:**
- `/api/auth/[...all]` - Better Auth handler (login, logout, session)
- `/api/auth/register` - Custom registration (email only, temp password)
- `/api/auth/send-verification` - Resend verification code
- `/api/auth/verify-code` - Verify 6-digit email code
- `/api/auth/set-password` - Set password after verification
- `/api/auth/forgot-password` - Request password reset
- `/api/auth/reset-password/verify` - Verify reset code
- `/api/auth/reset-password/confirm` - Confirm new password

**Session Utility Pattern:**
Two separate patterns for different contexts:
- **Server Components / Pages**: `requireAuth()` and `requireRole()` - redirect to `/login` or appropriate dashboard
- **API Routes**: `requireApiAuth()` and `requireApiRole()` - return `NextResponse` with 401/403 status

This distinction prevents API routes from redirecting (which would break JSON responses).

### Socket.IO (Real-time Features)

- Client: `lib/socket.ts` - singleton socket instance with event emitters/listeners, exponential backoff reconnection
- **Custom Server:** `server.ts` - **Single source of truth** for all Socket.IO event handlers (integrated Next.js + Socket.IO server, required for dev/production)
- **Path:** `/api/socket` - Socket.IO endpoint path
- **Authentication:** Cookie-based via `better-auth.session_token` - server parses cookie from handshake headers
- **Initialization**: `components/layout/socket-initializer.tsx` - Ensures Socket.IO server initializes before client connections
- Events: `board:join`, `board:leave`, `task:update`, `task:move`, `task:moved`, `task:updated`, `presence:cursor`, `presence:editing:start`, `presence:editing:stop`, `comment:new`, `comment:updated`, `comment:deleted`
- Integration: `lib/socket-middleware.ts` - Redux middleware that connects presenceSlice to socket events

**Event Naming Convention:**
- Client emits: `task:update`, `task:move`
- Server broadcasts: `task:updated`, `task:moved`
- Client listens: `onTaskUpdate()`, `onTaskMove()`
- When adding new socket events, follow this emit→broadcast→listen pattern to ensure real-time sync works
- **Cleanup**: `disconnectSocket()` called on logout to prevent memory leaks
- **Notifications**: Real-time delivery via `io.to(\`user:${userId}\`).emit('notification:new')`

**Notification system:**
- Types: `TASK_ASSIGNED`, `TASK_UNASSIGNED`, `COMMENT_ADDED`, `TASK_BLOCKED`, `TASK_UNBLOCKED`, `TASK_MOVED`, `AUTOMATION_TRIGGER`
- Delivery: Socket.IO broadcast + optional email (for `TASK_ASSIGNED`, `COMMENT_ADDED`, `TASK_BLOCKED`)
- Central handler: `handleTaskEvent()` - triggers webhooks and notifies participants
- Status tracking: `SENT` or `FAILED` with error logging

**Socket.IO Authentication Pattern (April 2026):**
```typescript
// Server-side (server.ts)
io.use(async (socket, next) => {
  const cookieHeader = socket.handshake.headers.cookie
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    acc[key] = value
    return acc
  }, {})

  // Better Auth uses better-auth.session_token cookie
  const sessionToken = cookies['better-auth.session_token']

  const { auth } = await import('./lib/auth.js')
  const session = await auth.api.getSession({
    headers: { cookie: cookieHeader }
  })

  if (!session) return next(new Error('Authentication error'))
  socket.data.user = session.user
  socket.data.userId = session.user.id
  next()
})
```

```typescript
// Client-side (lib/socket.ts)
// Cookies are automatically sent by the browser
// No auth token in handshake - server validates session cookie
socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
  path: '/api/socket',
  transports: ['websocket', 'polling'],
  reconnection: true,
  // No auth object needed - cookies sent automatically
})
```

### Security Features

**UI Role Guards Pattern:**

For client-side components that show/hide features based on user role, use this pattern:

```typescript
import { useGetSessionQuery } from '@/lib/use-session'

const { data: session } = useGetSessionQuery()
const canManage = session?.role === 'ADMIN' || session?.role === 'MANAGER'

// Early return for MEMBER-only components
if (!canManage) return null

// OR conditional rendering
{canManage && <Button>Delete</Button>}
```

**IMPORTANT**: Always import `useGetSessionQuery` from `@/lib/use-session`, NOT from `@/lib/slices/authApi` (which no longer exists).

**Components with role guards (April 2026):**
- `add-column-button.tsx` - Hides from MEMBERS
- `board-settings-dialog.tsx` - Hides Automations/Webhooks tabs from MEMBERS
- `automation-builder.tsx` - Create/Delete buttons gated
- `webhook-settings.tsx` - All action buttons gated
- `task-card.tsx` - Delete option in menu gated

**Note:** UI guards are for UX only. API routes must always enforce permissions independently.

**CRITICAL: Always use board-level role checks for board operations:**

For any board-related API route (tasks, columns, members, automations, webhooks), use `getEffectiveBoardRole()` from `lib/board-roles.ts`:

```typescript
// ❌ WRONG - checks platform role only
const authResult = await requireApiRole(['MANAGER', 'ADMIN'])

// ✅ CORRECT - checks board-level role
const authResult = await requireApiAuth()
if (authResult instanceof NextResponse) return authResult
const session = authResult

const effectiveRole = await getEffectiveBoardRole(session, boardId)
if (effectiveRole === null) {
  return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
}
if (effectiveRole === 'MEMBER') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

**Why this matters:**
- Platform MANAGERs should NOT automatically have access to all boards
- Platform MEMBERS invited as board MANAGERs/ADMINs SHOULD have elevated permissions on that board
- Using `requireApiRole()` for board operations creates security holes

**Routes that MUST use `getEffectiveBoardRole()`:**
- Archive/unarchive boards: `app/api/boards/[id]/archive/route.ts`
- Reorder columns: `app/api/columns/reorder/route.ts`
- Create/manage automations: `app/api/boards/[id]/automations/route.ts`, `app/api/automations/[id]/route.ts`
- Manage webhooks: `app/api/boards/[id]/webhooks/route.ts`, `app/api/webhooks/[id]/route.ts`
- Manage members: `app/api/boards/[id]/members/route.ts`
- Move tasks: `app/api/tasks/[id]/move/route.ts`
- **Task dependencies**: `app/api/tasks/[id]/dependencies/route.ts` (CRITICAL - must check BOTH tasks' boards)

**Audit Logging:**
Comprehensive audit logging across mutations (actorId, entityType, action, changes, boardId). See existing routes for patterns.

**Rate Limiting:**
- Implementation: `lib/rate-limiter.ts` - Hybrid rate limiter with database persistence and in-memory cache
- Uses `RateLimit` Prisma model for persistence across server restarts
- In-memory cache for fast path with database fallback
- IP extraction: Supports `x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`
- Usage: `rateLimit(identifier, maxRequests, windowMs)` returns `{ success, limit, remaining, resetTime }`

**File Upload Storage:**
- Current: Local filesystem storage in `public/uploads/attachments/`
- Note: Directory must exist before uploads work
- Production: Consider cloud storage (S3, Cloudinary) instead of local

**Webhooks:**
- Events: `TASK_CREATED`, `TASK_UPDATED`, `TASK_MOVED`, `TASK_COMPLETED`, `COMMENT_ADDED`
- Signature: HMAC-SHA256 with `X-SmartTask-Signature` header when secret is configured
- Delivery: Fire-and-forget with `Promise.allSettled()` - failures are logged but don't block
- Integration: Call `triggerWebhooks(boardId, event, payload)` after relevant mutations

### Key Implementation Patterns

**WIP limit enforcement:**
Members cannot move tasks to full columns. Managers/Admins can override with `override: true`.

**Task assignment restriction:**
Members can only assign tasks to themselves (or unassign). See `app/api/tasks/[id]/route.ts` (PATCH endpoint).

**Automation trigger integration:**
After successful task mutations, call `evaluateAutomations(boardId, eventType, taskData, actorId)` from `lib/automation/engine.ts`

**Automation system:**
- Triggers: `TASK_MOVED`, `TASK_ASSIGNED`, `PRIORITY_CHANGED`, `TASK_STALLED`
- Actions: `NOTIFY_USER`, `NOTIFY_ROLE`, `AUTO_ASSIGN`, `CHANGE_PRIORITY`, `ADD_LABEL`
- Conditions: Whitelisted fields and operators with Zod validation
- Security: All JSON parsing uses `safeJSONParse()` with schema validation

### Performance Optimization Patterns

**Prop-Drilling Session Data for Performance:**
When components need role or session data for UI rendering (like hiding/showing buttons), pass `session?.role` as a prop instead of querying the session inside the component. This avoids redundant RTK Query calls.

Example from TaskCard:
```typescript
// In parent component (draggable-task-card.tsx):
<TaskCard role={session?.role} ... />

// In TaskCard - receives role as prop:
role?: string // Alternative to session query inside for performance
```

**React Hooks Rules:**
Hooks must be called before any conditional returns or early returns. Violating this causes "React has detected a change in the order of Hooks" errors.

**Default Props for Component Safety:**
Always provide default values for array props to prevent crashes when data is undefined:
```typescript
// ✅ CORRECT
export default function TaskList({ tasks = [] }) {
  return tasks.map(task => <TaskItem key={task.id} {...task} />)
}
```

**Eliminate Waterfalls in API Routes:**
Use `Promise.all()` for parallel independent operations:
```typescript
const [cycleTime, leadTime, totalTasks] = await Promise.all([
  calculateCycleTime(id),
  calculateLeadTime(id),
  prisma.task.count({ where: { boardId: id } }),
])
```

### Common Development Patterns

**Running TypeScript scripts:**
All scripts in `scripts/` directory require dotenv loading:
```bash
npx tsx -r dotenv/config scripts/check-users.ts dotenv_config_path=.env.local
```

**Testing Socket.IO authentication:**
When testing Socket.IO connections, ensure `auth_token` cookie is set. The server middleware validates this cookie on connection.

**Checking user/board relationships:**
Use the helper scripts:
- `npm run check-users` - List all users with roles
- `npm run check-boards` - Show board memberships for `asefahmed500@gmail.com` (modify script for other users)

**Browser Testing:**
When testing UI changes, prefer manual browser testing over scripts/curl. Key areas to verify:
- Task cards show correct data (assignee, priority, labels)
- Drag & drop works smoothly between columns
- Permission-based UI (MANAGER/ADMIN see Delete, MEMBER doesn't)
- Real-time updates via Socket.IO work correctly

---

## Recent UI Changes (April 2026)

**Permission-Based UI Guards:**
- Add Column button - only visible to MANAGER/ADMIN
- Board Settings tabs - Automations/Webhooks hidden from MEMBERS
- WebhookSettings component now integrated in Board Settings (was placeholder)
- Automation Builder - Create/Delete buttons gated by role
- Webhook Settings - Add/Delete/Toggle buttons gated by role
- Task Card menu - Delete option only shows for MANAGER/ADMIN

**Task Card Menu:**
- Export button removed from board view header
- Task cards now have a 3-dot "More" menu on hover with:
  - Edit Task (opens sidebar)
  - Assign (for self-assignment)
  - Delete Task (MANAGER/ADMIN only)
- Clicking task card opens sidebar directly

**Role-Based Display:**
- `role` prop is passed to child components for permission-based UI
- Session data prop-drilled for performance (avoid redundant queries)
- Attachment delete button now shows for MANAGERs/ADMINs too

**Logical Consistency Improvements:**
- Task assignment: MEMBERS can claim/unassign themselves; cannot touch others' assignments
- WIP limits: Clear separation between MEMBER hard blocks and MANAGER override requirements
- Comments: Full CRUD API now available (create, read, update, delete)

---

## Common Issues & Patterns

### Dashboard Redirect Loop Prevention

When implementing role-based redirects, always check if already on target path:

```typescript
// ❌ WRONG - causes infinite loop
const handleRedirect = useCallback(() => {
  if (hasRedirected || !profile) return
  setHasRedirected(true)
  if (profile.role === 'ADMIN') router.replace('/admin')
}, [profile, router, hasRedirected])

// ✅ CORRECT - prevents redirect loop
const handleRedirect = useCallback(() => {
  if (hasRedirected || !profile) return

  const targetPath = profile.role === 'ADMIN' ? '/admin'
    : profile.role === 'MANAGER' ? '/manager'
    : '/member'

  // Don't redirect if already on target path
  if (pathname === targetPath) {
    setHasRedirected(true)
    return
  }

  setHasRedirected(true)
  router.replace(targetPath)
}, [profile, router, hasRedirected, pathname])
```

### Server TypeScript Considerations

The custom `server.ts` runs outside Next.js's type system. When working with HTTP requests:
- `req.url` may be `undefined` - always provide fallback: `parse(req.url || '/', true)`
- Socket.IO types: Use `import type { Socket } from 'socket.io'` - avoid `'socket.io/dist/typed-events'` (removed in v4)
- Dynamic imports use `.js` extension even for TypeScript files: `await import('./lib/auth.js')`

### Null-Check Board Role Results

When using `getEffectiveBoardRole()`, always check for null before role comparison:

```typescript
// ❌ WRONG - null !== 'MANAGER' is true, leaks info about board existence
const effectiveRole = await getEffectiveBoardRole(session, boardId)
if (effectiveRole !== 'MANAGER' && effectiveRole !== 'ADMIN') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ✅ CORRECT - null returns 404 (board not found), MEMBER returns 403
const effectiveRole = await getEffectiveBoardRole(session, boardId)
if (effectiveRole === null) {
  return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
}
if (effectiveRole === 'MEMBER') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### RTK Query Response Type Handling

API responses may be wrapped (`{ data: [...] }`) or direct arrays. Use `transformResponse`:

```typescript
// Handles both formats safely
getBoardAutomations: builder.query<any[], string>({
  query: (boardId) => `/boards/${boardId}/automations`,
  transformResponse: (response: any) => {
    return Array.isArray(response) ? response : (response?.data || [])
  },
  providesTags: (result, error, boardId) => {
    if (!result || !Array.isArray(result)) return []
    return [{ type: 'Board', id: `${boardId}-automations` }]
  },
}),
```

**Cache Invalidation for List Refresh:**
When mutations should refresh all entity lists across the app, include the `LIST` tag:
```typescript
invalidatesTags: (result) => [
  { type: 'Task', id: 'LIST' },  // Refetches all task queries
  { type: 'Task', id: result?.id },  // Refetches specific task
  'Board',
],
```

---

### React.memo Pattern for Relational Data

**Critical:** When using React.memo() on components that render collections with relational data (e.g., tasks that belong to columns), your comparison function must include relational properties, not just IDs.

```typescript
// ❌ WRONG - misses column changes, UI doesn't refresh
export default memo(TaskList, (prev, next) => {
  return prev.tasks.map(t => t.id).join(',') === next.tasks.map(t => t.id).join(',')
})

// ✅ CORRECT - includes relational property
export default memo(TaskList, (prev, next) => {
  return (
    prev.tasks.map(t => t.id).join(',') === next.tasks.map(t => t.id).join(',') &&
    prev.tasks.map(t => t.columnId).join(',') === next.tasks.map(t => t.columnId).join(',')
  )
})
```

**Why this matters:** When a task moves between columns, its `id` stays the same but its `columnId` changes. Without comparing relational properties, React.memo returns `true` (no re-render needed) and the UI shows stale state.

This pattern is especially important for:
- Drag & drop components (dnd-kit)
- Components displaying filtered/sorted collections
- Parent components receiving RTK Query cache updates

---

### Drag & Drop (dnd-kit)

**Library:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

**Pattern:**
- `Droppable` wraps drop zones (columns)
- `SortableContext` provides context for sortable items within a droppable
- `useSortable` hooks into individual draggable items
- `activeId` from `DndContext` tracks the currently dragged item

**Key Gotcha:** The `activeId` persists briefly after drop completes. Components should handle the transition state between drag end and cache update.

**React.memo interaction:** See "React.memo Pattern for Relational Data" above.

---

### RTK Query Error Filtering

The store's error logger (`lib/store.ts`) filters out expected abort errors to reduce console noise. When adding error logging, follow this pattern:

```typescript
const rtkQueryErrorLogger = () => (next: any) => (action: any) => {
  if (action.type.endsWith('/rejected')) {
    const errorMessage = action.error?.message || action.payload?.data || action.payload

    // Don't log expected aborts - these happen when components unmount or queries are deduplicated
    if (errorMessage === 'Aborted due to condition callback returning false.') {
      return next(action)
    }

    console.error('🔴 RTK Query Error:', {
      type: action.type,
      status: action.error?.status || action.payload?.status,
      error: errorMessage,
      endpoint: action.meta?.arg?.endpointName,
      request: action.meta?.arg?.originalArgs,
    })
  }
  return next(action)
}
```

---

## Known Issues & Bugs

### Fixed: UI Permission Guards (April 2026)

**Previously**: MEMBERS could see management buttons (Add Column, Create Automation, Add Webhook, etc.) that would fail with permission errors when clicked.

**Fix Applied**: Added role-based UI guards to all management components:
- `add-column-button.tsx` - Early return if !canManage
- `board-settings-dialog.tsx` - Conditional tab rendering
- `automation-builder.tsx` - Role checks on Create/Delete buttons
- `webhook-settings.tsx` - Role checks on all action buttons

### Fixed: Board View Cache Invalidation (April 2026)

**Previously**: Task updates saved successfully but board view task cards showed stale data until page refresh.

**Fix Applied**: The `updateTask` mutation in `lib/slices/tasksApi.ts` now includes `{ type: 'Task', id: 'LIST' }` in `invalidatesTags`, which properly refreshes all task queries across the app.

```typescript
// Current implementation (correct):
invalidatesTags: (result) => [{ type: 'Task', id: 'LIST' }, { type: 'Task', id: result?.id }, 'Board'],
```

### Fixed: Role Prop Not Passed to TaskCard (April 2026)

**Previously**: The `role` prop wasn't passed from `DraggableTaskCard` to `TaskCard`, causing MANAGER/ADMIN users to not see the Delete option in task card menu.

**Fix Applied**: `draggable-task-card.tsx` now passes `role={session?.role}` to TaskCard. Note: `totalTimeSpent` prop exists in TaskCard interface but is not yet in the Task model - this is a planned feature not yet implemented.

### Fixed: Task Assignment Logic (April 2026)

**Previously**: Task assignment was inconsistent - MEMBERS who had tasks assigned to them by MANAGERs couldn't reassign or unassign themselves.

**Fix Applied**: Updated `app/api/tasks/[id]/route.ts` with logical assignment rules:
- MEMBERS can claim unassigned tasks (assign to themselves)
- MEMBERS can unassign themselves from tasks
- MEMBERS cannot modify tasks assigned to others
- MANAGERs/ADMINs can assign to anyone

### Fixed: Attachment Delete Permissions (April 2026)

**Previously**: Only attachment owners could delete attachments, even though the API allowed MANAGERs/ADMINs to delete.

**Fix Applied**: Updated `attachment-list.tsx` to show delete button for owners AND MANAGERs/ADMINs using `canManage` check.

### Fixed: WIP Override Logic (April 2026)

**Previously**: WIP limit override condition was confusing - `if (!isManagerOrAdmin || !override)`.

**Fix Applied**: Split into two clear conditions in `app/api/tasks/[id]/move/route.ts`:
- MEMBERS are hard blocked (cannot override)
- MANAGERs/ADMINs blocked unless `override=true`
- `requiresOverride` flag now correctly indicates who can override

### Fixed: Comment Update API Missing (April 2026)

**Previously**: Frontend had comment update functionality but no backend API route existed.

**Fix Applied**: Created `app/api/comments/[id]/route.ts` with PATCH and DELETE endpoints:
- PATCH: Edit own comments
- DELETE: Delete own comments (or MANAGERs/ADMINs can delete any)

---

### Bug: Task Detail Sidebar Edit Button

**Status**: Unfixed - Medium Priority

**Issue**: First action button in task detail sidebar triggers Delete dialog instead of Edit form.

**Location**: `components/task/task-detail-sidebar.tsx`

**Expected**: Clicking edit button opens edit form
**Actual**: Opens delete confirmation dialog

**Impact**: Users cannot edit tasks from the detail sidebar - must use alternative methods

---

### Deprecation Warning: Middleware File

**Status**: Informational - No Action Required

**Warning**: `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`

**Context**: This is a Next.js 16 deprecation notice. The current `middleware.ts` file works but should be migrated to `proxy.ts` in future updates.

**Reference**: https://nextjs.org/docs/messages/middleware-to-proxy

---

## Major Migration: Better Auth (April 2026)

**Status**: Complete ✅

**What Changed:**
- Migrated from dual auth systems (custom JWT + Better Auth) to single Better Auth implementation
- Removed all custom JWT code (`createToken()`, `verifyToken()`, `getJwtSecret()`)
- Removed `lib/slices/authApi.ts` - all auth now uses Better Auth
- Eliminated localStorage token usage (security improvement - httpOnly cookies only)
- Updated 19 components to use `lib/use-session.ts` instead of `lib/slices/authApi.ts`

**New Auth Flow:**
1. **Registration**: Email-only → sends 6-digit code → user verifies → user sets password → can login
2. **Password Reset**: Request code → enter code → set new password → can login
3. **First user** automatically becomes ADMIN
4. All auth pages now use 6-digit codes (not links)

**Files Created:**
- `app/set-password/page.tsx` - Set password after email verification
- `app/forgot-password/page.tsx` - Request password reset code
- `app/reset-password/page.tsx` - Two-step: enter code → new password form
- `app/api/auth/set-password/route.ts` - Save password after verification
- `app/api/auth/forgot-password/route.ts` - Send reset code
- `app/api/auth/reset-password/verify/route.ts` - Verify reset code
- `app/api/auth/reset-password/confirm/route.ts` - Confirm new password
- `lib/use-session.ts` - Backward-compatible session hook

**Files Deleted:**
- `app/api/auth/login/route.ts` (now uses Better Auth)
- `app/api/auth/logout/route.ts` (now uses Better Auth)
- `app/api/auth/session/route.ts` (now uses Better Auth)
- `app/api/auth/verify-email/route.ts` (replaced with code-based system)
- `app/api/auth/reset-password/route.ts` (replaced with code-based system)
- `app/api/auth/verify/route.ts` (now uses Better Auth)
- `lib/slices/authApi.ts` (replaced with Better Auth)

**Security Improvements:**
- No localStorage token storage (httpOnly cookies only)
- No custom JWT implementation (Better Auth handles everything)
- 6-digit codes with expiry (more secure than reset links)
- Email verification required before setting password

**For Future Work:**
- All new auth features should use Better Auth APIs
- Never implement custom JWT or token handling
- Always use httpOnly cookies for session storage
- Import `useGetSessionQuery` from `@/lib/use-session`
