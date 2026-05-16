# SmartTask — Hooks Reference

> Complete visual guide to every hook in the project, how they connect, and what they do.

---

## Table of Contents

1. [Hooks Map — Big Picture](#1-hooks-map--big-picture)
2. [Socket Hooks](#2-socket-hooks)
3. [Kanban Board Hook](#3-kanban-board-hook)
4. [Task Details Hook](#4-task-details-hook)
5. [Task Comments Hook](#5-task-comments-hook)
6. [Task Checklist Hook](#6-task-checklist-hook)
7. [Task Attachments Hook](#7-task-attachments-hook)
8. [Task Tags Hook](#8-task-tags-hook)
9. [Task Time Hook](#9-task-time-hook)
10. [Task Reviews Hook](#10-task-reviews-hook)
11. [Task Activity Hook](#11-task-activity-hook)
12. [Mobile Hook](#12-mobile-hook)
13. [Hook Dependency Graph](#13-hook-dependency-graph)
14. [Common Patterns](#14-common-patterns)

---

## 1. Hooks Map — Big Picture

```mermaid
graph TB
    subgraph "Socket Layer (Real-Time)"
        SH["socket-hooks.ts"]
        SH -->|"useSocket"| BOARD
        SH -->|"useBoardEvents"| BOARD
        SH -->|"useNotificationListener"| BELL
    end

    subgraph "Board Layer"
        BOARD["use-kanban-board.ts"]
        BOARD -->|"DnD state"| UI
        BOARD -->|"offline check"| OFFLINE
    end

    subgraph "Task Detail Layer"
        TD["use-task-details.ts"]
        TC["use-task-comments.ts"]
        TCL["use-task-checklist.ts"]
        TA["use-task-attachments.ts"]
        TTG["use-task-tags.ts"]
        TT["use-task-time.ts"]
        TR["use-task-reviews.ts"]
        TACT["use-task-activity.ts"]
    end

    subgraph "Utility"
        MOBILE["use-mobile.ts"]
        OFFLINE["useOfflineStore"]
    end

    TD -->|"fetches"| TASK_DB
    TC -->|"add/edit/delete"| TASK_DB
    TCL -->|"CRUD"| TASK_DB
    TA -->|"upload/delete"| TASK_DB
    TTG -->|"add/remove"| TASK_DB
    TT -->|"log/delete"| TASK_DB
    TR -->|"submit/complete"| TASK_DB
    TACT -->|"audit log"| TASK_DB

    TD -->|"undo"| BOARD
    TC -->|"undo"| BOARD
    TCL -->|"undo"| BOARD
    TA -->|"undo"| BOARD
    TTG -->|"undo"| BOARD
    TT -->|"undo"| BOARD
    TR -->|"undo"| BOARD

    TD -->|"offline queue"| OFFLINE
    TC -->|"offline queue"| OFFLINE
    BOARD -->|"offline queue"| OFFLINE

    UI["Kanban Board UI"]
    BELL["Notification Bell"]
    TASK_DB[("PostgreSQL via Server Actions")]
```

---

## 2. Socket Hooks

**File:** `components/kanban/socket-hooks.ts`

Three hooks + four emitter functions. This is the **real-time backbone** of the entire app.

### 2.1 `useSocket(boardId?, user?)`

**Purpose:** Manages the single WebSocket connection to the Socket.IO server. Tracks presence (who's viewing the board) and editing indicators (who's editing which task).

```mermaid
flowchart TD
    START["Component mounts"] --> INIT["Create Socket.IO client (singleton)"]
    INIT --> LISTEN["Listen: connect, disconnect, presence:update, editing:update"]
    LISTEN --> JOIN{"boardId + user available?"}
    JOIN -->|Yes| EMIT_JOIN["emit('join-board', {boardId, user})"]
    JOIN -->|No| WAIT["Wait for props"]
    EMIT_JOIN --> TRACK["Track presence + editing state"]
    WAIT --> JOIN

    UNMOUNT["Component unmounts"] --> LEAVE["emit('leave-board', boardId)"]
    LEAVE --> CLEANUP["Remove event listeners"]
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `socket` | `Socket` | Raw Socket.IO client instance |
| `isConnected` | `boolean` | WebSocket connection status |
| `presence` | `PresenceUser[]` | Who is currently viewing this board |
| `editingTasks` | `Record<string, PresenceUser[]>` | Who is editing which task |

**Critical detail:** Uses `useMemo` on the `user` prop to prevent infinite re-renders. The socket is a **module-level singleton** — one connection shared across all components.

### 2.2 `useBoardEvents(boardId, onEvent)`

**Purpose:** Subscribes to all board-level socket events and routes them through a single callback.

```mermaid
flowchart TD
    START["Hook mounts with boardId"] --> SOCKET["Get socket from useSocket()"]
    SOCKET --> CONNECTED{"isConnected?"}
    CONNECTED -->|Yes| REG["Register 14 event handlers"]
    CONNECTED -->|No| WAIT["Wait for connection"]

    REG --> TASK_EV["task:moved, task:created, task:updated, task:deleted"]
    REG --> COL_EV["column:created, column:deleted, column:updated, columns:reordered"]
    REG --> BOARD_EV["board:updated, board:deleted, board:member_added, board:member_removed"]
    REG --> TAG_EV["tag:created, tag:deleted"]

    TASK_EV --> CALLBACK["onEvent(event, data)"]
    COL_EV --> CALLBACK
    BOARD_EV --> CALLBACK
    TAG_EV --> CALLBACK

    UNMOUNT["Hook unmounts"] --> DEREG["Remove all 14 listeners"]
```

**Events handled (14 total):**

| Event | What it means |
|-------|--------------|
| `task:moved` | Someone dragged a task to a different column |
| `task:created` | New task added to the board |
| `task:updated` | Task title/description/priority changed |
| `task:deleted` | Task removed |
| `column:created` | New column added |
| `column:deleted` | Column removed |
| `column:updated` | Column name/WIP limit changed |
| `columns:reordered` | Columns rearranged |
| `board:updated` | Board name changed |
| `board:deleted` | Board deleted (redirects to /dashboard) |
| `board:member_added` | New member joined |
| `board:member_removed` | Member removed |
| `tag:created` | New tag created |
| `tag:deleted` | Tag deleted |

### 2.3 `useNotificationListener(userId, onNotification)`

**Purpose:** Registers the user in their personal notification room and listens for incoming notifications.

```mermaid
sequenceDiagram
    participant Hook as useNotificationListener
    participant Socket as Socket.IO Server
    participant Callback as onNotification callback

    Hook->>Socket: emit('register-user', userId)
    Note over Socket: Joins room 'user:123'
    Socket->>Hook: emit('notification', data)
    Hook->>Callback: onNotification(data)
    Note over Callback: Updates bell badge + shows toast
```

### 2.4 Emitter Functions

Standalone functions (not hooks) that emit events from the browser to the Socket.IO server:

| Function | Event | Used By |
|----------|-------|---------|
| `emitTaskMoved(boardId, data)` | `task:moved` | `use-kanban-board.ts` (offline drag) |
| `emitTaskCreated(boardId, data)` | `task:created` | — |
| `emitTaskUpdated(boardId, data)` | `task:updated` | — |
| `emitTaskDeleted(boardId, data)` | `task:deleted` | — |
| `getSocket()` | — | All emitters (lazy singleton) |

---

## 3. Kanban Board Hook

**File:** `hooks/use-kanban-board.ts`

**Purpose:** The **central state machine** for the Kanban board. Handles drag-and-drop, optimistic updates, conflict resolution, undo, and offline support.

### Architecture

```mermaid
flowchart TD
    subgraph "State"
        BOARD["board: Board"]
        ACTIVE_COL["activeColumn: Column | null"]
        ACTIVE_TASK["activeTask: Task | null"]
        CONFLICT["conflictModalOpen: boolean"]
        SELECTED["selectedTaskId: string | null"]
    end

    subgraph "Inputs"
        INITIAL["initialBoard (from server)"]
        USER["currentUser"]
    end

    subgraph "DnD Handlers"
        DRAG_START["onDragStart — Set active task/column"]
        DRAG_OVER["onDragOver — Optimistic reorder (visual)"]
        DRAG_END["onDragEnd — Persist to server"]
    end

    INITIAL -->|"useEffect sync"| BOARD
    USER -->|"useSocket"| SOCKET["isConnected, presence, editingTasks"]

    DRAG_START --> DRAG_OVER --> DRAG_END
    DRAG_END --> PERSIST{"Online or offline?"}
    PERSIST -->|Online| SERVER["updateTaskStatus()"]
    PERSIST -->|Offline| QUEUE["addAction(MOVE_TASK) + emitTaskMoved()"]
    SERVER --> SUCCESS{"Success?"}
    SUCCESS -->|Yes| TOAST["Toast with Undo button"]
    SUCCESS -->|Conflict| CONFLICT_DLG["Open conflict dialog"]
    SUCCESS -->|Error| ROLLBACK["Rollback to initialBoard"]
```

### Drag-and-Drop Flow

```mermaid
sequenceDiagram
    participant User
    participant Hook as use-kanban-board
    participant Zustand as useOfflineStore
    participant Server as updateTaskStatus()
    participant Socket as emitTaskMoved()

    User->>Hook: Drag task to new column (onDragEnd)
    Hook->>Hook: Check isOnline

    alt Online
        Hook->>Server: updateTaskStatus(taskId, columnId, version)
        Server-->>Hook: (success: true, data: task)
        Hook->>Socket: emitTaskMoved(boardId, data)
        Hook->>Hook: Toast: "Task moved to Done" + Undo button
    else Conflict
        Server-->>Hook: "Conflict: Task was modified"
        Hook->>Hook: Open conflict dialog
        Hook->>Hook: Rollback to initialBoard
    else WIP Exceeded
        Server-->>Hook: "WIP limit exceeded"
        Hook->>Hook: Toast error + rollback
    else Offline
        Hook->>Zustand: addAction(MOVE_TASK, payload)
        Hook->>Socket: emitTaskMoved() (local broadcast)
        Hook->>Hook: Toast: "Task moved locally (offline)"
    end
```

### Conflict Resolution

```mermaid
flowchart TD
    CONFLICT["Server returns conflict error"] --> DIALOG["Open conflict dialog"]
    DIALOG --> USER_CHOICE{"User clicks 'Overwrite'?"}
    USER_CHOICE -->|Yes| FORCE["updateTaskStatus(version: undefined)"]
    USER_CHOICE -->|No| CLOSE["Close dialog, keep rollback"]
    FORCE --> RESULT{"Success?"}
    RESULT -->|Yes| TOAST["Toast: 'Task updated (overwritten)'"]
    RESULT -->|No| ERR["Toast error"]
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `board` | `Board` | Current board state (columns + tasks) |
| `activeColumn` | `Column \| null` | Column being dragged |
| `activeTask` | `Task \| null` | Task being dragged |
| `isAddColumnOpen` | `boolean` | Add column dialog state |
| `conflictModalOpen` | `boolean` | Conflict dialog state |
| `conflictTaskData` | `any` | Data for conflict resolution |
| `selectedTaskId` | `string \| null` | Currently selected task |
| `isConnected` | `boolean` | Socket connection status |
| `presence` | `PresenceUser[]` | Who is viewing the board |
| `editingTasks` | `Record<string, PresenceUser[]>` | Who is editing which task |
| `onDragStart` | `function` | dnd-kit drag start handler |
| `onDragOver` | `function` | dnd-kit drag over handler (optimistic) |
| `onDragEnd` | `function` | dnd-kit drag end handler (persist) |
| `handleRefresh` | `function` | Full page reload |
| `handleResolveConflict` | `function` | Force-overwrite on conflict |
| `handleUndo` | `function` | Undo last action |

---

## 4. Task Details Hook

**File:** `hooks/use-task/use-task-details.ts`

**Purpose:** Manages the task detail panel — fetching, updating, deleting tasks, and handling conflicts.

### Architecture

```mermaid
flowchart TD
    subgraph "State"
        TASK["task: Task | null"]
        LOADING["loading: boolean"]
        UPDATING["updating: boolean"]
        USERS["allUsers: User[]"]
        CONFLICT["conflictModalOpen: boolean"]
    end

    subgraph "Lifecycle"
        OPEN["isOpen = true"] --> FETCH["fetchTaskDetails()"]
        FETCH --> SERVER["getTaskDetails(taskId)"]
        SERVER --> SET["setTask(data)"]
        OPEN --> ALSO["getAllUsers()"]
    end

    subgraph "Update Flow"
        UPDATE["handleUpdate(field, value)"] --> ONLINE{"isOnline?"}
        ONLINE -->|No| QUEUE["addAction(EDIT_TASK) + optimistic setTask"]
        ONLINE -->|Yes| API["updateTask(id, field, value, version)"]
        API --> OK{"Success?"}
        OK -->|Yes| TOAST["Toast with Undo"]
        OK -->|Conflict| CONFLICT_DLG["Open conflict dialog"]
        OK -->|Error| ERR["Toast error"]
    end

    subgraph "Delete Flow"
        DELETE["handleDelete()"] --> CONFIRM["confirm() dialog"]
        CONFIRM --> API_DEL["deleteTask(id)"]
        API_DEL --> OK_DEL{"Success?"}
        OK_DEL -->|Yes| TOAST_DEL["Toast with Undo + router.refresh()"]
        OK_DEL -->|No| ERR_DEL["Toast error"]
    end
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `task` | `Task \| null` | Current task data |
| `setTask` | `Dispatch<SetStateAction>` | Update task state |
| `loading` | `boolean` | Fetching task details |
| `updating` | `boolean` | Update in progress |
| `allUsers` | `User[]` | All users (for assignee dropdown) |
| `conflictModalOpen` | `boolean` | Conflict dialog state |
| `handleUpdate(field, value)` | `function` | Update a single field |
| `handleDelete()` | `function` | Delete the task |
| `handleResolveConflict()` | `function` | Force-overwrite on conflict |
| `fetchTaskDetails()` | `function` | Re-fetch from server |

---

## 5. Task Comments Hook

**File:** `hooks/use-task/use-task-comments.ts`

**Purpose:** Handles comments — add, edit, delete, and emoji reactions.

### Architecture

```mermaid
flowchart TD
    subgraph "State"
        NEW["newComment: string"]
    end

    subgraph "Add Comment"
        ADD["handleAddComment()"] --> ONLINE{"isOnline?"}
        ONLINE -->|No| QUEUE["addAction(ADD_COMMENT) + optimistic setTask"]
        ONLINE -->|Yes| API["addComment(taskId, content)"]
        API --> OK{"Success?"}
        OK -->|Yes| TOAST["Toast with Undo"]
        OK -->|No| ERR["Toast error"]
    end

    subgraph "Edit Comment"
        EDIT["handleEditComment(id, content)"] --> CHECK["isCommentEditable()"]
        CHECK --> AGE{"Age < 5 min OR admin/manager?"}
        AGE -->|Yes| API_EDIT["editComment(id, content)"]
        AGE -->|No| REJECT["Reject"]
    end

    subgraph "Delete Comment"
        DEL["handleDeleteComment(id)"] --> CONFIRM["confirm()"]
        CONFIRM --> API_DEL["deleteComment(id)"]
        API_DEL --> OK_DEL{"Success?"}
        OK_DEL -->|Yes| TOAST_DEL["Toast with Undo"]
    end

    subgraph "Reactions"
        REACT["handleToggleReaction(commentId, emoji)"] --> FIND{"Existing reaction?"}
        FIND -->|Yes| DEL_R["delete reaction"]
        FIND -->|No| ADD_R["create reaction"]
    end
```

### Comment Edit Window

```mermaid
flowchart LR
    CREATE["Comment created"] --> TIMER["5 minute window"]
    TIMER -->|"Within 5 min"| EDIT_OK["Member can edit"]
    TIMER -->|"After 5 min"| EDIT_NO["Only admin/manager can edit"]
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `newComment` | `string` | Comment input value |
| `setNewComment` | `function` | Set input value |
| `handleAddComment()` | `function` | Add a new comment |
| `handleDeleteComment(id)` | `function` | Delete a comment |
| `handleEditComment(id, content)` | `function` | Edit a comment |
| `handleToggleReaction(commentId, emoji)` | `function` | Toggle emoji reaction |
| `isCommentEditable(comment)` | `function` | Check if comment can be edited |

---

## 6. Task Checklist Hook

**File:** `hooks/use-task/use-task-checklist.ts`

**Purpose:** Full CRUD for checklists and checklist items.

### Architecture

```mermaid
flowchart TD
    subgraph "State"
        NEW_ITEM["newChecklistItem: string"]
        EDIT_ID["editingItemId: string | null"]
        EDIT_CONTENT["editingContent: string"]
    end

    subgraph "Checklist Operations"
        ADD_CL["handleAddChecklist(title?)"] --> API_CL["addChecklist(taskId, title)"]
        API_CL --> OK_CL{"Success?"}
        OK_CL -->|Yes| TOAST_CL["Toast with Undo"]
        DEL_CL["handleDeleteChecklist(id)"] --> CONFIRM_CL["confirm()"]
        CONFIRM_CL --> API_DEL_CL["deleteChecklist(id)"]
    end

    subgraph "Item Operations"
        ADD_ITEM["handleAddChecklistItem(checklistId?)"] --> HAS_CL{"Has checklist?"}
        HAS_CL -->|No| AUTO["Auto-create 'Task Checklist'"]
        HAS_CL -->|Yes| USE["Use specified checklist"]
        AUTO --> API_ITEM["addChecklistItem(taskId, content)"]
        USE --> API_ITEM
        API_ITEM --> OK_ITEM{"Success?"}
        OK_ITEM -->|Yes| TOAST_ITEM["Toast with Undo"]

        TOGGLE["handleToggleChecklistItem(id, isCompleted)"] --> API_TOGGLE["toggleChecklistItem(id, isCompleted)"]
        API_TOGGLE --> OK_TOGGLE["Optimistic update + Toast with Undo"]

        DEL_ITEM["handleDeleteChecklistItem(id)"] --> API_DEL_ITEM["deleteChecklistItem(id)"]
        API_DEL_ITEM --> OK_DEL_ITEM["Optimistic update + Toast with Undo"]

        EDIT["handleStartEdit(id, content)"] --> SET_STATE["Set editingItemId + editingContent"]
        SAVE["handleSaveEdit(id)"] --> API_SAVE["updateChecklistItem(id, content)"]
    end
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `newChecklistItem` | `string` | New item input value |
| `editingItemId` | `string \| null` | Currently editing item ID |
| `editingContent` | `string` | Edit input value |
| `handleAddChecklist(title?)` | `function` | Create checklist |
| `handleDeleteChecklist(id)` | `function` | Delete checklist |
| `handleAddChecklistItem(checklistId?)` | `function` | Add item (auto-creates checklist if none) |
| `handleToggleChecklistItem(id, isCompleted)` | `function` | Toggle checkbox |
| `handleDeleteChecklistItem(id)` | `function` | Delete item |
| `handleStartEdit(id, content)` | `function` | Start inline editing |
| `handleSaveEdit(id)` | `function` | Save edited item |

---

## 7. Task Attachments Hook

**File:** `hooks/use-task/use-task-attachments.ts`

**Purpose:** Upload and delete file attachments.

### Architecture

```mermaid
flowchart TD
    subgraph "State"
        UPLOADING["isUploading: boolean"]
    end

    subgraph "Upload Flow"
        SELECT["User selects file"] --> SIZE{"Size <= 10MB?"}
        SIZE -->|No| ERR["Toast: 'File size exceeds 10MB'"]
        SIZE -->|Yes| READ["FileReader.readAsDataURL(file)"]
        READ --> LOAD["onloadend fires"]
        LOAD --> API["addAttachment(taskId, name, type, size, url)"]
        API --> OK{"Success?"}
        OK -->|Yes| TOAST["Toast with Undo + optimistic setTask"]
        OK -->|No| ERR_API["Toast error"]
    end

    subgraph "Delete Flow"
        DEL["handleDeleteAttachment(id)"] --> CONFIRM["confirm()"]
        CONFIRM --> API_DEL["deleteAttachment(id)"]
        API_DEL --> OK_DEL{"Success?"}
        OK_DEL -->|Yes| TOAST_DEL["Toast with Undo"]
    end
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `isUploading` | `boolean` | Upload in progress |
| `handleUpload(event)` | `function` | Handle file input change |
| `handleDeleteAttachment(id)` | `function` | Delete attachment |

---

## 8. Task Tags Hook

**File:** `hooks/use-task/use-task-tags.ts`

**Purpose:** Add and remove tags from tasks. Fetches available board tags automatically.

### Architecture

```mermaid
flowchart TD
    subgraph "State"
        TAGS["boardTags: Tag[]"]
    end

    subgraph "Fetch Tags"
        TRIGGER["task.column.boardId changes"] --> FETCH["getBoardTags(boardId)"]
        FETCH --> SET["setBoardTags(data)"]
    end

    subgraph "Add Tag"
        ADD["handleAddTag(tagId)"] --> API["addTagToTask(taskId, tagId)"]
        API --> OK{"Success?"}
        OK -->|Yes| TOAST["Toast with Undo + optimistic setTask"]
        OK -->|No| ERR["Toast error"]
    end

    subgraph "Remove Tag"
        RM["handleRemoveTag(tagId)"] --> API_RM["removeTagFromTask(taskId, tagId)"]
        API_RM --> OK_RM{"Success?"}
        OK_RM -->|Yes| TOAST_RM["Toast with Undo + optimistic setTask"]
    end
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `boardTags` | `Tag[]` | All tags available on this board |
| `handleAddTag(tagId)` | `function` | Add tag to task |
| `handleRemoveTag(tagId)` | `function` | Remove tag from task |

---

## 9. Task Time Hook

**File:** `hooks/use-task/use-task-time.ts`

**Purpose:** Log, edit, and delete time entries. Duration stored in **minutes**.

### Architecture

```mermaid
flowchart TD
    subgraph "State"
        ENTRIES["timeEntries: TimeEntry[]"]
        LOGGING["isLoggingTime: boolean"]
        DURATION["timeDuration: string"]
        DESC["timeDescription: string"]
        EDIT_ID["editingEntryId: string | null"]
        EDIT_DUR["editDuration: string"]
        EDIT_DESC["editDescription: string"]
    end

    subgraph "Fetch"
        OPEN["isOpen = true"] --> FETCH["getTimeEntries(taskId)"]
        FETCH --> SET["setTimeEntries(data)"]
    end

    subgraph "Log Time"
        LOG["handleLogTime()"] --> VALID{"duration > 0?"}
        VALID -->|No| ERR["Toast: 'Invalid duration'"]
        VALID -->|Yes| API["logTime(taskId, duration, description)"]
        API --> OK{"Success?"}
        OK -->|Yes| TOAST["Toast with Undo + reset form"]
    end

    subgraph "Edit Time Entry"
        START["startEdit(entry)"] --> SET_EDIT["Set editingEntryId + values"]
        SAVE["handleUpdateTimeEntry()"] --> VALID_DUR{"duration > 0?"}
        VALID_DUR -->|Yes| API_EDIT["updateTimeEntry(entryId, duration, desc)"]
        API_EDIT --> OK_EDIT["Refresh entries + clear edit state"]
        CANCEL["cancelEdit()"] --> CLEAR["Clear edit state"]
    end

    subgraph "Delete Time Entry"
        DEL["handleDeleteTimeEntry(id)"] --> CONFIRM["confirm()"]
        CONFIRM --> API_DEL["deleteTimeEntry(id)"]
        API_DEL --> OK_DEL["Remove from state"]
    end
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `timeEntries` | `TimeEntry[]` | All time entries for task |
| `isLoggingTime` | `boolean` | Log time form open |
| `timeDuration` | `string` | Duration input (minutes) |
| `timeDescription` | `string` | Description input |
| `isLoading` | `boolean` | Fetching entries |
| `editingEntryId` | `string \| null` | Currently editing entry |
| `editDuration` | `string` | Edit duration input |
| `editDescription` | `string` | Edit description input |
| `handleLogTime()` | `function` | Log new time entry |
| `startEdit(entry)` | `function` | Start editing entry |
| `cancelEdit()` | `function` | Cancel editing |
| `handleUpdateTimeEntry()` | `function` | Save edited entry |
| `handleDeleteTimeEntry(id)` | `function` | Delete time entry |
| `refreshTimeEntries()` | `function` | Re-fetch from server |

---

## 10. Task Reviews Hook

**File:** `hooks/use-task/use-task-reviews.ts`

**Purpose:** Submit tasks for review and complete reviews (approve/request changes/reject).

### Architecture

```mermaid
flowchart TD
    subgraph "State"
        SUBMITTING["isSubmittingReview: boolean"]
        REVIEWER["selectedReviewer: string"]
        FEEDBACK["reviewFeedback: string"]
    end

    subgraph "Submit for Review"
        SUBMIT["handleSubmitReview()"] --> CHECK{"Reviewer selected?"}
        CHECK -->|No| ERR["Toast: 'Select a reviewer'"]
        CHECK -->|Yes| API["submitForReview(taskId, reviewerId)"]
        API --> OK{"Success?"}
        OK -->|Yes| TOAST["Toast with Undo + reset form"]
    end

    subgraph "Complete Review"
        COMPLETE["handleCompleteReview(status)"] --> FEEDBACK_CHK{"Changes/Rejected + no feedback?"}
        FEEDBACK_CHK -->|Yes| ERR_FB["Toast: 'Please provide feedback'"]
        FEEDBACK_CHK -->|No| FIND["Find PENDING review"]
        FIND --> NOT_FOUND{"Review found?"}
        NOT_FOUND -->|No| RETURN["Return silently"]
        NOT_FOUND -->|Yes| API_COMP["completeReview(id, status, feedback)"]
        API_COMP --> OK_COMP{"Success?"}
        OK_COMP -->|Yes| TOAST_COMP["Toast with Undo + reset feedback"]
    end
```

### Review Flow

```mermaid
sequenceDiagram
    participant Creator as Task Creator
    participant Hook as useTaskReviews
    participant Server as submitForReview()
    participant Reviewer as Assigned Reviewer
    participant Complete as completeReview()

    Creator->>Hook: Select reviewer, click Submit
    Hook->>Server: submitForReview(taskId, reviewerId)
    Server-->>Hook: (success: true, review)
    Hook->>Hook: Toast: "Submitted for review" + Undo

    Reviewer->>Hook: Select status (APPROVED/CHANGES/REJECTED)
    Hook->>Complete: completeReview(reviewId, status, feedback)
    Note over Complete: Auto-moves task to appropriate column
    Complete-->>Hook: (success: true, review)
    Hook->>Hook: Toast: "Review completed: APPROVED" + Undo
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `isSubmittingReview` | `boolean` | Submit form open |
| `selectedReviewer` | `string` | Selected reviewer ID |
| `reviewFeedback` | `string` | Feedback text |
| `handleSubmitReview()` | `function` | Submit task for review |
| `handleCompleteReview(status)` | `function` | Complete review (APPROVED/CHANGES_REQUESTED/REJECTED) |

---

## 11. Task Activity Hook

**File:** `hooks/use-task/use-task-activity.ts`

**Purpose:** Displays the audit log for a task. Refreshes automatically on board events.

### Architecture

```mermaid
flowchart TD
    subgraph "State"
        LOG["activityLog: any[]"]
        FILTER["activityFilter: string"]
        LOADING["isLoading: boolean"]
    end

    subgraph "Fetch"
        OPEN["isOpen = true"] --> FETCH["getTaskActivityLog(taskId)"]
        FETCH --> SET["setActivityLog(data)"]
    end

    subgraph "Real-Time Refresh"
        EVENT["Board event received"] --> MATCH{"Event taskId matches?"}
        MATCH -->|Yes| REFRESH["fetchActivityLog()"]
        MATCH -->|No| IGNORE["Ignore"]
    end

    subgraph "Filter"
        FILTER_VAL{"activityFilter value"}
        FILTER_VAL -->|"all"| SHOW_ALL["Show all logs"]
        FILTER_VAL -->|"CREATE_TASK"| SHOW_CREATE["Show only CREATE_TASK"]
        FILTER_VAL -->|"UPDATE_TASK"| SHOW_UPDATE["Show only UPDATE_TASK"]
        FILTER_VAL -->|other| SHOW_SPECIFIC["Show only matching action"]
    end
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `activityLog` | `any[]` | All audit log entries for task |
| `filteredActivityLog` | `any[]` | Filtered by action type |
| `activityFilter` | `string` | Current filter value |
| `setActivityFilter` | `function` | Change filter |
| `isLoading` | `boolean` | Fetching logs |
| `refreshActivity()` | `function` | Re-fetch from server |

---

## 12. Mobile Hook

**File:** `hooks/use-mobile.ts`

**Purpose:** Detects if the viewport is below 768px (mobile breakpoint).

### Architecture

```mermaid
flowchart TD
    START["Hook mounts"] --> MQL["window.matchMedia(max-width: 767px)"]
    MQL --> CHECK["Check window.innerWidth"]
    CHECK --> SET["setIsMobile(width < 768)"]
    SET --> LISTEN["Add 'change' listener"]
    LISTEN --> RESIZE["Window resized"]
    RESIZE --> UPDATE["setIsMobile(new width < 768)"]
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `useIsMobile()` | `boolean` | `true` if viewport < 768px |

---

## 13. Hook Dependency Graph

```mermaid
graph TB
    subgraph "Board Page"
        KANBAN["use-kanban-board.ts"]
        KANBAN -->|"uses"| SOCKET["useSocket()"]
        KANBAN -->|"uses"| BOARD_EVENTS["useBoardEvents()"]
        KANBAN -->|"uses"| OFFLINE["useOfflineStore"]
    end

    subgraph "Task Detail Dialog"
        DETAILS["use-task-details.ts"]
        COMMENTS["use-task-comments.ts"]
        CHECKLIST["use-task-checklist.ts"]
        ATTACH["use-task-attachments.ts"]
        TAGS["use-task-tags.ts"]
        TIME["use-task-time.ts"]
        REVIEWS["use-task-reviews.ts"]
        ACTIVITY["use-task-activity.ts"]

        DETAILS -->|"uses"| OFFLINE
        COMMENTS -->|"uses"| OFFLINE
        ACTIVITY -->|"uses"| BOARD_EVENTS
    end

    subgraph "Notification Bell"
        BELL["useNotificationListener()"]
        BELL -->|"uses"| SOCKET
    end

    subgraph "Layout / Sidebar"
        MOBILE["useIsMobile()"]
    end

    DETAILS -.->|"shares task state"| COMMENTS
    DETAILS -.->|"shares task state"| CHECKLIST
    DETAILS -.->|"shares task state"| ATTACH
    DETAILS -.->|"shares task state"| TAGS
    DETAILS -.->|"shares task state"| REVIEWS
    DETAILS -.->|"provides fetchTaskDetails"| COMMENTS
    DETAILS -.->|"provides fetchTaskDetails"| CHECKLIST
    DETAILS -.->|"provides fetchTaskDetails"| ATTACH
    DETAILS -.->|"provides fetchTaskDetails"| TAGS
    DETAILS -.->|"provides fetchTaskDetails"| REVIEWS
```

---

## 14. Common Patterns

### Pattern 1: Server Action + Optimistic Update + Undo

Every task sub-hook follows this pattern:

```mermaid
flowchart TD
    ACTION["User triggers action"] --> ONLINE{"isOnline?"}
    ONLINE -->|No| QUEUE["Queue in IndexedDB + optimistic UI update"]
    ONLINE -->|Yes| API["Call server action"]
    API --> SUCCESS{"result.success?"}
    SUCCESS -->|Yes| OPTIMISTIC["Update local state"]
    OPTIMISTIC --> TOAST["Toast with Undo button"]
    TOAST --> UNDO["onClick: undoLastAction() + re-fetch"]
    SUCCESS -->|No| ERR["Toast error"]
```

### Pattern 2: Fetch on Open

Task sub-hooks fetch their data when the detail dialog opens:

```mermaid
flowchart TD
    OPEN["isOpen = true"] --> CHECK{"taskId exists?"}
    CHECK -->|Yes| FETCH["Call server action"]
    FETCH --> SET["Set state with data"]
    CHECK -->|No| SKIP["Do nothing"]
```

### Pattern 3: Shared Task State

All task sub-hooks receive the same props:

```
{
  taskId: string | null
  task: Task | null
  setTask: Dispatch<SetStateAction<Task | null>>
  fetchTaskDetails: () => Promise<void>
  currentUser: User          (comments, reviews only)
}
```

This means they all operate on the **same task object** in memory. When one hook updates the task, all others see the change immediately.

### Pattern 4: Conflict Resolution

Hooks that modify tasks handle version conflicts:

```mermaid
flowchart TD
    UPDATE["updateTask(field, value, version)"] --> SERVER["Server checks version"]
    SERVER --> MATCH{"clientVersion === serverVersion?"}
    MATCH -->|Yes| OK["Update succeeds, version++"]
    MATCH -->|No| CONFLICT["Return conflict error"]
    CONFLICT --> DIALOG["Show conflict dialog"]
    DIALOG --> FORCE["updateTask(field, value, version: undefined)"]
    FORCE --> OK_FORCE["Force update, version++"]
```

### Pattern 5: Real-Time Refresh

The activity hook subscribes to board events to stay fresh:

```mermaid
flowchart TD
    HOOK["useTaskActivity mounts"] --> SUB["useBoardEvents(boardId, handler)"]
    SUB --> EVENT["Board event received"]
    EVENT --> MATCH{"Event taskId matches current task?"}
    MATCH -->|Yes| FETCH["fetchActivityLog()"]
    MATCH -->|No| IGNORE["No-op"]
```

---

## Quick Reference Table

| Hook | File | Lines | State Variables | Handlers | Offline Support |
|------|------|-------|-----------------|----------|-----------------|
| `useSocket` | `socket-hooks.ts` | 78 | 4 | 0 | No |
| `useBoardEvents` | `socket-hooks.ts` | 33 | 0 | 0 | No |
| `useNotificationListener` | `socket-hooks.ts` | 21 | 0 | 0 | No |
| `use-kanban-board` | `hooks/` | 457 | 7 | 6 | Yes |
| `use-task-details` | `hooks/use-task/` | 189 | 5 | 3 | Yes |
| `use-task-comments` | `hooks/use-task/` | 157 | 1 | 5 | Yes |
| `use-task-checklist` | `hooks/use-task/` | 275 | 3 | 7 | No |
| `use-task-attachments` | `hooks/use-task/` | 115 | 1 | 2 | No |
| `use-task-tags` | `hooks/use-task/` | 100 | 1 | 2 | No |
| `use-task-time` | `hooks/use-task/` | 153 | 7 | 5 | No |
| `use-task-reviews` | `hooks/use-task/` | 113 | 3 | 2 | No |
| `use-task-activity` | `hooks/use-task/` | 61 | 3 | 1 | No |
| `useIsMobile` | `hooks/` | 19 | 1 | 0 | No |
