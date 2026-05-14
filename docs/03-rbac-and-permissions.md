# SmartTask — RBAC & Permissions

## Table of Contents

- [Overview](#overview)
- [Role Hierarchy](#role-hierarchy)
- [Permission Matrix](#permission-matrix)
- [Authorization Architecture](#authorization-architecture)
- [Board Permission Flow](#board-permission-flow)
- [Task Permission Flow](#task-permission-flow)
- [Route-Level Guards](#route-level-guards)
- [Member Assignment Rules](#member-assignment-rules)
- [WIP Limit Enforcement](#wip-limit-enforcement)

---

## Overview

SmartTask implements **three roles** with hierarchical permissions: ADMIN > MANAGER > MEMBER. RBAC checks are enforced at three levels:

1. **Route level** — `proxy.ts` middleware redirects unauthorized users
2. **Dashboard layout level** — Server components verify session before rendering
3. **Server action level** — Each action calls a private `checkAdmin()`, `checkManager()`, `checkBoardPermission()`, or `checkTaskPermission()` before executing

---

## Role Hierarchy

```mermaid
graph TD
    ADMIN["ADMIN - Full system access: User management, audit logs, automation, system settings"]
    MANAGER["MANAGER - Board management: Team analytics, automation, WIP limit override"]
    MEMBER["MEMBER - Task collaboration: View boards, create/edit tasks, manage own profile"]

    ADMIN -->|"includes all MANAGER perms"| MANAGER
    MANAGER -->|"includes all MEMBER perms"| MEMBER

    style ADMIN fill:#dbeafe,stroke:#2563eb
    style MANAGER fill:#fef3c7,stroke:#d97706
    style MEMBER fill:#f3f4f6,stroke:#6b7280
```

| Role | DB Value | Dashboard Route |
|------|----------|-----------------|
| Administrator | `ADMIN` | `/admin` |
| Manager | `MANAGER` | `/manager` |
| Member | `MEMBER` | `/member` |

All roles share `/dashboard` (redirects to role-specific dashboard) and `/profile`.

---

## Permission Matrix

### System-Level Permissions

| Action | ADMIN | MANAGER | MEMBER |
|--------|:-----:|:-------:|:------:|
| View admin dashboard | ✓ | ✗ | ✗ |
| Manage users (CRUD) | ✓ | ✗ | ✗ |
| View audit logs (all) | ✓ | ✗ | ✗ |
| View audit logs (team) | ✓ | ✓ | ✗ |
| View own audit logs | ✓ | ✓ | ✓ |
| System reports & export | ✓ | ✗ | ✗ |
| Database backups | ✓ | ✗ | ✗ |

### Board-Level Permissions

| Action | ADMIN | MANAGER | MEMBER |
|--------|:-----:|:-------:|:------:|
| Create boards | ✓ | ✓ | ✗ |
| Delete boards | ✓ | ✓ (own) | ✗ |
| Edit board name/description | ✓ | ✓ (own) | ✗ |
| Add/remove members | ✓ | ✓ (own) | ✗ |
| Create/edit/delete columns | ✓ | ✓ (own) | ✗ |
| Set WIP limits | ✓ | ✓ (own) | ✗ |
| Reorder columns | ✓ | ✓ (own) | ✗ |
| Create board tags | ✓ | ✓ (own) | ✗ |
| Create global tags | ✓ | ✗ | ✗ |
| View any board | ✓ | Boards they're in | Boards they're in |

### Task-Level Permissions

| Action | ADMIN | MANAGER | MEMBER |
|--------|:-----:|:-------:|:------:|
| Create tasks | ✓ | ✓ | ✓ (self-assign only) |
| Edit tasks | ✓ | ✓ | ✓ (any task in board) |
| Delete tasks | ✓ | ✓ | ✓ (any task in board) |
| Move tasks (drag) | ✓ | ✓ (WIP override) | ✓ (WIP enforced) |
| Assign tasks | ✓ | ✓ (anyone) | ✓ (self only) |
| Add comments | ✓ | ✓ | ✓ |
| Edit own comments | ✓ (any time) | ✓ (any time) | ✓ (5 min window) |
| Delete comments | ✓ | ✓ (any) | ✓ (own only) |
| Add checklists/items | ✓ | ✓ | ✓ |
| Add attachments | ✓ | ✓ | ✓ |
| Log time | ✓ | ✓ | ✓ |
| Submit for review | ✓ | ✓ | ✓ |
| Complete reviews | ✓ | ✓ (any) | ✓ (if reviewer) |
| Add/remove tags | ✓ | ✓ | ✓ |

### Automation Permissions

| Action | ADMIN | MANAGER | MEMBER |
|--------|:-----:|:-------:|:------:|
| View automation rules | ✓ | ✓ | ✗ |
| Create system-wide rules | ✓ | ✗ | ✗ |
| Create board rules | ✓ | ✓ | ✗ |
| Toggle/delete rules | ✓ | ✓ (board rules) | ✗ |

---

## Authorization Architecture

```mermaid
graph TB
    subgraph "Route Level"
        PROXY["proxy.ts - Middleware"]
    end

    subgraph "Layout Level"
        LAYOUT["Dashboard Layout - getSession() then redirect if null"]
    end

    subgraph "Action Level"
        CA["checkAdmin() in admin-actions.ts"]
        CM["checkManager() in manager-actions.ts"]
        CBP["checkBoardPermission() in board-actions.ts"]
        CTP["checkTaskPermission() in task-actions.ts"]
    end

    subgraph "Database"
        USER["User table (role, teamId)"]
        BOARD["Board table (ownerId)"]
        MEMBER_REL["Board - User (many-to-many)"]
    end

    PROXY -->|"cookie decrypt"| USER
    LAYOUT -->|"getSession()"| USER

    CA -->|"session.role === 'ADMIN'"| USER
    CM -->|"role is ADMIN or MANAGER"| USER
    CBP -->|"isAdmin OR owner OR member"| BOARD
    CBP -->|"member check"| MEMBER_REL
    CTP -->|"board membership + role"| BOARD
    CTP -->|"task.column.board.members"| MEMBER_REL
```

---

## Board Permission Flow

**Function:** `checkBoardPermission()` in `actions/board-actions.ts`

```mermaid
flowchart TD
    START["checkBoardPermission(boardId, allowedRoles)"] --> SESSION["getSession"]
    SESSION --> NO_SESSION{"Session exists?"}
    NO_SESSION -->|No| ERR_UNAUTH["401: Unauthorized"]
    NO_SESSION -->|Yes| FIND["prisma.board.findUnique with members"]
    FIND --> NOT_FOUND{"Board exists?"}
    NOT_FOUND -->|No| ERR_404["404: Board not found"]
    NOT_FOUND -->|Yes| IS_ADMIN{"role === ADMIN?"}
    IS_ADMIN -->|Yes| ALLOW["Authorized"]
    IS_ADMIN -->|No| IS_MEMBER_OR_OWNER{"isMember OR isOwner?"}
    IS_MEMBER_OR_OWNER -->|Neither| ERR_FORBIDDEN["403: Not a member"]
    IS_MEMBER_OR_OWNER -->|Is Owner| ALLOW
    IS_MEMBER_OR_OWNER -->|Is Member| IS_OWNER["Board owners get full management perms"]
    IS_OWNER -->|Allowed role match| ALLOW
    IS_OWNER -->|Role not in allowedRoles| ERR_ROLE["403: Role not permitted"]

    style ALLOW fill:#d1fae5,stroke:#059669
    style ERR_UNAUTH fill:#fee2e2,stroke:#dc2626
    style ERR_404 fill:#fee2e2,stroke:#dc2626
    style ERR_FORBIDDEN fill:#fee2e2,stroke:#dc2626
    style ERR_ROLE fill:#fee2e2,stroke:#dc2626
```

### Default `allowedRoles` by Action

| Action | allowedRoles |
|--------|-------------|
| `createBoard` | `['ADMIN', 'MANAGER']` (checked manually, not via `checkBoardPermission`) |
| `updateBoard` | `['ADMIN', 'MANAGER']` |
| `deleteBoard` | `['ADMIN', 'MANAGER']` |
| `createColumn` | `['ADMIN', 'MANAGER']` |
| `updateColumn` | `['ADMIN', 'MANAGER']` |
| `addBoardMember` | `['ADMIN', 'MANAGER']` |
| `removeBoardMember` | `['ADMIN', 'MANAGER']` |
| `getBoardData` | Any member (checked manually) |

---

## Task Permission Flow

**Function:** `checkTaskPermission()` in `actions/task-actions.ts`

```mermaid
flowchart TD
    START["checkTaskPermission(taskId, allowedRoles)"] --> SESSION["getSession"]
    SESSION --> NO_SESSION{"Session?"}
    NO_SESSION -->|No| ERR["401: Unauthorized"]
    NO_SESSION -->|Yes| FIND["prisma.task.findUnique with deep includes"]
    FIND --> NOT_FOUND{"Task?"}
    NOT_FOUND -->|No| ERR_404["404: Task not found"]
    NOT_FOUND -->|Yes| ADMIN{"Is ADMIN?"}
    ADMIN -->|Yes| ALLOW["Full access"]
    ADMIN -->|No| MEMBER_CHECK{"isMember OR isOwner?"}
    MEMBER_CHECK -->|Neither| ERR_403["403: Not a board member"]
    MEMBER_CHECK -->|Yes| OWNER_MGR{"isOwner OR isManager?"}
    OWNER_MGR -->|Yes| ALLOW
    OWNER_MGR -->|No| ROLE_CHECK{"allowedRoles includes MEMBER or MEMBER_ALL?"}
    ROLE_CHECK -->|No| ERR_MGR["403: Manager required"]
    ROLE_CHECK -->|Yes| ALLOW_MEM["Member access (collaboration model)"]

    style ALLOW fill:#d1fae5,stroke:#059669
    style ALLOW_MEM fill:#d1fae5,stroke:#059669
    style ERR fill:#fee2e2,stroke:#dc2626
    style ERR_404 fill:#fee2e2,stroke:#dc2626
    style ERR_403 fill:#fee2e2,stroke:#dc2626
    style ERR_MGR fill:#fee2e2,stroke:#dc2626
```

### Collaboration Model

Members operate under a **collaboration model**: any board member can edit, delete, add comments, checklists, attachments, tags, and time entries to **any task** in their board — not just their own. The only restriction is that members can only **assign tasks to themselves** (enforced server-side).

---

## Route-Level Guards

**File:** `proxy.ts`

```mermaid
flowchart LR
    REQ["Request"] --> PARSE["Parse path"]
    PARSE --> PROTECTED{"Starts with /dashboard, /admin, /manager, /member, /settings, /boards?"}
    PROTECTED -->|No| PUBLIC["Public route: check if logged in"]
    PUBLIC --> LOGGED_IN{"Has session + /login or /signup?"}
    LOGGED_IN -->|Yes| REDIRECT_DASH["Redirect to /dashboard"]
    LOGGED_IN -->|No| ALLOW["Allow"]
    PROTECTED -->|Yes| HAS_SESSION{"Has session?"}
    HAS_SESSION -->|No| REDIRECT_LOGIN["Redirect to /login"]
    HAS_SESSION -->|Yes| RBAC{"Path-based role check"}
    RBAC -->|"/admin" != ADMIN| REDIRECT_DASH2["Redirect to /dashboard"]
    RBAC -->|"/manager" not in ADMIN,MANAGER| REDIRECT_DASH2
    RBAC -->|"/member" not in any role| REDIRECT_DASH2
    RBAC -->|Authorized| ALLOW2["Allow"]
```

---

## Member Assignment Rules

```mermaid
sequenceDiagram
    participant Browser
    participant Action as createTask / updateTask
    participant DB as PostgreSQL

    Note over Browser: MEMBER creates a task

    Browser->>Action: createTask(title, assigneeId: other-user)
    Action->>Action: checkBoardPermission()
    Action->>Action: session.role === "MEMBER"?
    alt Is MEMBER
        Action->>Action: createData.assigneeId = session.id (override, force self-assign)
    else Is ADMIN or MANAGER
        Action->>Action: keep original assigneeId
    end
    Action->>DB: prisma.task.create(data)

    Note over Browser: MEMBER updates task assignee

    Browser->>Action: updateTask(assigneeId: other-user)
    Action->>Action: session.role === "MEMBER" && assigneeId !== session.id?
    alt Assigning to someone else
        Action-->>Browser: "Members can only assign tasks to themselves"
    else Assigning to self
        Action->>DB: prisma.task.update(data)
    end
```

---

## WIP Limit Enforcement

```mermaid
flowchart TD
    START["updateTaskStatus(taskId, columnId, version)"] --> PERM["checkTaskPermission"]
    PERM --> FAILED{"Authorized?"}
    FAILED -->|No| ERR["Error"]
    FAILED -->|Yes| VERSION["Version conflict check"]
    VERSION --> STALE{"clientVersion === serverVersion?"}
    STALE -->|No| CONFLICT["409: Conflict"]
    STALE -->|Yes| COL["Find target column"]
    COL --> WIP{"WIP limit active and user is MEMBER?"}

    WIP -->|No| MOVE["Move task"]
    WIP -->|Yes| COUNT["Count tasks in column (excluding current task)"]
    COUNT --> EXCEEDED{"count >= wipLimit?"}
    EXCEEDED -->|Yes| REJECT["Reject: WIP limit exceeded"]
    EXCEEDED -->|No| MOVE

    MOVE --> CHECK_OVERRIDE{"After move: count > wipLimit?"}
    CHECK_OVERRIDE -->|Yes| LOG_OVERRIDE["Log as UPDATE_TASK_STATUS_OVERRIDE"]
    CHECK_OVERRIDE -->|No| LOG_NORMAL["Log as UPDATE_TASK_STATUS"]

    style REJECT fill:#fee2e2,stroke:#dc2626
    style CONFLICT fill:#fef3c7,stroke:#d97706
    style MOVE fill:#d1fae5,stroke:#059669
```

**Key points:**
- WIP limits are **only enforced for MEMBER role**
- ADMIN and MANAGER can always move tasks, even past the limit
- When an admin/manager exceeds the limit, the audit log records `UPDATE_TASK_STATUS_OVERRIDE` instead of `UPDATE_TASK_STATUS`
- The override check is done **after** the move (retroactive detection)
