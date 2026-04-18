# Smart Task Management - Complete Codebase Architecture

> **Single Source of Truth** - This document explains how everything works, from small to big.

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Request Flow Architecture](#request-flow-architecture)
3. [Complete Data Models](#complete-data-models)
4. [Permission System Deep Dive](#permission-system-deep-dive)
5. [All Code Patterns](#all-code-patterns)
6. [Critical User Flows](#critical-user-flows)
7. [File-by-File Reference](#file-by-file-reference)

---

## System Overview

### Tech Stack
- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript
- **State**: Redux Toolkit + RTK Query
- **Database**: PostgreSQL + Prisma ORM v7
- **Real-time**: Socket.IO
- **Auth**: better-auth v1 (JWT)
- **Styling**: Tailwind CSS v4 + shadcn/ui

### Architecture Diagram
```
┌──────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                        │
├──────────────────────────────────────────────────────────────┤
│  Components → Redux Hooks → RTK Query → API Actions         │
│       ↓                                                    │
│  Socket.IO Client (Real-time updates)                       │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                      API LAYER (Next.js)                      │
├──────────────────────────────────────────────────────────────┤
│  middleware.ts → API Routes → Auth/Permission Checks         │
│       ↓                                                    │
│  Socket.IO Server (Broadcast updates)                       │
└──────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────┐
│                    DATA LAYER (Prisma)                       │
├──────────────────────────────────────────────────────────────┤
│  PostgreSQL Database with:                                   │
│  - Users, Boards, Tasks, Columns, Comments                    │
│  - Dependencies (TaskBlock), Automations, Notifications        │
│  - Audit Logs, Attachments, Memberships                       │
└──────────────────────────────────────────────────────────────┘
```

### Key Features
1. **Role-Based Access Control** - ADMIN, MANAGER, MEMBER with distinct permissions
2. **Real-time Collaboration** - Live cursors, editing indicators, instant updates
3. **Kanban Board** - Drag-drop, WIP limits, swimlanes, dependencies
4. **Automation** - Trigger-based rules (task moved, assigned, priority changed)
5. **Audit Trail** - Complete activity logging
6. **Offline Support** - Action queuing and replay
7. **Undo/Redo** - 20-step history

---

## Request Flow Architecture

### How API Requests Originate

#### Pattern 1: Component → Redux Hook → API Route
```typescript
// Component uses Redux hook
const { data, isLoading } = useGetBoardsQuery()

// Redux RTK Query (lib/slices/boardsApi.ts)
getBoards: builder.query({
  query: () => '/boards',
})

// API Route (app/api/boards/route.ts)
export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth()
  // ... fetch boards
}
```

#### Pattern 2: Component → Direct API Call
```typescript
// Direct fetch in component
fetch('/api/tasks/' + taskId, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
})
```

### Middleware Chain

#### 1. middleware.ts (Page Routes Only)
```typescript
// File: middleware.ts
export async function middleware(req: NextRequest) {
  const isPublicRoute = url.pathname === '/' || url.pathname.startsWith('/landing')
  const isAuthRoute = url.pathname.startsWith('/login') || url.pathname.startsWith('/register')

  if (isPublicRoute || isAuthRoute) {
    return NextResponse.next()
  }

  // Check for session cookie
  const sessionToken = req.cookies.get('auth_token')?.value
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}
```
**What it does:**
- Allows public routes without auth
- Redirects unauthenticated users to login
- Skips API routes (they handle their own auth)

#### 2. Rate Limiting (Auth Endpoints)
```typescript
// File: lib/rate-limiter.ts
export async function rateLimit(identifier: string, limit: number, window: number)

// Used in: app/api/auth/login/route.ts
const result = await rateLimit(identifier, 5, 60 * 1000) // 5 requests per minute
if (!result.success) {
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
}
```

#### 3. Socket.IO Authentication Middleware
```typescript
// File: app/api/socket/route.ts
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  // Verify JWT token
  const session = await verifyToken(token)
  if (!session) {
    return next(new Error('Unauthorized'))
  }
  socket.data.session = session
  next()
})
```

### Session Verification Process

#### API Routes: requireApiAuth()
```typescript
// File: lib/session.ts
export async function requireApiAuth(): Promise<SessionUser | NextResponse> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await getSession(token)
  return session
}
```

#### Server Components: requireAuth()
```typescript
// File: lib/session.ts
export async function requireAuth(): Promise<SessionUser> {
  const session = await getServerSession()
  if (!session) {
    redirect('/login')
  }
  return session
}
```

### Permission Checking Layers

#### Layer 1: Platform Role Check
```typescript
// File: lib/session.ts
export async function requireApiRole(roles: Role[]): Promise<SessionUser | NextResponse> {
  const session = await getApiSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!roles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return session
}
```

#### Layer 2: Board-Level Role Check
```typescript
// File: lib/board-roles.ts
export async function getEffectiveBoardRole(
  session: SessionUser,
  boardId: string
): Promise<EffectiveRole> {
  const platformRole = session.user.role

  // Platform ADMINs are always ADMIN
  if (platformRole === 'ADMIN') {
    return 'ADMIN'
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { members: { where: { userId } } }
  })

  // Board owners are ADMIN
  if (board.ownerId === userId) {
    return 'ADMIN'
  }

  // Otherwise use BoardMember role
  if (board.members.length > 0) {
    return board.members[0].role
  }

  return null // No access
}
```

### Database Operations via Prisma

#### Standard CRUD Pattern
```typescript
// Read
const task = await prisma.task.findUnique({
  where: { id },
  include: { assignee: true, column: true }
})

// Create
const task = await prisma.task.create({
  data: { title, columnId, boardId, createdById },
  include: { assignee: true }
})

// Update
const task = await prisma.task.update({
  where: { id },
  data: { title: newTitle },
  include: { assignee: true }
})

// Delete
await prisma.task.delete({ where: { id } })
```

#### Transaction Pattern
```typescript
await prisma.$transaction(async (tx) => {
  // Step 1: Create record
  const member = await tx.boardMember.create({ data: {...} })

  // Step 2: Create audit log
  await tx.auditLog.create({ data: {...} })

  return member
})
```

### Response Handling and Cache Invalidation

#### RTK Query Cache Tags
```typescript
// File: lib/slices/boardsApi.ts
getBoards: builder.query({
  query: () => '/boards',
  providesTags: ['Board'], // Cache all boards under 'Board' tag
})

createBoard: builder.mutation({
  query: () => ({ url: '/boards', method: 'POST', body: data }),
  invalidatesTags: ['Board'], // Invalidate ALL 'Board' tagged queries
})
```

#### API Response Format
```typescript
// Success
return NextResponse.json(data, { status: 200 })

// Error
return NextResponse.json({ error: 'Error message' }, { status: 400 })

// Created
return NextResponse.json(data, { status: 201 })
```

---

## Complete Data Models

### User Model
**File**: `prisma/schema.prisma`

```typescript
model User {
  id                String    @id @default(cuid())
  email             String    @unique
  name              String?
  password          String?   // bcrypt hashed
  role              Role      @default(MEMBER)
  avatar            String?
  isActive          Boolean   @default(true)
  emailVerified     Boolean   @default(false)
  resetToken        String?
  resetTokenExpires DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations (Outgoing)
  ownedBoards         Board[]          @relation("BoardOwner")
  memberships         BoardMember[]
  assignedTasks       Task[]           @relation("AssignedTo")
  createdTasks        Task[]           @relation("TaskCreator")
  createdAuditLog     AuditLog[]       @relation("AuditActor")
  receivedAudit       AuditLog[]       @relation("AuditTarget")
  notifications       Notification[]
  sessions            Session[]
  accounts            Account[]
  comments            Comment[]
  createdDependencies TaskBlock[]      @relation("TaskDependencyCreator")
  attachments         TaskAttachment[]

  @@index([email])
  @@index([role])
}
```

### Board Model
```typescript
model Board {
  id          String   @id @default(cuid())
  name        String
  description String?
  color       String   @default("#3b82f6")
  ownerId     String
  archived    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  owner           User             @relation("BoardOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  members         BoardMember[]
  columns         Column[]
  tasks           Task[]
  auditLogs       AuditLog[]
  automationRules AutomationRule[]

  @@index([ownerId])
}
```

### Column Model
```typescript
model Column {
  id         String   @id @default(cuid())
  name       String
  boardId    String
  position   Int
  wipLimit   Int?     // Work In Progress limit
  isTerminal Boolean  @default(false) // Final column (Done)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  board Board  @relation(fields: [boardId], references: [id], onDelete: Cascade)
  tasks Task[]

  @@index([boardId])
}
```

### Task Model
```typescript
model Task {
  id           String     @id @default(cuid())
  title        String
  description  String?
  priority     Priority   @default(MEDIUM)
  status       TaskStatus @default(BACKLOG)
  labels       String[]
  dueDate      DateTime?
  columnId     String
  boardId      String
  assigneeId   String?
  createdById  String
  version      Int        @default(1) // For optimistic locking
  position     Float      @default(0)
  isBlocked    Boolean    @default(false)
  inProgressAt DateTime?
  completedAt  DateTime?
  lastMovedAt  DateTime   @default(now())
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  // Relations
  column      Column           @relation(fields: [columnId], references: [id], onDelete: Cascade)
  board       Board            @relation(fields: [boardId], references: [id], onDelete: Cascade)
  assignee    User?            @relation("AssignedTo", fields: [assigneeId], references: [id], onDelete: SetNull)
  createdBy   User             @relation("TaskCreator", fields: [createdById], references: [id])
  blockers    TaskBlock[]      @relation("BlockedTasks")
  blocking    TaskBlock[]      @relation("BlockingTasks")
  auditLogs   AuditLog[]
  comments    Comment[]
  attachments TaskAttachment[]

  @@index([columnId])
  @@index([boardId])
  @@index([assigneeId])
  @@index([dueDate])
  @@index([lastMovedAt])
  @@index([priority])
}
```

### TaskBlock Model (Dependencies)
```typescript
model TaskBlock {
  id          String   @id @default(cuid())
  blockerId   String   // The task that blocks
  blockingId  String   // The task being blocked
  createdById String
  createdAt   DateTime @default(now())

  // Relations
  blocker  Task @relation("BlockedTasks", fields: [blockerId], references: [id], onDelete: Cascade)
  blocking Task @relation("BlockingTasks", fields: [blockingId], references: [id], onDelete: Cascade)
  creator  User @relation("TaskDependencyCreator", fields: [createdById], references: [id])

  @@unique([blockerId, blockingId]) // Can't block same task twice
  @@index([blockerId])
  @@index([blockingId])
  @@index([createdById])
}
```

### BoardMember Model (Role Assignment)
```typescript
model BoardMember {
  id       String   @id @default(cuid())
  boardId  String
  userId   String
  role     Role     @default(MEMBER)
  joinedAt DateTime @default(now())

  // Relations
  board Board @relation(fields: [boardId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([boardId, userId]) // One role per user per board
  @@index([boardId])
  @@index([userId])
}
```

### AuditLog Model
```typescript
model AuditLog {
  id         String   @id @default(cuid())
  action     String   // TASK_CREATED, TASK_MOVED, etc.
  entityType String   // Task, Board, User, etc.
  entityId   String
  actorId    String
  targetId   String?  // User affected by action
  boardId    String?
  changes    Json?    // { field: old → new }
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  // Relations
  actor  User   @relation("AuditActor", fields: [actorId], references: [id], onDelete: Cascade)
  target User?  @relation("AuditTarget", fields: [targetId], references: [id], onDelete: SetNull)
  board  Board? @relation(fields: [boardId], references: [id], onDelete: Cascade)
  task   Task?  @relation(fields: [entityId], references: [id], onDelete: Cascade)

  @@index([actorId])
  @@index([boardId])
  @@index([entityType, entityId])
  @@index([createdAt])
  @@index([targetId])
}
```

### AutomationRule Model
```typescript
model AutomationRule {
  id          String   @id @default(cuid())
  boardId     String
  name        String
  enabled     Boolean  @default(true)
  trigger     String   // JSON: { type: "TASK_MOVED", value: "Review" }
  condition   String?  // JSON: { field: "priority", operator: "EQ", value: "HIGH" }
  action      String   // JSON: { type: "NOTIFY", target: "MANAGER" }
  lastFiredAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  board Board @relation(fields: [boardId], references: [id], onDelete: Cascade)

  @@index([boardId])
  @@index([enabled])
}
```

### Notification Model
```typescript
model Notification {
  id         String             @id @default(cuid())
  userId     String
  type       String             // TASK_ASSIGNED, TASK_COMPLETED, etc.
  title      String
  message    String
  link       String?            // URL to navigate to
  read       Boolean            @default(false)
  status     NotificationStatus @default(PENDING)
  retryCount Int                @default(0)
  lastError  String?
  createdAt  DateTime           @default(now())

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, read])
  @@index([createdAt])
}
```

### Comment Model
```typescript
model Comment {
  id        String   @id @default(cuid())
  text      String   @db.Text
  taskId    String
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([taskId])
  @@index([userId])
}
```

### TaskAttachment Model
```typescript
model TaskAttachment {
  id        String   @id @default(cuid())
  name      String
  url       String
  type      String   // MIME type
  size      Int      // Bytes
  taskId    String
  userId    String
  createdAt DateTime @default(now())

  // Relations
  task Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user User     @relation(fields: [userId], references: [id])

  @@index([taskId])
  @@index([userId])
  @@index([taskId, userId]) // Composite index for user-task queries
}
```

### Enums
```typescript
enum Role {
  ADMIN
  MANAGER
  MEMBER
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum TaskStatus {
  BACKLOG
  TODO
  IN_PROGRESS
  REVIEW
  DONE
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
}
```

### Cascade Delete Behaviors
- **User deleted**: Their owned boards, memberships, assigned tasks, audit logs cascade
- **Board deleted**: All columns, tasks, members, audit logs, automations cascade
- **Column deleted**: All tasks in column cascade
- **Task deleted**: All comments, attachments, dependencies (TaskBlock), audit logs cascade
- **BoardMember deleted**: Just the membership record removed

### Key Indexes and Their Purposes
| Index | Purpose |
|-------|---------|
| `User.email` | Fast login lookup |
| `User.role` | Filter users by role |
| `Task.columnId` | Get all tasks in column |
| `Task.boardId` | Get all tasks in board |
| `Task.assigneeId` | Get user's assigned tasks |
| `Task.dueDate` | Get tasks due by date |
| `TaskBlock.createdById` | Get dependencies created by user |
| `TaskAttachment.[taskId,userId]` | Get attachments by task AND user |
| `AuditLog.targetId` | Get actions affecting a user |

---

## Permission System Deep Dive

### ADMIN Role (Platform-Level)

#### What They Can Do:
- **User Management**: Create, update, delete any user
- **Role Assignment**: Assign any role (ADMIN/MANAGER/MEMBER) to any user
- **Board Access**: View and manage ALL boards (owner or member)
- **Task Operations**: Create, update, delete ANY task on ANY board
- **Audit Access**: View platform-wide audit logs
- **Settings**: Modify platform settings
- **Override All**: Can override WIP limits, delete any task

#### Where Permissions Are Checked:

**1. API Routes - Platform Role Check**
```typescript
// File: app/api/admin/users/route.ts
export async function POST(req: NextRequest) {
  const authResult = await requireApiRole(['ADMIN'])
  if (authResult instanceof NextResponse) return authResult
  // Only ADMIN can create users
}
```

**2. Effective Board Role - Always ADMIN**
```typescript
// File: lib/board-roles.ts
export async function getEffectiveBoardRole(session, boardId) {
  // Platform ADMINs are always ADMIN on any board
  if (session.user.role === 'ADMIN') {
    return 'ADMIN'
  }
  // ... check board owner/membership
}
```

**3. Frontend - Admin Navigation**
```typescript
// File: components/layout/sidebar.tsx
{session?.user?.role === 'ADMIN' && (
  <Link href="/admin">
    <Button>Admin Panel</Button>
  </Link>
)}
```

### MANAGER Role (Board-Level)

#### What They Can Do:
- **Board Management**: Create, update, delete boards (if settings allow)
- **Member Management**: Add/remove members, assign roles on their boards
- **Column Management**: Create, update, delete columns, set WIP limits
- **Task Operations**: Create, update, delete ANY task on their boards
- **Task Assignment**: Assign tasks to ANY user
- **WIP Override**: Can move tasks to full columns (override WIP limits)
- **Automation**: Create and manage automation rules
- **Audit Access**: View board-level audit logs

#### Where Permissions Are Checked:

**1. Board Operations**
```typescript
// File: app/api/boards/route.ts (POST)
let canCreate = session.user.role === 'ADMIN' || session.user.role === 'MANAGER'
if (!canCreate) {
  // Check system settings for member board creation
  const settings = await prisma.systemSettings.findUnique({ where: { id: 'global' }})
  if (settings?.allowMemberBoardCreation) {
    canCreate = true
  }
}
```

**2. Member Management**
```typescript
// File: app/api/boards/[id]/members/route.ts (POST)
const effectiveRole = await getEffectiveBoardRole(session, id)
if (effectiveRole !== 'ADMIN' && effectiveRole !== 'MANAGER') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

**3. Task Deletion**
```typescript
// File: app/api/tasks/[id]/route.ts (DELETE)
const effectiveRole = await getEffectiveBoardRole(session, task.boardId)
if (effectiveRole === 'MEMBER') {
  return NextResponse.json(
    { error: 'Only managers and admins can delete tasks' },
    { status: 403 }
  )
}
```

**4. Frontend - Manager Controls**
```typescript
// File: components/kanban/board-view.tsx
const isManager = effectiveRole === 'ADMIN' || effectiveRole === 'MANAGER'

{isManager && (
  <Button onClick={handleDeleteTask}>Delete</Button>
)}
```

### MEMBER Role (Task-Level)

#### What They Can Do:
- **View Boards**: View all boards they're members of
- **Create Tasks**: Create tasks on boards they're members of
- **Update Tasks**: Update ANY task (title, description, etc.)
- **Self-Assignment**: Assign tasks ONLY to themselves
- **Unassignment**: Unassign themselves from tasks
- **Comments**: Add, edit, delete their own comments
- **Attachments**: Upload, view, delete their own attachments
- **Personal Metrics**: View their own metrics

#### What They CANNOT Do:
- Delete tasks (only MANAGER/ADMIN)
- Assign tasks to others (only self-assign)
- Delete boards (only MANAGER/ADMIN)
- Manage board members (only MANAGER/ADMIN)
- Override WIP limits (only MANAGER/ADMIN)

#### Where Permissions Are Checked:

**1. Task Assignment**
```typescript
// File: app/api/tasks/[id]/assign/route.ts (PATCH)
const effectiveRole = await getEffectiveBoardRole(session, task.boardId)
if (effectiveRole === 'MEMBER' && assigneeId && assigneeId !== userId) {
  return NextResponse.json(
    { error: 'Members can only assign tasks to themselves' },
    { status: 403 }
  )
}
```

**2. Task Deletion**
```typescript
// File: app/api/tasks/[id]/route.ts (DELETE)
const effectiveRole = await getEffectiveBoardRole(session, task.boardId)
if (effectiveRole === 'MEMBER') {
  return NextResponse.json(
    { error: 'Only managers and admins can delete tasks' },
    { status: 403 }
  )
}
```

**3. WIP Limit Enforcement**
```typescript
// File: app/api/tasks/[id]/move/route.ts (PATCH)
const effectiveRole = await getEffectiveBoardRole(session, boardId)
const isManagerOrAdmin = effectiveRole === 'MANAGER' || effectiveRole === 'ADMIN'

if (taskCount >= targetColumn.wipLimit) {
  if (!isManagerOrAdmin) {
    // Members are HARD BLOCKED
    return NextResponse.json({ error: 'WIP_LIMIT_EXCEEDED' }, { status: 409 })
  }
  // Managers/Admins can override
}
```

### Permission Check Functions - File Locations

| Function | File | Purpose |
|----------|------|---------|
| `requireApiAuth()` | `lib/session.ts` | Verify user is authenticated (API routes) |
| `requireAuth()` | `lib/session.ts` | Verify user is authenticated (server components) |
| `requireApiRole()` | `lib/session.ts` | Verify user has specific platform role |
| `requireRole()` | `lib/session.ts` | Verify user has specific platform role (server) |
| `getEffectiveBoardRole()` | `lib/board-roles.ts` | Calculate user's role on specific board |
| `getPermissionsForRole()` | `lib/slices/roleSlice.ts` | Get permission list for role |

### Role Hierarchy
```
ADMIN (Platform)
├── Can do everything MANAGER can do
├── Plus: User management, platform settings, all boards access
└── Effective Role: Always ADMIN on any board

MANAGER (Board)
├── Can do everything MEMBER can do
├── Plus: Board management, member management, task deletion, WIP override
└── Effective Role: ADMIN on owned boards, MANAGER on others

MEMBER (Task)
├── View assigned boards
├── Create and update tasks
├── Self-assign only
└── Cannot delete tasks or override WIP limits
```

---

## All Code Patterns

### API Route Patterns

#### Pattern 1: RESTful Endpoints
```
GET    /api/boards           - List all boards
POST   /api/boards           - Create new board
GET    /api/boards/[id]     - Get single board
PATCH  /api/boards/[id]     - Update board
DELETE /api/boards/[id]     - Delete board
```

#### Pattern 2: Nested Resources
```
GET    /api/boards/[id]/tasks       - Get board tasks
POST   /api/boards/[id]/tasks       - Create task in board
PATCH  /api/boards/[id]/members     - Add board member
DELETE /api/boards/[id]/members     - Remove board member
```

#### Pattern 3: Action Endpoints
```
PATCH  /api/tasks/[id]/move         - Move task to column
PATCH  /api/tasks/[id]/assign       - Assign task to user
POST   /api/tasks/[id]/comments     - Add comment to task
PATCH  /api/comments/[id]           - Edit comment
DELETE /api/comments/[id]           - Delete comment
```

#### Pattern 4: Authentication Wrapper
```typescript
// Every protected API route starts with this
export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  // Now safe to use session.user.id, session.user.role
}
```

#### Pattern 5: Permission Check
```typescript
// Board-level permission check
const effectiveRole = await getEffectiveBoardRole(session, boardId)
if (effectiveRole === null) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

if (effectiveRole !== 'ADMIN' && effectiveRole !== 'MANAGER') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

#### Pattern 6: Response Format
```typescript
// Success response
return NextResponse.json(data, { status: 200 })

// Error response
return NextResponse.json({ error: 'Error message' }, { status: 400 })

// Created response
return NextResponse.json(data, { status: 201 })

// No content response
return new NextResponse(null, { status: 204 })
```

### Redux Patterns

#### Pattern 1: RTK Query API Definition
```typescript
// File: lib/slices/boardsApi.ts
export const boardsApi = createApi({
  reducerPath: 'boardsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    credentials: 'include', // Send cookies
  }),
  tagTypes: ['Board', 'Column', 'Task'],

  endpoints: (builder) => ({
    getBoards: builder.query<Board[], void>({
      query: () => '/boards',
      providesTags: ['Board'],
    }),

    createBoard: builder.mutation<Board, CreateBoardRequest>({
      query: (data) => ({
        url: '/boards',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Board'],
    }),
  }),
})
```

#### Pattern 2: Slice Definition
```typescript
// File: lib/slices/roleSlice.ts
export const roleSlice = createSlice({
  name: 'role',
  initialState,
  reducers: {
    setRole: (state, action) => {
      state.role = action.payload
    },
    setPermissions: (state, action) => {
      state.permissions = action.payload
    },
  },
})

export const { setRole, setPermissions } = roleSlice.actions
export default roleSlice.reducer
```

#### Pattern 3: Custom Hooks
```typescript
// File: lib/hooks.ts
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelector<RootState> = useSelector
export const useAppStore = () => useStore<RootState>()

// Usage in components
const dispatch = useAppDispatch()
const boards = useAppSelector(state => state.boardsApi.data)
```

#### Pattern 4: Middleware Chain
```typescript
// File: lib/store.ts - Middleware applied in order
const middleware = [
  socketMiddleware,    // Real-time updates
  undoMiddleware,       // Undo/redo tracking
  offlineMiddleware,    // Offline queue
]

export const store = configureStore({
  reducer: {
    authApi: authApi.reducer,
    boardsApi: boardsApi.reducer,
    // ...
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(...middleware),
})
```

#### Pattern 5: Redux Query Cache Invalidation
```typescript
// Automatic cache invalidation with tags
getBoard: builder.query({
  query: (id) => `/boards/${id}`,
  providesTags: (result) => [{ type: 'Board', id: result?.id }],
}),

updateBoard: builder.mutation({
  query: ({ id, data }) => ({
    url: `/boards/${id}`,
    method: 'PATCH',
    body: data,
  }),
  invalidatesTags: (result, error, arg) => [
    { type: 'Board', id: arg.id }, // Invalidate specific board
  ],
}),
```

### Component Patterns

#### Pattern 1: Smart Component (Redux Connected)
```typescript
// File: components/dashboard/dashboard-page.tsx
export default function DashboardPage() {
  const dispatch = useAppDispatch()
  const { data: session } = useGetSessionQuery()
  const { data: boards } = useGetBoardsQuery()

  // Component uses Redux data directly
  return (
    <div>
      {boards?.map(board => <BoardCard key={board.id} board={board} />)}
    </div>
  )
}
```

#### Pattern 2: Role-Based Conditional Rendering
```typescript
// File: components/kanban/board-view.tsx
const effectiveRole = activeBoard?.effectiveRole
const isManager = effectiveRole === 'ADMIN' || effectiveRole === 'MANAGER'

{isManager && (
  <Button onClick={handleDelete}>Delete Task</Button>
)}
```

#### Pattern 3: Loading and Error States
```typescript
// File: components/kanban/board-view.tsx
const { data: tasks, isLoading, error } = useGetTasksQuery(boardId)

if (isLoading) {
  return <BoardSkeleton />
}

if (error) {
  return <ErrorMessage error={error} />
}

return <TaskList tasks={tasks} />
```

#### Pattern 4: Custom Hook for Permissions
```typescript
// File: lib/hooks/useBoardPermissions.ts
export function useBoardPermissions(boardId: string) {
  const { data: session } = useGetSessionQuery()
  const [effectiveRole, setEffectiveRole] = useState<EffectiveRole>(null)

  useEffect(() => {
    if (session) {
      getEffectiveBoardRole(session, boardId).then(setEffectiveRole)
    }
  }, [session, boardId])

  const canManage = effectiveRole === 'ADMIN' || effectiveRole === 'MANAGER'
  const canDelete = canManage
  const canAssign = effectiveRole !== 'MEMBER'

  return { effectiveRole, canManage, canDelete, canAssign }
}
```

### Error Handling Patterns

#### Pattern 1: Try-Catch with Error Response
```typescript
// File: app/api/boards/[id]/route.ts
try {
  const board = await prisma.board.update({
    where: { id },
    data: { name },
  })
  return NextResponse.json(board)
} catch (error) {
  console.error('Update board error:', error)
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

#### Pattern 2: Toast Notifications
```typescript
// File: components/kanban/board-view.tsx
import { toast } from 'sonner'

const handleMove = async () => {
  try {
    await moveTask({ taskId, targetColumnId, newPosition })
    toast.success('Task moved successfully')
  } catch (error) {
    toast.error(error.data?.error || 'Failed to move task')
  }
}
```

#### Pattern 3: Prisma Error Handling
```typescript
// File: lib/errors/prisma-handler.ts
export function handlePrismaError(error: unknown): NextResponse {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      return NextResponse.json({ error: 'Duplicate entry' }, { status: 409 })
    }
    if (error.code === 'P2025') {
      // Record not found
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }
  return NextResponse.json({ error: 'Internal error' }, { status: 500 })
}
```

### Validation Patterns

#### Pattern 1: Input Validation in API Routes
```typescript
// File: app/api/boards/route.ts (POST)
const { name, description, color } = body

if (!name) {
  return NextResponse.json(
    { error: 'Board name is required' },
    { status: 400 }
  )
}

if (name.length > 100) {
  return NextResponse.json(
    { error: 'Board name must be less than 100 characters' },
    { status: 400 }
  )
}
```

#### Pattern 2: Zod Schema Validation
```typescript
// File: lib/validations/task.ts
import { z } from 'zod'

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
})

// Usage in API route
const validationResult = createTaskSchema.safeParse(body)
if (!validationResult.success) {
  return NextResponse.json(
    { error: validationResult.error.errors[0].message },
    { status: 400 }
  )
}
```

#### Pattern 3: Business Logic Validation
```typescript
// File: app/api/tasks/[id]/move/route.ts
// Check WIP limit
if (targetColumn.wipLimit) {
  const taskCount = await prisma.task.count({
    where: { columnId: targetColumnId, id: { not: taskId } }
  })

  if (taskCount >= targetColumn.wipLimit) {
    const isManagerOrAdmin = effectiveRole === 'MANAGER' || effectiveRole === 'ADMIN'

    if (!isManagerOrAdmin) {
      return NextResponse.json(
        { error: 'WIP_LIMIT_EXCEEDED', requiresOverride: false },
        { status: 409 }
      )
    }
  }
}
```

---

## Critical User Flows

### Flow 1: User Login

**Step 1: User submits login form**
```
Component: components/auth/login-form.tsx
Action: User enters email/password, clicks "Login"
Redux: dispatch(authApi.login({ email, password }))
```

**Step 2: API route processes login**
```
File: app/api/auth/login/route.ts (POST)
1. Rate limit check (5 attempts per 5 minutes)
2. Find user by email
3. Verify password with bcrypt.compare()
4. Create JWT token (7 day expiration)
5. Set httpOnly cookie with token
6. Return user data
```

**Step 3: Redux updates auth state**
```
File: lib/slices/authApi.ts
login: builder.mutation({
  query: (credentials) => ({
    url: '/api/auth/login',
    method: 'POST',
    body: credentials,
  }),
  onQueryStarted: () => {
    // Show loading spinner
  },
  onSuccess: (data) => {
    // Store user in state
    // Redirect to dashboard
  },
})
```

**Step 4: User redirected to dashboard**
```
File: app/(dashboard)/dashboard/page.tsx
1. Session check via middleware.ts
2. Load user's boards
3. Redirect based on role:
   - ADMIN → /admin
   - MANAGER → /manager
   - MEMBER → /dashboard
```

### Flow 2: Board Creation

**Step 1: User clicks "Create Board"**
```
Component: components/dashboard/new-board-dialog.tsx
Action: User enters board name, description, color
Redux: dispatch(boardsApi.createBoard({ name, description, color }))
```

**Step 2: API route validates and creates**
```
File: app/api/boards/route.ts (POST)
1. requireApiAuth() - Verify authenticated
2. Check role (ADMIN/MANAGER) or system settings
3. Validate input (name required, max 100 chars)
4. Prisma transaction:
   a) Create board record
   b) Add creator as ADMIN member
   c) Create default columns (Backlog, Todo, In Progress, Review, Done)
