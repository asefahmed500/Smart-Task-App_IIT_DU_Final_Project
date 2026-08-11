# SmartTask QA Test Report

**Date:** 2026-08-10 (initial) / 2026-08-11 (latest updates)
**Scope:** Full interactive E2E testing across all 3 roles, all features, all services
**Environment:** localhost:3002 (Next.js), localhost:3001 (Socket.IO)
**Method:** Real browser automation (`agent-browser`) — every operation acted + verified via UI, refresh persistence, and DB where practical.

---

## Latest Updates (2026-08-11)

### Feature: Manager Team Performance (`/manager/team`)
- New `getTeamMemberPerformance` server action (MANAGER/ADMIN only) aggregating each member's workload across all manager boards: total/completed/in-progress/overdue task counts, completion rate, and latest 20 tasks with board/column/sprint.
- Member cards show live workload stats + completion-rate bar.
- **View Tasks** opens a compact (384px) scrollable dialog; **Performance** opens a workload/insights dialog.

### Feature/fix: Sprint UX
- `/member/sprints` and `/manager/sprints` now default to the **first board that has sprints** (members were landing on a sprints-less board and seeing an empty list).
- Managers can now **delete COMPLETED sprints** (delete button shows for all non-ACTIVE sprints; `deleteSprint` action already allowed it).
- Verified member sprint cards are read-only (View Details only) and the sprint board shows sprint-filtered tasks + name/status/metrics.

### Fix: Create/update data not showing until manual refresh
- Root cause: `router.refresh()` is unreliable in Next.js 16 Turbopack dev. Replaced with `window.location.reload()` in add-column, add-task, rename-column, set-wip-limit, edit-board, manage-members, column-container. All board mutations now reflect immediately.

### Fix: Notification cuid leak
- DUE_DATE_REMINDER / OVERDUE messages previously embedded `(ID: <prisma-cuid>)`. Added a `dedupKey` column; dedup now uses `dedupKey` (`due:<id>` / `overdue:<id>`) and messages are clean ("Task X is overdue"). Applied in both `utils/notification-utils.ts` and `src/socket/server.ts`. `cleanMessage()` safety net strips residual tokens in the bell + toast.

### Fix: Raw mention token display
- Added `mentionToDisplayText()` (`@[id|Name]` → `@Name`) applied in the audit-trail COMMENT action details, review feedback, and notification bell — raw user ids are never shown.

### Verified live (production)
- 3-role login (admin/manager/member), board open, task create + persist + reload, comment add, admin user create + instant display, attachment upload route deployed, member login with updated password `asef123`.

---

## Deep QA Pass 2 — Sub-feature Coverage (this round)

| Feature | Operation | Verified |
|---------|-----------|----------|
| Attachments | Upload via `/api/attachments/upload` (server-side) | ✅ 200, stored as FileBlob |
| Attachments | Serve via `/api/attachments/[id]/file` | ✅ correct bytes + content-type |
| Attachments | UI attach flow (task details dialog) | ✅ file appears + success toast |
| Attachments | Cascade delete (attachment → blob) | ✅ no orphans |
| Checklist | Create checklist + item | ✅ persisted |
| Checklist | Toggle item complete | ✅ DB update verified |
| Time tracking | Log time entry | ✅ persisted + toast |
| Issue links | Create BLOCKS link (search → select) | ✅ persisted in DB |
| RBAC | Member direct URL to /admin/users | ✅ redirected to /member |
| RBAC | Member has no create-board/column UI | ✅ hidden |
| Mobile responsive | 390×844 viewport — no horizontal overflow | ✅ |
| Mobile nav | Toggle Sidebar hamburger present | ✅ |

## Bundle Size Optimization

- **`recharts` (~1MB) was in the initial bundle of admin dashboard, admin reports, kanban board, and sprint board** (imported via chart components).
- **Fixed:** `SystemActivityChart`, `BurndownChart`, and `BoardAnalyticsDialog` are now lazy-loaded via `next/dynamic` + `ssr: false` (`*-lazy.tsx` wrappers). recharts is now a separate on-demand chunk fetched only when a chart renders.

