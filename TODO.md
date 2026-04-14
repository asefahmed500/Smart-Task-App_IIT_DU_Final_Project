# SmartTask - System Completion TODO

This document outlines issues and fixes needed to make SmartTask fully functional.

---

## ✅ COMPLETED FIXES

### 1. Task Reordering - FIXED ✅

**Location**: `components/kanban/board-view.tsx:120-164`

Now properly calculates position based on drop index within column using averaging between adjacent tasks.

### 2. Socket Broadcast - FIXED ✅

**Locations**:

- `app/api/tasks/[id]/move/route.ts` - broadcasts on move
- `app/api/tasks/[id]/assign/route.ts` - broadcasts on assign

Uses `broadcastTaskUpdate()` from `lib/socket-server.ts` to notify all clients in board room.

### 3. Terminal Column Detection - FIXED ✅

**Location**: `app/api/tasks/[id]/move/route.ts:101`

Now uses `targetColumn?.isTerminal` from Column model instead of hardcoded array.

Schema updated: `isTerminal Boolean @default(false)` added to Column model.

---

## 🔴 CRITICAL ISSUES (Still Remaining)

### 4. Undo System Incomplete

**Location**: `lib/undo/revert-handlers.ts`

**Problem**: Only 3 operations are revertable. Undo doesn't work for board/column operations or task assignment changes.

**Currently Revertable**:

- ✅ Task move
- ✅ Task update
- ✅ Task delete

**NOT Revertable**:

- ❌ Board create/update/delete
- ❌ Column create/update/delete
- ❌ Task assignment changes

**Fix Required**: Add revert handlers for board/column operations and task assignment.

---

## 🟡 MEDIUM ISSUES

### 5. Silent Notification Failures

**Location**: `lib/notifications.ts`

**Problem**: Notifications fail silently with no retry mechanism.

**Fix Required**: Add notification retry queue.

---

### 6. Dangling TaskBlock on Task Delete

**Location**: `app/api/tasks/[id]/route.ts` (DELETE)

**Problem**: When a blocking task is deleted, TaskBlock records remain orphaned.

**Fix Required**:

```typescript
await prisma.taskBlock.deleteMany({
  where: {
    OR: [{ blockerId: taskId }, { blockingId: taskId }],
  },
})
```

---

### 7. Password Validation Too Simple

**Location**: `app/api/admin/users/route.ts`, `app/api/auth/register/route.ts`

**Problem**: Only checks length >= 8, no complexity requirements.

**Fix Required**: Add uppercase, lowercase, number, special char validation.

---

## 🟢 MINOR ISSUES

### 8. No Board Hard Delete

Only soft delete (archived) exists. Add `?hard=true` parameter.

### 9. No Session Refresh Token

JWT expires after 7 days with no refresh mechanism.

---

## 📋 ENHANCEMENTS (Future)

- Real-time comments
- Real-time board changes (settings, members)
- Calendar view
- Time tracking
- Export features (CSV/JSON)
- Webhooks

---

## Summary

| Priority     | Count | Status      |
| ------------ | ----- | ----------- |
| Completed    | 3     | ✅ Fixed    |
| Critical     | 1     | Not started |
| Medium       | 3     | Not started |
| Minor        | 2     | Not started |
| Enhancements | 6     | Future      |

**Remaining: 6 issues to fix**

---

_Document generated: 2026-04-14_
_Last updated: 2026-04-15_
