# Role-Based Features Audit (Smart Task Manager)

This document provides a detailed audit of the implemented features for each role in the Smart Task Management System. It accurately reflects the actual state of the codebase following the recent RBAC refactoring.

**Audit Date:** April 2026
**Status:** ✅ Fully Implemented and Validated

---

## 1. Role System Architecture

Smart Task Manager uses a **Dual-Layer Role-Based Access Control (RBAC)** system. This means permissions are evaluated based on two contexts:

1. **Platform Roles** (`ADMIN`, `MANAGER`, `MEMBER`) - Global permissions assigned in the `User` model.
2. **Board-Level Roles** (`ADMIN`, `MANAGER`, `MEMBER`) - Contextual permissions assigned in the `BoardMember` model.

### Board-Level Role Resolution
The `getEffectiveBoardRole` function determines permissions inside a board in this exact order:
1. **Platform ADMIN** → Automatically elevated to board `ADMIN`.
2. **Board Owner** → Automatically elevated to board `ADMIN`.
3. **Invited Member** → Given the role specified in their `BoardMember` record (`ADMIN`, `MANAGER`, `MEMBER`).
4. **Not Invited** → Blocked entirely (`null`).

---

## 2. Platform Roles & Global Capabilities

### 👑 Platform ADMIN
*Has absolute, global access to all features, users, and boards.*
* **Dashboard:** `/admin`
* **User Lifecycle:** Can view, search, create, edit, deactivate/reactivate users, and reset passwords via `/api/admin/*`.
* **Platform Security:** Can view the global immutable Audit Log.
* **Global Visibility:** Bypasses all membership checks. Can view, edit, and archive *any* board.
* **System Settings:** Can update global settings (e.g., `allowMemberBoardCreation`).

### 💼 Platform MANAGER
*Intermediate role focused on creating and managing team workspaces.*
* **Dashboard:** `/manager`
* **Board Creation:** Can create new boards globally.
* **Restricted Admin Access:** Cannot access `/admin`, manage other platform users, or view global audit logs.

### 👤 Platform MEMBER
*Standard user focused on personal execution.*
* **Dashboard:** `/member` (Standard `/dashboard`)
* **Board Creation:** Blocked by default. (Only permitted if `allowMemberBoardCreation` is set to `true` in System Settings).
* **Restricted Management:** Cannot manage users or platform settings.

---

## 3. Board-Level Features & Capabilities

Once inside a board, what a user can do is determined by their **Board-Level Role** (evaluated by `getEffectiveBoardRole`).

### 🛡️ Board ADMIN
*(Includes Platform ADMINs and the user who created the board)*
* **Board Governance:** Can rename, recolor, archive, or permanently delete the board.
* **Member Management:** Can invite users, remove users, and promote/demote other members. (Guarded: Cannot remove the last Admin from a board).
* **Workflow Engineering:** Can create, rename, reorder, and delete columns.
* **WIP Limits:** Can set hard WIP limits on columns.
* **Automations & Webhooks:** Full access to create/edit visual no-code automation rules and outgoing webhooks.

### 🛠️ Board MANAGER
*Focuses on task throughput and resolving bottlenecks.*
* **Workflow Control:** Can reorder columns and set WIP limits.
* **WIP Overrides:** Exclusive ability to override WIP limits. When dragging a task into a full column, Managers can bypass the hard limit.
* **Member Management:** Can invite new members and remove standard members (but cannot demote/remove Admins).
* **Task Moderation:** Can edit any task, assign tasks to *any* member, and delete any task.
* **Metrics:** Has full access to the Metrics Dashboard (90-day throughput heatmap, Avg Lead Time, and Avg Cycle Time).

### ✍️ Board MEMBER
*Focuses strictly on doing the work.*
* **Task Execution:** Can create, edit, and move unblocked tasks.
* **Strict WIP Enforcement:** Hard-blocked from moving a task into a column that has reached its WIP limit. (No override capability).
* **Self-Assignment Only:** Can assign themselves to a task or unassign themselves. **Cannot** assign tasks to other members.
* **Comment & Attach:** Can comment on tasks and upload attachments.
* **Restricted Actions:** Cannot manage columns, cannot delete tasks, cannot edit automation rules, and cannot manage board members.

---

## 4. Shared Collaboration Features (Available to All)

These features enhance the user experience and are available to all roles (though they may behave differently based on permissions).

* **Live Cursors & Presence:** Real-time visibility into who is active on the board and who is currently editing a specific card (via Socket.io).
* **Task Dependencies (Blockers):** Tasks can block other tasks. A blocked task visually fades and physically cannot be moved to a terminal column.
* **Optimistic UI & Undo History:** All actions immediately reflect locally. Users can press `Ctrl+Z` to undo up to 20 recent actions (scoped to their own actions).
* **Offline Sync:** Actions queue up when disconnected and replay seamlessly upon reconnection.
* **Focus Mode (`F` key):** Visually isolates a user's assigned tasks by fading all others to 10% opacity.
* **Command Palette (`Cmd+K`):** Global search for quick navigation to specific tasks or boards.
* **Conflict Resolution:** If two users edit the same task simultaneously, a version conflict modal appears. Managers can "Force Overwrite".

---

## 5. Security & Technical Enforcement Notes

* **Consistent API Guards:** All API routes strictly implement `getEffectiveBoardRole(session, boardId)` to authorize mutations. 
* **Global Search Fix:** The user search API (`/api/users/search`) has been updated from a platform role check (`requireApiRole`) to a basic auth check (`requireApiAuth`). This ensures that if a Platform `MEMBER` creates a board (becoming a Board `ADMIN`), they are able to search for users to invite to their board.
* **Database Query Scoping:** Reads (`findMany`) dynamically inject `where` clauses to ensure users only ever fetch tasks and boards they are explicitly authorized to view.
