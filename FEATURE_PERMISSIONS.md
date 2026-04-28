# Smart-Task Feature Permissions Matrix

Complete breakdown of all features and role-based access control.

---

## Role Definitions

| Role | Scope | Dashboard |
|------|-------|-----------|
| **ADMIN** | Platform-level - global access | `/admin` |
| **MANAGER** | Board-level - manage own boards | `/manager` |
| **MEMBER** | Task-level - assigned tasks only | `/member` |

**Effective Role Calculation** (per board):
1. Platform ADMIN → Always ADMIN
2. Board Owner → Always ADMIN
3. BoardMember record → Use assigned role
4. Non-member → No access

---

## Quick Reference Matrix

| Feature | ADMIN | MANAGER | MEMBER |
|---------|-------|---------|--------|
| **Platform** | | | |
| User CRUD | ✅ | ❌ | ❌ |
| Role Changes | ✅ | ❌ | ❌ |
| Platform Settings | ✅ | ❌ | ❌ |
| Platform Audit | ✅ | ❌ | ❌ |
| **Boards** | | | |
| Create Boards | ✅ | ✅ | ⚠️* |
| Edit Boards | ✅ | ✅ | ❌ |
| Delete Boards | ✅ | ✅ (own only) | ❌ |
| Archive Boards | ✅ | ✅ (own only) | ❌ |
| Export Boards | ✅ | ✅ | ✅ |
| **Columns** | | | |
| Create/Edit Columns | ✅ | ✅ | ❌ |
| Delete Columns | ✅ | ❌ | ❌ |
| Reorder Columns | ✅ | ✅ | ❌ |
| Set WIP Limits | ✅ | ✅ | ❌ |
| Override WIP | ✅ | ✅ | ❌ |
| **Tasks** | | | |
| Create Tasks | ✅ | ✅ | ✅ |
| Edit Tasks | ✅ | ✅ | ✅ |
| Delete Tasks | ✅ | ✅ | ❌ |
| Assign Anyone | ✅ | ✅ | ❌ |
| Self-Assign Only | ✅ | ✅ | ✅ |
| Move Tasks | ✅ | ✅ | ✅ |
| Dependencies | ✅ | ✅ | ✅ |
| **Content** | | | |
| Comments | ✅ | ✅ | ✅ (own) |
| Attachments | ✅ | ✅ | ✅ |
| Delete Attachments | ✅ | ✅ | ✅ (own) |
| Time Tracking | ✅ | ✅ | ✅ |
| **Advanced** | | | |
| Automations | ✅ | ✅ | ❌ |
| Webhooks | ✅ | ✅ | ❌ |
| Metrics | ✅ | ✅ | ✅ |
| Audit Logs | ✅ | ✅ | ✅ |

⚠️* MEMBERs can create boards only if `allowMemberBoardCreation` platform setting is enabled

---

## Detailed Feature Breakdown

### 1. Authentication & Users

#### Login (`/api/auth/login`)
- All roles can login
- Role determines redirect destination after login

#### Registration (`/api/auth/register`)
- ❌ **No public registration** - Admin only creates users

#### User Management (`/app/api/admin/users/route.ts`)
- **ADMIN**: Create users, view all users, change roles, reset passwords
- **MANAGER**: ❌ No access
- **MEMBER**: ❌ No access

#### Password Change (`/app/api/users/change-password/route.ts`)
- **ADMIN**: Change any user's password
- **MANAGER**: Change own password
- **MEMBER**: Change own password

---

### 2. Board Operations

#### Create Board (`/app/api/boards/route.ts`)
- **ADMIN**: ✅ Always allowed
- **MANAGER**: ✅ Always allowed
- **MEMBER**: ⚠️ Only if platform setting enabled

#### Update Board (`/app/api/boards/[id]/route.ts`)
- **ADMIN**: ✅ Can edit any board
- **MANAGER**: ✅ Can edit boards they're ADMIN on
- **MEMBER**: ❌ Cannot edit boards

#### Delete Board (`/app/api/boards/[id]/route.ts`)
- **ADMIN**: ✅ Can delete any board
- **MANAGER**: ✅ Can delete own boards only
- **MEMBER**: ❌ Cannot delete boards

