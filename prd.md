Here is a **clean, plain‑text PRD** based exactly on your project proposal. It describes the full system flow and explains how every role‑based feature works. No tables, no markdown – just readable text.

---

## SMART TASK MANAGER – COMPLETE PRD (Plain Text)

### 1. SYSTEM PURPOSE

The Smart Task Manager is a real‑time Kanban board that enforces Work‑In‑Progress (WIP) limits. It helps teams visualise tasks, collaborate instantly, work offline, and get intelligent reports. The system has three roles: Admin, Team Manager, and Team Member.

---

### 2. OVERALL SYSTEM FLOW

A user signs up. An Admin assigns a role. After login, the user sees a dashboard tailored to their role. Managers create boards with columns (To Do, In Progress, Done). Members add tasks as cards. Tasks can be moved between columns. If a column reaches its WIP limit, only Managers or Admins can move more tasks into it. All changes appear instantly on all screens via WebSockets. When offline, actions are queued locally and sync later. Managers can set no‑code automation rules. Reports show cycle time, bottlenecks, etc. Every action is recorded in an immutable audit log. Admins can see everything; Managers see their team; Members see only their own work.

---

### 3. ROLE‑BASED FEATURE FLOW (Detailed)

#### 3.1. User Login and Authentication

How it works:  
- Anyone can sign up with email and password.  
- Password is hashed with bcrypt.  
- On login, the server returns a JWT token.  
- The token is sent with every API request.  

Role behaviour:  
- All roles go through the same login/signup process.  
- The JWT contains the user’s role (Admin, Manager, Member).  
- After login, the system redirects to the role‑specific dashboard.

Admin‑only actions after login:  
- View all users, change roles, delete users, edit user details.

All users:  
- View own profile, edit name, change password, request password reset.

---

#### 3.2. Role‑Based Dashboards

How it works:  
- After login, the frontend fetches `/api/dashboard`.  
- The server checks the JWT role and returns different data.

**Admin Dashboard** (what Admin sees):  
- User management table (list, edit, delete, change role).  
- System‑wide audit log viewer (every action in the system).  
- List of all boards (overview).  
- Buttons to edit any board or user.

**Manager Dashboard** (what Manager sees):  
- List of boards the Manager owns or is a member of (team boards).  
- Team performance metrics: throughput (tasks completed per week), cycle time (time from In Progress to Done).  
- Bottleneck alerts: columns where tasks stay the longest.  
- A “Create new board” button.  
- Unassigned tasks count for the team.

**Member Dashboard** (what Member sees):  
- “My Tasks” list – tasks assigned to the member.  
- Focus mode – only shows a limited number of active tasks (e.g., 3) to prevent overload.  
- Recent activity feed – what happened on boards the member is in.  
- Notifications summary – unread notifications.

All dashboards:  
- Real‑time updates via Socket.io (new tasks, moves appear without refresh).  
- Sidebar navigation, avatar, logout button.  
- Responsive layout (works on mobile).

---

#### 3.3. Board and Column Management

How it works:  
- Managers click “Create Board”, give a name and description.  
- Default columns: To Do, In Progress, Done.  
- They can add more columns, rename them, reorder by drag‑and‑drop, or delete a column (tasks moved to another column).  
- Each column has a settable WIP limit (default 0 = unlimited).  
- Admin can also create boards and manage members of any board.

Role behaviour:  
- Admin: create, edit, delete ANY board; add or remove ANY user as member.  
- Manager: create, edit, delete boards for their own team; add/remove team members.  
- Member: cannot create boards; can only view boards they have been added to.  
- When a board is deleted, all its tasks, comments, and attachments are deleted (cascade).

---

#### 3.4. Task CRUD (Create, Read, Update, Delete)

How it works:  
- On a board, click “Add Task” in any column.  
- Fill in title (required), description (Markdown), priority (Low/Medium/High), due date (optional), assignee (optional).  
- The task appears as a card on the board.  
- Click the card to open the full detail view (includes comments, attachments, etc.).  
- From the detail view, edit any field.  
- Delete task if permitted.

Role behaviour:  
- Admin: can create, edit, delete ANY task on ANY board.  
- Manager: can create, edit, delete tasks on their team’s boards.  
- Member: can create tasks (but only assign to themselves); can edit/delete only tasks assigned to themselves.  
- Every task has a “version” number that increments on each edit (used for conflict detection).

---

#### 3.5. Task Assignment

How it works:  
- On the task form, click the assignee dropdown.  
- The dropdown shows eligible users based on the assigner’s role.  
- After assignment, the assignee gets a real‑time notification.  
- Unassigned tasks appear in a special “Unassigned” section or column.

Role behaviour:  
- Member: dropdown shows only “Assign to me” or “Unassigned”. Member cannot assign to another person.  
- Manager: dropdown shows all members of the team. Can assign to any team member.  
- Admin: dropdown shows all users in the system. Can assign to anyone.  
- Unassign (set assignee to null) allowed for anyone with edit permission.

