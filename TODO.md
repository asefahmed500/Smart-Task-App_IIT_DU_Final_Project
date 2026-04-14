# SmartTask - System Completion TODO

This document outlines all issues and fixes needed to make SmartTask fully functional and production-ready.

---

## 🔴 CRITICAL ISSUES (Must Fix)

### 1. Task Reordering Not Working

**Location**: `components/kanban/board-view.tsx:85, 108`

**Problem**: When dragging a task within the same column, position is always set to 0 instead of calculating the actual drop position.

**Current Code**:

```typescript
// Line 108 in performMove()
newPosition = 0 // WRONG - should calculate from drop index
```

**Fix Required**:

- Calculate position based on drop index within column
- Use the distance from other tasks to determine correct position
- Update the `performMove()` function to handle same-column reordering

**Status**: Not implemented

---

### 2. Server Socket Broadcast Missing

**Location**: `app/api/socket/route.ts`, API routes for task/board operations

**Problem**: Socket server receives events from clients but doesn't broadcast task updates to other clients. Other users don't see real-time task changes.

**Current Behavior**:

```typescript
// Client emits
emitTaskMove(data) // Only moves locally

// Server should broadcast but doesn't
// Other clients don't receive 'task:updated' events
```

**Fix Required**:

- After each task mutation (create, update, move, delete), emit socket event from API route
- Broadcast to board room: `io.to(`board:${boardId}`).emit('task:updated', task)`
- Clients subscribe to board room and update local state on event

**Files to modify**:

- `app/api/tasks/[id]/route.ts` - PATCH, DELETE
- `app/api/tasks/[id]/move/route.ts` - PATCH
- `app/api/tasks/[id]/assign/route.ts` - PATCH
- `app/api/boards/[id]/tasks/route.ts` - POST
- `app/api/socket/route.ts` - Socket server

**Status**: Not implemented

---

### 3. Undo System Incomplete

**Location**: `lib/undo/revert-handlers.ts`

**Problem**: Only 3 operations are revertable. Undo doesn't work for board/column operations or task assignment changes.

**Currently Revertable**:

- ✅ Task move
- ✅ Task update
- ✅ Task delete

**NOT Revertable**:

- ❌ Board create
- ❌ Board update
- ❌ Board delete
- ❌ Column create
- ❌ Column update
- ❌ Column delete
- ❌ Task assignment changes

**Fix Required**:
Add revert handlers for each operation type:

```typescript
// Add to lib/undo/revert-handlers.ts

// Board revert
async function revertBoardCreate(dispatch, action) {
  await dispatch(
    boardsApi.endpoints.deleteBoard.initiate(action.payload.boardId)
  )
}

async function revertBoardDelete(dispatch, action) {
  await dispatch(
    boardsApi.endpoints.createBoard.initiate(action.meta.previousState)
  )
}

// Column revert
async function revertColumnCreate(dispatch, action) {
  await dispatch(
    boardsApi.endpoints.deleteColumn.initiate(action.payload.columnId)
  )
}

async function revertColumnDelete(dispatch, action) {
  await dispatch(
    boardsApi.endpoints.createColumn.initiate(action.meta.previousState)
  )
}

// Task assignment revert
async function revertTaskAssign(dispatch, action) {
  const previousAssigneeId = action.meta.previousState?.assigneeId
  await dispatch(
    tasksApi.endpoints.assignTask.initiate({
      id: action.payload.taskId,
      assigneeId: previousAssigneeId,
    })
  )
}
```

Also update `lib/undo-middleware.ts` to track these operations.

**Status**: Not implemented

---

## 🟡 MEDIUM ISSUES (Should Fix)

### 4. Hardcoded Terminal Columns

**Location**: `app/api/tasks/[id]/move/route.ts:100-119`

**Problem**: Dependency blocking uses hardcoded array `['done', 'review', 'completed']` instead of configurable column reference.

**Current Code**:

```typescript
const terminalColumns = ["done", "review", "completed"] // HARDCODED
if (
  terminalColumns.includes(targetColumnName.toLowerCase()) &&
  task.isBlocked
) {
  return NextResponse.json(
    { error: "Blocked task cannot move to done" },
    { status: 400 }
  )
}
```

**Fix Required**:

- Check if column has `position` greater than a threshold (e.g., last 2 columns)
- Or add `isTerminal` field to Column model
- Or check if column has no outgoing dependencies

**Status**: Hardcoded

---

### 5. Silent Notification Failures

**Location**: `lib/notifications.ts`

**Problem**: Notifications fail silently with no retry mechanism. Failed notifications are never recovered.

