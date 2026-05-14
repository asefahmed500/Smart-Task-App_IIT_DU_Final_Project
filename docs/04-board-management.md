# SmartTask — Board Management

## Table of Contents

- [Overview](#overview)
- [Board Lifecycle](#board-lifecycle)
- [Column Management](#column-management)
- [WIP Limits](#wip-limits)
- [Board Membership](#board-membership)
- [Tags](#tags)
- [Undo System](#undo-system)
- [File Map](#file-map)

---

## Overview

Boards are the primary organizational unit. Each board has an **owner**, multiple **members** (many-to-many), **columns** (ordered, with optional WIP limits), and **tags**. Boards can only be created by ADMIN or MANAGER roles. The board page at `app/dashboard/board/[id]/page.tsx` is the main Kanban view, rendering edge-to-edge via a CSS `-m-6` trick.

---

## Board Lifecycle

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
    participant Action as createBoard() (board-actions.ts)
    participant DB as PostgreSQL
    participant Socket as Socket Emitter

    Browser->>Action: createBoard({name, description})
    Action->>Action: getSession() + role check
    alt role === MEMBER
        Action-->>Browser: "Only Admins and Managers can create boards"
    end
    Action->>Action: createBoardSchema.validate(input)
    Action->>DB: prisma.board.create({ownerId: session.id, members: {connect: session.id}, columns: {create: [{name: "To Do", order: 0}, {name: "In Progress", order: 1}, {name: "Done", order: 2}]}})
    Action->>DB: createAuditLog({CREATE_BOARD})
    Action->>Action: revalidatePath('/dashboard')
    Action-->>Browser: {success: true, data: board}
```

**Key details:**
- The creator is automatically set as `ownerId`
- The creator is automatically added as a member
- Three default columns are created: "To Do" (order 0), "In Progress" (order 1), "Done" (order 2)
- Validation: name max 50 chars, description max 255 chars

---

## Column Management

```mermaid
flowchart TD
    subgraph "Column Operations"
        CREATE["Create Column - allowedRoles: ADMIN, MANAGER"]
        UPDATE["Update Column (name, wipLimit, order)"]
        DELETE["Delete Column with task rehoming"]
        REORDER["Reorder Columns - bulk update via transaction"]
    end

    subgraph "Delete Flow"
        DELETE --> HAS_TASKS{"Has tasks?"}
        HAS_TASKS --> TARGET{"Target column specified?"}
        TARGET -->|Yes| MOVE["Move tasks to target column"]
        TARGET -->|No| OTHER{"Other column exists?"}
        OTHER -->|Yes| FIRST["Move tasks to first other column"]
        OTHER -->|No| EMPTY{"Tasks remain?"}
        EMPTY -->|Yes| ERR["Cannot delete only column with tasks"]
        EMPTY -->|No| DEL["Delete column"]
        MOVE --> DEL
        FIRST --> DEL
    end

    subgraph "Reorder Flow"
        REORDER --> FETCH["Fetch current order (for undo)"]
        FETCH --> TX["prisma.$transaction(update each column order)"]
        TX --> EMIT["emit columns:reordered"]
    end
```

### Delete Column with Task Rehoming

When a column is deleted, its tasks are moved to another column (either specified by the user or the first available column). The moved task IDs are stored in the audit log for undo support.

### Reorder Columns

Uses a Prisma `$transaction` to update all column orders atomically. The previous order is stored in the audit log for undo.

---

## WIP Limits

Each column has a `wipLimit` field (default: 0, meaning unlimited).

```mermaid
flowchart LR
    COL["Column wipLimit: 3"] --> COUNT["Task count: 4"]
    COUNT --> MEMBER{"User is MEMBER?"}
    MEMBER -->|Yes| BLOCK["Block: WIP limit exceeded"]
    MEMBER -->|No| OVERRIDE["Allow + log UPDATE_TASK_STATUS_OVERRIDE"]
```

- **WIP limit of 0** = unlimited (no restriction)
- Only enforced for MEMBER role
- ADMIN/MANAGER always bypass (logged as override)
- Can be set per column via `updateColumnWipLimit()` or `updateColumn()`

---

## Board Membership

```mermaid
sequenceDiagram
    participant Manager as ADMIN/MANAGER
    participant Action as addBoardMember() / removeBoardMember()
    participant DB as PostgreSQL
    participant Notif as Notification System
    participant Socket as Socket Emitter

    Note over Manager: Add Member

    Manager->>Action: addBoardMember({boardId, userId})
    Action->>Action: checkBoardPermission([ADMIN, MANAGER])
    Action->>DB: prisma.board.update({members: {connect: {id: userId}}})
    Action->>DB: createAuditLog({ADD_BOARD_MEMBER})
    Action->>Socket: emit board:member_added
    Action->>Notif: sendNotification({type: BOARD_MEMBER_ADDED})

    Note over Manager: Remove Member

    Manager->>Action: removeBoardMember({boardId, userId})
    Action->>Action: checkBoardPermission([ADMIN, MANAGER])
    Action->>Action: Check: is userId the board owner?
    alt Is owner
        Action-->>Manager: "Cannot remove the board owner"
    end
    Action->>DB: prisma.board.update({members: {disconnect: {id: userId}}})
    Action->>DB: createAuditLog({REMOVE_BOARD_MEMBER})
    Action->>Socket: emit board:member_removed
    Action->>Notif: sendNotification({type: BOARD_MEMBER_REMOVED})
```

**Key rules:**
- Cannot remove the board owner
- Notifications are NOT sent when adding/removing yourself
- User search for adding members: `searchUsers()` searches by name or email (case-insensitive, max 10 results)

---

## Tags

```mermaid
flowchart TD
    subgraph "Tag Scopes"
        GLOBAL["Global Tag (boardId: null) - Only ADMIN can create/delete"]
        BOARD["Board Tag (boardId: board.id) - ADMIN/MANAGER can create/delete"]
    end

    subgraph "Tag Operations"
        CREATE["createTag({name, color, boardId?})"]
        DELETE["deleteTag({tagId})"]
        GET["getTagsForBoard({boardId}) - Returns board tags + global tags"]
        TASK_ADD["addTagToTask({taskId, tagId})"]
        TASK_RM["removeTagFromTask({taskId, tagId})"]
    end

    CREATE --> GLOBAL
    CREATE --> BOARD
    GET --> GLOBAL
    GET --> BOARD
```

Tags are a many-to-many relationship between `Tag` and `Task`. When fetching tags for a board, both board-specific tags and global tags are returned.

---

## Undo System

The undo system uses the **audit log as a reversible operation log**. It works within a **30-second window** after the original action.

```mermaid
sequenceDiagram
    participant Browser
    participant Action as undoLastAction() (board-actions.ts)
    participant DB as PostgreSQL
    participant Socket as Socket Emitter

    Note over Browser: User clicks "Undo" (within 30 seconds)

    Browser->>Action: undoLastAction()
    Action->>DB: Delete audit logs older than 5 minutes for this user
    Action->>DB: Find most recent undoable action (last 30s)
    alt No recent action
        Action-->>Browser: "No recent actions to undo"
    end

    Note over Action: Reverse the action based on type

    alt CREATE_TASK
        Action->>DB: task.delete({id: details.taskId})
        Action->>Socket: emit task:deleted
    else DELETE_TASK
        Action->>DB: Recreate task from stored fullTask data
        Action->>Socket: emit task:created
    else UPDATE_TASK
        Action->>DB: task.update({restore previousState fields})
        Action->>Socket: emit task:updated
    else UPDATE_TASK_STATUS
        Action->>DB: task.update({columnId: previousColumnId})
        Action->>Socket: emit task:moved
    else CREATE_COLUMN
        Action->>DB: column.delete({id: details.columnId})
        Action->>Socket: emit column:deleted
    else DELETE_COLUMN
        Action->>DB: Recreate column + move back tasks
        Action->>Socket: emit column:created
    end

    Action->>DB: createAuditLog({UNDO})
    Action->>Action: revalidatePath(board page)
    Action-->>Browser: {success: true}
```

### Undoable Actions (30-second window)

| Audit Action | Undo Behavior |
|-------------|---------------|
| `CREATE_TASK` | Delete the task |
| `DELETE_TASK` | Recreate task with all sub-resources (checklists, comments, attachments, time entries, reviews) |
| `UPDATE_TASK` | Restore previous field values |
| `UPDATE_TASK_STATUS` | Move task back to previous column |
| `UPDATE_TASK_STATUS_OVERRIDE` | Same as above |
| `CREATE_COLUMN` | Delete the column |
| `DELETE_COLUMN` | Recreate column + move tasks back |
| `UPDATE_COLUMN` | Restore name/wipLimit |
| `UPDATE_COLUMN_WIP_LIMIT` | Restore previous WIP limit |
| `REORDER_COLUMNS` | Restore previous column order |
| `DELETE_COMMENT` | Recreate comment |
| `DELETE_CHECKLIST_ITEM` | Recreate checklist item |
| `DELETE_ATTACHMENT` | Recreate attachment |
| `COMPLETE_REVIEW` | Restore review status + move task back |
| `ADD_TAG` | Remove tag from task |
| `REMOVE_TAG` | Add tag back to task |
| `TOGGLE_CHECKLIST_ITEM` | Toggle completion state back |
| `ADD_COMMENT` | Delete the comment |
| `ADD_CHECKLIST_ITEM` | Delete the item |
| `UPDATE_CHECKLIST_ITEM` | Restore previous content |
| `ADD_ATTACHMENT` | Delete the attachment |
| `LOG_TIME` | Delete the time entry |
| `SUBMIT_REVIEW` | Delete the review |

### Important Constraints

- **30-second window** — only actions within the last 30 seconds can be undone
- **5-minute log cleanup** — every undo call also deletes audit logs older than 5 minutes for the user (housekeeping)
- **Version increment** — undo operations on tasks still increment the `version` field to prevent stale state

---

## File Map

| File | Responsibility |
|------|---------------|
| `actions/board-actions.ts` | Board/column CRUD, members, tags, undo, search users |
| `components/kanban/create-board-dialog.tsx` | Create board dialog |
| `components/kanban/edit-board-dialog.tsx` | Edit board name/description |
| `components/kanban/manage-members-dialog.tsx` | Add/remove board members |
| `components/kanban/add-column-dialog.tsx` | Create column dialog |
| `components/kanban/rename-column-dialog.tsx` | Rename column dialog |
| `components/kanban/set-wip-limit-dialog.tsx` | Set WIP limit dialog |
| `components/kanban/kanban-board.tsx` | Main board component (DnD context) |
| `components/kanban/column-container.tsx` | Column with tasks list |
| `components/kanban/board-header.tsx` | Board title, members, settings |
| `app/dashboard/board/[id]/page.tsx` | Board page (edge-to-edge rendering) |
| `hooks/use-kanban-board.ts` | DnD logic, board state, event handlers |
| `lib/schemas.ts` | Zod schemas for board/column/tag operations |