---

#### 3.6. Work‑In‑Progress (WIP) Limit Enforcement

How it works:  
- Each column has a WIP limit (e.g., 3).  
- When a user drags a task into that column, the server counts tasks already in that column.  
- If count >= limit, the move is blocked for non‑managers.  
- If the user is Manager or Admin, they can override and the move is allowed.  
- Override action is recorded in the audit log.

Role behaviour:  
- Admin: can set WIP limit on any column; can always override.  
- Manager: can set WIP limit on team board columns; can override on team boards.  
- Member: cannot set or change WIP limits; cannot override – always blocked when column full.  
- UI shows a red border on a full column and a counter (e.g., “3/5”).

---

#### 3.7. Real‑Time Collaboration and Live Presence

How it works:  
- When a user opens a board, a Socket.io connection is made to a room named “board:ID”.  
- Every task move, edit, create, or delete is broadcast to all clients in that room.  
- Additionally, when a user starts editing a task, they emit a “cursor” event so others see “User is editing…”.  
- User joins a presence list on open, leaves on close.

Role behaviour:  
- All roles see the same real‑time updates.  
- All roles can see who is viewing the board (avatar list) and who is editing a task.  
- No role can disable presence for others.

---

#### 3.8. Undo History and Conflict Resolution

How it works:  
- The server stores the last 5 actions per user (in memory or Redis).  
- After an action, an “Undo” button appears in the UI for 30 seconds.  
- Clicking Undo sends a request to reverse that action.  
- For conflicts: each task has a version number. When a user edits a task, they send the version they have. If the server’s version is higher, a conflict is detected.  
- The UI shows a modal with options: Overwrite (discard server version), Refresh (discard my changes), or Merge (manual diff).

Role behaviour:  
- All roles can undo their own actions.  
- All roles experience conflict resolution the same way.  
- Undo actions are also logged in the audit log.

---

#### 3.9. Offline Action Queue

How it works:  
- A Service Worker is registered. When the browser goes offline, all task‑related actions (create, move, edit, add comment) are stored in IndexedDB instead of being sent to the server.  
- A banner shows “Offline mode – changes will sync later”.  
- When connection returns, the queue is processed in FIFO order.  
- Failed actions are retried up to 3 times, then shown to the user for manual resolution.

Role behaviour:  
- All roles have the same offline capabilities.  
- Offline supported actions: create task, move task, edit task, add comment.  
- Offline blocked actions: file uploads, delete board, change WIP limits (because they need immediate consistency).  
- Any role can clear the pending queue manually.

---

#### 3.10. Automation and Workflow Rules

How it works:  
- Managers (or Admins) go to the Automation Rules page.  
- They define a rule: trigger (e.g., “task moved to In Progress”), condition (e.g., “priority is High”), and action (e.g., “send notification to manager”).  
- The rule is stored in the database.  
- Whenever a task is updated, the server evaluates all rules for that board. If a rule’s trigger and condition match, the action is executed asynchronously (does not block the user).

Role behaviour:  
- Admin: can create global rules that apply to all boards.  
- Manager: can create rules only for boards they manage.  
- Member: cannot create, edit, or delete rules.  
- Rules can be enabled/disabled without deletion.  
- Rule execution is logged in the audit log.

---

#### 3.11. Notifications System

How it works:  
- When an event occurs (task assigned, @mention, status change, etc.), the server creates a `Notification` record and emits a Socket.io event to the target user.  
- The user sees a red badge on the bell icon.  
- Clicking the bell shows a dropdown of recent notifications.  
- Clicking a notification marks it read and opens the related task.  
- Users can set email preferences (optional).

Role behaviour:  
- All roles receive notifications for events they are involved in.  
- Admin receives system‑wide notifications (e.g., new user signup – optional).  
- Manager receives team‑related notifications.  
- Member receives only personal notifications (tasks assigned, @mentions, status changes of their tasks).  
- Notification types: task assignment, status change, @mention, automation trigger, due date reminder, overdue.

---

#### 3.12. Reporting and Flow Metrics

How it works:  
- Managers and Admins go to the Reports page.  
- They select a date range and a board.  
- The server runs aggregate SQL queries on the Task table.  
- The frontend draws charts (completion rate, cycle time, throughput, bottleneck detection).

Role behaviour:  
- Admin: can see reports for any board.  
- Manager: can see reports only for boards they manage.  
- Member: cannot access the Reports page.  
- Metrics: completion rate (%), cycle time (avg days from In Progress to Done), lead time (avg days from creation to Done), throughput (tasks/week), bottleneck (column with highest average stay), leaderboard of tasks completed per assignee.  
- Export to CSV and PDF available for Admin and Manager.

---

#### 3.13. Audit Log and Activity Tracking

