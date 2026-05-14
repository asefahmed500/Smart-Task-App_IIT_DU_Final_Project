# SmartTask — Real-Time System (Socket.IO)

## Table of Contents

- [Overview](#overview)
- [Architecture Diagram](#architecture-diagram)
- [Server Architecture](#server-architecture)
- [Client Architecture](#client-architecture)
- [Board Rooms & Presence](#board-rooms--presence)
- [Event Reference](#event-reference)
- [Editing Indicators](#editing-indicators)
- [Background Worker](#background-worker)
- [Production Deployment](#production-deployment)
- [File Map](#file-map)

---

## Overview

SmartTask uses a **standalone Socket.IO server** running on a separate process (port 3001) from the Next.js app (port 3002). This is necessary because Vercel's serverless environment cannot maintain persistent WebSocket connections. The socket server is **self-contained**: it has its own Prisma client, its own pg.Pool, and does NOT import from any `@/` paths.

---

## Architecture Diagram

```mermaid
graph TB
    subgraph "Browser Tabs"
        TAB1["Tab 1<br/>Board abc123"]
        TAB2["Tab 2<br/>Board abc123"]
        TAB3["Tab 3<br/>Board xyz789"]
    end

    subgraph "Next.js Server (Port 3002)"
        ACTIONS["Server Actions<br/>(mutations)"]
        EMITTER["socket-emitter.ts<br/>(Socket.IO client)"]
    end

    subgraph "Socket.IO Server (Port 3001)"
        IO["Socket.IO Server<br/>src/socket/server.ts"]
        ROOMS["Board Rooms<br/>board:abc123<br/>board:xyz789"]
        USER_ROOMS["User Rooms<br/>user:u1<br/>user:u2"]
        PRESENCE_MAP["Presence Tracking<br/>(boardId → users[])"]
        EDITING_MAP["Editing Tracking<br/>(taskId → editors[])"]
        WORKER["Background Worker<br/>(60s interval)"]
    end

    subgraph "Database"
        DB[("PostgreSQL<br/>(own Prisma + pg.Pool)")]
    end

    TAB1 -->|"WebSocket"| IO
    TAB2 -->|"WebSocket"| IO
    TAB3 -->|"WebSocket"| IO
    ACTIONS -->|"emit event"| EMITTER
    EMITTER -->|"Socket.IO client"| IO

    IO --> ROOMS
    IO --> USER_ROOMS
    IO --> PRESENCE_MAP
    IO --> EDITING_MAP
    IO --> WORKER
    WORKER --> DB
```

---

## Server Architecture

```mermaid
flowchart TD
    subgraph "src/socket/server.ts (Standalone Process)"
        START["Startup"]
        DOTENV["Load .env.local (dev)<br/>or .env (prod)"]
        POOL["Create pg.Pool<br/>(max: 5 connections)"]
        PRISMA["Create PrismaClient<br/>(with PrismaPg adapter)"]
        HTTP["Create HTTP server<br/>GET / → 'Socket.IO server running'<br/>GET /health → {status, uptime}"]
        IO["Create Socket.IO Server<br/>(CORS from ALLOWED_ORIGIN)"]

        START --> DOTENV --> POOL --> PRISMA --> HTTP --> IO

        subgraph "Connection Handling"
            CONNECT["io.on('connection')"]
            JOIN["join-board → join room,<br/>update presence"]
            LEAVE["leave-board → leave room,<br/>update presence"]
            REGISTER["register-user → join user room"]
            RELAY["Relay board events<br/>to board room"]
            NOTIF["Relay notifications<br/>to user room"]
            DISCONNECT["disconnect → cleanup"]
        end

        subgraph "Background Jobs"
            INTERVAL["setInterval(60s)"]
            OVERDUE["Overdue check"]
            DUE["Due date reminder"]
            CLEANUP["90-day audit log cleanup<br/>(at midnight only)"]
        end

        IO --> CONNECT
        CONNECT --> JOIN
        CONNECT --> LEAVE
        CONNECT --> REGISTER
        CONNECT --> RELAY
        CONNECT --> NOTIF
        CONNECT --> DISCONNECT
        INTERVAL --> OVERDUE
        INTERVAL --> DUE
        INTERVAL --> CLEANUP
    end
```

### Key Startup Details

- **Port selection:** `process.env.PORT` → `process.env.SOCKET_PORT` → `3001` (Railway auto-injects PORT)
- **CORS:** Reads `ALLOWED_ORIGIN` (comma-separated), defaults to `['*']`
- **SSL:** Auto-detects Supabase URLs and adds `ssl: { rejectUnauthorized: false }`
- **Pool size:** 5 connections (vs 20 in the Next.js Prisma client)
- **Health endpoint:** `GET /health` returns `{"status":"ok","uptime":...}` — required for Railway health checks

---

## Client Architecture

There are **two Socket.IO clients** in the system:

### 1. Server-side emitter (`utils/socket-emitter.ts`)

```mermaid
flowchart LR
    ACTION["Server Action"] -->|"calls"| EMIT["emitBoardEvent()<br/>or emitNotification()"]
    EMIT --> SOCKET["Singleton Socket.IO Client"]
    SOCKET -->|"connects to"| SERVER["Socket.IO Server<br/>:3001"]
```

- Used by server actions to emit events after database commits
- **Lazy singleton** — created on first use
- Connects to `NEXT_PUBLIC_SOCKET_URL` (default `http://localhost:3001`)
- Uses both `websocket` and `polling` transports

### 2. Browser hooks (`components/kanban/socket-hooks.ts`)

```mermaid
flowchart LR
    HOOK["useSocket()"] -->|"creates"| CLIENT["Module-level<br/>Socket.IO Client"]
    CLIENT -->|"WebSocket"| SERVER["Socket.IO Server<br/>:3001"]

    HOOK -->|"returns"| API["socket, isConnected,<br/>presence, editingTasks"]
```

- **Module-level singleton** — one connection shared across all hook instances
- `useMemo` for user prop to prevent infinite re-renders
- Manages board room join/leave lifecycle
- Cleanup on unmount via ref tracking

---

## Board Rooms & Presence

```mermaid
sequenceDiagram
    participant UserA as User A
    participant UserB as User B
    participant Server as Socket.IO Server

    UserA->>Server: join-board {boardId: "abc", user: {id, name, image}}
    Server->>Server: socket.join("board:abc")
    Server->>Server: Store socket.data.user = user
    Server->>UserA: presence:update [{id: "u1", name: "User A"}]
    Server->>UserA: presence:update (broadcast to room)

    UserB->>Server: join-board {boardId: "abc", user: {id, name, image}}
    Server->>Server: socket.join("board:abc")
    Server->>UserA: presence:update [{id: "u1"}, {id: "u2"}]
    Server->>UserB: presence:update [{id: "u1"}, {id: "u2"}]

    Note over UserA: User A navigates away

    UserA->>Server: leave-board "abc"
    Server->>Server: socket.leave("board:abc")
    Server->>UserB: presence:update [{id: "u2"}]
```

### Presence Tracking

The server maintains presence by scanning all sockets in a board room on every join/leave/disconnect:

```typescript
function getUsersInBoard(boardId: string) {
  const roomName = `board:${boardId}`
  const sockets = io.sockets.adapter.rooms.get(roomName)
  const users = new Map()
  for (const socketId of sockets) {
    const s = io.sockets.sockets.get(socketId)
    if (s?.data.user) users.set(s.data.user.id, s.data.user)
  }
  return Array.from(users.values())
}
```

Users are deduplicated by ID (same user in multiple tabs counts once).

---

## Event Reference

### Board Events (server action → emitter → server → broadcast)

| Event | Payload | Emitted By |
|-------|---------|-----------|
| `task:created` | `{boardId, task}` | `createTask()` |
| `task:updated` | `{boardId, taskId, task?}` | `updateTask()`, comment/checklist/attachment ops |
| `task:moved` | `{boardId, taskId, newColumnId, oldColumnId, task}` | `updateTaskStatus()` |
| `task:deleted` | `{boardId, taskId}` | `deleteTask()` |
| `column:created` | `{boardId, columnId, column?}` | `createColumn()` |
| `column:updated` | `{boardId, columnId}` | `updateColumn()`, `updateColumnWipLimit()` |
| `column:deleted` | `{boardId, columnId}` | `deleteColumn()` |
| `columns:reordered` | `{boardId, columnIds}` | `reorderColumns()` |
| `board:updated` | `{boardId, name}` | `updateBoard()` |
| `board:deleted` | `{boardId}` | `deleteBoard()` |
| `board:member_added` | `{boardId, userId}` | `addBoardMember()` |
| `board:member_removed` | `{boardId, userId}` | `removeBoardMember()` |
| `tag:created` | `{boardId, tagId}` | `createTag()` |
| `tag:deleted` | `{boardId, tagId}` | `deleteTag()` |

### Notification Events

| Event | Payload | Direction |
|-------|---------|-----------|
| `notification` | `{userId, type, message, link, notificationId}` | Emitter → Server → User room |
| `register-user` | `userId` (string) | Browser → Server |

### Presence Events

| Event | Payload | Direction |
|-------|---------|-----------|
| `join-board` | `{boardId, user: {id, name, image}}` | Browser → Server |
| `leave-board` | `boardId` (string) | Browser → Server |
| `presence:update` | `PresenceUser[]` | Server → Board room |

### Editing Events

| Event | Payload | Direction |
|-------|---------|-----------|
| `task:editing` | `{boardId, taskId, user}` | Browser → Server → Board room |
| `task:stop-editing` | `{boardId, taskId, userId}` | Browser → Server → Board room |
| `editing:update` | `{taskId, editors: PresenceUser[]}` | Server → Board room |

---

## Editing Indicators

The server tracks who is editing which task in memory:

```mermaid
flowchart TD
    START["task:editing {taskId, user}"] --> MAP["editingTasks Map<br/>taskId → Map&lt;userId, PresenceUser&gt;"]
    MAP --> EMIT["Emit editing:update<br/>to board room"]
    EMIT --> UI["Other browsers show<br/>'User X is editing...'"]

    STOP["task:stop-editing {taskId, userId}"] --> RM["Remove user from map"]
    RM --> CLEANUP{"Map empty?"}
    CLEANUP -->|Yes| DELETE["Delete taskId key"]
    CLEANUP -->|No| KEEP["Keep key"]
    DELETE --> EMIT2["Emit updated editors"]
    KEEP --> EMIT2

    DISCONNECT["Socket disconnect"] --> SCAN["Scan all editingTasks<br/>for this user"]
    SCAN --> REMOVE["Remove user from all tasks"]
    REMOVE --> NOTIFY["Emit editing:update<br/>for each affected task"]
```

---

## Background Worker

```mermaid
flowchart TD
    TIMER["setInterval(60,000ms)"] --> RUN["runBackgroundChecks()"]

    RUN --> OVERDUE["Find overdue tasks<br/>(dueDate < now, NOT in Done column)"]
    OVERDUE --> O_LOOP["For each task with assignee"]
    O_LOOP --> O_DEDUP["Already sent OVERDUE today?"]
    O_DEDUP -->|No| O_CREATE["Create notification + emit"]
    O_DEDUP -->|Yes| O_SKIP["Skip"]

    RUN --> UPCOMING["Find tasks due in next 24h"]
    UPCOMING --> U_LOOP["For each task with assignee"]
    U_LOOP --> U_DEDUP["Already sent DUE_DATE_REMINDER?"]
    U_DEDUP -->|No| U_CREATE["Create notification + emit"]
    U_DEDUP -->|Yes| U_SKIP["Skip"]

    RUN --> MIDNIGHT{"Hour = 0, Minute = 0?"}
    MIDNIGHT -->|Yes| CLEANUP["Delete audit logs older than 90 days"]
    MIDNIGHT -->|No| DONE["Done"]
```

The worker runs inline on the Socket.IO server process. No external cron service needed.

---

## Production Deployment

```mermaid
graph LR
    subgraph "Vercel"
        NEXT["Next.js App<br/>(serverless functions)"]
        EMIT["socket-emitter.ts<br/>(Socket.IO client)"]
    end

    subgraph "Railway"
        SOCKET["Socket.IO Server<br/>src/socket/server.ts"]
        HEALTH["GET /health<br/>(Railway health check)"]
    end

    subgraph "Supabase"
        DB[("PostgreSQL")]
    end

    NEXT -->|"Server actions"| EMIT
    EMIT -->|"WebSocket"| SOCKET
    NEXT -->|"Prisma queries"| DB
    SOCKET -->|"Prisma queries"| DB
    RAILWAY_CHECK["Railway<br/>Health Check"] -->|"HTTP GET"| HEALTH
```

**Railway configuration:**
- `railway.toml` sets `NIXPACKS_NODE_VERSION=22`
- Railway auto-injects `PORT` env var — the server reads it first
- Do NOT manually set `PORT` in Railway env vars
- `/health` endpoint is required for Railway to mark deployment as healthy

---

## File Map

| File | Role |
|------|------|
| `src/socket/server.ts` | Standalone Socket.IO server (own Prisma, own pg pool, background worker) |
| `utils/socket-emitter.ts` | Socket.IO **client** used by server actions to emit events |
| `components/kanban/socket-hooks.ts` | Browser hooks: `useSocket`, `useBoardEvents`, `useNotificationListener`, `emitTaskMoved/Created/Updated/Deleted` |
| `hooks/use-kanban-board.ts` | Consumes socket events for optimistic board state updates |
| `components/notification-bell.tsx` | Uses `useNotificationListener` for real-time badge updates |
