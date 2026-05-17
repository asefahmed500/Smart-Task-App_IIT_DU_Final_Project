# Sprint Planning & Issue Tracker

## Overview

SmartTask now includes a full Sprint Planning and Issue Tracking system built on top of the existing Kanban board infrastructure. This feature enables teams to plan work in time-boxed iterations (sprints), organize tasks into epics, link related issues, and track velocity over time.

## Role-Based Access

| Role | Access Level | Routes |
|------|-------------|--------|
| **MANAGER** | Full sprint planning: create/edit/delete sprints, manage backlog, assign tasks, start/complete sprints, create epics | `/manager/sprints`, `/manager/backlog`, `/manager/epics` |
| **MEMBER** | View sprints, view backlog, view epics, update issue fields (type, story points) | `/member/sprints`, `/member/backlog`, `/member/epics` |
| **ADMIN** | Full access to all sprint features across all boards | Same as MANAGER + `/admin` oversight |

### Permission Details

- **MANAGER/ADMIN**: Can create, edit, delete sprints and epics. Can assign/remove tasks from sprints. Can change sprint status (PLANNED → ACTIVE → COMPLETED/CANCELLED).
- **MEMBER**: Can view sprints, backlog, and epics. Can edit issue type and story points on tasks. Cannot delete sprints or change sprint status.

## Sprint Lifecycle

```
PLANNED → ACTIVE → COMPLETED
   ↓         ↓
CANCELLED → PLANNED (reopen)
```

### Status Transitions

| From | To | Who | Description |
|------|----|-----|-------------|
| PLANNED | ACTIVE | MANAGER/ADMIN | Start the sprint, notifies all assignees |
| ACTIVE | COMPLETED | MANAGER/ADMIN | Mark sprint as done, calculates final metrics |
| ACTIVE | CANCELLED | MANAGER/ADMIN | Cancel mid-sprint |
| CANCELLED | PLANNED | MANAGER/ADMIN | Reopen a cancelled sprint |
| PLANNED | (delete) | MANAGER/ADMIN | Delete empty sprints only |

## Data Model

### New Models

#### Sprint
```
id, name, goal, startDate, endDate, status, boardId
Relations: board (Board), tasks (Task[])
```

#### Epic
```
id, name, description, status, color, boardId
Relations: board (Board), tasks (Task[])
```

#### IssueLink
```
id, sourceTaskId, targetTaskId, linkType, createdAt
Relations: sourceTask (Task), targetTask (Task)
Unique: [sourceTaskId, targetTaskId, linkType]
```

#### Task (Extended)
```
New fields:
- issueType: BUG | FEATURE | STORY | TASK | EPIC | SUBTASK
- status: TODO | IN_PROGRESS | IN_REVIEW | DONE
- storyPoints: Int (0-100)
- parentId: String (self-relation for subtasks)
- sprintId: String (FK to Sprint)
- resolution: FIXED | WONT_FIX | DUPLICATE | CANNOT_REPRODUCE | LATER | MOVED
- epicId: String (FK to Epic)
```

## Features

### 1. Backlog Management (`/manager/backlog`, `/member/backlog`)

- View all tasks NOT assigned to any sprint
- Edit issue type (Bug, Feature, Story, Task, Subtask)
- Set story points for estimation
- Assign tasks to active/planned sprints
- Filter by board via `?boardId=` query parameter

### 2. Sprint Management (`/manager/sprints`, `/member/sprints`)

- Create sprints with name, goal, start/end dates
- View sprint cards with status badges, task counts, date ranges
- Start sprints (PLANNED → ACTIVE)
- Complete sprints (ACTIVE → COMPLETED)
- Cancel/Reopen sprints
- Delete empty sprints
- Click "View" to see sprint detail with metrics

### 3. Sprint Detail (`/manager/sprints/[id]`, `/member/sprints/[id]`)

- Sprint overview with 4 metric cards:
  - Total Tasks
  - Completed Tasks (in "Done" column)
  - Story Points (completed / total)
  - Completion Rate (%)
- Task list with issue type badges, priority, story points, column name
- Edit task issue fields (type, story points)
- Remove tasks from sprint

### 4. Epic Management (`/manager/epics`, `/member/epics`)

- Create epics with name, description, color picker
- View epic cards with status badges and task counts
- Delete epics (tasks are unlinked, not deleted)

### 5. Issue Linking

- Link tasks with relationship types:
  - BLOCKS / BLOCKED_BY
  - RELATES_TO
  - DUPLICATES / DUPLICATED_BY
- Prevents self-linking and cross-board linking
- Server-side permission checks

### 6. Velocity Tracking

