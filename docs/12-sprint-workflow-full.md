# Sprint Workflow — Full Implementation

## Overview

This document describes the complete Sprint Workflow for SmartTask, extending the existing Kanban board with time-boxed iteration planning (sprints), daily tracking (burndown), calendar visualization, and sprint review/retro ceremonies.

---

## Architecture

The sprint system sits on top of the existing Board/Task infrastructure. Every sprint is scoped to a single board. Tasks carry optional `sprintId`, `storyPoints`, `issueType`, `isBlocked`, and `blockerReason` fields.

### Data Flow

```
User Action → Server Action → Prisma Write → Audit Log → Socket Event → UI Update
                          ↘ Notification (via sendNotification)
```

### Routes

| Role | Route | Feature |
|------|-------|---------|
| MANAGER/ADMIN | `/manager/sprints` | Sprint list |
| MANAGER/ADMIN | `/manager/sprints/[id]` | Sprint detail + metrics |
| MANAGER/ADMIN | `/manager/sprints/[id]/plan` | **Sprint Planning Board** — backlog + sprint side-by-side |
| MANAGER/ADMIN | `/manager/sprints/[id]/board` | **Sprint Kanban Board** — sprint-filtered columns |
| MANAGER/ADMIN | `/manager/sprints/[id]/review` | Sprint review / demo notes |
| MANAGER/ADMIN | `/manager/sprints/[id]/retro` | Sprint retro notes |
| MANAGER/ADMIN | `/manager/sprints/calendar` | **Sprint Calendar View** |
| MANAGER/ADMIN | `/manager/backlog` | Backlog |
| MANAGER/ADMIN | `/manager/epics` | Epics |
| MEMBER | `/member/sprints/[id]` | Sprint detail (read-only) |
| MEMBER | `/member/sprints/[id]/board` | Sprint board (read-only) |
| MEMBER | `/member/sprints/calendar` | Sprint calendar (read-only) |
| MEMBER | `/member/backlog` | Backlog (read-only) |

---

## Phase 1: Sprint Planning Board

### Route: `/manager/sprints/[id]/plan`

A two-panel layout:
- **Left Panel**: Backlog tasks (not assigned to any sprint) — draggable
- **Right Panel**: Sprint backlog — tasks in the current sprint — draggable

### UI Components
- Drag task from backlog → sprint to call `assignTaskToSprint()`
- Drag task from sprint → backlog to call `removeTaskFromSprint()`
- Capacity bar: shows assigned story points / planned capacity
- Search/filter on both panels

### Data
- Left panel uses `getBacklogTasks(boardId)` filtered by board
- Right panel uses `getSprintDetail(sprintId)` task list
- Capacity from sprint's new `capacity` field

---

## Phase 2: Sprint Kanban Board

### Route: `/manager/sprints/[id]/board`

Full kanban board (same columns as parent board) showing ONLY tasks assigned to the sprint.

### Features
- Drag and drop between columns (reuses existing `useKanbanBoard` infrastructure)
- Task cards show: assignee avatar, priority, story points, issue type, blocker indicator, epic color
- Progress bar header showing completed vs total tasks
- Burndown chart embedded in header area
- Filter by assignee / status / priority

### Reuse
- Wraps existing `KanbanBoard` dynamic component
- Passes a sprint-filtered task set to the board
- All existing DnD, socket events, task editing carries over

---

## Phase 3: Burndown Chart

### Component: `components/sprint/burndown-chart.tsx`

Recharts `LineChart` showing remaining story points vs. time.

### Calculation
- **Ideal line**: Linear decline from `totalStoryPoints` → `0` over sprint duration
- **Actual line**: For each day of the sprint, compute remaining story points (tasks NOT in Done column)
- Data computed server-side by `getBurndownData(sprintId)`

### Server Action: `getBurndownData(sprintId)`
```typescript
interface BurndownPoint {
  date: string      // YYYY-MM-DD
  ideal: number     // Ideal remaining
  actual: number    // Actual remaining
}
```

Returns an array of points spanning the sprint's date range.

### Display
- Burndown line chart on sprint detail page
- Also embedded in sprint kanban board header
- X-axis: sprint days, Y-axis: story points
- Tooltip showing date, ideal, actual
- Empty state when no story points assigned

---

## Phase 4: Sprint Calendar View

### Route: `/manager/sprints/calendar`

Month-view calendar showing all sprints on the active board as colored bars.

### Features
- Month navigation (prev/next)
- Sprint bars spanning their date range, colored by status
- Click bar → navigate to sprint detail
- Hover → tooltip with name, dates, task count
- Board selector (when user has multiple boards)

### Component: `components/sprint/sprint-calendar.tsx`

Built with `date-fns` (already installed, no new deps):
- Custom monthly grid rendering
- Sprint positioning as absolutely-positioned bars within day cells
- Status colors: PLANNED=blue, ACTIVE=green, COMPLETED=gray, CANCELLED=red

---

## Phase 5: Date Picker Component

### Component: `components/ui/date-picker.tsx`

Reusable calendar date picker built with Radix Popover + custom grid + `date-fns`.

### Features
- Single date selection
- Month navigation (prev/next arrows)
- Today highlight
- Selected state
- Disabled dates
- Keyboard navigation
- Portaled popover

### Replaces
All native `<input type="date">` across:
- Sprint create/edit dialog
- Task due date
- Audit log date filters

---

## Phase 6: Sprint Review & Retro

### Route: `/manager/sprints/[id]/review`

