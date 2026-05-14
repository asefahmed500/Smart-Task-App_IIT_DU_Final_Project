# SmartTask — Offline Queue System

## Table of Contents

- [Overview](#overview)
- [Architecture Diagram](#architecture-diagram)
- [Offline Detection](#offline-detection)
- [Action Queue Flow](#action-queue-flow)
- [Zustand Store](#zustand-store)
- [Sync on Reconnect](#sync-on-reconnect)
- [Retry & Failure Handling](#retry--failure-handling)
- [File Map](#file-map)

---

## Overview

SmartTask supports **offline-first task operations**. When the browser loses connectivity, mutations (move task, create task, edit task, add comment) are queued in **IndexedDB** and replayed when connectivity returns. The system uses a Zustand store for reactive UI state and an OfflineProvider component for online/offline detection.

---

## Architecture Diagram

```mermaid
graph TB
    subgraph "Browser"
        PROVIDER["OfflineProvider (online/offline events)"]
        ZUSTAND["useOfflineStore (Zustand)"]
        IDB["IndexedDB 'smart-task-db' 'action-queue' store"]
        UI["Kanban Board UI (use-kanban-board.ts)"]
    end

    subgraph "Sync Engine"
        SYNC["offline-sync.ts (maps queue to server actions)"]
        ACTIONS["Server Actions (createTask, updateTaskStatus, etc.)"]
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

---

## Offline Detection

```mermaid
sequenceDiagram
    participant Browser as Browser Events
    participant Provider as OfflineProvider
    participant Zustand as useOfflineStore
    participant IndexedDB as IndexedDB

    Browser->>Provider: window.addEventListener('online')
    Browser->>Provider: window.addEventListener('offline')

    Note over Provider: On mount

    Provider->>Zustand: setOnline(navigator.onLine)
    Provider->>IndexedDB: initQueue() -> load pending actions
    Provider->>Zustand: Set queue from IndexedDB

    Note over Provider: User goes offline

    Browser->>Provider: 'offline' event
    Provider->>Zustand: setOnline(false)

    Note over Provider: User comes back online

    Browser->>Provider: 'online' event
    Provider->>Zustand: setOnline(true)
    Provider->>Provider: Sync queued actions
```

---

## Action Queue Flow

### Queuing a Mutation (Offline)

```mermaid
sequenceDiagram
    participant User as User (Drag)
    participant Hook as use-kanban-board
    participant Store as useOfflineStore
    participant IDB as IndexedDB
    participant Socket as Local Socket

    User->>Hook: Drag task to new column
    Hook->>Hook: isOnline? -> false

    Hook->>Store: addAction({type: 'MOVE_TASK', payload: {taskId, columnId, version}})
    Store->>IDB: addOfflineAction(action)
    IDB-->>Store: Saved action
    Store->>Store: Add to queue state

    Hook->>Socket: emitTaskMoved() (local broadcast)
    Note over Hook: Show toast: "Task moved locally (offline)"
```

### Supported Action Types

| Type | Payload | Server Action |
|------|---------|--------------|
| `MOVE_TASK` | `{taskId, columnId, statusName, version}` | `updateTaskStatus()` |
| `CREATE_TASK` | `{title, columnId, priority, ...}` | `createTask()` |
| `UPDATE_TASK` / `EDIT_TASK` | `{id, title?, description?, ...}` | `updateTask()` |
| `ADD_COMMENT` | `{taskId, content}` | `addComment()` |

### OfflineAction Schema

```typescript
interface OfflineAction {
  id: string          // crypto.randomUUID()
  type: "CREATE_TASK" | "MOVE_TASK" | "EDIT_TASK" | "ADD_COMMENT" | "UPDATE_TASK"
  payload: any        // Action-specific data
  timestamp: number   // Date.now()
  retryCount?: number // Incremented on retry failure
  errorMsg?: string   // Last error message
}
```

---

## Zustand Store

**File:** `lib/store/use-offline-store.ts`

```mermaid
flowchart TD
    subgraph "State"
        QUEUE["queue: OfflineAction[] (retryCount < 3)"]
        FAILED["failedActions: OfflineAction[] (retryCount >= 3)"]
        ONLINE["isOnline: boolean"]
    end

    subgraph "Actions"
        INIT["initQueue() - Load from IndexedDB"]
        ADD["addAction() - Queue + persist to IndexedDB"]
        REMOVE["removeAction() - Delete from IndexedDB + state"]
        UPDATE["updateAction() - Update retryCount/errorMsg"]
        CLEAR["clearQueue() - Delete all from IndexedDB"]
        RETRY["retryAction() - Reset retryCount to 0"]
        DISMISS["dismissFailed() - Remove from failed list"]
        SET_ONLINE["setOnline()"]
    end

    INIT --> QUEUE
    INIT --> FAILED
    ADD --> QUEUE
    REMOVE --> QUEUE
    UPDATE -->|"retryCount >= 3"| FAILED
    RETRY -->|"move back to queue"| QUEUE
    DISMISS --> FAILED
```

The store maintains two lists:
- **queue**: Actions with `retryCount < 3` (pending retry)
- **failedActions**: Actions with `retryCount ≥ 3` (permanently failed, user must dismiss or retry manually)

---

## Sync on Reconnect

**File:** `lib/offline-sync.ts`

```mermaid
flowchart TD
    START["syncOfflineAction(action)"] --> TYPE{"action.type?"}

    TYPE -->|MOVE_TASK| MOVE["updateTaskStatus(action.payload)"]
    TYPE -->|CREATE_TASK| CREATE["createTask(action.payload)"]
    TYPE -->|ADD_COMMENT| COMMENT["addComment(action.payload)"]
    TYPE -->|UPDATE_TASK / EDIT_TASK| EDIT["updateTask(action.payload)"]

    MOVE --> RESULT["Check result"]
    CREATE --> RESULT
    COMMENT --> RESULT
    EDIT --> RESULT

    RESULT --> SUCCESS{"success?"}
    SUCCESS -->|Yes| DELETE["deleteOfflineAction(id)"]
    SUCCESS -->|No| INCREMENT["updateAction(id, {retryCount: +1, errorMsg: result.error})"]
```

### Sync Flow

```mermaid
sequenceDiagram
    participant Provider as OfflineProvider
    participant Store as useOfflineStore
    participant Sync as offline-sync.ts
    participant Server as Server Action
    participant IDB as IndexedDB

    Note over Provider: 'online' event fires

    Provider->>Store: setOnline(true)
    Provider->>Store: Get queue

    loop For each action in queue
        Provider->>Sync: syncOfflineAction(action)
        Sync->>Server: Call appropriate server action

        alt Success
            Server-->>Sync: {success: true}
            Sync-->>Provider: Success
            Provider->>Store: removeAction(id)
            Store->>IDB: Delete from store
        else Failure
            Server-->>Sync: {success: false, error: "..."}
            Sync-->>Provider: Failure
            Provider->>Store: updateAction(id, {retryCount: +1})
            Store->>IDB: Update in store
        end
    end
```

---

## Retry & Failure Handling

```mermaid
flowchart TD
    ACTION["Queued Action"] --> ATTEMPT["Attempt sync"]
    ATTEMPT --> SUCCESS{"Success?"}

    SUCCESS -->|Yes| REMOVE["Remove from queue"]
    SUCCESS -->|No| INCREMENT["retryCount++"]

    INCREMENT --> CHECK{"retryCount >= 3?"}
    CHECK -->|No| KEEP["Stay in queue (will retry on next online)"]
    CHECK -->|Yes| FAIL["Move to failedActions"]

    FAIL --> USER["User sees failed action in UI"]
    USER --> RETRY_BTN["User clicks Retry"]
    RETRY_BTN --> RESET["retryCount = 0"]
    RESET --> ATTEMPT

    USER --> DISMISS_BTN["User clicks Dismiss"]
    DISMISS_BTN --> DELETE["Delete from IndexedDB"]
```

**Max retries:** 3 attempts before moving to `failedActions`. Users can manually retry or dismiss failed actions.

---

## File Map

| File | Responsibility |
|------|---------------|
| `lib/offline-db.ts` | IndexedDB wrapper: add/get/delete/update/clear actions |
| `lib/store/use-offline-store.ts` | Zustand store: queue state, online status, retry/dismiss logic |
| `lib/offline-sync.ts` | Maps queue action types to server action calls |
| `components/providers/offline-provider.tsx` | React provider: online/offline event listeners, triggers sync |
| `hooks/use-kanban-board.ts` | Checks `isOnline` before server calls, queues when offline |