- Calculates velocity from last 10 completed sprints
- Shows story points completed per sprint
- Shows tasks completed per sprint
- Data available via `getVelocityData()` server action

### 7. Sprint Metrics

- **Completion Rate**: (completed tasks / total tasks) × 100
- **Scope Completion Rate**: (completed story points / total story points) × 100
- **Total Time Logged**: Sum of all time entries in sprint tasks

## Server Actions

### Sprint Actions (`actions/sprint-actions.ts`)

| Action | Description | Permissions |
|--------|-------------|-------------|
| `createSprint()` | Create new sprint | MANAGER/ADMIN |
| `updateSprint()` | Edit sprint details | MANAGER/ADMIN |
| `deleteSprint()` | Delete empty sprint | MANAGER/ADMIN |
| `updateSprintStatus()` | Change sprint status | MANAGER/ADMIN |
| `assignTaskToSprint()` | Add task to sprint | MANAGER/ADMIN |
| `removeTaskFromSprint()` | Remove task from sprint | MANAGER/ADMIN |
| `getSprintsByBoard()` | List sprints for board | All members |
| `getSprintDetail()` | Get sprint with tasks | All members |
| `getBacklogTasks()` | Get unscheduled tasks | All members |
| `getSprintMetrics()` | Calculate sprint metrics | All members |
| `getVelocityData()` | Get velocity history | All members |
| `updateTaskIssueFields()` | Edit issue type/points | All members |

### Epic Actions (`actions/epic-actions.ts`)

| Action | Description | Permissions |
|--------|-------------|-------------|
| `createEpic()` | Create new epic | MANAGER/ADMIN |
| `updateEpic()` | Edit epic details | MANAGER/ADMIN |
| `deleteEpic()` | Delete epic (unlink tasks) | MANAGER/ADMIN |
| `getEpicsByBoard()` | List epics for board | All members |
| `getEpicDetail()` | Get epic with tasks | All members |

### Issue Link Actions (`actions/issue-link-actions.ts`)

| Action | Description | Permissions |
|--------|-------------|-------------|
| `createIssueLink()` | Create task link | All members |
| `deleteIssueLink()` | Remove task link | All members |
| `getTaskIssueLinks()` | Get links for task | All members |

## Navigation

### Manager Sidebar
1. Dashboard → `/manager`
2. Team Boards → `/manager/boards`
3. **Backlog** → `/manager/backlog`
4. **Sprints** → `/manager/sprints`
5. **Epics** → `/manager/epics`
6. Team Members → `/manager/team`
7. Analytics → `/manager/analytics`
8. Audit Logs → `/manager/logs`

### Member Sidebar
1. My Dashboard → `/member`
2. Boards → `/member/boards`
3. **My Sprints** → `/member/sprints`
4. **My Backlog** → `/member/backlog`
5. **Epics** → `/member/epics`
6. Reports → `/member/reports`
7. My Activity → `/member/logs`

## Notifications

Three new notification types added:

| Type | Trigger | Recipients |
|------|---------|-----------|
| `SPRINT_STARTED` | Sprint status → ACTIVE | All task assignees in sprint |
| `SPRINT_COMPLETED` | Sprint status → COMPLETED | Board members |
| `TASK_ADDED_TO_SPRINT` | Task assigned to sprint | Task assignee |

## Automation

Two new automation triggers:

| Trigger | Description |
|---------|-------------|
| `SPRINT_STARTED` | When a sprint starts |
| `SPRINT_COMPLETED` | When a sprint completes |

New conditions:
- `issueType=BUG`, `issueType=FEATURE`, `issueType=STORY`
- `hasSprint=true`, `hasSprint=false`

## Quick Start

### For Managers

1. Go to **Manager → Backlog** to see unscheduled tasks
2. Go to **Manager → Sprints** and click "New Sprint"
3. Set name, goal, start/end dates → Create
4. Go back to **Backlog**, click tasks → "Add to Sprint"
5. When ready, click **Start** on the sprint card
6. Track progress in **Sprint Detail** view
7. Click **Complete** when sprint ends

### For Members

1. Go to **Member → My Sprints** to see active sprints
2. Click a sprint to view tasks and metrics
3. Go to **Member → My Backlog** to see unscheduled tasks
4. Click tasks to edit issue type and story points

## Technical Notes

- All pages auto-detect the user's first available board if no `boardId` query param is provided
- Sprint status transitions are validated server-side
- Deleting a sprint with tasks is blocked (must remove tasks first)
- Deleting an epic unlinks tasks but doesn't delete them
- Issue links are board-scoped (can't link tasks across boards)
- Self-linking is prevented
- All mutations create audit log entries
- Real-time socket events emitted for sprint/epic changes