**Sprint Review page** for demo notes and achievement showcase:
- Completed tasks list with issue type badges
- Sprint summary metrics (completion rate, story points, velocity)
- Text area for review/demo notes
- "What was accomplished" section

### Route: `/manager/sprints/[id]/retro`

**Sprint Retro page** for improvement notes:
- "What went well" textarea
- "What to improve" textarea
- "Action items" list (add/remove items)
- Previous sprint retro comparison (if available)

### Schema
New fields on Sprint model:
```
capacity          Int?        // Planned story points capacity
reviewNotes       String?     // Sprint review/demo notes
retroWentWell     String?     // Retro: what went well
retroToImprove    String?     // Retro: what to improve
retroActionItems  Json?       // Retro: action items [{ text, owner, done }]
```

### Server Actions
- `updateSprintReview(sprintId, reviewNotes)` — saves review notes
- `updateSprintRetro(sprintId, wentWell, toImprove, actionItems)` — saves retro notes

### Post-Completion
When sprint status changes to COMPLETED, redirect to review page with prompt to add notes.

---

## Phase 7: Blocker Flagging

### Schema
New fields on Task model:
```
isBlocked     Boolean  @default(false)
blockerReason String?
```

### UI
- Flag/unflag button on task cards in sprint detail, sprint board, backlog
- Visual indicator: red dot/badge on blocked task cards
- Filter: "Show blocked only" toggle on sprint board

### Server Action
```typescript
toggleTaskBlocker(taskId, isBlocked, blockerReason?)
```

### Audit Log
Action `TASK_BLOCKER_TOGGLED` with details `{ taskId, isBlocked, reason }`

### Notifications
When a task is blocked, notify the task creator and sprint manager.

---

## Files Created

### Components
```
components/sprint/
├── sprint-planning-board.tsx    (Phase 1 - 2-panel planning)
├── sprint-kanban-board.tsx      (Phase 2 - sprint-filtered kanban)
├── burndown-chart.tsx           (Phase 3 - recharts line chart)
├── sprint-calendar.tsx          (Phase 4 - month calendar view)
├── sprint-review.tsx            (Phase 6 - review notes)
└── sprint-retro.tsx             (Phase 6 - retro notes)

components/ui/
└── date-picker.tsx              (Phase 5 - radix popover calendar)
```

### Server Actions (in sprint-actions.ts)
```
getBurndownData(sprintId)        → BurndownPoint[]
updateSprintReview(id, notes)    → Sprint
updateSprintRetro(id, data)      → Sprint
toggleTaskBlocker(id, blocked, reason) → Task
updateSprintCapacity(id, capacity) → Sprint
```

### Pages
```
app/manager/sprints/
├── [id]/plan/page.tsx           (Phase 1)
├── [id]/board/page.tsx          (Phase 2)
├── [id]/review/page.tsx         (Phase 6)
├── [id]/retro/page.tsx          (Phase 6)
└── calendar/page.tsx            (Phase 4)

app/member/sprints/
├── [id]/board/page.tsx          (Phase 2, read-only)
└── calendar/page.tsx            (Phase 4, read-only)
```

### Schema Changes
```
Sprint: +capacity, reviewNotes, retroWentWell, retroToImprove, retroActionItems
Task:   +isBlocked, +blockerReason
```

### Socket Events (new)
```
task:blockerToggled → { boardId, taskId, isBlocked }
```

---

## Sidebar Updates

### Manager sidebar additions:
```
Sprint Calendar → /manager/sprints/calendar
```
(Inserted between Epics and Team Members)

### Member sidebar additions:
```
Sprint Calendar → /member/sprints/calendar
```
(Inserted between My Sprints and Epics)

---

## Burndown Calculation Details

The burndown chart shows remaining work over the sprint duration.

### Formula
```
For each day D in [sprint.startDate, sprint.endDate]:
  ideal[D] = totalSP - (totalSP / totalDays * daysElapsed)
  actual[D] = sum of storyPoints for tasks NOT in Done column at end of day D
```

### Implementation
The server action `getBurndownData(sprintId)`:
1. Gets the sprint with all tasks
2. Gets the done column name for the board
3. For each day in the sprint, queries how many tasks were NOT in the done column
4. Returns the data points

For MVP, the "actual" line uses current task state and back-fills from audit logs where available.

### Edge Cases
- Sprint with no story points assigned → show task count instead
- Active sprint (incomplete) → show up to today
- Completed sprint → full dataset
- Cancelled sprint → return empty

---

## Implementation Order

1. **Schema changes** → `prisma/schema.prisma` — add Sprint + Task fields
2. **Types** → `types/kanban.ts` — update interfaces
3. **Server actions** → `actions/sprint-actions.ts` — add burndown, review, retro, blocker, capacity
4. **Socket events** → `src/socket/server.ts` — add task:blockerToggled
5. **DatePicker** → `components/ui/date-picker.tsx`
6. **Sprint Planning Board** → `components/sprint/sprint-planning-board.tsx`
7. **Sprint Kanban Board** → `components/sprint/sprint-kanban-board.tsx`
8. **Burndown Chart** → `components/sprint/burndown-chart.tsx`
9. **Sprint Calendar** → `components/sprint/sprint-calendar.tsx`
10. **Sprint Review** → `components/sprint/sprint-review.tsx`
11. **Sprint Retro** → `components/sprint/sprint-retro.tsx`
12. **New pages** → `app/manager/sprints/[id]/plan/`, `app/manager/sprints/[id]/board/`, etc.
13. **Member pages** → `app/member/sprints/[id]/board/`, `app/member/sprints/calendar/`
14. **Sidebar** → `components/app-sidebar.tsx`