#### Archive Board (`/app/api/boards/[id]/archive/route.ts`)
- **ADMIN**: ✅ Can archive any board
- **MANAGER**: ✅ Can archive own boards only
- **MEMBER**: ❌ Cannot archive boards

#### Export Board (`/app/api/boards/[id]/export/route.ts`)
- **ADMIN**: ✅ Export as JSON/CSV
- **MANAGER**: ✅ Export as JSON/CSV
- **MEMBER**: ✅ Export as JSON/CSV

---

### 3. Column Management

#### Create Column (`components/kanban/add-column-button.tsx`)
- **ADMIN**: ✅ Create columns anywhere
- **MANAGER**: ✅ Create columns on their boards
- **MEMBER**: ❌ Button hidden

#### Edit Column (`components/kanban/column.tsx`)
- **ADMIN**: ✅ Edit name, WIP limit anywhere
- **MANAGER**: ✅ Edit on their boards
- **MEMBER**: ❌ Cannot edit

#### Delete Column (`/app/api/columns/[id]/route.ts` - DELETE)
- **ADMIN**: ✅ Delete columns anywhere
- **MANAGER**: ❌ Cannot delete (ADMIN only - destructive action)
- **MEMBER**: ❌ Cannot delete

#### Set WIP Limit
- **ADMIN**: ✅ Set WIP limits anywhere
- **MANAGER**: ✅ Set WIP limits on their boards
- **MEMBER**: ❌ Cannot set limits

---

### 4. Task Operations

#### Create Task (`/app/api/boards/[id]/tasks/route.ts`)
- **ADMIN**: ✅ Create anywhere
- **MANAGER**: ✅ Create on their boards
- **MEMBER**: ✅ Create on their boards (subject to WIP limits)

#### Edit Task (`/app/api/tasks/[id]/route.ts`)
- **ADMIN**: ✅ Edit any task
- **MANAGER**: ✅ Edit tasks on their boards
- **MEMBER**: ✅ Edit assigned tasks only

#### Delete Task (`/app/api/tasks/[id]/route.ts`)
- **ADMIN**: ✅ Delete any task
- **MANAGER**: ✅ Delete tasks on their boards
- **MEMBER**: ❌ Cannot delete tasks

#### Task Assignment (`/app/api/tasks/[id]/route.ts` - PATCH)
```typescript
// MEMBERS can only:
- Claim unassigned tasks (assign to self)
- Unassign themselves from tasks
- Cannot modify tasks assigned to others

// MANAGERs/ADMINs can:
- Assign tasks to anyone
```

#### Move Task (`/app/api/tasks/[id]/move/route.ts`)
- **ADMIN**: ✅ Move anywhere, override WIP
- **MANAGER**: ✅ Move on their boards, override WIP with `override=true`
- **MEMBER**: ✅ Move on their boards, respects WIP limits (no override)

#### Task Dependencies (`/app/api/tasks/[id]/dependencies/route.ts`)
- **ADMIN**: ✅ Manage dependencies anywhere
- **MANAGER**: ✅ Manage on their boards
- **MEMBER**: ✅ Manage on their assigned tasks

---

### 5. Comments & Attachments

#### Comments (`/app/api/tasks/[id]/comments/route.ts`)
- **ADMIN**: ✅ Full CRUD on all comments
- **MANAGER**: ✅ Full CRUD on their boards
- **MEMBER**: ✅ Add/edit/delete own comments only

#### Update Comment (`/app/api/comments/[id]/route.ts` - PATCH)
- **ADMIN**: ✅ Edit any comment
- **MANAGER**: ✅ Edit any comment on their boards
- **MEMBER**: ✅ Edit own comments only

#### Delete Comment (`/app/api/comments/[id]/route.ts` - DELETE)
- **ADMIN**: ✅ Delete any comment
- **MANAGER**: ✅ Delete any comment on their boards
- **MEMBER**: ✅ Delete own comments only

#### Upload Attachments (`/app/api/tasks/[id]/attachments/route.ts`)
- **ADMIN**: ✅ Upload anywhere
- **MANAGER**: ✅ Upload on their boards
- **MEMBER**: ✅ Upload on their tasks

