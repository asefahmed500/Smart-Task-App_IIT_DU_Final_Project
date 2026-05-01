Here is a **plain‑text feature checklist with dependencies and role requirements** – no code, no tables, just a clean list. Use it to track what needs to be built and what each feature depends on.

---

## SMART TASK MANAGER – FEATURE CHECKLIST WITH DEPENDENCIES

### Module 1: User Authentication & Role Management

**Dependencies:** None

- Sign up with email and password (all roles)
- Log in with email and password (all roles)
- Log out (all roles)
- JWT token generation on login (all roles)
- JWT verification on protected routes (all roles)
- Password hashing with bcrypt (all roles)
- Password reset via email link (expires 1 hour) (all roles)
- Change own password (all roles)
- Edit own name (all roles)
- Admin only: view list of all users
- Admin only: change any user’s role (Member/Manager/Admin)
- Admin only: delete any user
- Admin only: edit any user’s details (name, email)

---

### Module 2: Role‑Based Dashboards

**Dependencies:** Module 1

- Redirect to correct dashboard after login (all roles)
- Admin dashboard: user management table
- Admin dashboard: system audit log viewer
- Admin dashboard: overview of all boards
- Manager dashboard: list of team boards
- Manager dashboard: team performance metrics (throughput, cycle time)
- Manager dashboard: bottleneck alerts
- Manager dashboard: “Create board” button
- Member dashboard: “My Tasks” list
- Member dashboard: focus mode (limit active tasks)
- Member dashboard: recent activity feed
- Member dashboard: notifications summary
- Responsive layout for all dashboards
- Real‑time widget refresh via Socket.io (all roles)
- Sidebar navigation with avatar and logout (all roles)

---

### Module 3: Board & Column Management

**Dependencies:** Module 1

- Admin: create any board
- Manager: create board for own team
- Member: cannot create board
- Board has name and description
- Board has member list
- Admin: add/remove any member to any board
- Manager: add/remove team members to own boards
- Edit board name/description (Admin, Manager for own boards)
- Delete board with cascade delete (Admin, Manager for own boards)
- User sees only boards they are member of (all roles)
- Default columns (To Do, In Progress, Done) on board creation
- Add new column (Admin, Manager for own boards)
- Rename column (Admin, Manager for own boards)
- Reorder columns by drag‑and‑drop (Admin, Manager for own boards)
- Delete column (tasks moved to another column) – Admin, Manager for own boards
- Set WIP limit per column (default 0 = unlimited) – Admin, Manager for own boards
- Kanban view (columns side by side) with horizontal scroll (all roles)

---

### Module 4: Task CRUD

**Dependencies:** Module 3

- Create task in any column (role‑permitted)
- Task title required (all roles)
- Task description with Markdown support (all roles)
- Priority (Low, Medium, High) (all roles)
- Due date optional (all roles)
- Assignee optional (all roles)
- Creation and update timestamps (automatic)
- Edit task title, description, priority, due date (Admin, Manager for any; Member only own assigned)
- Admin: delete any task
- Manager: delete any task in team board
- Member: delete only tasks assigned to self
- Task card shows title, priority badge, due date, assignee avatar (all roles)
- Click card opens task detail view (all roles)
- Task version number increments on each edit (all roles)

---

### Module 5: Task Assignment

**Dependencies:** Module 1, Module 4

- Member: assign only to self
- Manager: assign to any team member
- Admin: assign to any user
- Unassigned tasks appear in “Unassigned” section/column (all roles)
- Assignment triggers real‑time notification (assignee sees it)
- Reassignment triggers notification to new assignee
- Unassign task (set assignee to null) – allowed for anyone with edit permission
- Assignment history recorded in audit log
- Manager dashboard shows count of unassigned tasks

---

### Module 6: WIP Limit Enforcement

**Dependencies:** Module 3, Module 4

- Configurable WIP limit per column (Admin, Manager for own boards)
- Column shows current count / limit (e.g., “3/5”) (all roles)
- When limit reached, Member cannot drag task into column (blocked)
- API returns error when Member tries to move into full column
- Manager can override WIP limit (force move)
- Admin can override WIP limit (force move)
- Override action logged in audit log
- Visual warning (red border) on full column (all roles)
- WIP limit = 0 means unlimited

---