## New Feature: Real Server-Side File Upload

- Previously a **client-side simulation**: the browser read the whole file via `FileReader` and stored base64 data-URLs directly in the `Attachment.url` column (see `UPLOAD.md`).
- **Now:** `POST /api/attachments/upload` authenticates (httpOnly cookie), validates size/type server-side, checks board permission, and stores bytes in a new `FileBlob` table. `GET /api/attachments/[id]/file` serves them. Client uploads the raw file via FormData (no client-side base64).
- Schema: new `FileBlob` model, `Attachment.blob` relation (cascade delete). Run `prisma db push && prisma generate` + restart dev server after schema changes.

---

## Roles Tested

| Role | Account | Result |
|------|---------|--------|
| ADMIN | admin@gmail.com / admin123 | ✅ All admin + board + task features |
| MANAGER | manager@gmail.com / manager123 | ✅ All manager + board + review features |
| MEMBER | member@smarttask.com / AdminPassword123! | ✅ Member board + RBAC + responsive |
| MEMBER | asefahmed500@gmail.com / asef123456 | ⚠️ **password mismatch (401)** — account exists, `isActive`, but password differs from AGENTS.md (passwordVersion 3). Not a code bug; credential docs stale. |

---

## Pages Tested (all load without runtime errors)

- `/admin`, `/admin/users`, `/admin/logs`, `/admin/boards`, `/admin/automation`, `/admin/reports`
- `/manager`, `/manager/sprints`, `/manager/boards`, `/manager/logs`
- `/member`, `/member/boards`, `/member/logs`
- `/login`, `/signup`, `/profile`, `/profile/notifications`, `/`
- `/dashboard/board/[id]` (Kanban)
- `/dashboard` (direct URL — now redirects per role without the "negative time stamp" error)

---

## Operations Verified (act → verify → refresh-persist → DB)

