# SmartTask — Codebase Audit

> Full inventory of every source file, what it does, and which feature it belongs to.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [API Routes](#3-api-routes)
4. [Server Actions](#4-server-actions)
5. [Real-Time System (Socket.IO)](#5-real-time-system-socketio)
6. [Pages (App Router)](#6-pages-app-router)
7. [Kanban Board Components](#7-kanban-board-components)
8. [Task Detail Components](#8-task-detail-components)
9. [Dashboard Components](#9-dashboard-components)
10. [Admin Components](#10-admin-components)
11. [Other Components](#11-other-components)
12. [Custom Hooks](#12-custom-hooks)
13. [Library Layer (lib/)](#13-library-layer-lib)
14. [Utilities (utils/)](#14-utilities-utils)
15. [Types](#15-types)
16. [Database Schema](#16-database-schema)
17. [Configuration & Middleware](#17-configuration--middleware)
18. [Scripts](#18-scripts)
19. [UI Component Library](#19-ui-component-library)
20. [File Count Summary](#20-file-count-summary)

---

## 1. Architecture Overview

```
smart-task/
├── app/                    # Next.js App Router pages + API routes
│   ├── (auth)/             # Login, signup, password reset
│   ├── admin/              # Admin dashboard + user/board/log management
│   ├── manager/            # Manager dashboard + team/analytics
│   ├── member/             # Member dashboard + boards/logs/reports
│   ├── dashboard/          # Shared Kanban board view
│   ├── profile/            # User profile + notification prefs
│   └── api/                # REST endpoints (auth + notifications)
├── actions/                # Server actions (all mutations)
├── components/
│   ├── kanban/             # Board, columns, cards, drag-and-drop
│   ├── kanban/task-details/ # Task detail dialog sub-components
│   ├── admin/              # Admin-specific UI
│   ├── dashboard/          # Role-specific dashboard clients
│   ├── providers/          # Offline provider
│   └── ui/                 # shadcn primitives (28 components)
├── hooks/
│   ├── use-task/           # Task detail hooks (8 files)
│   └── use-kanban-board.ts # Board state + DnD logic
├── lib/                    # Server-side logic
│   ├── store/              # Zustand offline store
│   ├── auth.ts             # JWT encrypt/decrypt
│   ├── auth-server.ts      # Cookie session management
│   ├── prisma.ts           # DB client singleton
│   └── schemas.ts          # Zod validation schemas
├── utils/                  # Shared utilities
├── types/                  # TypeScript interfaces
├── src/socket/             # Standalone Socket.IO server
├── prisma/                 # Schema + seed
├── scripts/                # Diagnostic + setup scripts
└── proxy.ts                # Next.js middleware (auth + RBAC)
```

**Stack:** Next.js 16 · React 19 · Prisma v7 + PostgreSQL · Socket.IO · Tailwind CSS 4 · shadcn/radix-nova · Zustand · Zod v4

---

## 2. Authentication & Authorization

### `lib/auth.ts`
JWT cryptography using `jose` (HS256, 7-day expiry).
- `encrypt(payload)` — signs a JWT
- `decrypt(input)` — verifies and decodes a JWT
- `JWTPayload` interface — `{ id, email, name, image, role }`

### `lib/auth-server.ts` (`'use server'`)
Cookie-based session management. All cookie operations live here (not in route handlers — Turbopack fails to resolve `cookies()` directly in route files).
- `login(payload)` — sets `session` HTTP-only cookie (7-day expiry)
- `logout()` — clears session cookie
- `getSession()` — reads and decrypts session from cookie
- `updateSession(request)` — refreshes session cookie in middleware

### `proxy.ts` (Project Root — Next.js 16 Middleware)
Auth guards and RBAC redirects. Next.js 16 auto-detects `proxy.ts` instead of `middleware.ts`.
- Protected routes: `/dashboard`, `/boards`, `/settings`, `/admin`, `/manager`, `/member`
- Public routes: `/login`, `/signup`, `/`
- RBAC: `/admin` → ADMIN only, `/manager` → ADMIN+MANAGER, `/member` → all authenticated
- Redirects logged-in users away from `/login` and `/signup`

### `app/api/auth/login/route.ts`
`POST /api/auth/login` — Validates email/password against DB with bcrypt, creates JWT session, logs `LOGIN` audit event. Returns user object.

### `app/api/auth/logout/route.ts`
`POST /api/auth/logout` — Calls `logout()` from `auth-server.ts` to clear session cookie.

### `app/api/auth/signup/route.ts`
`POST /api/auth/signup` — Creates a MEMBER user with hashed password, default notification preferences, notifies admins of new signup, auto-logs in.

### `app/api/auth/me/route.ts`
`GET /api/auth/me` — Returns current session user or `{ user: null }`.

### `app/api/auth/reset-password/request/route.ts`
`POST /api/auth/reset-password/request` — Generates a crypto-random token (1-hour expiry), stores in `PasswordResetToken` table, sends reset email.

### `app/api/auth/reset-password/confirm/route.ts`
`POST /api/auth/reset-password/confirm` — Validates reset token, hashes new password, updates user, deletes token in a transaction.

### `actions/auth-actions.ts`
- `requestPasswordReset(email)` — Generates reset token, sends email
- `resetPassword(token, password)` — Validates token, updates password
- `updateProfile(data)` — Updates user name/avatar
- `getUserProfile()` — Returns current user profile
- `changePassword(data)` — Validates current password, sets new one

---

## 3. API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/login` | POST | Email/password login with JWT session |
| `/api/auth/logout` | POST | Clear session cookie |
| `/api/auth/me` | GET | Return current session user |
| `/api/auth/signup` | POST | Register new user + auto-login |
| `/api/auth/reset-password/request` | POST | Generate password reset token + email |
| `/api/auth/reset-password/confirm` | POST | Validate token + set new password |
| `/api/notifications/check` | POST | Run due-date reminders + overdue checks (cron) |

---

## 4. Server Actions

### `actions/board-actions.ts` (1250 lines)
Board CRUD, columns, members, tags, and the undo engine.
- `checkBoardPermission()` — Validates board membership + role (exported, reused by task-actions)
- `getBoardData()` — Fetches full board with columns, tasks, members, tags
- `createBoard()` — Creates board with default To Do/In Progress/Done columns (MEMBER blocked)
- `updateBoard()` / `deleteBoard()` — Board management
- `createColumn()` / `deleteColumn()` / `updateColumn()` / `reorderColumns()` — Column management
- `updateColumnWipLimit()` — Set WIP limit on a column
- `searchUsers()` — Search by name/email for member picker
- `addBoardMember()` / `removeBoardMember()` — Member management with notifications
- `createTag()` / `deleteTag()` / `getTagsForBoard()` — Board-scoped and global tags
- `undoLastAction()` — Comprehensive undo engine reversing ~30 action types from audit logs (30s window)

### `actions/task-actions.ts` (1493 lines)
Task CRUD plus comments, checklists, attachments, tags, time tracking, and reviews.
- `createTask()` — Creates task with audit log + automation trigger + assignee notification
- `updateTask()` — Updates with optimistic concurrency (version check)
- `updateTaskStatus()` — Moves task between columns with WIP limit enforcement (MANAGER/ADMIN bypass)
- `deleteTask()` — Stores full task in audit log for undo
- `getTaskDetails()` — Fetches task with all relations
- `addComment()` / `editComment()` / `deleteComment()` — Comments with @mention detection (5-min edit window)
- `toggleReaction()` — Emoji reactions on comments
- `addChecklist()` / `deleteChecklist()` / `addChecklistItem()` / `updateChecklistItem()` / `deleteChecklistItem()` / `toggleChecklistItem()` — Full checklist CRUD
- `addAttachment()` / `deleteAttachment()` — File attachments
- `addTagToTask()` / `removeTagFromTask()` — Tag management
- `logTime()` / `updateTimeEntry()` / `deleteTimeEntry()` / `getTimeEntries()` — Time tracking
- `submitForReview()` / `completeReview()` — Review workflow (auto-moves task on completion)
- `getAllUsers()` — For assignee/reviewer pickers
- `getTaskActivityLog()` — Audit trail per task

### `actions/admin-actions.ts` (486 lines)
Admin-only operations.
- `checkAdmin()` — RBAC guard (private)
- `getUsers()` / `createUser()` / `updateUserRole()` / `updateUserDetails()` / `deleteUser()` — User management
- `getAuditLogs()` / `getManagerAuditLogs()` / `getMemberAuditLogs()` — Role-scoped audit logs
- `getAdminStats()` — System dashboard stats (users, boards, health, activity chart)
- `getAllBoards()` — All boards with owner/member info
- `getSystemReports()` — System-wide analytics (cycle time, throughput, completion rate)
- `exportAuditLogsToCSV()` — CSV export

### `actions/manager-actions.ts` (264 lines)
Manager-scoped data.
- `checkManager()` — RBAC guard (ADMIN or MANAGER)
- `getManagerBoards()` — Boards the manager owns or belongs to
- `getManagerTeam()` — Unique team members across all manager's boards
- `getManagerAnalytics()` — Throughput, cycle time, task distribution, bottleneck detection

### `actions/member-actions.ts` (199 lines)
Member-scoped data.
- `getMemberTasks()` — Tasks assigned to current user
- `getMemberBoards()` — Boards the user is a member of
- `getMemberStats()` — Performance metrics (velocity, accuracy, collaboration rate)

### `actions/dashboard-actions.ts` (299 lines)
- `getManagerDashboardData()` — Manager dashboard: boards, team size, unassigned tasks, bottlenecks
- `getAdvancedReports()` — Per-board analytics: lead/cycle time, throughput, bottleneck data
- `getMemberDashboardData()` — Member dashboard: assigned tasks, focus mode, recent activity

### `actions/automation-actions.ts` (406 lines)
No-code automation engine.
- `evaluateAutomationRules(trigger, context)` — Core engine: matches rules, evaluates conditions, executes actions
- `getAutomationRules()` / `createAutomationRule()` / `updateAutomationRule()` / `deleteAutomationRule()` / `toggleAutomationRule()` — Rule CRUD
- Private helpers: `evaluateCondition()`, `executeAction()`, `handleSendNotification()`, `handleMoveTask()`, `handleSetPriority()`, `handleAddTag()`

### `actions/notification-actions.ts` (94 lines)
- `getNotifications()` — User's notifications with unread count
- `markNotificationRead()` / `markAllNotificationsRead()` / `deleteNotification()` — Notification management
- `getCurrentUserId()` — Session helper

### `actions/notification-preferences-actions.ts` (52 lines)
- `getNotificationPreferences()` — Fetches or creates default preferences
- `updateNotificationPreferences()` — Upserts preference fields

### `actions/index.ts`
Barrel re-export of all action modules (except notification-preferences-actions).

---

## 5. Real-Time System (Socket.IO)

### `src/socket/server.ts` (309 lines)
Standalone Socket.IO server on port 3001. Runs independently from Next.js.
- Board rooms: `join-board`, `leave-board` with presence tracking
- Real-time event relay: task/column/board/tag CRUD events broadcast to board rooms
- Editing indicators: per-task tracking of who is editing
- Personal notifications: `user:${userId}` room delivery
- Background jobs (every 60s): due-date reminders, overdue checks, midnight 90-day audit log cleanup

### `components/kanban/socket-hooks.ts`
Module-level Socket.IO client singleton + React hooks.
- `useSocket(boardId, user)` — Connection management, room join/leave, presence tracking
- `useBoardEvents(onEvent)` — Listens for task/column/board CRUD events
- `useNotificationListener(userId, onNotification)` — Real-time notification delivery
- `emitTaskMoved()` / `emitTaskCreated()` / `emitTaskUpdated()` / `emitTaskDeleted()` — Client-side emit helpers

### `utils/socket-emitter.ts`
Server-side Socket.IO client. Server actions call these to relay events to the standalone server.
- `emitNotification(userId, data)` — Sends to `user:${userId}` room
- `emitBoardEvent(boardId, event, data)` — Sends to `board:${boardId}` room

### `utils/notification-utils.ts` (`'use server'`)
Notification core with preference checking.
- `sendNotification()` — Checks user prefs → creates DB record → emits socket event
- `checkDueDateReminders()` — Tasks due within 24h
- `checkOverdueTasks()` — Past due, not in "Done"
- `notifyAdminsNewUser()` — Notifies all admins on new signup
- `runNotificationChecks()` — Runs both reminder checks
- Supports 11 notification types mapped to preference boolean keys

### Notification Types (11)
| Type | Preference Key |
|------|---------------|
| `TASK_ASSIGNED` | `taskAssigned` |
| `TASK_STATUS_CHANGED` | `statusChanged` |
| `COMMENT_MENTION` | `commentMention` |
| `REVIEW_REQUESTED` | `reviewRequested` |
| `REVIEW_COMPLETED` | `reviewCompleted` |
| `AUTOMATION_TRIGGERED` | `automationTriggered` |
| `DUE_DATE_REMINDER` | `dueDateReminder` |
| `OVERDUE` | `overdueReminder` |
| `NEW_USER_SIGNUP` | `newUserSignup` |
| `BOARD_MEMBER_ADDED` | `boardMemberAdded` |
| `BOARD_MEMBER_REMOVED` | `boardMemberRemoved` |

---

## 6. Pages (App Router)

### Root & Auth Pages

| File | Type | Description |
|------|------|-------------|
| `app/page.tsx` | Server | Landing page with hero + DemoKanban. Redirects logged-in users to role dashboard |
| `app/layout.tsx` | Server | Root layout: 4 Google fonts, global CSS, OfflineProvider, Sonner Toaster |
| `app/(auth)/login/page.tsx` | Client | Login form → `POST /api/auth/login` |
| `app/(auth)/signup/page.tsx` | Client | Registration form → `POST /api/auth/signup` |
| `app/(auth)/forgot-password/page.tsx` | Client | Email input → `requestPasswordReset` server action |
| `app/(auth)/reset-password/page.tsx` | Client | Token validation → `resetPassword` server action |

### Dashboard Pages

| File | Type | Description |
|------|------|-------------|
| `app/dashboard/layout.tsx` | Server | Authenticated layout with AppSidebar + NotificationBell |
| `app/dashboard/page.tsx` | Server | Role-based redirect: ADMIN→`/admin`, MANAGER→`/manager`, MEMBER→`/member` |
| `app/dashboard/board/[id]/page.tsx` | Server | Kanban board page. Fetches board data, renders BoardHeader + KanbanBoard. Uses `-m-6` for full-width |

### Admin Pages

| File | Type | Description |
|------|------|-------------|
| `app/admin/layout.tsx` | Server | Admin-only layout with premium header |
| `app/admin/page.tsx` | Server | Admin dashboard: stat cards, activity chart, recent audit logs |
| `app/admin/boards/page.tsx` | Client | Board CRUD + member management for admins |
| `app/admin/users/page.tsx` | Server | User management with UserTable + AddUserDialog |
| `app/admin/logs/page.tsx` | Server | Audit log viewer with AuditLogManager |
| `app/admin/reports/page.tsx` | Client | System reports with metrics, throughput chart, export |
| `app/admin/automation/page.tsx` | Server | Automation rule management |

### Manager Pages

| File | Type | Description |
|------|------|-------------|
| `app/manager/layout.tsx` | Server | ADMIN+MANAGER layout |
| `app/manager/page.tsx` | Server | Manager dashboard with team boards + bottleneck alerts |
| `app/manager/boards/page.tsx` | Client | Manager's board management with CRUD |
| `app/manager/team/page.tsx` | Client | Team member viewer with search/filter |
| `app/manager/analytics/page.tsx` | Client | Analytics: throughput, cycle time, pie charts, leaderboards |
| `app/manager/logs/page.tsx` | Server | Team-scoped audit logs |

### Member Pages

| File | Type | Description |
|------|------|-------------|
| `app/member/layout.tsx` | Server | All-roles layout |
| `app/member/page.tsx` | Server | Member dashboard with focus mode + activity timeline |
| `app/member/boards/page.tsx` | Client | Read-only board list |
| `app/member/logs/page.tsx` | Server | Personal activity log |
| `app/member/reports/page.tsx` | Client | Personal performance: velocity chart, efficiency targets |

### Profile Pages

| File | Type | Description |
|------|------|-------------|
| `app/profile/layout.tsx` | Server | Profile layout with breadcrumb |
| `app/profile/page.tsx` | Server | Profile editor with ProfileForm |
| `app/profile/notifications/page.tsx` | Client | 13 notification preference toggles |

---

## 7. Kanban Board Components

| File | Description |
|------|-------------|
| `kanban-board.tsx` | Main board component. DndContext + SortableContext + DragOverlay. Manages WIP status, presence, search, tag filters |
| `column-container.tsx` | Sortable column with task list, add-task button, context menu (rename/WIP/delete). Red border when over WIP limit |
| `task-card.tsx` | dnd-kit sortable card showing priority, title, tags, assignee, counts, dates |
| `board-header.tsx` | Board name, description, member avatars, action buttons (manage/edit/delete/analytics) |
| `presence-avatars.tsx` | Overlapping avatar circles for users currently viewing the board (Framer Motion) |
| `create-board-dialog.tsx` | Create board with name + description |
| `edit-board-dialog.tsx` | Edit board name/description with props-to-state sync via useEffect |
| `add-column-dialog.tsx` | Add new column to board |
| `rename-column-dialog.tsx` | Rename a column |
| `set-wip-limit-dialog.tsx` | Set column WIP limit (disabled offline) |
| `add-task-dialog.tsx` | Create task with title, description, priority, due date, assignee. Supports offline queue |
| `manage-members-dialog.tsx` | Search users, add/remove board members with undo |
| `task-details-dialog.tsx` | Full task detail dialog orchestrating 8 hooks. 3 tabs: Details, Activity, Time Tracking |
| `conflict-dialog.tsx` | Warning dialog for edit conflicts (refresh or overwrite) |
| `board-analytics-dialog.tsx` | Full analytics overlay: cycle/lead time, throughput chart, bottleneck analysis |
| `socket-hooks.ts` | Socket.IO singleton + hooks (documented in Section 5) |

---

## 8. Task Detail Components

All in `components/kanban/task-details/`:

| File | Description |
|------|-------------|
| `task-header.tsx` | Column badge, task ID, version, editing indicator, inline-editable title, delete button |
| `task-description.tsx` | Editable textarea, persists on blur |
| `task-sidebar.tsx` | Assignee select, priority picker, due date, tags, status info |
| `task-comments-section.tsx` | Comment thread with @mention support, reactions (👍🚀❤️), edit/delete, pagination |
| `task-checklist-section.tsx` | Multiple checklists with progress bars, inline item CRUD |
| `task-attachments-section.tsx` | File upload/delete with type icons (image/PDF/code) |
| `task-reviews-section.tsx` | Submit for review, approve/reject/request-changes, review history |
| `task-activity-tab.tsx` | Audit log timeline with action-type badges and filters |
| `task-time-tab.tsx` | Time tracking: log/edit/delete entries, total summary |
| `mention-textarea.tsx` | Textarea with `@` mention autocomplete popover and keyboard navigation |

---

## 9. Dashboard Components

| File | Description |
|------|-------------|
| `dashboard/manager-dashboard-client.tsx` | Summary cards (boards, tasks, team, unassigned), board list, bottleneck alerts |
| `dashboard/member-dashboard-client.tsx` | Summary cards, focus mode (top 3 tasks), recent activity, full task list |

---

## 10. Admin Components

All in `components/admin/`:

| File | Description |
|------|-------------|
| `activity-chart.tsx` | Recharts bar chart for system activity |
| `add-user-dialog.tsx` | User creation form with react-hook-form + Zod |
| `user-table.tsx` | User list with edit/role-change/delete dropdown per row |
| `audit-log-controls.tsx` | Search bar, action filter, date range, CSV export |
| `audit-log-manager.tsx` | Composes controls + filtered audit log table |
| `automation-rule-list.tsx` | Rule table with toggle, delete, edit. Shows trigger/action/condition |
| `add-rule-dialog.tsx` | Automation rule creation form |

---

## 11. Other Components

| File | Description |
|------|-------------|
| `app-sidebar.tsx` | Role-based navigation sidebar with logout |
| `logout-button.tsx` | Standalone logout button |
| `notification-bell.tsx` | Bell icon with unread badge, dropdown list, real-time listener, 60s poll fallback |
| `profile-form.tsx` | Profile editor (name, avatar) + password change form |
| `report-export-buttons.tsx` | CSV/PDF export buttons for reports |
| `demo-kanban.tsx` | Static animated demo board for landing page |
| `providers/offline-provider.tsx` | Global provider: service worker, online/offline events, offline queue sync (max 3 retries), red banner |

---

## 12. Custom Hooks

### Board

| File | Description |
|------|-------------|
| `hooks/use-kanban-board.ts` | Board state management, DnD logic, socket events, offline queue, conflict resolution, undo |
| `hooks/use-mobile.ts` | Returns `true` if viewport < 768px |

### Task Detail (`hooks/use-task/`)

| File | Description |
|------|-------------|
| `use-task-details.ts` | Task fetch, field-level updates, version conflict resolution, delete, offline |
| `use-task-comments.ts` | Comment CRUD, reactions, offline queuing |
| `use-task-checklist.ts` | Checklist + item CRUD, offline, undo |
| `use-task-attachments.ts` | File upload (base64, 10MB limit), delete, undo |
| `use-task-tags.ts` | Board tag fetch, add/remove tags from task |
| `use-task-reviews.ts` | Submit/complete review workflow |
| `use-task-time.ts` | Time entry CRUD |
| `use-task-activity.ts` | Activity log fetch with action-type filter |

---

## 13. Library Layer (lib/)

| File | Description |
|------|-------------|
| `prisma.ts` | Prisma client singleton using `@prisma/adapter-pg` + `pg.Pool` (max 20 connections). Re-exports all Prisma types/enums |
| `auth.ts` | JWT encrypt/decrypt via `jose` (HS256) |
| `auth-server.ts` | `'use server'` — login/logout/getSession/updateSession cookie management |
| `schemas.ts` | ~30 Zod v4 validation schemas for tasks, boards, columns, members, tags, checklists, attachments, time entries, reviews, automation, comments, auth |
| `create-audit-log.ts` | Creates AuditLog record with auto-injected client IP |
| `audit.ts` | Extracts client IP from `x-forwarded-for` / `x-real-ip` headers |
| `export-report.ts` | PDF export (jsPDF + jspdf-autotable) and CSV export utilities |
| `offline-db.ts` | IndexedDB persistence layer using `idb`. CRUD for offline action queue |
| `offline-sync.ts` | Replays queued offline actions against server actions on reconnect |
| `store/use-offline-store.ts` | Zustand store: action queue + failed actions list (3+ retries). Methods: init, add, remove, retry, dismiss |

---

## 14. Utilities (utils/)

| File | Description |
|------|-------------|
| `utils.ts` | `cn()` — Tailwind class merge (clsx + tailwind-merge) |
| `socket-emitter.ts` | Socket.IO client singleton: `emitNotification()`, `emitBoardEvent()` |
| `notification-utils.ts` | `sendNotification()` (pref check → DB write → socket emit), due-date/overdue checks, admin notification. 11 notification types |
| `automation-utils.ts` | Static config: available triggers, conditions, actions for automation builder |
| `mail.ts` | Password reset email via nodemailer (console fallback in dev) |
| `index.ts` | Barrel re-export: `cn`, `emitNotification`, `emitBoardEvent` |

---

## 15. Types

| File | Description |
|------|-------------|
| `types/kanban.ts` | Central type definitions: `Role`, `Priority`, `User`, `Comment`, `ChecklistItem`, `Checklist`, `Column`, `Task`, `Attachment`, `Tag`, `TimeEntry`, `Review`, `Reaction`, `NotificationPreference`, `Board`, `ActionResult<T>` |
| `types/index.ts` | Barrel re-export from `./kanban` |
| `types/jspdf-autotable.d.ts` | Ambient module declaration for jspdf-autotable |

---

## 16. Database Schema

### `prisma/schema.prisma` — 16 Models + 2 Enums

| Model | Purpose |
|-------|---------|
| `User` | Users with role, boards, notifications, audit logs |
| `Board` | Kanban boards with owner, members, columns, tags |
| `Column` | Board columns with order and WIP limit |
| `Task` | Tasks with priority, version (optimistic locking), assignee, creator |
| `Comment` | Task comments with reactions |
| `Reaction` | Emoji reactions on comments (unique per user+comment+emoji) |
| `Attachment` | File attachments on tasks |
| `Checklist` / `ChecklistItem` | Task checklists with progress tracking |
| `TimeEntry` | Time tracking entries |
| `Review` | Review workflow (PENDING/APPROVED/CHANGES_REQUESTED/REJECTED) |
| `Tag` | Board-scoped or global tags |
| `Notification` | User notifications with read status |
| `NotificationPreference` | Per-user boolean preferences for 11 notification types |
| `AuditLog` | Immutable audit trail with JSON details and IP address |
| `AutomationRule` | Automation rules with trigger, condition, action |
| `PasswordResetToken` | Password reset tokens with expiry |

**Enums:**
- `Role`: ADMIN, MANAGER, MEMBER
- `Priority`: LOW, MEDIUM, HIGH, URGENT

### `prisma/seed.ts`
Seeds DB with 3 users (admin, manager, member), 2 boards with columns, 3 sample tasks.

---

## 17. Configuration & Middleware

| File | Description |
|------|-------------|
| `proxy.ts` | Next.js 16 middleware — auth guards + RBAC redirects (not `middleware.ts`) |
| `next.config.mjs` | CSP headers, X-Frame-Options, HSTS, Permissions-Policy for all routes |
| `prisma.config.ts` | Prisma v7 config reading `DATABASE_URL` from `.env.local` |
| `postcss.config.mjs` | PostCSS with `@tailwindcss/postcss` |
| `tsconfig.json` | TypeScript config with `@/` path alias to project root |
| `eslint.config.mjs` | Flat ESLint config with Next.js core-web-vitals + TypeScript. Ignores `generated/` and `scratch/` |
| `app/globals.css` | Tailwind CSS 4: `@import "tailwindcss"`, `@theme inline`, `@custom-variant dark` |

---

## 18. Scripts

| File | Description |
|------|-------------|
| `scripts/db-check.ts` | Verifies DB connectivity (blocks dev startup if unreachable) |
| `scripts/check-users.ts` | Lists all users with email/role |
| `scripts/check-member-boards.ts` | Lists boards with owner + members |
| `scripts/create-admin.ts` | Upserts admin user |
| `scripts/list-tables.ts` | Lists all PostgreSQL tables in public schema |
| `scripts/test-db.ts` | Basic Prisma connectivity test |
| `scripts/test-prisma-automation.ts` | Tests AutomationRule model |

---

## 19. UI Component Library

`components/ui/` — 28 shadcn primitives (radix-nova style):

| Components |
|-----------|
| Alert, Avatar, Badge, Breadcrumb, Button, Card, Checkbox, Collapsible, Dialog, Dropdown Menu, Form, Input, Kbd, Label, Navigation Menu, Pagination, Popover, Scroll Area, Select, Separator, Sheet, Sidebar, Skeleton, Switch, Table, Tabs, Textarea, Tooltip |

---

## 20. File Count Summary

| Category | Files | Lines (approx) |
|----------|-------|----------------|
| Server Actions (`actions/`) | 11 | ~3,800 |
| API Routes (`app/api/`) | 7 | ~400 |
| Pages (`app/`) | 24 | ~3,500 |
| Components (`components/`) | 55 | ~8,000 |
| Custom Hooks (`hooks/`) | 11 | ~2,000 |
| Library (`lib/`) | 10 | ~1,200 |
| Utilities (`utils/`) | 6 | ~500 |
| Types (`types/`) | 3 | ~200 |
| Socket Server | 1 | ~310 |
| Prisma Schema + Seed | 2 | ~450 |
| Config & Middleware | 6 | ~200 |
| Scripts | 7 | ~300 |
| UI Components (shadcn) | 28 | ~3,500 |
| **Total Source Files** | **~171** | **~24,400** |

---

## Feature-to-File Map

| Feature | Key Files |
|---------|-----------|
| **Auth (Login/Signup/Logout)** | `lib/auth.ts`, `lib/auth-server.ts`, `app/api/auth/*/route.ts`, `app/(auth)/*/page.tsx` |
| **Password Reset** | `actions/auth-actions.ts`, `app/api/auth/reset-password/*/route.ts`, `utils/mail.ts` |
| **RBAC / Middleware** | `proxy.ts`, `actions/admin-actions.ts` (`checkAdmin`), `actions/manager-actions.ts` (`checkManager`), `actions/board-actions.ts` (`checkBoardPermission`), `actions/task-actions.ts` (`checkTaskPermission`) |
| **Kanban Board** | `components/kanban/kanban-board.tsx`, `hooks/use-kanban-board.ts`, `actions/board-actions.ts` |
| **Task Management** | `actions/task-actions.ts`, `components/kanban/task-details-dialog.tsx`, `hooks/use-task/*.ts` |
| **Comments & Mentions** | `actions/task-actions.ts`, `components/kanban/task-details/task-comments-section.tsx`, `components/kanban/task-details/mention-textarea.tsx` |
| **Checklists** | `actions/task-actions.ts`, `components/kanban/task-details/task-checklist-section.tsx` |
| **Attachments** | `actions/task-actions.ts`, `components/kanban/task-details/task-attachments-section.tsx` |
| **Tags/Labels** | `actions/board-actions.ts`, `actions/task-actions.ts`, `components/kanban/task-details/task-sidebar.tsx` |
| **Time Tracking** | `actions/task-actions.ts`, `components/kanban/task-details/task-time-tab.tsx` |
| **Reviews** | `actions/task-actions.ts`, `components/kanban/task-details/task-reviews-section.tsx` |
| **WIP Limits** | `actions/board-actions.ts`, `components/kanban/column-container.tsx`, `components/kanban/set-wip-limit-dialog.tsx` |
| **Real-Time (Sockets)** | `src/socket/server.ts`, `utils/socket-emitter.ts`, `components/kanban/socket-hooks.ts` |
| **Notifications** | `utils/notification-utils.ts`, `actions/notification-actions.ts`, `components/notification-bell.tsx` |
| **Notification Preferences** | `actions/notification-preferences-actions.ts`, `app/profile/notifications/page.tsx` |
| **Automation Engine** | `actions/automation-actions.ts`, `utils/automation-utils.ts`, `components/admin/automation-rule-list.tsx` |
| **Undo System** | `actions/board-actions.ts` (`undoLastAction`), `lib/create-audit-log.ts` |
| **Offline Support** | `lib/offline-db.ts`, `lib/offline-sync.ts`, `lib/store/use-offline-store.ts`, `components/providers/offline-provider.tsx` |
| **Audit Logging** | `lib/audit.ts`, `lib/create-audit-log.ts`, `app/admin/logs/page.tsx`, `components/admin/audit-log-manager.tsx` |
| **Reporting & Analytics** | `actions/dashboard-actions.ts`, `actions/admin-actions.ts` (`getSystemReports`), `actions/manager-actions.ts` (`getManagerAnalytics`), `lib/export-report.ts` |
| **User Management** | `actions/admin-actions.ts`, `components/admin/user-table.tsx`, `app/admin/users/page.tsx` |
| **Board Management** | `actions/board-actions.ts`, `components/kanban/create-board-dialog.tsx`, `components/kanban/edit-board-dialog.tsx`, `components/kanban/manage-members-dialog.tsx` |
| **Drag & Drop** | `hooks/use-kanban-board.ts`, `components/kanban/kanban-board.tsx`, `components/kanban/column-container.tsx`, `components/kanban/task-card.tsx` |
| **Presence (Who's Online)** | `src/socket/server.ts`, `components/kanban/socket-hooks.ts`, `components/kanban/presence-avatars.tsx` |
| **Profile Management** | `actions/auth-actions.ts`, `components/profile-form.tsx`, `app/profile/page.tsx` |