### Module 7: Real‑Time Collaboration & Live Presence

**Dependencies:** Module 3, Module 4

- Socket.io connection on board page (all roles)
- Each board has a unique Socket.io room
- Task movement updates instantly on all clients
- Task edit updates instantly on all clients
- New task appears instantly on all clients
- Task deletion removes instantly on all clients
- Show who is viewing the board (avatar list) (all roles)
- Show who is editing a specific task (all roles)
- Typing/cursor indicator (all roles)
- User joins presence room on board open (all roles)
- User leaves presence room on board close (all roles)
- Presence list updates in real‑time
- Connection status indicator (online/offline) (all roles)

---

### Module 8: Undo History & Conflict Resolution

**Dependencies:** Module 4, Module 7

- Store last 5 actions per user in memory/Redis (server)
- Undo button appears after action (all roles)
- Undo button disappears after 30 seconds (all roles)
- Undo restores previous state (task position, content) (all roles)
- Undo action logged in audit log
- Task version field – increments on each update
- Client sends current version with every update
- Server rejects update if version mismatch (returns HTTP 409)
- Conflict modal appears on mismatch (all roles)
- Conflict options: Overwrite, Refresh, Merge (all roles)
- User notified of successful or failed undo

---

### Module 9: Offline Action Queue

**Dependencies:** Module 4

- Service Worker registered (all roles)
- IndexedDB setup for storing offline actions
- Queue stores action type, payload, timestamp, retry count
- Actions queued when network offline
- Offline mode banner appears
- Pending sync count displayed (e.g., “3 actions pending”)
- Queue processed in FIFO order when network returns
- Failed actions retried up to 3 times
- Permanent failures shown to user for manual resolution
- Offline supported: create task, move task, edit task, add comment
- Offline blocked: file uploads, delete board, change WIP limits
- User can clear pending queue manually

---

### Module 10: Automation & Workflow Rules

**Dependencies:** Module 4, Module 7, Module 11

- Manager can create automation rules for own board
- Admin can create global rules (applies to all boards)
- Rule builder UI with trigger, condition, action (Admin, Manager)
- Trigger types: status change, priority change, due date approaching, new task
- Conditions: priority = High, assignee = null, column = In Progress, etc.
- Action types: assign task, move task, send notification, add tag
- Example rule: auto‑assign when moved to In Progress
- Example rule: notify manager on High priority + due soon
- Rules evaluated on every task update (asynchronous)
- Rules can be enabled/disabled without deletion
- Rules can be edited and deleted
- Rule execution logged in audit log
- Member: cannot create, edit, or delete rules

---

### Module 11: Notifications System

**Dependencies:** Module 5, Module 7, Module 10

- Bell icon with unread badge (all roles)
- Notification dropdown list (all roles)
- Real‑time notifications via Socket.io (all roles)
- Notification on task assignment
- Notification on status change (if you are assignee or creator)
- Notification on @mention in comment
- Notification on automation trigger
- Due date reminder (24 hours before)
- Overdue notification
- Mark single notification as read (all roles)
- Mark all as read (all roles)
- Delete notification (all roles)
- Email notifications (optional per user, all roles)
- Notification preferences page (choose which types to receive)
- Push notifications (optional, browser permission)

---

### Module 12: Reporting & Flow Metrics

**Dependencies:** Module 4

- Reports page accessible only to Admin and Manager
- Date range filter (last 7 days, 30 days, custom)
- Board filter (for Manager: only own boards; for Admin: any)
- Task completion rate chart (Admin, Manager)
- Cycle time calculation (time from In Progress to Done)
- Lead time calculation (time from creation to Done)
- Team throughput chart (tasks completed per day/week)
- Bottleneck detection (column with highest average stay)
- Average completion time by priority (Admin, Manager)
- Tasks completed by assignee (leaderboard)
- Export report as CSV (Admin, Manager)
- Export report as PDF (Admin, Manager)
- Auto‑refresh or manual refresh button
- Member: no access to reports page

---

### Module 13: Audit Log & Activity Tracking

**Dependencies:** All modules (via middleware)

