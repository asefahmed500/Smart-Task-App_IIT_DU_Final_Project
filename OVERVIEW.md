# SmartTask — Complete System Overview

> Real-time Kanban board with RBAC, WIP limits, offline support, undo via audit log, and task automation.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Authentication System](#2-authentication-system)
3. [RBAC & Permissions](#3-rbac--permissions)
4. [Board Management](#4-board-management)
5. [Task Management](#5-task-management)
6. [Real-Time Sockets](#6-real-time-sockets)
7. [Notification System](#7-notification-system)
8. [Offline Queue](#8-offline-queue)
9. [Automation Engine](#9-automation-engine)
10. [Undo System](#10-undo-system)
11. [Database Schema](#11-database-schema)
12. [Validation Schemas](#12-validation-schemas)
13. [Design Patterns & Algorithms](#13-design-patterns--algorithms)
14. [Deployment Architecture](#14-deployment-architecture)

---

## 1. System Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Browser (Client)"
        UI["React UI Components"]
        ZUSTAND["Zustand Store"]
        IDB["IndexedDB"]
        SOCKET_CLIENT["Socket.IO Client"]
    end

    subgraph "Next.js Server (Port 3002)"
        PAGES["App Router Pages"]
        ACTIONS["Server Actions"]
        API["API Routes"]
        MIDDLEWARE["proxy.ts"]
        EMITTER["Socket Emitter"]
    end

    subgraph "Socket.IO Server (Port 3001)"
        SOCKET_SERVER["Socket.IO Server"]
        WORKER["Background Worker"]
    end

    subgraph "PostgreSQL"
        DB[("PostgreSQL")]
    end

    UI --> ACTIONS
    UI --> API
    PAGES --> ACTIONS
    ACTIONS --> DB
    API --> DB
    ACTIONS --> EMITTER
    EMITTER --> SOCKET_SERVER
    SOCKET_SERVER --> SOCKET_CLIENT
    SOCKET_CLIENT --> UI
    SOCKET_SERVER --> WORKER
    WORKER --> DB
    MIDDLEWARE --> PAGES
    UI --> ZUSTAND
    ZUSTAND --> IDB
    IDB --> ACTIONS
```

### Process & Port Layout

```mermaid
graph LR
    subgraph "Development"
        DEV["npm run dev"]
        DEV --> NX["Next.js :3002"]
        DEV --> SKT["Socket.IO :3001"]
    end

    subgraph "Production"
        VERCEL["Vercel (Next.js)"]
        RAILWAY["Railway (Socket.IO)"]
        SUPA["Supabase (PostgreSQL)"]
    end

    NX -->|"WebSocket"| SKT
    VERCEL -->|"WebSocket"| RAILWAY
    VERCEL -->|"Prisma"| SUPA
    RAILWAY -->|"Prisma"| SUPA
```

| Process | Dev Port | Production Host | Purpose |
|---------|----------|-----------------|---------|
| Next.js App Router | 3002 | Vercel | UI, server actions, API routes |
| Socket.IO Server | 3001 | Railway | Real-time WebSocket connections, background worker |
| PostgreSQL | 5432 | Supabase | Persistent data storage |

### Directory Structure

```
smart-task/
├── actions/              # Server actions (all mutations, barrel export in index.ts)
│   ├── admin-actions.ts          ADMIN-only: users, audit logs, stats
│   ├── auth-actions.ts           Password reset, profile, change password
│   ├── automation-actions.ts     Automation rule CRUD + evaluateAutomationRules()
│   ├── board-actions.ts          Board/column CRUD, members, tags, undoLastAction()
│   ├── dashboard-actions.ts      Role-specific dashboard data
│   ├── manager-actions.ts        MANAGER+: boards, team, analytics
│   ├── member-actions.ts         Any auth user: tasks, boards, stats
│   ├── notification-actions.ts   Read/mark/delete notifications
│   ├── notification-preferences-actions.ts  Preference CRUD
│   └── task-actions.ts           Task CRUD, comments, checklists, attachments, tags, time, reviews
│
├── app/                  # Next.js App Router pages
│   ├── (auth)/                   Login, signup, forgot/reset password
│   ├── admin/                    Admin dashboard, users, automation, audit logs
│   ├── api/auth/                 Login, logout, signup, me, reset-password
│   ├── api/notifications/        Notification check endpoint
│   ├── dashboard/                Board list + board/[id] (Kanban view, -m-6 edge-to-edge)
│   ├── manager/                  Manager dashboard, analytics, team
│   ├── member/                   Member dashboard, tasks, reports
│   └── profile/                  Profile edit + notification preferences
│
├── components/
│   ├── admin/                    Admin-specific UI components
│   ├── kanban/                   Board UI, task cards, dialogs, socket-hooks.ts
│   │   └── task-details/         Task sidebar tabs (comments, checklists, etc.)
│   ├── providers/                OfflineProvider
│   └── ui/                       shadcn UI primitives (radix-nova style)
│
├── hooks/
│   ├── use-kanban-board.ts       DnD state machine, board event handling, undo trigger
│   └── use-task/                 Per-task-subsystem hooks (8 hooks)
│
├── lib/
│   ├── auth.ts                   JWT encrypt/decrypt (jose, HS256, 7-day expiry)
│   ├── auth-server.ts            'use server' — login(), logout(), getSession(), updateSession()
│   ├── prisma.ts                 Prisma singleton + pg.Pool adapter + re-exports
│   ├── schemas.ts                Zod v4 validation schemas (all inputs)
│   ├── create-audit-log.ts       Auto-injects IP address, creates AuditLog
│   ├── audit.ts                  getClientIp() from headers
│   ├── offline-db.ts             IndexedDB wrapper for action queue
│   ├── offline-sync.ts           Maps queue actions to server action calls
│   └── store/use-offline-store.ts  Zustand store for offline state
│
├── utils/
│   ├── socket-emitter.ts         Socket.IO CLIENT — emits events to standalone server
│   ├── notification-utils.ts     sendNotification(), background checks, preference filter
│   ├── automation-utils.ts       Trigger/condition/action option lists
│   └── mail.ts                   Nodemailer password reset emails
│
├── types/kanban.ts         Shared types: ActionResult, Board, Task, User, etc.
├── src/socket/server.ts    STANDALONE Socket.IO server (own Prisma, own pg pool)
├── prisma/schema.prisma    Database schema (16 models, 2 enums)
├── prisma/seed.ts          Seeds 3 users + demo board + demo tasks
├── proxy.ts                Next.js 16 middleware (auth guards + RBAC)
├── prisma.config.ts        Prisma v7 config (uses DIRECT_URL for schema ops)
└── next.config.mjs         CSP headers, security headers
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| Standalone Socket.IO server | Vercel serverless cannot hold persistent WebSocket connections |
| Socket emitter is a client | Server actions emit events without importing server code |
| `@prisma/adapter-pg` | Required for Prisma v7 with pg.Pool; NOT `@prisma/adapter-neon` |
| `db push` not migrations | Simpler for rapid iteration |
| Custom JWT (not NextAuth) | Lightweight, `jose` HS256, HTTP-only cookies, no refresh tokens |
| `proxy.ts` not `middleware.ts` | Next.js 16 auto-detects `proxy.ts` |
| Server actions (not API routes) | Type safety; only auth login/signup remain as API routes (Turbopack compatibility) |
| Optimistic concurrency | `version` field prevents lost updates |
| Audit log as undo mechanism | `undoLastAction()` reverses mutations using stored previous state |
| Offline queue via IndexedDB | Mutations queued when offline, synced on reconnect |
| Background worker inline | Socket.IO server runs due-date/overdue checks every 60s, audit log cleanup at midnight |

---

## 2. Authentication System

### Architecture

```mermaid
graph TB
    subgraph "Browser"
        LOGIN_FORM["Login Form"]
        SIGNUP_FORM["Signup Form"]
        FORGOT_FORM["Forgot Password"]
        RESET_FORM["Reset Password"]
    end

    subgraph "API Routes"
        LOGIN_RT["POST /api/auth/login"]
        SIGNUP_RT["POST /api/auth/signup"]
        LOGOUT_RT["POST /api/auth/logout"]
        ME_RT["GET /api/auth/me"]
        REQ_RT["POST .../reset-password/request"]
        CONF_RT["POST .../reset-password/confirm"]
    end

    subgraph "Server Modules"
        AUTH_LIB["lib/auth.ts — encrypt/decrypt (jose)"]
        AUTH_SRV["lib/auth-server.ts — login/logout/getSession"]
    end

    subgraph "Middleware"
        PROXY["proxy.ts — Decrypt cookie, Auth guard + RBAC"]
    end

    subgraph "Database"
        USER_T["User (email, password hash, role)"]
        TOKEN_T["PasswordResetToken (email, token, expires)"]
    end

    subgraph "Email"
        MAILER["Nodemailer — Gmail SMTP"]
    end

    LOGIN_FORM --> LOGIN_RT
    SIGNUP_FORM --> SIGNUP_RT
    LOGIN_RT -->|"bcrypt.compare"| USER_T
    LOGIN_RT --> AUTH_SRV
    AUTH_SRV --> AUTH_LIB
    SIGNUP_RT -->|"bcrypt.hash + prisma.create"| USER_T
    SIGNUP_RT --> AUTH_SRV
    FORGOT_FORM -->|"requestPasswordReset()"| TOKEN_T
    TOKEN_T --> MAILER
    RESET_FORM --> CONF_RT
    CONF_RT -->|"validate + hash + update"| USER_T
    PROXY --> AUTH_LIB
```

### JWT Session Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Proxy as proxy.ts
    participant AuthLib as lib/auth.ts (jose)
    participant AuthSrv as lib/auth-server.ts
    participant DB as PostgreSQL

    Note over Browser,DB: === LOGIN ===
    Browser->>+AuthLib: POST /api/auth/login (email, password)
    AuthLib->>DB: prisma.user.findUnique(email)
    AuthLib->>AuthLib: bcrypt.compare(password, hash)
    AuthLib->>AuthSrv: login(id, email, name, role)
    AuthSrv->>AuthLib: encrypt(payload) → JWT string
    AuthLib-->>-Browser: Set-Cookie: session=(jwt) (HttpOnly, SameSite=Lax, 7d expiry)

    Note over Browser,DB: === SUBSEQUENT REQUEST ===
    Browser->>Proxy: GET /dashboard (with session cookie)
    Proxy->>AuthLib: decrypt(cookie)
    AuthLib-->>Proxy: (id, email, name, role)
    Proxy->>Proxy: Check RBAC rules
    Proxy-->>Browser: Allow or redirect
```

### JWT Payload

```typescript
interface JWTPayload {
  id: string        // User ID (cuid)
  email: string
  name: string | null
  image: string | null
  role: 'ADMIN' | 'MANAGER' | 'MEMBER'
}
```

### Cookie Settings

| Property | Value |
|----------|-------|
| Name | `session` |
| HTTP-Only | `true` |
| Secure | `true` in production, `false` in dev |
| SameSite | `lax` |
| Path | `/` |
| Expiry | 7 days |
| Algorithm | HS256 |

### Login Flow

```mermaid
flowchart TD
    START["POST /api/auth/login"] --> VALIDATE{"email and password?"}
    VALIDATE -->|No| ERR_400["400: Required"]
    VALIDATE -->|Yes| FIND["prisma.user.findUnique(email)"]
    FIND --> NOT_FOUND{"User exists?"}
    NOT_FOUND -->|No| ERR_401["401: Invalid credentials"]
    NOT_FOUND -->|Yes| COMPARE["bcrypt.compare(password, hash)"]
    COMPARE --> MISMATCH{"Match?"}
    MISMATCH -->|No| ERR_401
    MISMATCH -->|Yes| LOGIN["login(payload) → Set cookie"]
    LOGIN --> AUDIT["createAuditLog(LOGIN)"]
    AUDIT --> SUCCESS["200: user data"]
```

### Signup Flow

```mermaid
flowchart TD
    START["POST /api/auth/signup"] --> VALIDATE{"Valid input?"}
    VALIDATE -->|Invalid| ERR["400: Validation error"]
    VALIDATE -->|Valid| EXISTS["prisma.user.findUnique(email)"]
    EXISTS --> TAKEN{"User exists?"}
    TAKEN -->|Yes| ERR_EXISTS["400: Already exists"]
    TAKEN -->|No| HASH["bcrypt.hash(password, 12)"]
    HASH --> CREATE["prisma.user.create(role: MEMBER)"]
    CREATE --> PREFS["prisma.notificationPreference.create()"]
    PREFS --> NOTIFY["notifyAdminsNewUser()"]
    NOTIFY --> AUTO_LOGIN["login(payload) — auto-login"]
    AUTO_LOGIN --> SUCCESS["201: user data"]
```

### Password Reset Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Action as requestPasswordReset()
    participant DB as PostgreSQL
    participant Mailer as Nodemailer
    participant API as /reset-password/confirm

    Browser->>Action: requestPasswordReset(email)
    Action->>DB: user.findUnique(email)
    alt User found
        Action->>DB: passwordResetToken.upsert(email, token, 1hr expiry)
        Action->>Mailer: sendPasswordResetEmail(email, token)
        Mailer-->>Browser: Email with reset link
    else User not found
        Action-->>Browser: "If account exists, reset link sent."
    end

    Browser->>API: POST /confirm (email, token, password)
    API->>DB: passwordResetToken.findUnique(token)
    API->>API: Verify email match + not expired
    API->>DB: $transaction(user.update, token.delete)
    API-->>Browser: "Password reset successfully"
```

### Why API Routes for Auth?

Turbopack's dev server fails to resolve `cookies()` at runtime in server action files in certain edge cases. API routes with `'use server'` imports from `auth-server.ts` work reliably.

---

## 3. RBAC & Permissions

### Role Hierarchy

```mermaid
graph TD
    ADMIN["ADMIN — Full system access: Users, boards, automation, audit logs, system settings"]
    MANAGER["MANAGER — Board management: Team analytics, automation, WIP limit override"]
    MEMBER["MEMBER — Task collaboration: View boards, create/edit tasks, manage profile"]

    ADMIN -->|"includes all MANAGER perms"| MANAGER
    MANAGER -->|"includes all MEMBER perms"| MEMBER
```

### Three-Layer Authorization

```mermaid
graph TB
    subgraph "Layer 1: Route Level"
        PROXY["proxy.ts — Middleware"]
    end

    subgraph "Layer 2: Layout Level"
        LAYOUT["Dashboard Layout — getSession() redirect if null"]
    end

    subgraph "Layer 3: Action Level"
        CA["checkAdmin() — admin-actions.ts"]
        CM["checkManager() — manager-actions.ts"]
        CBP["checkBoardPermission() — board-actions.ts"]
        CTP["checkTaskPermission() — task-actions.ts"]
    end

    subgraph "Database"
        USER["User (role)"]
        BOARD["Board (ownerId)"]
        MEMBER_REL["Board-User (m:n)"]
    end

    PROXY --> USER
    LAYOUT --> USER
    CA --> USER
    CM --> USER
    CBP --> BOARD
    CBP --> MEMBER_REL
    CTP --> BOARD
    CTP --> MEMBER_REL
```

### Route Guards (proxy.ts)

```mermaid
flowchart TD
    REQ["Request"] --> PARSE["Parse path"]
    PARSE --> PROTECTED{"Protected route?"}
    PROTECTED -->|No| PUBLIC["Public: redirect to /dashboard if logged in"]
    PUBLIC --> ALLOW["Allow"]
    PROTECTED -->|Yes| HAS_SESSION{"Has session?"}
    HAS_SESSION -->|No| REDIRECT_LOGIN["Redirect to /login"]
    HAS_SESSION -->|Yes| RBAC{"Role check"}
    RBAC -->|"/admin" != ADMIN| REDIRECT_DASH["Redirect to /dashboard"]
    RBAC -->|"/manager" not in ADMIN,MANAGER| REDIRECT_DASH
    RBAC -->|"/member" not in any role| REDIRECT_DASH
    RBAC -->|Authorized| ALLOW2["Allow"]
```

### Permission Matrix

| Action | ADMIN | MANAGER | MEMBER |
|--------|:-----:|:-------:|:------:|
| Manage users | ✓ | ✗ | ✗ |
| Create boards | ✓ | ✓ | ✗ |
| Delete boards | ✓ | ✓ (own) | ✗ |
| Manage board members | ✓ | ✓ (own) | ✗ |
| Create/edit/delete columns | ✓ | ✓ (own) | ✗ |
| Set WIP limits | ✓ | ✓ (own) | ✗ |
| Create tasks | ✓ | ✓ | ✓ (self-assign) |
| Edit any task in board | ✓ | ✓ | ✓ |
| Move tasks (WIP override) | ✓ | ✓ | ✗ |
| Assign tasks to anyone | ✓ | ✓ | ✗ (self only) |
| Edit comments (any time) | ✓ | ✓ | ✗ (5 min window) |
| View automation rules | ✓ | ✓ | ✗ |
| Create automation rules | ✓ | ✓ (board) | ✗ |

### Board Permission Flow

```mermaid
flowchart TD
    START["checkBoardPermission(boardId, allowedRoles)"] --> SESSION["getSession"]
    SESSION --> NO_SESS{"Session?"}
    NO_SESS -->|No| ERR["401: Unauthorized"]
    NO_SESS -->|Yes| FIND["prisma.board.findUnique with members"]
    FIND --> NOT_FOUND{"Board?"}
    NOT_FOUND -->|No| ERR_404["404"]
    NOT_FOUND -->|Yes| IS_ADMIN{"role === ADMIN?"}
    IS_ADMIN -->|Yes| ALLOW["Authorized"]
    IS_ADMIN -->|No| CHECK{"isMember OR isOwner?"}
    CHECK -->|Neither| ERR_403["403: Not a member"]
    CHECK -->|Yes| ROLE_OK{"Role in allowedRoles?"}
    ROLE_OK -->|Yes| ALLOW
    ROLE_OK -->|No| ERR_ROLE["403: Role not permitted"]
```

### Task Permission Flow

```mermaid
flowchart TD
    START["checkTaskPermission(taskId, allowedRoles)"] --> SESSION["getSession"]
    SESSION --> NO_SESS{"Session?"}
    NO_SESS -->|No| ERR["401"]
    NO_SESS -->|Yes| FIND["prisma.task.findUnique with deep includes"]
    FIND --> NOT_FOUND{"Task?"}
    NOT_FOUND -->|No| ERR_404["404"]
    NOT_FOUND -->|Yes| IS_ADMIN{"Is ADMIN?"}
    IS_ADMIN -->|Yes| ALLOW["Full access"]
    IS_ADMIN -->|No| MEMBER_CHK{"isMember OR isOwner?"}
    MEMBER_CHK -->|Neither| ERR_403["403"]
    MEMBER_CHK -->|Yes| MGR_CHK{"isOwner OR isManager?"}
    MGR_CHK -->|Yes| ALLOW
    MGR_CHK -->|No| ROLE_CHK{"MEMBER in allowedRoles?"}
    ROLE_CHK -->|No| ERR_MGR["403: Manager required"]
    ROLE_CHK -->|Yes| ALLOW_MEM["Member collaboration access"]
```

### Member Assignment Rules

```mermaid
sequenceDiagram
    participant Browser
    participant Action as createTask / updateTask
    participant DB as PostgreSQL

    Note over Browser: MEMBER creates task
    Browser->>Action: createTask(title, assigneeId: other-user)
    Action->>Action: session.role === "MEMBER"?
    alt Is MEMBER
        Action->>Action: createData.assigneeId = session.id (force self-assign)
    else ADMIN or MANAGER
        Action->>Action: keep original assigneeId
    end
    Action->>DB: prisma.task.create(data)
```

### WIP Limit Enforcement

```mermaid
flowchart TD
    START["updateTaskStatus(taskId, columnId, version)"] --> PERM["checkTaskPermission"]
    PERM --> FAILED{"Authorized?"}
    FAILED -->|No| ERR["Error"]
    FAILED -->|Yes| VERSION["Version conflict check"]
    VERSION --> STALE{"clientVersion === serverVersion?"}
    STALE -->|No| CONFLICT["409: Conflict"]
    STALE -->|Yes| COL["Find target column"]
    COL --> WIP{"WIP limit active AND user is MEMBER?"}
    WIP -->|No| MOVE["Move task"]
    WIP -->|Yes| COUNT["Count tasks in column (excluding current)"]
    COUNT --> EXCEEDED{"count >= wipLimit?"}
    EXCEEDED -->|Yes| REJECT["Reject: WIP limit exceeded"]
    EXCEEDED -->|No| MOVE
    MOVE --> OVERRIDE_CHK{"After move: count > wipLimit?"}
    OVERRIDE_CHK -->|Yes| LOG_OV["Log as UPDATE_TASK_STATUS_OVERRIDE"]
    OVERRIDE_CHK -->|No| LOG_NORM["Log as UPDATE_TASK_STATUS"]
```

---

## 4. Board Management

### Board Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Created: ADMIN/MANAGER creates board
    Created --> Active: Default columns created (To Do, In Progress, Done)
    Active --> Active: Edit name/description
    Active --> Active: Add/remove columns
    Active --> Active: Add/remove members
    Active --> Active: Reorder columns
    Active --> Active: Set WIP limits
    Active --> Deleted: ADMIN/MANAGER deletes board
    Deleted --> [*]
```

### Create Board Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Action as createBoard()
    participant DB as PostgreSQL
    participant Socket as Socket Emitter

    Browser->>Action: createBoard(name, description)
    Action->>Action: getSession() + role check (ADMIN/MANAGER only)
    Action->>Action: createBoardSchema.validate(input)
    Action->>DB: prisma.board.create with owner, members, default columns
    Action->>DB: createAuditLog(CREATE_BOARD)
    Action->>Action: revalidatePath('/dashboard')
    Action-->>Browser: (success: true, data: board)
```

**Key details:**
- Creator is automatically set as `ownerId` and added as a member
- Three default columns: "To Do" (order 0), "In Progress" (order 1), "Done" (order 2)
- Validation: name max 50 chars, description max 255 chars

### Column Management

```mermaid
flowchart TD
    subgraph "Operations"
        CREATE["Create Column — ADMIN, MANAGER"]
        UPDATE["Update Column (name, wipLimit, order)"]
        DELETE["Delete Column with task rehoming"]
        REORDER["Reorder Columns — bulk transaction"]
    end

    subgraph "Delete Flow"
        DELETE --> HAS_TASKS{"Has tasks?"}
        HAS_TASKS --> TARGET{"Target column specified?"}
        TARGET -->|Yes| MOVE["Move tasks to target"]
        TARGET -->|No| OTHER{"Other column exists?"}
        OTHER -->|Yes| FIRST["Move to first other column"]
        OTHER -->|No| EMPTY{"Tasks remain?"}
        EMPTY -->|Yes| ERR["Cannot delete only column with tasks"]
        EMPTY -->|No| DEL["Delete column"]
        MOVE --> DEL
        FIRST --> DEL
    end

    subgraph "Reorder Flow"
        REORDER --> FETCH["Fetch current order (for undo)"]
        FETCH --> TX["prisma.$transaction(update each)"]
        TX --> EMIT["emit columns:reordered"]
    end
```

### Board Membership

```mermaid
sequenceDiagram
    participant Mgr as ADMIN/MANAGER
    participant Action as addBoardMember()
    participant DB as PostgreSQL
    participant Notif as Notification System
    participant Socket as Socket Emitter

    Mgr->>Action: addBoardMember(boardId, userId)
    Action->>Action: checkBoardPermission([ADMIN, MANAGER])
    Action->>DB: prisma.board.update(members connect userId)
    Action->>DB: createAuditLog(ADD_BOARD_MEMBER)
    Action->>Socket: emit board:member_added
    Action->>Notif: sendNotification(BOARD_MEMBER_ADDED)
```

**Rules:** Cannot remove board owner. Notifications not sent when adding/removing yourself.

### Tags

```mermaid
flowchart TD
    subgraph "Tag Scopes"
        GLOBAL["Global Tag (boardId: null) — ADMIN only"]
        BOARD["Board Tag (boardId: board.id) — ADMIN/MANAGER"]
    end

    subgraph "Operations"
        CREATE["createTag(name, color, boardId?)"]
        GET["getTagsForBoard(boardId) — board tags + global tags"]
        TASK_ADD["addTagToTask(taskId, tagId)"]
        TASK_RM["removeTagFromTask(taskId, tagId)"]
    end

    CREATE --> GLOBAL
    CREATE --> BOARD
    GET --> GLOBAL
    GET --> BOARD
```

---

## 5. Task Management

### Task Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Created: Create task
    Created --> InProgress: Drag to "In Progress"
    InProgress --> ReviewPending: Submit for review
    ReviewPending --> Approved: Reviewer approves, auto-move to Done
    ReviewPending --> ChangesRequested: Reviewer requests changes, auto-move to In Progress
    ReviewPending --> Rejected: Reviewer rejects, auto-move to To Do
    ChangesRequested --> InProgress: Fix and resubmit
    AnyState --> Updated: Edit title/description/priority/assignee
    AnyState --> Deleted: Delete task
    Approved --> [*]
    Deleted --> [*]
```

### Task Data Model

```mermaid
erDiagram
    TASK ||--o{ COMMENT : has
    TASK ||--o{ CHECKLIST : has
    TASK ||--o{ ATTACHMENT : has
    TASK ||--o{ TIME_ENTRY : has
    TASK ||--o{ REVIEW : has
    TASK }o--o{ TAG : "tagged with"
    TASK }o--|| COLUMN : "lives in"
    TASK }o--o| USER : "assigned to"
    TASK }o--|| USER : "created by"
    COMMENT ||--o{ REACTION : has
    CHECKLIST ||--o{ CHECKLIST_ITEM : contains

    TASK {
        string id PK
        string title
        string description
        enum priority
        datetime dueDate
        int version
        string columnId FK
        string assigneeId FK
        string creatorId FK
    }
```

### Version Conflict Detection

```mermaid
sequenceDiagram
    participant UserA as User A (Browser)
    participant UserB as User B (Browser)
    participant Server as Server Action
    participant DB as PostgreSQL

    Note over DB: Task version = 3
    UserA->>Server: updateTask(id, title: "New", version: 3)
    Server->>DB: Find task, version = 3
    Server->>Server: clientVersion(3) === serverVersion(3) OK
    Server->>DB: UPDATE task SET title="New", version=4
    Server-->>UserA: (success: true)

    Note over DB: Task version = 4
    UserB->>Server: updateTask(id, priority: "HIGH", version: 3)
    Server->>DB: Find task, version = 4
    Server->>Server: clientVersion(3) !== serverVersion(4) FAIL
    Server-->>UserB: "Conflict: Task was modified by another user"

    UserB->>Server: updateTask(id, priority: "HIGH", version: undefined)
    Note over Server: version=undefined bypasses conflict check
    Server->>DB: UPDATE task SET priority="HIGH", version=5
    Server-->>UserB: (success: true)
```

### Drag and Drop Flow

```mermaid
flowchart TD
    subgraph "Browser (use-kanban-board)"
        DRAG_START["onDragStart — Set active task/column"]
        DRAG_OVER["onDragOver — Optimistic reorder (visual)"]
        DRAG_END["onDragEnd — Persist to server"]
        DRAG_START --> DRAG_OVER --> DRAG_END
    end

    subgraph "Task Move"
        DRAG_END --> MOVE{"Task moved to different column?"}
        MOVE -->|Yes| ONLINE{"isOnline?"}
        ONLINE -->|Yes| API["updateTaskStatus()"]
        ONLINE -->|No| OFFLINE["addAction(MOVE_TASK) + emitTaskMoved()"]
        API --> SUCCESS{"Success?"}
        SUCCESS -->|Yes| EMIT["emitTaskMoved()"]
        SUCCESS -->|Conflict| CONFLICT["Open conflict dialog"]
        SUCCESS -->|WIP Limit| WIP_ERR["Show WIP error"]
        API --> ROLLBACK["Rollback to initialBoard"]
    end

    subgraph "Column Reorder"
        DRAG_END --> COL_MOVE{"Column reordered?"}
        COL_MOVE -->|Yes| ARRAY["arrayMove(columns)"]
        ARRAY --> REORDER["reorderColumns()"]
        REORDER --> TOAST["Toast with Undo button"]
    end
```

### Task Sub-Systems

#### Comments

```mermaid
flowchart TD
    ADD["Add Comment (any board member)"]
    EDIT["Edit Comment"]
    DELETE["Delete Comment"]
    REACT["Toggle Reaction (emoji on/off)"]
    MENTION["@ Mention (regex: @name)"]

    ADD --> MENTION
    MENTION --> FIND_USERS["findUsers by name"]
    FIND_USERS --> SEND_NOTIF["sendNotification(COMMENT_MENTION)"]

    EDIT --> TIME_CHECK{"Time since creation"}
    TIME_CHECK -->|"Within 5 min or admin/manager"| ALLOW["Allow edit"]
    TIME_CHECK -->|"> 5 min AND member"| REJECT["Reject"]
```

**Mention parsing:** Regex `/@([\w\s]+?)(?=\s|$|[,.!?:;])/g` — case-insensitive name match.

**Edit window:** `FIVE_MINUTES_MS = 5 * 60 * 1000` — non-admin/manager users can only edit within 5 minutes.

#### Checklists

```mermaid
flowchart TD
    ADD_CL["Add Checklist (title + taskId)"]
    ADD_ITEM["Add Checklist Item"]
    TOGGLE["Toggle Item (isCompleted)"]
    UPDATE_ITEM["Update Item Content"]
    DELETE_ITEM["Delete Item"]

    ADD_ITEM --> HAS_CL{"Has checklist?"}
    HAS_CL -->|No| AUTO_CREATE["Auto-create 'Checklist' (default title)"]
    HAS_CL -->|Yes| USE_CL["Use specified checklist"]
    AUTO_CREATE --> CREATE_ITEM["Create item"]
    USE_CL --> CREATE_ITEM
```

#### Reviews

```mermaid
sequenceDiagram
    participant Creator as Task Creator
    participant Action as submitForReview()
    participant Reviewer as Assigned Reviewer
    participant Complete as completeReview()
    participant DB as PostgreSQL
    participant Socket as Socket Emitter

    Creator->>Action: submitForReview(taskId, reviewerId)
    Action->>DB: review.create(status: PENDING)
    Action->>DB: task.update(version: increment)
    Action->>DB: createAuditLog(SUBMIT_REVIEW)
    Action->>Socket: emit task:updated
    Action->>Reviewer: sendNotification(REVIEW_REQUESTED)

    Reviewer->>Complete: completeReview(reviewId, status, feedback)
    Complete->>Complete: Check: is reviewer OR admin/manager?
    Complete->>DB: review.update(status, feedback)

    alt status === APPROVED
        Complete->>DB: Find column "Done" (case-insensitive)
        Complete->>DB: task.update(columnId → doneColumn)
        Complete->>Socket: emit task:moved
    else status === CHANGES_REQUESTED
        Complete->>DB: Find column "In Progress"
        Complete->>DB: task.update(columnId → inProgressColumn)
    else status === REJECTED
        Complete->>DB: Find column "To Do"
        Complete->>DB: task.update(columnId → todoColumn)
    end

    Complete->>DB: createAuditLog(COMPLETE_REVIEW)
    Complete->>Creator: sendNotification(REVIEW_COMPLETED)
```

**Auto-move:** Completing a review automatically moves the task to the appropriate column, found by case-insensitive name matching.

---

## 6. Real-Time Sockets

### Architecture

```mermaid
graph TB
    subgraph "Browser Tabs"
        TAB1["Tab 1 — Board abc123"]
        TAB2["Tab 2 — Board abc123"]
        TAB3["Tab 3 — Board xyz789"]
    end

    subgraph "Next.js Server (Port 3002)"
        ACTIONS["Server Actions"]
        EMITTER["socket-emitter.ts (Socket.IO client)"]
    end

    subgraph "Socket.IO Server (Port 3001)"
        IO["Socket.IO Server"]
        ROOMS["Board Rooms — board:abc123"]
        USER_ROOMS["User Rooms — user:u1, user:u2"]
        PRESENCE["Presence Tracking"]
        EDITING["Editing Tracking"]
        WORKER["Background Worker (60s)"]
    end

    subgraph "Database"
        DB[("PostgreSQL — own Prisma + pg.Pool)")]
    end

    TAB1 -->|"WebSocket"| IO
    TAB2 -->|"WebSocket"| IO
    TAB3 -->|"WebSocket"| IO
    ACTIONS -->|"emit event"| EMITTER
    EMITTER -->|"Socket.IO client"| IO
    IO --> ROOMS
    IO --> USER_ROOMS
    IO --> PRESENCE
    IO --> EDITING
    WORKER --> DB
```

### Two Socket Clients

```mermaid
graph LR
    subgraph "Server-side Emitter"
        ACTION["Server Action"] --> EMIT["emitBoardEvent / emitNotification"]
        EMIT --> CLIENT1["Singleton Socket.IO Client"]
        CLIENT1 -->|"connects to"| SERVER1["Socket.IO Server :3001"]
    end

    subgraph "Browser Hooks"
        HOOK["useSocket"] --> CLIENT2["Module-level Socket.IO Client"]
        CLIENT2 -->|"WebSocket"| SERVER2["Socket.IO Server :3001"]
    end
```

| Client | Location | Purpose |
|--------|----------|---------|
| Server-side emitter | `utils/socket-emitter.ts` | Server actions emit events after DB commits |
| Browser hooks | `components/kanban/socket-hooks.ts` | Browser receives real-time updates, manages board rooms |

### Board Rooms & Presence

```mermaid
sequenceDiagram
    participant UserA as User A
    participant UserB as User B
    participant Server as Socket.IO Server

    UserA->>Server: join-board (boardId, user)
    Server->>Server: socket.join("board:abc")
    Server->>UserA: presence:update (User A present)

    UserB->>Server: join-board (boardId, user)
    Server->>Server: socket.join("board:abc")
    Server->>UserA: presence:update (User A, User B)
    Server->>UserB: presence:update (User A, User B)

    Note over UserA: User A navigates away
    UserA->>Server: leave-board "abc"
    Server->>Server: socket.leave("board:abc")
    Server->>UserB: presence:update (User B present)
```

### Event Reference

| Event | Payload | Emitted By |
|-------|---------|-----------|
| `task:created` | `{boardId, task}` | `createTask()` |
| `task:updated` | `{boardId, taskId, task?}` | `updateTask()`, comment/checklist/attachment ops |
| `task:moved` | `{boardId, taskId, newColumnId, oldColumnId, task}` | `updateTaskStatus()` |
| `task:deleted` | `{boardId, taskId}` | `deleteTask()` |
| `column:created` | `{boardId, columnId, column?}` | `createColumn()` |
| `column:updated` | `{boardId, columnId}` | `updateColumn()` |
| `column:deleted` | `{boardId, columnId}` | `deleteColumn()` |
| `columns:reordered` | `{boardId, columnIds}` | `reorderColumns()` |
| `board:updated` | `{boardId, name}` | `updateBoard()` |
| `board:deleted` | `{boardId}` | `deleteBoard()` |
| `board:member_added` | `{boardId, userId}` | `addBoardMember()` |
| `board:member_removed` | `{boardId, userId}` | `removeBoardMember()` |
| `tag:created` | `{boardId, tagId}` | `createTag()` |
| `tag:deleted` | `{boardId, tagId}` | `deleteTag()` |
| `notification` | `{userId, type, message, link, notificationId}` | `sendNotification()` |
| `presence:update` | `PresenceUser[]` | Server → Board room |
| `editing:update` | `{taskId, editors: PresenceUser[]}` | Server → Board room |

### Server Startup Details

| Detail | Value |
|--------|-------|
| Port selection | `PORT` → `SOCKET_PORT` → `3001` |
| CORS | `ALLOWED_ORIGIN` (comma-separated), defaults to `['*']` |
| SSL | Auto-detects Supabase URLs |
| Pool size | 5 connections (vs 20 in Next.js Prisma client) |
| Health endpoint | `GET /health` → `{"status":"ok","uptime":...}` |

---

## 7. Notification System

### Architecture

```mermaid
graph TB
    subgraph "Server Action"
        MUTATION["e.g., createTask, updateTaskStatus"]
    end

    subgraph "Notification Utils"
        PREF["Preference Check"]
        DB_WRITE["DB Write — prisma.notification.create()"]
        SOCKET_EMIT["Socket Emit — emitNotification()"]
    end

    subgraph "Socket.IO Server"
        RELAY["Relay to user room"]
    end

    subgraph "Browser"
        LISTENER["useNotificationListener"]
        BELL["NotificationBell (badge + dropdown)"]
    end

    subgraph "Database"
        NOTIF_T["Notification table"]
        PREF_T["NotificationPreference (11 boolean toggles)"]
    end

    subgraph "Background Worker"
        WORKER["Socket.IO Server Worker (every 60s)"]
        DUE["Due Date Reminders"]
        OVERDUE["Overdue Checks"]
    end

    MUTATION --> PREF
    PREF -->|"reads"| PREF_T
    PREF -->|"if enabled"| DB_WRITE
    DB_WRITE -->|"creates"| NOTIF_T
    DB_WRITE --> SOCKET_EMIT
    SOCKET_EMIT --> RELAY
    RELAY --> LISTENER
    LISTENER --> BELL

    WORKER --> DUE
    WORKER --> OVERDUE
    DUE -->|"creates + emits"| NOTIF_T
    OVERDUE -->|"creates + emits"| NOTIF_T
```

### Notification Flow

```mermaid
sequenceDiagram
    participant Action as Server Action
    participant Utils as sendNotification()
    participant DB as PostgreSQL
    participant Emitter as emitNotification()
    participant SocketSrv as Socket.IO Server
    participant Browser as useNotificationListener
    participant Bell as NotificationBell

    Action->>Utils: sendNotification(userId, type, message, link)
    Utils->>DB: notificationPreference.findUnique(userId)
    DB-->>Utils: preferences
    alt Preference disabled
        Utils-->>Action: Return (no notification)
    end
    Utils->>DB: notification.create(userId, type, message, link)
    DB-->>Utils: notification (with id)
    Utils->>Emitter: emitNotification(userId, type, message, notificationId)
    Emitter->>SocketSrv: socket.emit('notification', data)
    SocketSrv->>Browser: io.to('user:123').emit('notification', data)
    Browser->>Bell: Update unread count + show toast
```

**Critical rule:** Always call `sendNotification()` — never just emit a socket event. Without a DB record, no bell badge, no persistence.

### Notification Types

| Type | Trigger | Recipients |
|------|---------|-----------|
| `TASK_ASSIGNED` | Task created/updated with assignee | Assignee |
| `TASK_STATUS_CHANGED` | Task moved to different column | Assignee + Creator |
| `COMMENT_MENTION` | Comment with @name pattern | Mentioned user |
| `REVIEW_REQUESTED` | Task submitted for review | Reviewer |
| `REVIEW_COMPLETED` | Review completed | Task creator |
| `AUTOMATION_TRIGGERED` | Automation rule fires | Configured target |
| `DUE_DATE_REMINDER` | Background worker: task due within 24h | Assignee |
| `OVERDUE` | Background worker: task past due date | Assignee |
| `NEW_USER_SIGNUP` | New user signs up | All admins |
| `BOARD_MEMBER_ADDED` | Member added to board | Added user |
| `BOARD_MEMBER_REMOVED` | Member removed from board | Removed user |

### Preference System

```mermaid
flowchart TD
    INPUT["sendNotification(userId, type, message)"]
    LOOKUP["notifTypeToPrefKey maps type to pref field"]
    CHECK{"booleanPrefKeys has pref?"}
    FETCH["notificationPreference.findUnique(userId)"]
    EVAL{"prefs[prefKey] === false?"}
    SKIP["Skip (user opted out)"]
    CREATE["notification.create()"]

    INPUT --> LOOKUP --> CHECK
    CHECK -->|Yes| FETCH --> EVAL
    CHECK -->|No| CREATE
    EVAL -->|"=== false"| SKIP
    EVAL -->|"!== false"| CREATE
```

### Adding a New Notification Type

To add a new type, update **5 locations** then run `prisma db push && prisma generate`:

```mermaid
flowchart LR
    A["1. NotifType union (notification-utils.ts)"] --> B["2. notifTypeToPrefKey map"]
    B --> C["3. booleanPrefKeys set"]
    C --> D["4. NotificationPreference (schema.prisma)"]
    D --> E["5. NotificationPreference (types/kanban.ts)"]
    E --> F["6. prisma db push + generate"]
```

### Background Worker

```mermaid
flowchart TD
    START["Every 60 seconds"] --> OVERDUE["Find overdue tasks"]
    OVERDUE --> O_DEDUP["Already sent OVERDUE today?"]
    O_DEDUP -->|No| O_CREATE["Create notification + emit"]
    O_DEDUP -->|Yes| O_SKIP["Skip"]

    START --> DUE["Find tasks due within 24h"]
    DUE --> U_DEDUP["Already sent DUE_DATE_REMINDER?"]
    U_DEDUP -->|No| U_CREATE["Create notification + emit"]
    U_DEDUP -->|Yes| U_SKIP["Skip"]

    START --> MIDNIGHT{"Hour=0, Min=0?"}
    MIDNIGHT -->|Yes| CLEANUP["Delete audit logs older than 90 days"]
    MIDNIGHT -->|No| DONE["Done"]
```

---

## 8. Offline Queue

### Architecture

```mermaid
graph TB
    subgraph "Browser"
        PROVIDER["OfflineProvider (online/offline events)"]
        ZUSTAND["useOfflineStore (Zustand)"]
        IDB["IndexedDB 'smart-task-db'"]
        UI["Kanban Board (use-kanban-board)"]
    end

    subgraph "Sync Engine"
        SYNC["offline-sync.ts"]
        ACTIONS["Server Actions"]
    end

    subgraph "Server"
        DB[("PostgreSQL")]
    end

    PROVIDER -->|"setOnline(true/false)"| ZUSTAND
    UI -->|"isOnline check"| ZUSTAND
    UI -->|"addAction()"| ZUSTAND
    ZUSTAND -->|"persist"| IDB
    IDB -->|"read on init"| ZUSTAND
    IDB -->|"syncOfflineAction()"| SYNC
    SYNC -->|"calls"| ACTIONS
    ACTIONS -->|"write"| DB
```

### Offline Detection

```mermaid
sequenceDiagram
    participant Browser as Browser Events
    participant Provider as OfflineProvider
    participant Zustand as useOfflineStore
    participant IndexedDB as IndexedDB

    Note over Provider: On mount
    Provider->>Zustand: setOnline(navigator.onLine)
    Provider->>IndexedDB: initQueue — load pending actions

    Note over Provider: User goes offline
    Browser->>Provider: 'offline' event
    Provider->>Zustand: setOnline(false)

    Note over Provider: User comes back online
    Browser->>Provider: 'online' event
    Provider->>Zustand: setOnline(true)
    Provider->>Provider: Sync queued actions
```

### Action Queue Flow

```mermaid
sequenceDiagram
    participant User as User (Drag)
    participant Hook as use-kanban-board
    participant Store as useOfflineStore
    participant IDB as IndexedDB

    User->>Hook: Drag task to new column
    Hook->>Hook: isOnline = false
    Hook->>Store: addAction(type: MOVE_TASK, payload)
    Store->>IDB: addOfflineAction(action)
    IDB-->>Store: Saved
    Store->>Store: Add to queue state
    Hook->>Hook: emitTaskMoved() (local broadcast)
    Note over Hook: Toast: "Task moved locally (offline)"
```

### Supported Action Types

| Type | Payload | Server Action |
|------|---------|--------------|
| `MOVE_TASK` | `{taskId, columnId, statusName, version}` | `updateTaskStatus()` |
| `CREATE_TASK` | `{title, columnId, priority, ...}` | `createTask()` |
| `UPDATE_TASK` / `EDIT_TASK` | `{id, title?, description?, ...}` | `updateTask()` |
| `ADD_COMMENT` | `{taskId, content}` | `addComment()` |

### Zustand Store

```mermaid
flowchart TD
    subgraph "State"
        QUEUE["queue: retryCount < 3"]
        FAILED["failedActions: retryCount >= 3"]
        ONLINE["isOnline: boolean"]
    end

    subgraph "Actions"
        INIT["initQueue() — Load from IndexedDB"]
        ADD["addAction() — Queue + persist"]
        REMOVE["removeAction() — Delete from IndexedDB + state"]
        UPDATE["updateAction() — Update retryCount/errorMsg"]
        CLEAR["clearQueue() — Delete all"]
        RETRY["retryAction() — Reset retryCount to 0"]
        DISMISS["dismissFailed() — Remove from failed list"]
    end

    INIT --> QUEUE
    INIT --> FAILED
    ADD --> QUEUE
    REMOVE --> QUEUE
    UPDATE -->|"retryCount >= 3"| FAILED
    RETRY -->|"move back to queue"| QUEUE
```

### Retry & Failure Handling

```mermaid
flowchart TD
    ACTION["Queued Action"] --> ATTEMPT["Attempt sync"]
    ATTEMPT --> SUCCESS{"Success?"}
    SUCCESS -->|Yes| REMOVE["Remove from queue"]
    SUCCESS -->|No| INCREMENT["retryCount++"]
    INCREMENT --> CHECK{"retryCount >= 3?"}
    CHECK -->|No| KEEP["Stay in queue"]
    CHECK -->|Yes| FAIL["Move to failedActions"]
    FAIL --> USER["User sees failed action in UI"]
    USER --> RETRY_BTN["User clicks Retry"]
    RETRY_BTN --> RESET["retryCount = 0"]
    RESET --> ATTEMPT
    USER --> DISMISS_BTN["User clicks Dismiss"]
    DISMISS_BTN --> DELETE["Delete from IndexedDB"]
```

**Max retries:** 3 attempts before moving to `failedActions`.

---

## 9. Automation Engine

### Architecture

```mermaid
graph TB
    subgraph "Trigger Sources (task-actions.ts)"
        TC["TASK_CREATED — createTask()"]
        TM["TASK_MOVED — updateTaskStatus()"]
        TU["TASK_UPDATED — updateTask()"]
        TA["TASK_ASSIGNED — createTask/updateTask"]
    end

    subgraph "Engine (automation-actions.ts)"
        EVAL["evaluateAutomationRules()"]
        COND["evaluateCondition()"]
        EXEC["executeAction()"]
    end

    subgraph "Action Handlers"
        NOTIFY["handleSendNotification()"]
        MOVE["handleMoveTask()"]
        PRIO["handleSetPriority()"]
        TAG["handleAddTag()"]
    end

    subgraph "Side Effects"
        DB["Prisma DB"]
        SOCKET["Socket.IO"]
        AUDIT["createAuditLog()"]
        NOTIF["sendNotification()"]
    end

    TC --> EVAL
    TM --> EVAL
    TU --> EVAL
    TA --> EVAL
    EVAL --> COND
    COND -->|matches| EXEC
    EXEC --> NOTIFY --> NOTIF --> DB
    EXEC --> MOVE --> DB
    EXEC --> PRIO --> DB
    EXEC --> TAG --> DB
    EXEC --> AUDIT --> DB
    NOTIFY --> SOCKET
    MOVE --> SOCKET
    PRIO --> SOCKET
    TAG --> SOCKET
```

### Rule Evaluation Flow

```mermaid
sequenceDiagram
    participant User
    participant Action as Server Action
    participant Engine as evaluateAutomationRules()
    participant DB as Prisma
    participant Executor as executeAction()

    User->>Action: createTask / updateTask / moveTask
    Action->>Action: Perform DB mutation
    Action->>Engine: evaluateAutomationRules(trigger, context)
    Engine->>DB: findMany enabled rules matching trigger + boardId
    DB-->>Engine: rules[]

    loop For each matching rule
        Engine->>Engine: evaluateCondition(rule.condition, context)
        alt Condition matches (or no condition)
            Engine->>Executor: executeAction(rule.action, context)
            Executor->>DB: Perform action
            Executor->>DB: createAuditLog(AUTOMATION_EXECUTED)
        end
    end

    Engine-->>Action: done
    Action-->>User: Response
```

### Triggers

| Trigger | When Fired |
|---------|-----------|
| `TASK_CREATED` | After `createTask()` commits |
| `TASK_MOVED` | After `updateTaskStatus()` or `completeReview()` auto-move |
| `TASK_UPDATED` | After `updateTask()` commits |
| `TASK_ASSIGNED` | After task creation with assignee, or assignee change |

### Conditions

| Condition | Evaluates True When |
|-----------|-------------------|
| `priority=HIGH` | Task priority is HIGH |
| `priority=URGENT` | Task priority is URGENT |
| `assignee=null` | Task is unassigned |
| `assignee!=null` | Task has an assignee |
| `column=In Progress` | Column name contains "progress" (case-insensitive) |
| `column=Done` | Column name contains "done" (case-insensitive) |
| `column=To Do` | Column name contains "todo" (case-insensitive) |

**Fails open:** Unknown conditions default to matching.

### Actions

| Format | Description |
|--------|-------------|
| `SEND_NOTIFICATION:email:manager` | Notify board manager/owner |
| `SEND_NOTIFICATION:email:assignee` | Notify task assignee |
| `SEND_NOTIFICATION:email:creator` | Notify task creator |
| `MOVE_TASK:column:Done` | Move task to column containing "Done" |
| `SET_PRIORITY:priority:HIGH` | Set task priority |
| `ADD_TAG:tag:urgent` | Create/connect tag to task |

### Important Behaviors

- Rules run **AFTER** the primary DB commit
- Rules run **synchronously** — server action waits for all rules
- Errors are caught **per-rule** — one failure doesn't block others
- Version is incremented by MOVE_TASK, SET_PRIORITY, ADD_TAG
- No recursion guard — column-match guards prevent infinite loops in practice

---

## 10. Undo System

### Architecture

```mermaid
sequenceDiagram
    participant Browser
    participant Action as undoLastAction()
    participant DB as PostgreSQL
    participant Socket as Socket Emitter

    Note over Browser: User clicks "Undo" (within 30 seconds)
    Browser->>Action: undoLastAction()
    Action->>DB: Delete audit logs older than 5 minutes for this user
    Action->>DB: Find most recent undoable action (last 30s)
    alt No recent action
        Action-->>Browser: "No recent actions to undo"
    end

    Note over Action: Reverse based on type
    alt CREATE_TASK
        Action->>DB: task.delete(details.taskId)
        Action->>Socket: emit task:deleted
    else DELETE_TASK
        Action->>DB: Recreate task from stored fullTask data
        Action->>Socket: emit task:created
    else UPDATE_TASK
        Action->>DB: task.update(restore previousState fields)
        Action->>Socket: emit task:updated
    else UPDATE_TASK_STATUS
        Action->>DB: task.update(columnId: previousColumnId)
        Action->>Socket: emit task:moved
    else CREATE_COLUMN
        Action->>DB: column.delete(details.columnId)
        Action->>Socket: emit column:deleted
    else DELETE_COLUMN
        Action->>DB: Recreate column + move back tasks
        Action->>Socket: emit column:created
    end

    Action->>DB: createAuditLog(UNDO)
    Action->>Action: revalidatePath(board page)
    Action-->>Browser: (success: true)
```

### Undoable Actions (30-second window)

| Audit Action | Undo Behavior |
|-------------|---------------|
| `CREATE_TASK` | Delete the task |
| `DELETE_TASK` | Recreate task with all sub-resources |
| `UPDATE_TASK` | Restore previous field values |
| `UPDATE_TASK_STATUS` | Move task back to previous column |
| `UPDATE_TASK_STATUS_OVERRIDE` | Same as above |
| `CREATE_COLUMN` | Delete the column |
| `DELETE_COLUMN` | Recreate column + move tasks back |
| `UPDATE_COLUMN` | Restore name/wipLimit |
| `REORDER_COLUMNS` | Restore previous column order |
| `DELETE_COMMENT` | Recreate comment |
| `DELETE_CHECKLIST_ITEM` | Recreate checklist item |
| `TOGGLE_CHECKLIST_ITEM` | Toggle completion state back |
| `ADD_ATTACHMENT` | Delete the attachment |
| `COMPLETE_REVIEW` | Restore review status + move task back |
| `ADD_TAG` | Remove tag from task |
| `REMOVE_TAG` | Add tag back to task |
| `ADD_COMMENT` | Delete the comment |
| `ADD_CHECKLIST_ITEM` | Delete the item |
| `UPDATE_CHECKLIST_ITEM` | Restore previous content |
| `ADD_ATTACHMENT` | Delete the attachment |
| `LOG_TIME` | Delete the time entry |
| `SUBMIT_REVIEW` | Delete the review |

### Constraints

- **30-second window** — only actions within last 30 seconds can be undone
- **5-minute log cleanup** — every undo also deletes audit logs older than 5 minutes
- **Version increment** — undo operations on tasks still increment `version`

---

## 11. Database Schema

### ERD

```mermaid
erDiagram
    User ||--o{ Board : "owns (BoardOwner)"
    User }o--o{ Board : "member of (BoardMembers)"
    User ||--o{ Task : "assigned to (TaskAssignee)"
    User ||--o{ Task : "created (TaskCreator)"
    User ||--o{ Comment : "writes"
    User ||--o{ TimeEntry : "logs"
    User ||--o{ Review : "reviews (ReviewReviewer)"
    User ||--o{ Notification : "receives"
    User ||--o{ AuditLog : "performs"
    User ||--o{ Reaction : "reacts"
    User ||--o| NotificationPreference : "has"
    Board ||--o{ Column : "contains"
    Board ||--o{ Tag : "defines"
    Column ||--o{ Task : "contains"
    Task ||--o{ Comment : "has"
    Task ||--o{ Attachment : "has"
    Task ||--o{ Checklist : "has"
    Task ||--o{ TimeEntry : "tracked"
    Task ||--o{ Review : "has"
    Task }o--o{ Tag : "tagged"
    Comment ||--o{ Reaction : "has"
    Checklist ||--o{ ChecklistItem : "contains"

    User {
        String id PK
        String email UK
        String password
        Role role
        DateTime createdAt
        DateTime updatedAt
    }
    Board {
        String id PK
        String name
        String ownerId FK
        DateTime createdAt
    }
    Column {
        String id PK
        String name
        Int order
        Int wipLimit
        String boardId FK
    }
    Task {
        String id PK
        String title
        Priority priority
        DateTime dueDate
        Int version
        String columnId FK
        String assigneeId FK
        String creatorId FK
    }
```

### Enums

| Enum | Values |
|------|--------|
| `Role` | `ADMIN`, `MANAGER`, `MEMBER` |
| `Priority` | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |

### Cascade Deletes

| Parent | Cascade Target |
|--------|---------------|
| `User` | `AuditLog`, `Board` (owned), `Comment`, `Notification`, `Task` (assigned/created), `TimeEntry`, `Review`, `Reaction`, `NotificationPreference` |
| `Board` | `Column` → cascades to `Task` → all task sub-entities |
| `Column` | `Task` → `Comment`, `Attachment`, `Checklist` → `ChecklistItem`, `TimeEntry`, `Review` |
| `Task` | `Comment` → `Reaction`, `Attachment`, `Checklist` → `ChecklistItem`, `TimeEntry`, `Review` |
| `Comment` | `Reaction` |
| `Checklist` | `ChecklistItem` |

### Indexes & Uniques

| Model | Field(s) | Type |
|-------|----------|------|
| `User` | `email` | `@unique` |
| `Reaction` | `[userId, commentId, emoji]` | `@@unique` |
| `NotificationPreference` | `userId` | `@unique` |
| `PasswordResetToken` | `email`, `token`, `[email, token]` | `@unique`, `@@unique` |

All models use CUID (`@default(cuid())`) as primary keys.

---

## 12. Validation Schemas

### Zod v4 Schemas (lib/schemas.ts)

| Schema | Max Lengths | Purpose |
|--------|-------------|---------|
| `createTaskSchema` | title: 100, description: 1000 | Task creation |
| `updateTaskSchema` | title: 100, description: 1000 | Task update (requires version) |
| `moveTaskSchema` | — | Task column move (requires version) |
| `createBoardSchema` | name: 50, description: 255 | Board creation |
| `updateBoardSchema` | name: 50, description: 255 | Board update |
| `createColumnSchema` | name: 30 | Column creation |
| `createTagSchema` | name: 20, color: hex regex | Tag creation |
| `createCommentSchema` | content: 1000 | Comment creation |
| `addAttachmentSchema` | name: 255, size: 10MB | Attachment validation |
| `logTimeSchema` | description: 500, duration: positive int | Time logging |
| `createAutomationRuleSchema` | name: 100, condition: 255, action: 255 | Automation rule creation |
| `signupSchema` | name: 50, password: min 6 | User signup |
| `resetPasswordSchema` | password: min 6 | Password reset |

### Date Handling

`<input type="date">` returns `YYYY-MM-DD` strings. Schemas use `z.string()` (not `z.string().datetime()`) for date fields.

---

## 13. Design Patterns & Algorithms

### Server Action Pattern

All mutations follow the same pattern:

```
1. Validate input with Zod schema
2. Check permissions (checkAdmin/checkManager/checkBoardPermission/checkTaskPermission)
3. Perform database mutation (Prisma)
4. Create audit log (createAuditLog)
5. Emit real-time event (emitBoardEvent)
6. Send notifications (sendNotification)
7. Evaluate automation rules (evaluateAutomationRules)
8. Revalidate Next.js cache (revalidatePath)
9. Return ActionResult<T>
```

### Optimistic Concurrency Control (OCC)

**Algorithm:** Version-based conflict detection

```
client sends: updateTask(id, data, version: N)
server checks: task.version === N
  if match: UPDATE task SET ..., version = N+1 → success
  if mismatch: return "Conflict: Task was modified by another user"
bypass: version: undefined → skip check (used by conflict resolution dialog)
```

**Applied to:** `updateTask()`, `updateTaskStatus()`, tag operations, review auto-moves

### WIP Limit Algorithm

```
if user is MEMBER and targetColumn.wipLimit > 0:
    count = COUNT tasks in targetColumn WHERE id != currentTaskId
    if count >= wipLimit:
        return "WIP limit exceeded"
    else:
        move task
else:
    move task (admin/manager bypass)
    if after-move count > wipLimit:
        log as UPDATE_TASK_STATUS_OVERRIDE
```

### Audit Log Undo Algorithm

```
1. Delete audit logs older than 5 minutes for current user (housekeeping)
2. Find most recent audit log entry for current user within 30 seconds
3. Match action type to undo handler:
   CREATE_* → DELETE the created entity
   DELETE_* → RECREATE entity from stored details.fullTask/details
   UPDATE_* → RESTORE previousState from details
   *_STATUS → MOVE back to previousColumnId from details
4. Increment version on affected tasks
5. Emit socket events to reflect undo
6. Create UNDO audit log entry
```

### Review Auto-Move Algorithm

```
status → column name mapping (case-insensitive):
  APPROVED → find column where name.toLowerCase().includes("done")
  CHANGES_REQUESTED → find column where name.toLowerCase().includes("progress")
  REJECTED → find column where name.toLowerCase().includes("todo")

if targetColumn found and targetColumn.id != currentColumnId:
    UPDATE task SET columnId = targetColumn.id, version++
    emit task:moved
    notify assignee + creator
    evaluateAutomationRules(TASK_MOVED, ...)
```

### Notification Deduplication

```
Overdue tasks:
  Check: EXISTS notification WHERE type='OVERDUE' AND createdAt >= todayStart
  If not exists: create notification

Due date reminders:
  Check: EXISTS notification WHERE type='DUE_DATE_REMINDER' AND message contains taskId
  If not exists: create notification
```

### Mention Parsing Algorithm

```
Regex: /@([\w\s]+?)(?=\s|$|[,.!?:;])/g
1. Extract all @name patterns from comment content
2. For each name: prisma.user.findMany WHERE name CONTAINS name (case-insensitive)
3. For each matched user (excluding self): sendNotification(COMMENT_MENTION)
```

### Board Permission Algorithm

```
checkBoardPermission(boardId, allowedRoles):
  1. Get session
  2. Fetch board with members
  3. If ADMIN → allow
  4. If isMember OR isOwner → continue
  5. If role in allowedRoles → allow
  6. Else → forbidden
```

### Column Reorder Algorithm

```
1. Fetch current column order (for undo storage)
2. prisma.$transaction:
   For each column in new order:
     UPDATE column SET order = index WHERE id = columnId
3. Emit columns:reordered with new columnIds array
```

### Task Status Mapping (by column name)

Tasks don't have an explicit status field. Status is determined by column name:

| Column Name Pattern | Status |
|--------------------|--------|
| Contains "done" or "complete" | Done |
| Contains "progress" or "doing" | In Progress |
| Contains "todo" or "to do" | To Do |
| Contains "block" | Blocked |

---

## 14. Deployment Architecture

### Production Deployment

```mermaid
graph LR
    subgraph "Vercel"
        NEXT["Next.js App (serverless)"]
        EMIT["socket-emitter.ts (client)"]
    end

    subgraph "Railway"
        SOCKET["Socket.IO Server"]
        HEALTH["GET /health"]
    end

    subgraph "Supabase"
        DB[("PostgreSQL")]
    end

    NEXT -->|"Server actions"| EMIT
    EMIT -->|"WebSocket"| SOCKET
    NEXT -->|"Prisma queries"| DB
    SOCKET -->|"Prisma queries"| DB
    RAILWAY_HC["Railway Health Check"] -->|"HTTP GET"| HEALTH
```

### Vercel Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection (with `?pgbouncer=true` for Supabase) |
| `DIRECT_URL` | Yes | Direct PostgreSQL connection (port 5432, no pgbouncer) |
| `JWT_SECRET` | Yes | JWT signing key |
| `NEXT_PUBLIC_SOCKET_URL` | Yes | Railway Socket.IO server URL |
| `NEXT_PUBLIC_APP_URL` | Yes | App base URL |
| `ALLOWED_ORIGIN` | Yes | CORS allowed origins |
| `PORT` | Yes | Must be `3002` |

### Railway Configuration

| Setting | Value |
|---------|-------|
| Node version | 22 (via `railway.toml`) |
| Health check | `GET /health` on Socket.IO server |
| PORT | Auto-injected by Railway — do NOT set manually |

### Supabase Connection

```
DATABASE_URL: postgresql://user:pass@db.supabase.com:6543/dbname?pgbouncer=true
DIRECT_URL: postgresql://user:pass@db.supabase.com:5432/dbname

SSL: auto-applied when URL contains "supabase.com"
  - lib/prisma.ts
  - src/socket/server.ts
  - prisma/seed.ts
  - scripts/db-check.ts
```

### CSP Headers

Content Security Policy in `next.config.mjs` dynamically builds `connect-src` from `NEXT_PUBLIC_SOCKET_URL`. Must include Railway Socket.IO URL for WebSocket connections to work.

---

## Quick Reference

### Test Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@smarttask.com | AdminPassword123! | ADMIN (seed) |
| manager@smarttask.com | AdminPassword123! | MANAGER (seed) |
| member@smarttask.com | AdminPassword123! | MEMBER (seed) |
| admin@gmail.com | admin123 | ADMIN |
| manager@gmail.com | manager123 | MANAGER |

### Key Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | db:check + Socket.io (3001) + Next.js (3002) |
| `npm run typecheck` | TypeScript validation |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (no semicolons, double quotes, printWidth 80) |
| `npm run db:setup` | prisma db push + generate + seed |
| `npm run seed` | Seed database |
| `npm run check-users` | Diagnostic: verify user roles |
| `npm run check-boards` | Diagnostic: validate board memberships |

### ActionResult Pattern

All server actions return:

```typescript
interface ActionResult<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  fieldErrors?: Record<string, string[] | undefined>
}
```

### Gotchas

- **Port 3002**, not 3000
- **`proxy.ts`** not `middleware.ts`
- **`@prisma/adapter-pg`** not `@prisma/adapter-neon`
- **`generated/` is gitignored** — run `prisma generate` after schema changes
- **`scripts/` and `scratch/`** excluded from TypeScript compilation
- **ESM project** — all config files use `.mjs`, never `.cjs`
- **API routes must use `auth-server.ts`** for cookie operations — never import `cookies` from `next/headers` directly in route handlers
- **Emit socket events AFTER database commits**
- **Always call `sendNotification()`** — never just emit socket events
- **`AuditLog.details` is `Json`**, not a string — format with helpers
- **`_count` returns numbers, not relations** — include full relation if needed
- **Board page uses `-m-6`** to cancel parent `p-6` padding
- **Board queries must include owner**: `OR: [{ members: { some: { id } } }, { ownerId: id }]`
- **`useSocket` requires `useMemo` for user prop** — raw objects cause infinite re-renders
- **All Dialogs need `<DialogDescription>`** (even with `className="sr-only"`)
- **Recharts `ResponsiveContainer` needs explicit pixel dimensions**
- **Radix Select crash on empty value** — use `value="__none__"`
- **Props-to-state sync needs `useEffect`** — `useState(initialValue)` only uses value on first render
- **Node.js 22+ required** — `.nvmrc` pins Node 22