5. Create audit log entry
6. Return created board with members and columns
```

**Step 3: Real-time broadcast**
```
File: app/api/boards/route.ts
After board creation:
- Emit Socket.IO event to notify other clients
- Invalidate 'Board' cache tag
- Update Redux state
```

**Step 4: UI updates**
```
Component: components/dashboard/dashboard-page.tsx
1. RTK Query auto-refetches boards (cache invalidation)
2. New board appears in board list
3. Success toast shown
4. User can click to enter board
```

### Flow 3: Task Creation

**Step 1: User opens "Add Task" dialog**
```
Component: components/kanban/column-header.tsx
Action: User clicks "+" button in column
Dialog: components/task/create-task-dialog.tsx opens
```

**Step 2: User fills task details**
```
Form Fields:
- Title (required)
- Description (optional)
- Priority (default: MEDIUM)
- Assignee (optional)
- Due Date (optional)
- Labels (optional)
```

**Step 3: API route creates task**
```
File: app/api/boards/[id]/tasks/route.ts (POST)
1. requireApiAuth() - Verify authenticated
2. getEffectiveBoardRole() - Check board access
3. Validate title (required, max 200 chars)
4. Determine task position (end of column)
5. Prisma transaction:
   a) Create task record
   b) Create audit log
6. Evaluate automation rules
7. Broadcast update via Socket.IO
8. Return created task
```

**Step 4: Automation triggers**
```
File: lib/automation/engine.ts
If automation rules exist for board:
1. Check triggers (TASK_CREATED)
2. Evaluate conditions
3. Execute actions:
   - Send notifications
   - Auto-assign users
   - Set priority
   - Add labels
