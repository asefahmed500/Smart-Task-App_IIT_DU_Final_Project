# Role-Based Access Control (RBAC) System

## Authority Hierarchy

### Platform Roles (Global)
Assigned at account creation, applies across entire instance.

| Role | Capabilities |
|------|------------|
| **ADMIN** | User CRUD, role assignment, platform audit logs, password reset, statistics |
| **MANAGER** | Board CRUD, column management, automations, member roster |
| **MEMBER** | Task CRUD (own only), self-assignment |

### Effective Board Roles (Contextual)
Calculated per-board via `getEffectiveBoardRole()` in `lib/board-roles.ts`:

1. Platform ADMIN → always ADMIN on any board
2. Board owner → always ADMIN on their board  
3. BoardMember record → role is used (MANAGER/MEMBER)
4. Not a member → access denied (null)

## Permission Matrix

| Feature | MEMBER | MANAGER | ADMIN |
|---------|-------|---------|-------|
| **Tasks** |||
| Create tasks | ✅ | ✅ | ✅ |
| Edit own tasks | ✅ | ✅ | ✅ |
| Edit any task | ❌ | ✅ | ✅ |
| Delete tasks | ❌ | ✅ | ✅ |
| Move tasks (WIP limit) | 🛡️ Blocked | Override available | Override available |
| **Board** |||
| Create boards | ✅ | ✅ | ✅ |
| Archive boards | ❌ | ✅ | ✅ |
| Edit board settings | ❌ | ✅ | ✅ |
| **Columns** |||
| Create/edit columns | ❌ | ✅ | ✅ |
| Set WIP limits | ❌ | ✅ | ✅ |
| Reorder columns | ❌ | ✅ | ✅ |
| **Members** |||
| View roster | ✅ | ✅ | ✅ |
| Invite members | ❌ | ✅ | ✅ |
| Remove members | ❌ | ✅ | ✅ |
| Edit member roles | ❌ | ❌ | ✅ |
| **Automations** |||
| View rules | ✅ | ✅ | ✅ |
| Create/edit rules | ❌ | ✅ | ✅ |
| **Comments** |||
| Delete own comments | ✅ | ✅ | ✅ |
| Delete any comment | ❌ | ✅ | ✅ |
| **Platform** |||
| Manage all users | ❌ | ❌ | ✅ |
| View platform stats | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ✅ |
| Reset user passwords | ❌ | ❌ | ✅ |

## Key Enforcement Mechanisms

### 1. WIP Limit Enforcement
**Location**: `app/api/tasks/[id]/move/route.ts`

- Hard-block members from moving to full columns
- Managers/Admins can pass `override: true` to bypass
- Dependency check: blocked tasks cannot move to terminal columns

```typescript
// Members blocked unless override: true
if (taskCount >= targetColumn.wipLimit) {
  if (!isManagerOrAdmin || !override) {
    return NextResponse.json({ error: 'WIP limit exceeded' }, { status: 409 })
  }
}
```

### 2. Self-Assignment Only
**Location**: `app/api/tasks/[id]/route.ts` (PATCH)

- Members can only assign/unassign themselves
- Cannot assign tasks to other users

```typescript
if (effectiveRole === 'MEMBER' && assigneeId !== undefined) {
  if (assigneeId !== null && assigneeId !== userId) {
    finalAssigneeId = existingTask.assigneeId // Reject
  }
}
```

### 3. Board Ownership
**Location**: `lib/board-roles.ts`

- Board owners implicitly have ADMIN role on their board
- Can override any board-level restriction

## Implementation Files

| Purpose | File |
|---------|------|
| Board-level role calculation | `lib/board-roles.ts` |
| Session/auth helpers | `lib/session.ts` |
| Task move with WIP check | `app/api/tasks/[id]/move/route.ts` |
| Task edit with self-assignment | `app/api/tasks/[id]/route.ts` |
| Board CRUD | `app/api/boards/[id]/route.ts` |
| Member management | `app/api/boards/[id]/members/route.ts` |
| Admin user management | `app/api/admin/users/route.ts` |
| Middleware (route protection) | `middleware.ts` |

## API Protection Patterns

```typescript
// API routes: returns 401/403 NextResponse
const authResult = await requireApiAuth()
if (authResult instanceof NextResponse) return authResult

const roleResult = await requireApiRole(['MANAGER', 'ADMIN'])
if (roleResult instanceof NextResponse) return roleResult
```

```typescript
// Server components: redirects to /login or /dashboard
const session = await requireRole(['ADMIN'])
```

## Role Redirect Targets

- ADMIN → `/admin`
- MANAGER → `/manager`  
- MEMBER → `/dashboard`