**Current Code**:

```typescript
} catch (error) {
  console.error('Failed to create notification:', error)
  // We don't throw here to avoid breaking the main request flow
}
```

**Fix Required**:

- Add notification retry queue
- Log failures to database for later retry
- Consider using a background job system for reliability
- Add `failedAt`, `retryCount` fields to Notification model if needed

**Status**: No retry mechanism

---

### 6. Dangling TaskBlock on Task Delete

**Location**: `app/api/tasks/[id]/route.ts` (DELETE)

**Problem**: When a blocking task is deleted, the TaskBlock records remain, creating orphaned references.

**Fix Required**:

```typescript
// In DELETE /api/tasks/[id]
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  // ... existing code ...

  // Clean up TaskBlock references BEFORE deleting task
  await prisma.taskBlock.deleteMany({
    where: {
      OR: [{ blockerId: taskId }, { blockingId: taskId }],
    },
  })

  await prisma.task.delete({ where: { id } })
}
```

**Status**: Not implemented

---

### 7. Password Validation Too Simple

**Location**: `app/api/admin/users/route.ts`, `app/api/auth/register/route.ts`

**Problem**: Only checks for minimum length (8 chars), no complexity requirements.

**Current Validation**:

```typescript
if (password.length < 8) {
  return NextResponse.json(
    { error: "Password must be at least 8 characters" },
    { status: 400 }
  )
}
```

**Fix Required**:

```typescript
function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters"
  if (!/[A-Z]/.test(password))
    return "Password must contain at least one uppercase letter"
  if (!/[a-z]/.test(password))
    return "Password must contain at least one lowercase letter"
  if (!/[0-9]/.test(password))
    return "Password must contain at least one number"
  if (!/[!@#$%^&*]/.test(password))
    return "Password must contain at least one special character (!@#$%^&*)"
  return null
}
```

**Status**: Not implemented

---

## 🟢 MINOR ISSUES (Nice to Fix)

### 8. No Board Hard Delete

**Location**: `app/api/boards/[id]/route.ts`

**Problem**: Only soft delete (archived) exists. No way to permanently delete a board.

**Fix Required**:

- Add query parameter: `?hard=true` to force permanent deletion
- Or add separate endpoint: `DELETE /api/boards/[id]/hard`

---

### 9. No Session Refresh Token

**Location**: `lib/auth.ts`

**Problem**: JWT expires after 7 days with no refresh mechanism. Users must re-login.

**Fix Required**:

- Implement refresh token rotation
- Add refresh token to database (Session model)
- Create `/api/auth/refresh` endpoint
- Extend session seamlessly without user interaction

---

### 10. Swimlane View Data Not Loaded

**Location**: `components/kanban/swimlane-view.tsx`

**Problem**: May not be fetching or displaying data correctly for swimlane grouping.

**Status**: Needs verification

---

### 11. Metrics API Might Not Calculate Correctly

**Location**: `lib/metrics/cycle-time.ts`, `lib/metrics/lead-time.ts`

**Problem**: Need to verify calculations are accurate for different date ranges and edge cases.

**Status**: Needs verification

---

## 📋 ENHANCEMENTS (Future)

### 12. Real-time Comments

- Add socket event for new comments
- Other users see comments appear without refresh

### 13. Real-time Board Changes

- Socket broadcast when board settings change
- Socket broadcast when members added/removed

### 14. Calendar View

- Add calendar view for tasks with due dates

### 15. Time Tracking

- Add time tracking fields to tasks
- Track time spent in each column

### 16. Export Features

- Export board to CSV/JSON
- Export metrics reports

### 17. Webhooks

- Add webhook system for external integrations

---

## Implementation Order

### Phase 1: Critical (Week 1)

1. ✅ Task reordering fix
2. ✅ Socket broadcast for task updates
3. ✅ Undo system completion

### Phase 2: Medium (Week 2)

4. Fix terminal column detection
5. Add notification retry system
6. Fix TaskBlock cleanup
7. Add password complexity validation

### Phase 3: Minor (Week 3)

8. Add board hard delete
9. Implement refresh tokens
10. Verify swimlane and metrics

### Phase 4: Enhancements (Future)

- Calendar view
- Time tracking
- Export features
- Webhooks

---

## Summary

| Priority     | Count | Status      |
| ------------ | ----- | ----------- |
| Critical     | 3     | Not started |
| Medium       | 4     | Not started |
| Minor        | 3     | Not started |
| Enhancements | 6     | Future      |

**Total: 16 items to complete the system**

---

_Document generated: 2026-04-14_
_Last updated: 2026-04-14_