```

**Step 5: Real-time updates**
```
File: lib/socket-server.ts
1. broadcastTaskUpdate(boardId, task)
2. All connected clients receive update
3. Redux cache updates automatically
4. Task card appears in column without refresh
```

### Flow 4: Task Assignment

**Step 1: User assigns task**
```
Component: components/task/task-detail-sidebar.tsx (Overview tab)
Action: User clicks assignee dropdown, selects user
Redux: dispatch(tasksApi.updateTask({ id, assigneeId: userId }))
```

**Step 2: Permission check**
```
File: app/api/tasks/[id]/assign/route.ts (PATCH)
1. requireApiAuth() - Verify authenticated
2. getEffectiveBoardRole() - Get user's role on board
3. Role check:
   - MEMBER: Can only assign to self (assigneeId === userId)
   - MANAGER/ADMIN: Can assign to anyone
4. Return 403 if permission denied
```

**Step 3: Database update**
```
File: app/api/tasks/[id]/assign/route.ts
1. Update task.assigneeId
2. Increment task.version
3. Create audit log entry
```

**Step 4: Notifications**
```
File: lib/notifications.ts
1. Create notification for new assignee
2. Socket.IO broadcast: notification:new
3. Assignee sees notification in bell icon
```

**Step 5: Automation**
```
File: lib/automation/engine.ts
Trigger: TASK_ASSIGNED
Actions may include:
- Notify user's manager
- Change task priority
- Add "Assigned" label
```

### Flow 5: Real-time Updates (Socket.IO)

**Step 1: Client connects**
```
File: lib/socket.ts
1. Get JWT from cookie
2. Connect to Socket.IO server
3. Emit authentication with token
4. Join board-specific rooms
```

**Step 2: Server authenticates**
```
File: app/api/socket/route.ts
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  const session = await verifyToken(token)
  if (!session) return next(new Error('Unauthorized'))
  socket.data.session = session
  next()
})
```

**Step 3: User performs action**
```
Example: User moves task on board
Component: components/kanban/board-view.tsx
Action: onDragEnd → moveTask mutation
```

**Step 4: Server broadcasts**
```
File: app/api/tasks/[id]/move/route.ts
After task move:
1. Update database
2. broadcastTaskUpdate(boardId, task)
3. Emits 'task:update' to board room
```

**Step 5: Other clients update**
```
File: lib/socket-middleware.ts
socket.on('task:update', (task) => {
  // Update Redux cache
  dispatch({ type: 'tasksApi/fulfilled', payload: task })
})
UI updates automatically via Redux
```

---

## File-by-File Reference

### API Routes

| File | Purpose | Key Functions |
|------|---------|---------------|
| `app/api/auth/login/route.ts` | User login | Rate limiting, password verify, JWT creation |
| `app/api/auth/register/route.ts` | User registration | Email validation, password hashing |
| `app/api/auth/logout/route.ts` | User logout | Clear cookie, invalidate session |
| `app/api/auth/session/route.ts` | Session verification | Return current user session |
| `app/api/boards/route.ts` | Board CRUD | List/create boards, member creation settings |
| `app/api/boards/[id]/route.ts` | Single board | Get/update/delete board with all data |
| `app/api/boards/[id]/archive/route.ts` | Archive board | Soft delete by setting archived flag |
| `app/api/boards/[id]/members/route.ts` | Member management | Add/remove/update members, transaction with audit |
| `app/api/boards/[id]/columns/route.ts` | Column list | Get all columns for board |
| `app/api/boards/[id]/tasks/route.ts` | Task CRUD | Create task with position, audit log |
| `app/api/boards/[id]/automations/route.ts` | Automation | List/create automation rules |
| `app/api/boards/[id]/audit/route.ts` | Audit logs | Get board activity history |
| `app/api/boards/[id]/metrics/route.ts` | Metrics | Cycle time, lead time, throughput |
| `app/api/columns/[id]/route.ts` | Column CRUD | Update/delete column, WIP limits |
| `app/api/columns/reorder/route.ts` | Column ordering | Bulk update column positions |
| `app/api/tasks/[id]/route.ts` | Single task | Get/update/delete task with all relations |
| `app/api/tasks/[id]/move/route.ts` | Move task | WIP check, position update, dependency check |
| `app/api/tasks/[id]/assign/route.ts` | Assignment | Role-based assign permission |
| `app/api/tasks/[id]/dependencies/route.ts` | Dependencies | Add/remove blocking relationships |
| `app/api/tasks/[id]/comments/route.ts` | Comments | Add comments to task |
| `app/api/tasks/[id]/attachments/route.ts` | Attachments | Upload/delete files |
| `app/api/tasks/[id]/audit/route.ts` | Task audit | Get task activity history |
| `app/api/comments/[id]/route.ts` | Comment CRUD | Edit/delete comments |
| `app/api/notifications/route.ts` | Notifications | List user notifications |
| `app/api/notifications/[id]/route.ts` | Notification actions | Mark as read, delete |
| `app/api/admin/users/route.ts` | User management | List/create/update/delete users |
| `app/api/admin/settings/route.ts` | Platform settings | Get/update system settings |
| `app/api/admin/stats/route.ts` | Platform stats | User/task/board counts |
| `app/api/socket/route.ts` | Socket.IO server | WebSocket connection, auth, rooms |

### Redux Slices

| File | Purpose | State/Actions |
|------|---------|--------------|
| `lib/slices/authApi.ts` | Auth API | Login, logout, session queries |
| `lib/slices/boardsApi.ts` | Board API | Board CRUD, columns, members, automations |
| `lib/slices/tasksApi.ts` | Task API | Task CRUD, move, assign, dependencies, comments |
| `lib/slices/usersApi.ts` | User API | Profile, search, activity |
| `lib/slices/adminApi.ts` | Admin API | Users, settings, stats |
| `lib/slices/notificationsApi.ts` | Notification API | List, mark read, delete |
| `lib/slices/roleSlice.ts` | Role state | Current role, permissions list |
| `lib/slices/uiSlice.ts` | UI state | Online status, current board, view mode, sidebar |
| `lib/slices/presenceSlice.ts` | Presence | Real-time user presence, cursors, editing state |
| `lib/slices/undoSlice.ts` | Undo/redo | Past/future states, undo/redo actions |

### Key Components

| File | Purpose | Props |
|------|---------|-------|
| `components/kanban/board-view.tsx` | Main Kanban board | boardId, tasks, columns |
| `components/kanban/column.tsx` | Single column | column, tasks, WIP limit |
| `components/kanban/task-card.tsx` | Task card display | task, onEdit, onDelete |
| `components/kanban/swimlane-view.tsx` | Swimlane grouping | tasks, groupBy (assignee/priority) |
| `components/task/task-detail-sidebar.tsx` | Task details drawer | taskId, isOpen, onClose |
| `components/auth/login-form.tsx` | Login form | onLoginSuccess |
| `components/dashboard/board-card.tsx` | Board preview card | board, onClick |
| `components/admin/users-table.tsx` | User management | users, onRoleChange |
| `components/automation/rules-list.tsx` | Automation list | boardId, rules |
| `components/notifications/notification-center.tsx` | Notification bell | notifications, onMarkRead |

### Utility Files

| File | Purpose | Exports |
|------|---------|---------|
| `lib/auth.ts` | Better-auth server | auth instance, session management |
| `lib/auth-client.ts` | Better-auth client | createAuthClient for frontend |
| `lib/session.ts` | Session utilities | getSession, requireAuth, requireApiAuth, requireRole |
| `lib/board-roles.ts` | Board role calc | getEffectiveBoardRole() |
| `lib/prisma.ts` | Database client | Prisma singleton instance |
| `lib/socket.ts` | Socket.IO client | Socket instance, emit functions |
| `lib/socket-server.ts` | Socket broadcast | broadcastTaskUpdate, emitCursorMove |
| `lib/socket-middleware.ts` | Socket Redux | Connects socket events to Redux |
| `lib/rate-limiter.ts` | Rate limiting | rateLimit(), getIdentifier() |
| `lib/offlineQueue.ts` | Offline support | Queue actions, replay on reconnect |
| `lib/undo/revert-handlers.ts` | Undo logic | revertAction() for undo |
| `lib/automation/engine.ts` | Automation | evaluateAutomations() |
| `lib/automation/triggers.ts` | Triggers | TASK_MOVED, TASK_ASSIGNED, etc. |
| `lib/automation/actions.ts` | Actions | NOTIFY_USER, AUTO_ASSIGN, etc. |
| `lib/notifications.ts` | Notifications | createNotification() |
| `lib/errors/prisma-handler.ts` | Error handling | handlePrismaError() |

### Validation Files

| File | Purpose | Schemas |
|------|---------|---------|
| `lib/validations/task.ts` | Task validation | createTaskSchema, updateTaskSchema, moveTaskSchema |
| `lib/validations/board.ts` | Board validation | createBoardSchema, updateColumnSchema |
| `lib/validations/user.ts` | User validation | registerSchema, loginSchema, changePasswordSchema |

---

## Summary

This document provides a complete picture of the Smart Task Management system:

1. **Request Flow**: Component → Redux → API → Auth/Permission → Prisma → Response
2. **Data Models**: 12 Prisma models with clear relationships and cascade behaviors
3. **Permissions**: Three-tier role system (ADMIN/MANAGER/MEMBER) with specific capabilities
4. **Patterns**: Consistent API, Redux, component, error handling, and validation patterns
5. **Flows**: Step-by-step traces of login, board creation, task operations, real-time updates

**Key Files to Reference:**
- `lib/session.ts` - Authentication and authorization
- `lib/board-roles.ts` - Board-level permission calculation
- `prisma/schema.prisma` - Complete data model
- `lib/slices/` - Redux architecture
- `app/api/**` - All API endpoints

**Permission Quick Reference:**
| Operation | ADMIN | MANAGER | MEMBER |
|-----------|-------|---------|--------|
| Create board | ✅ | ✅* | ✅* |
| Delete board | ✅ | ✅ | ❌ |
| Manage members | ✅ | ✅ | ❌ |
| Create task | ✅ | ✅ | ✅ |
| Delete task | ✅ | ✅ | ❌ |
| Assign to anyone | ✅ | ✅ | ❌ |
| Self-assign | ✅ | ✅ | ✅ |
| Override WIP | ✅ | ✅ | ❌ |

*If system settings allow member board creation