#### Delete Attachment (`/app/api/attachments/[id]/route.ts`)
- **ADMIN**: ✅ Delete any attachment
- **MANAGER**: ✅ Delete any attachment on their boards
- **MEMBER**: ✅ Delete own attachments only

---

### 6. Team & Member Management

#### Add Members (`/app/api/boards/[id]/members/route.ts`)
- **ADMIN**: ✅ Add members to any board
- **MANAGER**: ✅ Add members to their boards
- **MEMBER**: ❌ Cannot add members

#### Remove Members
- **ADMIN**: ✅ Remove from any board
- **MANAGER**: ✅ Remove from their boards
- **MEMBER**: ❌ Cannot remove others

#### Change Member Role (`/app/api/boards/[id]/members/route.ts` - PATCH)
- **ADMIN**: ✅ Change roles on any board
- **MANAGER**: ❌ Cannot change roles (ADMIN only - privilege escalation)
- **MEMBER**: ❌ Cannot change roles

#### Leave Board
- **ADMIN**: ✅ Can leave any board
- **MANAGER**: ✅ Can leave their boards
- **MEMBER**: ✅ Can leave boards

---

### 7. Automation Rules

#### View Automations (`components/board/automation-builder.tsx`)
- **ADMIN**: ✅ View all automations
- **MANAGER**: ✅ View automations on their boards
- **MEMBER**: ❌ Tab hidden in board settings

#### Create Automation (`/app/api/boards/[id]/automations/route.ts`)
- **ADMIN**: ✅ Create anywhere
- **MANAGER**: ✅ Create on their boards
- **MEMBER**: ❌ Cannot create

#### Delete Automation
- **ADMIN**: ✅ Delete anywhere
- **MANAGER**: ✅ Delete on their boards
- **MEMBER**: ❌ Cannot delete

#### Automation Triggers
- `TASK_MOVED` - Task moved to column
- `TASK_ASSIGNED` - Task assigned to user
- `PRIORITY_CHANGED` - Priority changed
- `TASK_STALLED` - Task hasn't moved in 5+ days

#### Automation Actions
- `NOTIFY_USER` - Send notification to user
- `NOTIFY_ROLE` - Send notification to role
- `AUTO_ASSIGN` - Automatically assign task
- `CHANGE_PRIORITY` - Change task priority
- `ADD_LABEL` - Add label to task

---

### 8. Webhooks

#### View Webhooks (`components/board/webhook-settings.tsx`)
- **ADMIN**: ✅ View all webhooks
- **MANAGER**: ✅ View webhooks on their boards
- **MEMBER**: ❌ Tab hidden in board settings

#### Create Webhook (`/app/api/boards/[id]/webhooks/route.ts`)
- **ADMIN**: ✅ Create anywhere
- **MANAGER**: ✅ Create on their boards
- **MEMBER**: ❌ Cannot create

#### Delete Webhook (`/app/api/webhooks/[id]/route.ts`)
- **ADMIN**: ✅ Delete anywhere
- **MANAGER**: ✅ Delete on their boards
- **MEMBER**: ❌ Cannot delete

#### Webhook Events
- `TASK_CREATED`
- `TASK_UPDATED`
- `TASK_MOVED`
- `TASK_COMPLETED`
- `COMMENT_ADDED`

---

### 9. Metrics & Analytics

#### Board Metrics (`/app/api/boards/[id]/metrics/route.ts`)
- **ADMIN**: ✅ View all board metrics
- **MANAGER**: ✅ View their board metrics
- **MEMBER**: ✅ View board metrics they're on

#### Cycle Time Calculation
- Time from "In Progress" to "Done"
- Available to all board members

#### Lead Time Calculation
- Time from creation to completion
- Available to all board members

#### Throughput Tracking
- Tasks completed per time period
- Available to all board members

#### Platform Stats (`/app/api/admin/stats/route.ts`)
- **ADMIN**: ✅ Platform-wide statistics
- **MANAGER**: ❌ No access
- **MEMBER**: ❌ No access

---

### 10. Audit & Activity

#### Audit Logs (`/app/api/boards/[id]/audit/route.ts`)
- **ADMIN**: ✅ View all audit logs
- **MANAGER**: ✅ View audit logs for their boards
- **MEMBER**: ✅ View audit logs for their boards

