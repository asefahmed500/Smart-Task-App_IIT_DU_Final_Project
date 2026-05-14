# SmartTask — Task Management

## Table of Contents

- [Overview](#overview)
- [Task Lifecycle](#task-lifecycle)
- [Task Data Model](#task-data-model)
- [Version Conflict Detection](#version-conflict-detection)
- [Drag and Drop Flow](#drag-and-drop-flow)
- [Task Sub-Systems](#task-sub-systems)
  - [Comments](#comments)
  - [Checklists](#checklists)
  - [Attachments](#attachments)
  - [Tags](#tags)
  - [Time Tracking](#time-tracking)
  - [Reviews](#reviews)
- [File Map](#file-map)

---

## Overview

Tasks are the core work items in SmartTask. They live inside columns on boards. Each task supports a rich set of sub-systems: comments with reactions and @mentions, checklists, file attachments, tags, time tracking, and a review/approval workflow. Tasks use **optimistic concurrency** via a `version` field to prevent lost updates.

---

## Task Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Created: Executive/Manager creates task
    Created --> InProgress: Drag to "In Progress"
    InProgress --> ReviewPending: Submit for review
    ReviewPending --> Approved: Reviewer approves → auto-move to "Done"
    ReviewPending --> ChangesRequested: Reviewer requests changes → auto-move to "In Progress"
    ReviewPending --> Rejected: Reviewer rejects → auto-move to "To Do"
    ChangesRequested --> InProgress: Fix and resubmit
    AnyState --> Updated: Edit title/description/priority/assignee
    AnyState --> Deleted: Delete task
    Approved --> [*]
    Deleted --> [*]
```

### Status Mapping (by column name)

Tasks don't have an explicit status field. Their "status" is determined by which column they're in. The system recognizes columns by **case-insensitive name matching**:

| Column Name Pattern | Status Meaning |
|--------------------|---------------|
| Contains "done" or "complete" | Done/Completed |
| Contains "progress" or "doing" | In Progress |
| Contains "todo" or "to do" | To Do |
| Contains "block" | Blocked |

---

## Task Data Model

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
        datetime createdAt
        datetime updatedAt
    }

    COMMENT {
        string id PK
        string content
        string userId FK
        string taskId FK
    }

    CHECKLIST {
        string id PK
        string title
        string taskId FK
    }

    CHECKLIST_ITEM {
        string id PK
        string content
        boolean isCompleted
        string checklistId FK
    }

    ATTACHMENT {
        string id PK
        string name
        string url
        string type
        int size
        string taskId FK
    }

    TIME_ENTRY {
        string id PK
        int duration
        string description
        string userId FK
        string taskId FK
    }

    REVIEW {
        string id PK
        string status
        string feedback
        string reviewerId FK
        string taskId FK
    }

    REACTION {
        string id PK
        string emoji
        string userId FK
        string commentId FK
    }

    COMMENT ||--o{ REACTION : has
    CHECKLIST ||--o{ CHECKLIST_ITEM : contains
```

---

## Version Conflict Detection

```mermaid
sequenceDiagram
    participant UserA as User A (Browser)
    participant UserB as User B (Browser)
    participant Server as Server Action
    participant DB as PostgreSQL

    Note over DB: Task version = 3

    UserA->>Server: updateTask({id, title: "New Title", version: 3})
    Server->>DB: Find task → version = 3
    Server->>Server: clientVersion(3) === serverVersion(3) ✓
    Server->>DB: UPDATE task SET title="New Title", version=4
    Server-->>UserA: {success: true}

    Note over DB: Task version = 4

    UserB->>Server: updateTask({id, priority: "HIGH", version: 3})
    Server->>DB: Find task → version = 4
    Server->>Server: clientVersion(3) !== serverVersion(4) ✗
    Server-->>UserB: "Conflict: Task was modified by another user"

    UserB->>Browser: Conflict dialog shown
    UserB->>Server: updateTask({id, priority: "HIGH", version: undefined})
    Note over Server: version=undefined bypasses conflict check
    Server->>DB: UPDATE task SET priority="HIGH", version=5
    Server-->>UserB: {success: true}
```

**How it works:**
1. Every task has an integer `version` field (starts at 1)
2. On every update, the client sends the `version` it last saw
3. The server compares: if they match, proceed; if not, reject with conflict error
4. On success, the server increments `version` via `version: { increment: 1 }`
5. The conflict dialog can bypass by sending `version: undefined`

---

## Drag and Drop Flow

**Hook:** `hooks/use-kanban-board.ts` using `@dnd-kit/core`

```mermaid
flowchart TD
    subgraph "Browser (use-kanban-board)"
        DRAG_START["onDragStart<br/>Set active task/column"]
        DRAG_OVER["onDragOver<br/>Optimistic reorder<br/>(visual only)"]
        DRAG_END["onDragEnd<br/>Persist to server"]

        DRAG_START --> DRAG_OVER
        DRAG_OVER --> DRAG_END
    end

    subgraph "Task Move"
        DRAG_END --> MOVE{"Task moved to<br/>different column?"}
        MOVE -->|Yes| ONLINE{"isOnline?"}
        ONLINE -->|Yes| API["updateTaskStatus()"]
        ONLINE -->|No| OFFLINE["addAction(MOVE_TASK)<br/>emitTaskMoved() local"]
        API --> SUCCESS{"Success?"}
        SUCCESS -->|Yes| EMIT["emitTaskMoved()"]
        SUCCESS -->|Conflict| CONFLICT_DLG["Open conflict dialog"]
        SUCCESS -->|WIP Limit| WIP_ERR["Show WIP error"]
        API --> ROLLBACK["Rollback to initialBoard"]
    end

    subgraph "Column Reorder"
        DRAG_END --> COL_MOVE{"Column reordered?"}
        COL_MOVE -->|Yes| ARRAY_MOVE["arrayMove(columns)"]
        ARRAY_MOVE --> REORDER["reorderColumns()"]
        REORDER --> TOAST["Toast with Undo button"]
    end

    style OFFLINE fill:#fef3c7,stroke:#d97706
    style CONFLICT_DLG fill:#fef3c7,stroke:#d97706
    style WIP_ERR fill:#fee2e2,stroke:#dc2626
```

### Optimistic Updates

During `onDragOver`, the board state is updated **optimistically** in memory (purely visual). If the server rejects the move (WIP limit, conflict, permission), the board state is rolled back to `initialBoard` (the last confirmed state from the server).

### Offline Drag

When offline (`isOnline === false`):
1. The task move is queued in IndexedDB via `addAction({type: 'MOVE_TASK'})`
2. The socket event is emitted locally for other tabs
3. A toast shows "Task moved locally (offline)"
4. On reconnect, `offline-sync.ts` replays the queued action

---

## Task Sub-Systems

### Comments

**Files:** `actions/task-actions.ts` (addComment, editComment, deleteComment, toggleReaction)

```mermaid
flowchart TD
    subgraph "Comment Lifecycle"
        ADD["Add Comment<br/>(any board member)"]
        EDIT["Edit Comment<br/>(owner: 5 min window<br/>admin/manager: any time)"]
        DELETE["Delete Comment<br/>(owner or admin/manager)"]
        REACT["Toggle Reaction<br/>(emoji on/off)"]
        MENTION["@ Mention<br/>(regex: @name)"]
    end

    ADD --> MENTION
    MENTION --> FIND_USERS["findUsers by name"]
    FIND_USERS --> SEND_NOTIF["sendNotification<br/>(COMMENT_MENTION)"]

    EDIT --> TIME_CHECK{"Time since creation"}
    TIME_CHECK -->|"≤ 5 min OR admin/manager"| ALLOW["Allow edit"]
    TIME_CHECK -->|"> 5 min AND member"| REJECT["Reject"]
```

**Mention parsing:** Uses regex `/@([\w\s]+?)(?=\s|$|[,.!?:;])/g` to extract names from comment content. Matches are looked up case-insensitively in the database.

**Edit window:** `FIVE_MINUTES_MS = 5 * 60 * 1000` (5 minutes). Non-admin/manager users can only edit within this window.

### Checklists

```mermaid
flowchart TD
    ADD_CL["Add Checklist<br/>(title + taskId)"]
    ADD_ITEM["Add Checklist Item<br/>(content + taskId + checklistId?)"]
    TOGGLE["Toggle Item<br/>(isCompleted)"]
    UPDATE_ITEM["Update Item Content"]
    DELETE_ITEM["Delete Item"]

    ADD_ITEM --> HAS_CL{"Has checklist?"}
    HAS_CL -->|No| AUTO_CREATE["Auto-create 'Checklist'<br/>(default title)"]
    HAS_CL -->|Yes| USE_CL["Use specified checklist"]
    AUTO_CREATE --> CREATE_ITEM["Create item in new checklist"]
    USE_CL --> CREATE_ITEM
```

If no `checklistId` is provided when adding an item, the system auto-creates a checklist with title "Checklist" if none exists.

### Attachments

```mermaid
flowchart LR
    ADD["Add Attachment<br/>(name, url, type, size)"]
    DELETE["Delete Attachment"]

    ADD --> VALIDATE["Max size: 10MB<br/>url: valid URL"]
    VALIDATE --> CREATE["prisma.attachment.create()"]
```

Attachments store a URL (typically from client-side upload to a file service). Max size validated via Zod schema: `10 * 1024 * 1024` bytes.

### Tags

```mermaid
flowchart LR
    ADD_TAG["addTagToTask<br/>(connect tag)"]
    RM_TAG["removeTagFromTask<br/>(disconnect tag)"]

    ADD_TAG --> VERSION["version: {increment: 1}"]
    RM_TAG --> VERSION
```

Tag operations on tasks increment the task version to trigger real-time updates.

### Time Tracking

```mermaid
flowchart TD
    LOG["Log Time<br/>(duration in minutes,<br/>optional description)"]
    UPDATE["Update Time Entry<br/>(duration, description)"]
    DELETE["Delete Time Entry<br/>(owner, admin, or manager)"]

    LOG --> VALIDATE["duration > 0"]
    VALIDATE --> CREATE["prisma.timeEntry.create()"]
    DELETE --> OWNER_CHECK{"Is owner,<br/>admin, or manager?"}
    OWNER_CHECK -->|No| ERR["Forbidden"]
    OWNER_CHECK -->|Yes| DEL["Delete entry"]
```

Duration is stored in **minutes** (integer). Only the entry owner, ADMIN, or MANAGER can delete or edit time entries.

### Reviews

```mermaid
sequenceDiagram
    participant Creator as Task Creator
    participant Action as submitForReview()
    participant Reviewer as Assigned Reviewer
    participant Complete as completeReview()
    participant DB as PostgreSQL
    participant Socket as Socket Emitter

    Creator->>Action: submitForReview({taskId, reviewerId})
    Action->>DB: review.create({status: 'PENDING'})
    Action->>DB: task.update({version: increment})
    Action->>DB: createAuditLog({SUBMIT_REVIEW})
    Action->>Socket: emit task:updated
    Action->>Reviewer: sendNotification(REVIEW_REQUESTED)

    Reviewer->>Complete: completeReview({reviewId, status, feedback})
    Complete->>Complete: Check: is reviewer OR admin/manager?
    Complete->>DB: review.update({status, feedback})

    Note over Complete: Auto-move task based on status

    alt status === APPROVED
        Complete->>DB: Find column named "Done" (case-insensitive)
        Complete->>DB: task.update({columnId: doneColumn.id})
        Complete->>Socket: emit task:moved
    else status === CHANGES_REQUESTED
        Complete->>DB: Find column named "In Progress"
        Complete->>DB: task.update({columnId: inProgressColumn.id})
        Complete->>Socket: emit task:moved
    else status === REJECTED
        Complete->>DB: Find column named "To Do"
        Complete->>DB: task.update({columnId: todoColumn.id})
        Complete->>Socket: emit task:moved
    end

    Complete->>DB: createAuditLog({COMPLETE_REVIEW})
    Complete->>Creator: sendNotification(REVIEW_COMPLETED)
```

**Key behavior:** Completing a review automatically moves the task to the appropriate column, found by case-insensitive name matching. This is separate from the `updateTaskStatus` flow — it's handled inside `completeReview()`.

---

## File Map

| File | Responsibility |
|------|---------------|
| `actions/task-actions.ts` | All task CRUD, comments, checklists, attachments, tags, time, reviews |
| `hooks/use-kanban-board.ts` | DnD state machine, board event handling, undo trigger |
| `hooks/use-task/use-task-details.ts` | Task detail fetching |
| `hooks/use-task/use-task-comments.ts` | Comment operations |
| `hooks/use-task/use-task-checklist.ts` | Checklist operations |
| `hooks/use-task/use-task-attachments.ts` | Attachment operations |
| `hooks/use-task/use-task-tags.ts` | Tag operations |
| `hooks/use-task/use-task-time.ts` | Time tracking operations |
| `hooks/use-task/use-task-reviews.ts` | Review operations |
| `hooks/use-task/use-task-activity.ts` | Task activity log |
| `components/kanban/add-task-dialog.tsx` | Create task dialog |
| `components/kanban/task-card.tsx` | Task card in column |
| `components/kanban/task-details-dialog.tsx` | Task details overlay |
| `components/kanban/task-details/task-sidebar.tsx` | Task sidebar layout |
| `components/kanban/task-details/task-header.tsx` | Task title, priority, assignee |
| `components/kanban/task-details/task-description.tsx` | Description editing |
| `components/kanban/task-details/task-comments-section.tsx` | Comments with reactions |
| `components/kanban/task-details/task-checklist-section.tsx` | Checklists |
| `components/kanban/task-details/task-attachments-section.tsx` | File attachments |
| `components/kanban/task-details/task-reviews-section.tsx` | Review workflow |
| `components/kanban/task-details/task-time-tab.tsx` | Time tracking |
| `components/kanban/task-details/task-activity-tab.tsx` | Activity log |
| `components/kanban/task-details/mention-textarea.tsx` | @mention input |
| `components/kanban/conflict-dialog.tsx` | Version conflict resolution |
| `lib/schemas.ts` | Zod schemas for all task operations |