| # | Feature | Operation | Verified |
|---|---------|-----------|----------|
| 1 | Auth | Login as ADMIN → redirects to `/admin` (direct, skips /dashboard) | ✅ |
| 2 | Auth | Login as MANAGER → redirects to `/manager` | ✅ |
| 3 | Auth | Role switch (logout → different role login) — **no stale socket JWT** | ✅ |
| 4 | Profile | Update name → persists after refresh → reverted | ✅ |
| 5 | Profile | Notification preference toggle → persists after refresh → reverted | ✅ |
| 6 | Board | Create board (name + desc) → persists after refresh | ✅ |
| 7 | Board | Add member via search → success toast + notification | ✅ |
| 8 | Board | Open Kanban board → 3 default columns render | ✅ |
| 9 | Task | Create with assignee → persists after refresh | ✅ |
| 10 | Task | Add comment → visible in Activity & Comments | ✅ |
| 11 | Review | Request review (assignee can't self-review; admin→manager reviewer) | ✅ |
| 12 | Review | Manager approves → **task auto-moves to Done** (DB: status APPROVED, column Done) | ✅ |
| 13 | Sprint | Create sprint (board-scoped, name/goal/dates) → persists | ✅ |
| 14 | Automation | Create system rule (trigger TASK_CREATED → notify assignee) → persists in DB | ✅ |
| 15 | Socket | Manager creates task → **ADMIN session sees it live** (no reload) | ✅ |
| 16 | Automation | Admin automation page renders stats (active engines, executions) | ✅ |
| 17 | RBAC | Member blocked from creating boards/columns (checkBoardPermission) | ✅ (code-verified) |
| 18 | WIP | WIP enforced for MEMBER only; admin/manager override logged | ✅ (code-verified) |
| 19 | Comment | Edit window (5-min for non-admin), admin/manager edit any | ✅ (code-verified) |
| 20 | Issue links | Self-link blocked, same-board enforced, duplicates blocked | ✅ (code-verified) |

---

## Bugs Found & Fixed (this QA pass)

| # | Bug | Root Cause | Fix | Verified |
|---|-----|-----------|-----|----------|
| 1 | Automation rule created but **not listed instantly** | `add-rule-dialog` used `router.refresh()` (unreliable in Next 16 Turbopack dev) + didn't check `createAutomationRule` result | Check `res.success` + `window.location.reload()` | ✅ typecheck + build |

### Bugs fixed in earlier passes (still passing this round)

| Bug | Fix | Status |
|-----|-----|--------|
| Stale socket JWT on role switch | httpOnly-cookie-only auth via `/api/auth/socket-token`, in-memory token, auth-callback | ✅ socket real-time verified live |
| Data not showing after create (SW served stale cached pages) | SW network-first for navigations, bypass API routes | ✅ live task appearance verified |
| "Negative time stamp" Performance error | Login/proxy redirect directly to role page (skip /dashboard) | ✅ no error on any login |
| User creation silently failed / not displayed | Dialog ignored result; wrong revalidatePath; no reload | ✅ create + instant display |
| 6 validation/RBAC gaps (getAutomationRules leak, weak IDs, prefs allowlist, boardId, checklist title, emoji) | audit | ✅ fixed, typecheck/build pass |

---

## Coverage Matrix

| Area | Admin | Manager | Member |
|------|-------|---------|--------|
| Boards CRUD | ✅ tested | ✅ tested | ❌ blocked (verified) |
| Columns + WIP | ✅ (code-verified) | ✅ (code-verified) | ❌ blocked |
| Task CRUD | ✅ tested | ✅ tested | ✅ tested (shared board) |
| Comments | ✅ tested | ✅ (code) | ✅ (code) |
| Reviews | ✅ submit tested | ✅ approve tested | submit only |
| Sprints | — | ✅ create tested | view |
| Epics | — | ✅ (code) | view |
| Automation | ✅ create tested | ✅ (code) | ❌ blocked |
| Users (admin) | ✅ create tested | — | — |
| Profile/settings | ✅ tested | — | — |
| Real-time socket | ✅ live receive | ✅ live emit | — |
| Notifications | ✅ prefs tested | — | — |

---

## Known Remaining Issues (non-blocking)

1. `router.refresh()` is unreliable for server-component list updates in **Next.js 16 Turbopack dev mode**. Fixed for user + rule creation via `window.location.reload()`. Other create/edit dialogs rely on client state + socket (work reliably); production build unaffected.
2. The "negative time stamp" `performance.measure` error is a **Next.js dev-mode instrumentation artifact** — non-fatal, eliminated for login by skipping `/dashboard`.
3. **Kanban drag-and-drop** could not be automated reliably (dnd-kit pointer sensors aren't triggered by headless CDP drag). The underlying `updateTaskStatus` business logic was verified via the review auto-move (APPROVED → Done) and is covered by the code audit.
4. **`asefahmed500@gmail.com` password mismatch** — AGENTS.md lists `asef123456`, but the account returns 401 (passwordVersion 3). The login flow is correct; the credential in AGENTS.md is stale. Use `member@smarttask.com` / `AdminPassword123!` for MEMBER testing, or reset the password.
5. **Undo** was verified only via toast presence + code audit (30s window, ~30 action types); the full interactive undo of every action type wasn't exhaustively re-tested this round.
6. **Offline queue sync** — offline-mode task queueing is code-implemented but wasn't exercised with a real network drop this round (SW is now network-first for navigations, so stale-cache issues are eliminated).

---

## Cleanup

All test data (Attachment Test Board, tasks, checklist, time entries, attachments/blobs, issue links, automation rule, member additions, test users) was **deleted** after testing. DB returned to baseline: 12 users, 15 boards, 53 tasks, 2 sprints, 1 automation rule. The remaining 3 attachments + 1 issue link are pre-existing production data (verified by older cuid IDs).