#### Platform Audit (`/app/api/admin/audit/route.ts`)
- **ADMIN**: ✅ View all platform audit logs
- **MANAGER**: ❌ No access
- **MEMBER**: ❌ No access

#### Activity Feed (`components/board/board-activity-feed.tsx`)
- **ADMIN**: ✅ View all activity
- **MANAGER**: ✅ View board activity
- **MEMBER**: ✅ View board activity

---

### 11. Notifications

#### Receive Notifications
- **ADMIN**: ✅ All platform notifications
- **MANAGER**: ✅ Board notifications
- **MEMBER**: ✅ Task assignment notifications

#### Notification Types
- `TASK_ASSIGNED` - When assigned to task
- `TASK_UNASSIGNED` - When unassigned from task
- `COMMENT_ADDED` - When someone comments on task
- `TASK_BLOCKED` - When task is blocked
- `TASK_UNBLOCKED` - When task is unblocked
- `TASK_MOVED` - When task moved to Done/Review
- `AUTOMATION_TRIGGER` - When automation fires

#### Mark as Read
- All roles can mark notifications as read

---

### 12. Real-time Features

#### Socket.IO Connection
- All roles receive real-time updates for boards they're on

#### Board Cursors (`components/kanban/board-cursors.tsx`)
- See where other users are hovering on the board
- Available to all board members

#### Presence Tracking
- See who is currently viewing the board
- See who is editing which task
- Available to all board members

#### Live Updates
- Task changes broadcast immediately
- Column changes broadcast immediately
- Member changes broadcast immediately

---

### 13. Views & Modes

#### Board Views (`components/kanban/`)
- **Kanban**: Default column view
- **Swimlane**: Group by assignee/priority/label
- **Calendar**: Calendar view by due date
- Available to all board members

#### Focus Mode
- Filter tasks by assignee
- Blurs non-matching tasks
- Available to all board members

#### Command Palette (`cmd+k`)
- Quick navigation
- Quick task creation
- Quick board switching
- Available to all authenticated users

---

## Critical Security Notes

### Board-Level Role Check Pattern
Always use `getEffectiveBoardRole()` for board operations:

```typescript
// ❌ WRONG - platform role only
const authResult = await requireApiRole(['MANAGER', 'ADMIN'])

// ✅ CORRECT - board-level role
const effectiveRole = await getEffectiveBoardRole(session, boardId)
if (effectiveRole === null) return 404
if (effectiveRole === 'MEMBER') return 403
```

### API vs UI Permissions
- **API**: Always enforces permissions independently
- **UI**: Shows/hides features for better UX
- Never trust UI alone - API is source of truth

### WIP Limit Enforcement
- **MEMBERs**: Hard blocked at WIP limit
- **MANAGERs/ADMINs**: Can override with `override=true`
- API returns `requiresOverride` flag to indicate override option

---

## File Reference Index

### API Routes
- User Management: `app/api/admin/users/route.ts`
- Board Operations: `app/api/boards/[id]/route.ts`
- Task Operations: `app/api/tasks/[id]/route.ts`
- Move Task: `app/api/tasks/[id]/move/route.ts`
- Comments: `app/api/tasks/[id]/comments/route.ts`, `app/api/comments/[id]/route.ts`
- Attachments: `app/api/tasks/[id]/attachments/route.ts`, `app/api/attachments/[id]/route.ts`
- Members: `app/api/boards/[id]/members/route.ts`
- Automations: `app/api/boards/[id]/automations/route.ts`
- Webhooks: `app/api/boards/[id]/webhooks/route.ts`
- Metrics: `app/api/boards/[id]/metrics/route.ts`

### Key Utilities
- Role Calculation: `lib/board-roles.ts`
- Session Helpers: `lib/session.ts`
- Error Handler: `lib/api/error-handler.ts`
- Validation Middleware: `lib/api/validation-middleware.ts`

### UI Components
- Board Settings: `components/board/board-settings-dialog.tsx`
- Automation Builder: `components/board/automation-builder.tsx`
- Webhook Settings: `components/board/webhook-settings.tsx`
- Task Card: `components/kanban/task-card.tsx`
- Add Column: `components/kanban/add-column-button.tsx`
- Attachment List: `components/task/attachment-list.tsx`

---

*Generated April 2026 - reflects current codebase state*
