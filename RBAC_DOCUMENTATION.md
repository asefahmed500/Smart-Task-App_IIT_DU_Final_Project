# Role-Based Access Control (RBAC) Documentation

## Overview

The Smart Task Manager uses a three-tier role system with **platform-level roles** (ADMIN, MANAGER, MEMBER) and **board-level roles** that determine what users can do. This dual-layer system provides flexibility while maintaining security.

---

## The Three Roles

### 1. ADMIN (Platform Level)

**Scope**: Entire platform - global oversight and management

**Access**: 
- Redirects to `/admin` dashboard
- Can access ALL boards (even ones they're not explicitly invited to)
- Cannot be restricted from any board

**Capabilities**:
| Feature | Description |
|---------|-------------|
| **User Management** | Create new users, change any user's role, reset passwords |
| **Platform Audit** | View all audit logs across the entire platform |
| **Board Oversight** | View all boards on the platform, see all board settings |
| **Platform Settings** | Configure system-wide settings (member board creation, etc.) |
| **Full Board Access** | Automatically ADMIN on every board (global privilege) |

**Dashboard**: `/admin`
- User Management table (create, edit roles, delete)
- Board Oversight (view all boards)
- Security Audit Log (all platform activity)
- Platform Settings

**Key Code**:
```typescript
// Platform ADMINs bypass all board-level checks
if (platformRole === 'ADMIN') {
  return 'ADMIN' // Always ADMIN on any board
}
```

---

### 2. MANAGER (Board Level)

**Scope**: Boards they own or have been invited to with MANAGER/ADMIN role

**Access**:
- Redirects to `/manager` dashboard
- Can create new boards
- Can manage boards where they are OWNER or MANAGER/ADMIN (board-level role)

**Capabilities**:
| Feature | Description |
|---------|-------------|
| **Board Creation** | Create unlimited boards (unless restricted by platform settings) |
| **Board Management** | Edit board name, description, color, archive boards |
| **Column Management** | Create, edit, delete, reorder columns |
| **WIP Limits** | Set work-in-progress limits on columns, can override when moving tasks |
| **Automation Rules** | Create and manage automation rules (triggers/actions) |
| **Team Invitations** | Invite users to boards, assign/remove members |
| **Role Assignment** | Promote/demote members (assign ADMIN/MANAGER/MEMBER roles on board) |
| **Webhooks** | Create and manage board webhooks |
| **Task Operations** | Full CRUD on tasks, assign to anyone, move tasks (including WIP override) |
| **All Board Features** | Comments, attachments, time tracking, dependencies |

**Dashboard**: `/manager`
- Shows only boards they manage (owned or invited as MANAGER/ADMIN)
- Stats for managed boards (tasks, members, throughput)
- Quick create board button

**Key Code**:
```typescript
// Manager filtering - shows only boards where user has elevated role
const managedBoards = boards?.filter((board) => {
  const userId = session?.id
  if (board.ownerId === userId) return true // Owner
  const member = board.members.find((m) => m.userId === userId)
  return member && (member.role === 'ADMIN' || member.role === 'MANAGER')
})
```

---

### 3. MEMBER (Task Level)

**Scope**: Boards they are invited to, with task-focused permissions

**Access**:
- Redirects to `/dashboard` (member dashboard)
- Can only access boards they've been invited to
- Cannot create boards (unless allowed in platform settings)

**Capabilities**:
| Feature | Description |
|---------|-------------|
| **View Boards** | Only boards they are member of |
| **Task CRUD** | Create, edit, delete tasks |
| **Self-Assignment** | Can assign tasks ONLY to themselves (cannot assign to others) |
| **Unassignment** | Can unassign themselves from tasks |
| **Move Tasks** | Can move tasks between columns (respects WIP limits - cannot override) |
| **Comments** | Add/edit/delete own comments |
| **Attachments** | Upload/download attachments |
| **Time Tracking** | Track time on tasks |
| **Dependencies** | Link tasks (blockers) |
| **Focus Mode** | Personal focus mode for concentration |

**Restrictions**:
- ❌ Cannot create boards (unless platform setting allows)
- ❌ Cannot manage columns
- ❌ Cannot set WIP limits
- ❌ Cannot invite/remove members
- ❌ Cannot manage automation rules
- ❌ Cannot assign tasks to other users
- ❌ Cannot override WIP limits
- ❌ Cannot delete boards

**Dashboard**: `/dashboard`
- Shows personal metrics (tasks due today, overdue, throughput)
- Shows all boards they are member of
- Task-focused view

**Key Code**:
```typescript
// MEMBER restriction: can only self-assign
if (effectiveRole === 'MEMBER' && assigneeId !== undefined) {
  if (assigneeId === null || assigneeId === userId) {
    // Allow self-assignment and self-unassignment
    finalAssigneeId = assigneeId
  } else {
    // Deny assigning to others - keep existing assignment
    finalAssigneeId = existingTask.assigneeId
  }
}

// MEMBER restriction: cannot override WIP limits
if (column?.wipLimit && isMember) {
  const taskCount = await prisma.task.count({ where: { columnId } })
  if (taskCount >= column.wipLimit) {
    return NextResponse.json({ error: 'WIP limit exceeded' }, { status: 409 })
  }
}
```

---

## Board-Level Role Calculation

The `getEffectiveBoardRole()` function in `lib/board-roles.ts` determines a user's role on a specific board using this priority order:

### Priority Order

1. **Platform ADMIN** → Always `ADMIN` (global privilege)
2. **Board Owner** → Always `ADMIN` (implicit board ownership)
3. **BoardMember Record** → Use the assigned role (ADMIN/MANAGER/MEMBER)
4. **Non-Member** → `null` (no access)

### Decision Tree

```
Is user a platform ADMIN?
├─ YES → Return 'ADMIN' (highest privilege)
└─ NO → Continue
    Is user the board owner?
    ├─ YES → Return 'ADMIN' (implicit ownership)
    └─ NO → Continue
        Is user in BoardMember table?
        ├─ YES → Return their BoardMember.role
        └─ NO → Return null (no access)
```

### Example Scenarios

**Scenario 1**: Platform ADMIN on any board
- Platform Role: `ADMIN`
- Board Role: N/A (not invited)
- **Effective Role**: `ADMIN` ✅
- Reason: Platform ADMINs have global access

**Scenario 2**: Regular MANAGER invited as MEMBER on a board
- Platform Role: `MANAGER`
- Board Role: `MEMBER` (invited)
- **Effective Role**: `MEMBER` ⚠️
- Reason: Board-level role takes precedence over platform role for non-ADMINs

**Scenario 3**: Board owner (no BoardMember record needed)
- Platform Role: `MEMBER`
- Board Role: None (owner)
- **Effective Role**: `ADMIN` 👑
- Reason: Ownership implies ADMIN on that board

**Scenario 4**: User not invited to board
- Platform Role: `MANAGER`
- Board Role: None (not invited)
- **Effective Role**: `null` 🚫
- Reason: No access to this board

---

## Permission Matrix

| Operation | ADMIN (Platform) | MANAGER (Board) | MEMBER (Board) |
|-----------|------------------|-----------------|-----------------|
| **Platform Operations** |
| View all users | ✅ | ❌ | ❌ |
| Create users | ✅ | ❌ | ❌ |
| Change user roles | ✅ | ❌ | ❌ |
| View platform audit | ✅ | ❌ | ❌ |
| Platform settings | ✅ | ❌ | ❌ |
| **Board Operations** |
| Create boards | ✅ | ✅ | ⚠️* |
| Delete boards | ✅ (any) | ✅ (owned/managed) | ❌ |
| Edit board details | ✅ | ✅ | ❌ |
| Archive boards | ✅ | ✅ | ❌ |
| **Column Operations** |
| Create/edit/delete columns | ✅ | ✅ | ❌ |
| Reorder columns | ✅ | ✅ | ❌ |
| Set WIP limits | ✅ | ✅ | ❌ |
| Override WIP limits | ✅ | ✅ | ❌ |
| **Member Operations** |
| Invite members | ✅ | ✅ | ❌ |
| Remove members | ✅ | ✅ | ❌ |
| Change member roles | ✅ | ✅ | ❌ |
| View all members | ✅ | ✅ | ✅ |
| **Task Operations** |
| Create tasks | ✅ | ✅ | ✅ |
| Edit tasks | ✅ | ✅ | ✅ |
| Delete tasks | ✅ | ✅ | ✅ |
| Move tasks | ✅ | ✅ | ✅ |
| Assign tasks (anyone) | ✅ | ✅ | ❌ |
| Assign tasks (self only) | ✅ | ✅ | ✅ |
| Unassign self | ✅ | ✅ | ✅ |
| **Advanced Features** |
| Automation rules | ✅ | ✅ | ❌ |
| Webhooks | ✅ | ✅ | ❌ |
| Export board data | ✅ | ✅ | ✅ |
| View audit log (board) | ✅ | ✅ | ✅ |
| Comments | ✅ | ✅ | ✅ |
| Attachments | ✅ | ✅ | ✅ |
| Time tracking | ✅ | ✅ | ✅ |
| Dependencies | ✅ | ✅ | ✅ |

⚠️* MEMBERs can create boards only if `allowMemberBoardCreation` is enabled in platform settings

---

## Security Enforcement

### API Route Protection

**Pattern 1: Board-Level Role Check**
```typescript
// ❌ WRONG - Only checks platform role
if (session.user.role === 'MEMBER') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ✅ CORRECT - Checks board-level role
const effectiveRole = await getEffectiveBoardRole(session, boardId)
if (effectiveRole === 'MEMBER') {
  // Restrict MEMBER actions...
}
```

**Pattern 2: Access Verification**
```typescript
// Verify user is member of board before allowing operations
const hasAccess = task.board.ownerId === userId ||
  task.board.members.some((m) => m.userId === userId)

if (!hasAccess) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### Page Route Protection

**Middleware** (`middleware.ts`):
- Redirects unauthenticated users to `/login`
- Does NOT check roles (role checks in page components)

**Page Components**:
```typescript
useEffect(() => {
  if (session && session.role !== 'ADMIN') {
    router.replace(session.role === 'MANAGER' ? '/manager' : '/dashboard')
  }
}, [session, router])
```

### Session Utilities

| Function | Context | Returns On Fail |
|----------|---------|-----------------|
| `requireAuth()` | Server Components | Redirects to `/login` |
| `requireRole()` | Server Components | Redirects to `/dashboard` |
| `requireApiAuth()` | API Routes | 401 response |
| `requireApiRole()` | API Routes | 401/403 response |
| `getEffectiveBoardRole()` | Both | `null` (no access) |

---

## Dashboard Redirection

### Automatic Routing Based on Role

```
User logs in
    ↓
Check platform role
    ↓
┌───────────┬──────────────────┬──────────────────┐
│  ADMIN    │    MANAGER       │    MEMBER        │
│           │                  │                  │
│ Redirect  │ Redirect         │ Redirect         │
│ to /admin │ to /manager      │ to /dashboard    │
└───────────┴──────────────────┴──────────────────┘
```

### Code Implementation

```typescript
// dashboard/page.tsx - Role-based redirect
const handleRedirect = useCallback(() => {
  if (hasRedirected || !profile) return
  setHasRedirected(true)
  if (profile.role === 'ADMIN') router.replace('/admin')
  else if (profile.role === 'MANAGER') router.replace('/manager')
  else if (profile.role === 'MEMBER') router.replace('/member')
}, [profile, router, hasRedirected])
```

---

## Common Permission Patterns

### 1. WIP Limit Enforcement

**MEMBERs**: Hard blocked from moving tasks to full columns
**MANAGER/ADMIN**: Can override by passing `override: true`

```typescript
// Check WIP limit
const effectiveRole = await getEffectiveBoardRole(session, boardId)
const isMember = effectiveRole === 'MEMBER'

if (column.wipLimit && taskCount >= column.wipLimit && !isMember) {
  // Allow manager/admin to override
  if (override) {
    // Proceed with move
  } else {
    return NextResponse.json({ error: 'WIP_LIMIT_EXCEEDED' }, { status: 409 })
  }
}
```

### 2. Task Assignment

**MEMBERs**: Can only assign to themselves
**MANAGER/ADMIN**: Can assign to anyone

```typescript
const effectiveRole = await getEffectiveBoardRole(session, boardId)

let finalAssigneeId = assigneeId
if (effectiveRole === 'MEMBER' && assigneeId && assigneeId !== userId) {
  // Force self-assignment
  finalAssigneeId = userId
}
```

### 3. Board Operations

**Create Board**: MANAGER/ADMIN only (unless platform setting allows MEMBER)
```typescript
let canCreate = session.user.role === 'ADMIN' || session.user.role === 'MANAGER'

if (!canCreate) {
  const settings = await prisma.systemSettings.findUnique({ where: { id: 'global' } })
  if (settings?.allowMemberBoardCreation || settings === null) {
    canCreate = true
  }
}
```

### 4. Member Management

Only MANAGER/ADMIN on the board can manage members
```typescript
const effectiveRole = await getEffectiveBoardRole(session, boardId)
if (effectiveRole === 'MEMBER') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

## Database Schema

### User Model
```typescript
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      UserRole // ADMIN, MANAGER, MEMBER
  // ... other fields
}

enum UserRole {
  ADMIN
  MANAGER
  MEMBER
}
```

### BoardMember Model (Board-Level Roles)
```typescript
model BoardMember {
  id        String   @id @default(cuid())
  userId    String
  boardId   String
  role      BoardRole // ADMIN, MANAGER, MEMBER
  joinedAt  DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id])
  board     Board    @relation(fields: [boardId], references: [id])
  
  @@unique([userId, boardId])
}

enum BoardRole {
  ADMIN
  MANAGER
  MEMBER
}
```

---

## Best Practices for Developers

### 1. Always Use Board-Level Role Checks

For any board-related operation:
```typescript
import { getEffectiveBoardRole } from '@/lib/board-roles'

const effectiveRole = await getEffectiveBoardRole(session, boardId)
if (effectiveRole === 'MEMBER') {
  // Restrict MEMBER actions
}
```

### 2. Check Access Before Operations

```typescript
// Verify user has access to board
const hasAccess = task.board.ownerId === userId ||
  task.board.members.some((m) => m.userId === userId)

if (!hasAccess) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### 3. Use Correct Session Utilities

- **Server Components**: `requireAuth()`, `requireRole()`
- **API Routes**: `requireApiAuth()`, `requireApiRole()`

### 4. Handle Null Effective Role

```typescript
const effectiveRole = await getEffectiveBoardRole(session, boardId)

if (!effectiveRole) {
  return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
}
```

---

## Testing Permissions

### Test Scenarios

**1. Platform ADMIN**
- Can access /admin dashboard
- Can create users with any role
- Can view all boards (even without invitation)
- Can perform any action on any board

**2. MANAGER**
- Redirected to /manager dashboard
- Can create boards
- Can manage boards where they are owner/invited as MANAGER/ADMIN
- Cannot access boards they're not invited to
- Can override WIP limits

**3. MEMBER**
- Redirected to /dashboard
- Can only access boards they're invited to
- Can create/edit/delete tasks
- Can only assign tasks to themselves
- Cannot override WIP limits
- Cannot manage columns, members, or settings

**4. Cross-Role Scenarios**
- MANAGER invited as MEMBER on a board → has MEMBER permissions on that board
- MEMBER promoted to MANAGER → gains MANAGER permissions on that board
- ADMIN always has ADMIN permissions everywhere

---

## Summary

| Aspect | ADMIN | MANAGER | MEMBER |
|--------|-------|---------|--------|
| **Scope** | Platform | Boards | Boards |
| **Dashboard** | /admin | /manager | /dashboard |
| **Create Boards** | ✅ | ✅ | ⚠️ |
| **Board Access** | All (auto) | Managed/Owned | Invited only |
| **Board-Level Role** | Always ADMIN | Based on invite | Based on invite |
| **Task Assignment** | Anyone | Anyone | Self only |
| **WIP Override** | ✅ | ✅ | ❌ |
| **Manage Columns** | ✅ | ✅ | ❌ |
| **Manage Members** | ✅ | ✅ | ❌ |
| **Automation** | ✅ | ✅ | ❌ |
| **Platform Admin** | ✅ | ❌ | ❌ |

This dual-layer system provides granular control while maintaining security through the `getEffectiveBoardRole()` function that consistently determines permissions across all board operations.
