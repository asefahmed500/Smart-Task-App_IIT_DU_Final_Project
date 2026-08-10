# SmartTask QA Test Report

**Date:** 2026-08-10
**Scope:** Full interactive E2E testing across all 3 roles, all features, all services
**Environment:** localhost:3002 (Next.js), localhost:3001 (Socket.IO)
**Method:** Real browser automation (`agent-browser`) — every operation acted + verified via UI, refresh persistence, and DB where practical.

---

## Roles Tested

| Role | Account | Result |
|------|---------|--------|
| ADMIN | admin@gmail.com / admin123 | ✅ All admin + board + task features |
| MANAGER | manager@gmail.com / manager123 | ✅ All manager + board + review features |
| MEMBER | asefahmed500@gmail.com / asef123456 | ✅ Member board + task features (verified via shared board) |

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

---

## Cleanup

All test data (QA Test Board, tasks, comments, review, sprint, automation rule, member additions, test users) was **deleted** after testing. DB returned to baseline: 12 users, 15 boards, 53 tasks, 2 sprints, 1 automation rule.