How it works:  
- Every API route that modifies data has a middleware that writes to the `AuditLog` table.  
- Record contains: userId, action, details (JSON with before/after), IP address, timestamp.  
- The log is append‑only – no updates or deletes.

Role behaviour:  
- Admin: sees the full system audit log (all users, all boards).  
- Manager: sees only actions that happened on their team’s boards or by their team members.  
- Member: sees only their own actions.  
- Retention: logs older than 90 days are automatically deleted.  
- Export to CSV is available only for Admin.

---

#### 3.14. Task Detail View

This is the page that opens when you click a task card. It contains several sub‑features. Role behaviour is specified per sub‑feature.

**14a. Comments and Discussion**  
- All roles can add comments (if they have view access to the task).  
- Member can edit/delete own comment within 5 minutes.  
- Manager can delete any comment on team tasks.  
- Admin can delete any comment.  
- @mention in a comment sends a notification to the mentioned user.  
- Comments support Markdown, threading, and reactions.

**14b. Attachments and File Management**  
- All roles with edit permission on the task can upload attachments (images, PDF, DOCX, XLSX, TXT, max 10MB).  
- Member can delete own attachments.  
- Manager can delete any attachment on team tasks.  
- Admin can delete any attachment.  
- File is stored in cloud storage (e.g., cloudinary or folder upload ); URL saved in database.  
- Image preview and download links are shown.

**14c. Tags and Labeling**  
- Admin can create global tags (available on all boards).  
- Manager can create board‑specific tags.  
- Any user with edit permission on a task can add/remove tags.  
- Tags are colour‑coded and appear as chips.  
- Board view can be filtered by tag.  
- Tag usage count is shown in tag management.

**14d. Checklists and Sub‑tasks**  
- Any user with edit permission can add checklists to a task.  
- Each checklist has a title and items with checkboxes.  
- Marking an item complete updates a progress bar (e.g., “3/5 completed”).  
- Checklist items can be edited, deleted, reordered.  
- Multiple checklists per task are allowed.

**14e. Time Tracking**  
- Any user with edit permission can log time (hours/minutes) with a description.  
- Total logged time is displayed on the task.  
- User can edit/delete own time entries.  
- Manager can view time entries for team tasks (but not edit/delete unless they are the creator).  
- Time entries appear in the task activity log.

**14f. Review and Approval**  
- Any user with edit permission can submit a task for review (status becomes “Pending Review”).  
- They select a reviewer (Manager or a specific user).  
- Reviewer can Approve, Request Changes (must provide feedback comment), or Reject.  
- Task status updates based on the outcome.  
- Notifications are sent to the task creator on completion.  
- Review history is tracked.

**14g. Task Activity Log**  
- This is a read‑only timeline of everything that happened to the task: creation, status changes, assignee changes, comments, attachments, tags, checklist completions, review outcomes.  
- Any user with view access to the task can see the activity log.  
- Filterable by activity type and updated in real‑time.

---

### 4. DEPENDENCIES BETWEEN MODULES

- Module 1 (Auth & Roles) is required by everything.  
- Module 2 (Dashboards) depends on Module 1.  
- Module 3 (Boards & Columns) depends on Module 1.  
- Module 4 (Task CRUD) depends on Module 3.  
- Module 5 (Task Assignment) depends on Module 1 and Module 4.  
- Module 6 (WIP Limits) depends on Module 3 and Module 4.  
- Module 7 (Real‑time) depends on Module 3 and Module 4.  
- Module 8 (Undo & Conflict) depends on Module 4 and Module 7.  
- Module 9 (Offline Queue) depends on Module 4.  
- Module 10 (Automation) depends on Module 4, Module 7, and Module 11.  
- Module 11 (Notifications) depends on Module 5, Module 7, and Module 10.  
- Module 12 (Reporting) depends on Module 4.  
- Module 13 (Audit Log) depends on all modules.  
- Module 14 (Task Detail sub‑modules) depends on Module 4 and Module 11 (for mentions and review notifications).

---

### 5. DEVELOPMENT TIMELINE (Weeks 1-22)

The proposal includes a Gantt chart. Core modules (Auth, Dashboards, Boards, Tasks) are built first (weeks 1-8). Then real‑time, offline, undo, automation, notifications (weeks 9-15). Reporting and audit log come next (weeks 16-19). Testing and integration occupy weeks 20-21, final submission week 22.

---

### 6. SUMMARY OF ROLE CAPABILITIES

- **Admin**: Full control over users, roles, all boards, all tasks, all comments, all attachments, global automation rules, full audit log, all reports.  
- **Manager**: Create/manage team boards, set WIP limits and override, assign tasks to team members, create board‑level automation rules, view team reports and audit logs (team scope).  
- **Member**: Self‑assign tasks, edit their own tasks, comment/upload on tasks they can see, use offline queue, view personal reports, see own audit log, cannot override WIP limits, cannot create boards.

This PRD captures every feature from your proposal and explains the role‑based flow in clear, linear text. You can use it as your project specification document.