- Every API write request logged (automatically)
- Audit log table with: id, userId, action, details (JSON), ipAddress, createdAt
- Audit log is append‑only (no updates or deletes)
- Admin: view full system audit log
- Manager: view audit log for own team’s boards and team members
- Member: view only own actions
- Filter audit log by user, action type, date range (Admin, Manager)
- Search audit log (Admin, Manager)
- Sort by date (newest first) (Admin, Manager)
- Export audit log as CSV (Admin only)
- Log critical actions: login, role change, board delete, WIP override
- Retention period 90 days (auto‑delete older logs)

---

### Module 14a: Comments & Discussion

**Dependencies:** Module 4

- Comment section on task detail page (all roles with view access)
- Add comment (all roles with edit permission)
- Comment supports Markdown (all roles)
- Edit own comment within 5 minutes (all roles)
- Delete own comment (all roles)
- Manager: delete any comment on team task
- Admin: delete any comment
- Comment pagination (“Load more”) (all roles)
- @mention user in comment triggers notification (all roles)
- Comment reactions (👍, 🚀, ❤️) (all roles)

---

### Module 14b: Attachments & File Management

**Dependencies:** Module 4

- Upload file to task (all roles with edit permission)
- Supported types: images, PDF, DOCX, XLSX, TXT (all roles)
- File size limit 10MB (enforced on frontend and backend)
- Image preview in task detail (all roles)
- Other files show download link (all roles)
- Delete own attachment (all roles)
- Manager: delete any attachment on team task
- Admin: delete any attachment
- Upload progress indicator (all roles)
- Multiple file upload support (all roles)
- Attachment stored in cloud storage (AWS S3 or Cloudinary)

---

### Module 14c: Tags & Labeling

**Dependencies:** Module 3, Module 4

- Admin: create global tags (available on all boards)
- Manager: create board‑specific tags (for own boards)
- Tag has name and hex color (Admin, Manager)
- User with edit permission can add/remove tags from task
- Tag chips shown on task card and detail view (all roles)
- Board view can filter tasks by tag (all roles)
- Tag usage count shown in tag management (Admin, Manager)

---

### Module 14d: Checklists & Sub‑tasks

**Dependencies:** Module 4

- Add checklist to task (all roles with edit permission)
- Checklist has title and list of items (all roles)
- Mark checklist item complete/incomplete (all roles)
- Progress bar shows completion (e.g., “3/5 completed”) (all roles)
- Add new checklist item (all roles with edit permission)
- Edit checklist item (all roles with edit permission)
- Delete checklist item (all roles with edit permission)
- Multiple checklists per task allowed

---

### Module 14e: Time Tracking

**Dependencies:** Module 4

- Log time on task (hours, minutes, description) (all roles with edit permission)
- Total logged time shown on task (all roles)
- Edit own time entry (all roles)
- Delete own time entry (all roles)
- Manager: view time entries for team tasks (read‑only)
- Time entries appear in task activity log (all roles)

---

### Module 14f: Review & Approval

**Dependencies:** Module 4, Module 11

- Submit task for review (status changes to “Pending Review”) – all roles with edit permission
- Assign reviewer (Manager or specific user) – submitter chooses
- Reviewer can Approve, Request Changes, or Reject
- Request Changes requires feedback comment (enforced)
- Task status updates based on review outcome
- Review history tracked (who reviewed, when, outcome)
- Notification sent to task creator on review completion
- All roles with view access can see review status and history

---

### Module 14g: Task Activity Log

**Dependencies:** Module 4

- Separate activity log per task (timeline view) – all roles with view access
- Shows: status changes, assignee changes, comments, attachments, tags, checklist completions, review outcomes
- Activity log is read‑only (all roles)
- Filterable by activity type (all roles)
- Real‑time update when new activity occurs (all roles)

---

## Summary of Role Capabilities (Text)

**Admin:**  
Full control over users, roles, all boards, all tasks, all comments, all attachments, global automation rules, full audit log, all reports. No restrictions.

**Manager:**  
Create and manage own team’s boards. Set and override WIP limits. Assign tasks to team members. Create automation rules for own boards. View team reports and team audit logs. Delete any comment/attachment on team tasks.

**Member:**  
Self‑assign tasks. Edit/delete only tasks assigned to self. Add comments and upload attachments on tasks they can view. Use offline queue. Cannot create boards, cannot set or override WIP limits, cannot access reports page, sees only own audit log actions.

---

This checklist shows every feature, what it depends on, and who can use it. Use it to plan your development and track completion.