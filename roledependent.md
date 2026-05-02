Here is a **role‑based features checklist with clear dependencies** – each feature shows who can do it and what other modules it requires.

---

## ROLE‑BASED FEATURES CHECKLIST (with Dependencies)

### Module 1 – User Authentication & Role Management (No dependencies)

- [ ] Sign up, log in, log out – **All roles** (Admin, Manager, Member)
- [ ] JWT token generation and verification – **All roles**
- [ ] Password reset via email – **All roles**
- [ ] Edit own profile (name, password) – **All roles**
- [ ] View all users, change roles, delete users – **Admin only**
- [ ] Create new user (manual) – **Admin only**

---

### Module 2 – Role‑Based Dashboards (Depends on: Module 1)

- [ ] Redirect to role‑specific dashboard after login – **All roles**
- [ ] Admin dashboard: user table, audit log viewer, all boards – **Admin only**
- [ ] Manager dashboard: team boards, metrics, bottleneck alerts, create board button – **Manager only**
- [ ] Member dashboard: “My Tasks”, focus mode, activity feed, notifications – **Member only**
- [ ] Real‑time widget refresh via Socket.io – **All roles**

---

### Module 3 – Board & Column Management (Depends on: Module 1)

- [ ] Create, edit, delete any board – **Admin, Manager** (Manager only for own team)
- [ ] Add/remove any member to any board – **Admin** (Manager for own team)
- [ ] Create, rename, reorder, delete columns – **Admin, Manager** (Manager for own boards)
- [ ] Set WIP limit on columns – **Admin, Manager**
- [ ] View boards they are member of – **All roles**

---

### Module 4 – Task CRUD (Depends on: Module 3)

- [ ] Create task (any column) – **All roles** (Member can only self‑assign)
- [ ] Edit task (title, description, priority, due date) – **Admin, Manager** (Member only own assigned)
- [ ] Delete task – **Admin, Manager** (Member only own assigned)
- [ ] View task details – **All roles** (if board member)
- [ ] Task version increments on each edit – **All roles** (automatic)

---

### Module 5 – Task Assignment (Depends on: Modules 1, 4)

- [ ] Assign task to self – **Member**
- [ ] Assign task to any team member – **Manager**
- [ ] Assign task to any user – **Admin**
- [ ] Unassign task – **All roles** (with edit permission)
- [ ] View unassigned tasks count – **Manager, Admin**

---

### Module 6 – WIP Limit Enforcement (Depends on: Modules 3, 4)

- [ ] Set/change WIP limit – **Admin, Manager** (Manager for own boards)
- [ ] Move task into full column (normal) – **All roles** (Member blocked, Manager/Admin allowed)
- [ ] Override WIP limit (force move) – **Manager, Admin**
- [ ] See visual warning (red border) on full column – **All roles**

---

### Module 7 – Real‑Time Collaboration (Depends on: Modules 3, 4)

- [ ] Receive live task updates (move, edit, create, delete) – **All roles**
- [ ] See who is viewing the board (avatar list) – **All roles**
- [ ] See who is editing a task – **All roles**
- [ ] Join/leave presence room automatically – **All roles**

---

### Module 8 – Undo & Conflict Resolution (Depends on: Modules 4, 7)

- [ ] Undo own last action (30 sec window) – **All roles**
- [ ] Detect version conflict on simultaneous edits – **All roles**
- [ ] Resolve conflict via modal (Overwrite, Refresh, Merge) – **All roles**

---

### Module 9 – Offline Action Queue (Depends on: Module 4)

- [ ] Queue actions when offline (create, move, edit, comment) – **All roles**
- [ ] Sync queue on reconnect (FIFO) – **All roles**
- [ ] Handle failed sync & manual resolution – **All roles**
- [ ] Clear pending queue – **All roles**

---

### Module 10 – Automation & Workflow Rules (Depends on: Modules 4, 7, 11)

- [ ] Create, edit, delete automation rules – **Admin** (global), **Manager** (board‑only)
- [ ] Enable/disable rules – **Admin, Manager**
- [ ] View rule execution log – **Admin, Manager**
- [ ] Member: cannot manage rules – **Member**

---

### Module 11 – Notifications (Depends on: Modules 5, 7, 10)

- [ ] Receive in‑app notifications – **All roles**
- [ ] Mark as read, delete, view list – **All roles**
- [ ] Configure email preferences – **All roles**
- [ ] Receive system‑wide notifications – **Admin only** (optional)

---

### Module 12 – Reporting & Flow Metrics (Depends on: Module 4)

- [ ] Access reports page – **Admin, Manager** (Member no access)
- [ ] View metrics for any board – **Admin**
- [ ] View metrics for own team boards – **Manager**
- [ ] Export CSV/PDF – **Admin, Manager**

---

### Module 13 – Audit Log (Depends on: All modules)

- [ ] View full audit log – **Admin only**
- [ ] View team audit log – **Manager only**
- [ ] View own action log – **Member only**
- [ ] Export audit log – **Admin only**

---

### Module 14a – Comments (Depends on: Module 4)

- [ ] Add, edit own comment (5 min window) – **All roles** (with view access)
- [ ] Delete own comment – **All roles**
- [ ] Delete any comment on team task – **Manager, Admin**
- [ ] @mention user – **All roles**

---

### Module 14b – Attachments (Depends on: Module 4)

- [ ] Upload file (max 10MB) – **All roles** (with edit permission)
- [ ] Delete own attachment – **All roles**
- [ ] Delete any attachment on team task – **Manager, Admin**

---

### Module 14c – Tags (Depends on: Modules 3, 4)

- [ ] Create global tags – **Admin only**
- [ ] Create board‑specific tags – **Manager only**
- [ ] Add/remove tags on task – **All roles** (with edit permission)
- [ ] Filter board by tag – **All roles**

---

### Module 14d – Checklists (Depends on: Module 4)

- [ ] Add, edit, delete checklist items – **All roles** (with edit permission)
- [ ] Mark items complete – **All roles**

---

### Module 14e – Time Tracking (Depends on: Module 4)

- [ ] Log time on task – **All roles** (with edit permission)
- [ ] Edit/delete own time entries – **All roles**
- [ ] View team time entries – **Manager only**

---

### Module 14f – Review & Approval (Depends on: Modules 4, 11)

- [ ] Submit task for review – **All roles** (with edit permission)
- [ ] Approve, request changes, reject – **Reviewer** (Manager or assigned user)
- [ ] View review status – **All roles** (with view access)

---

### Module 14g – Task Activity Log (Depends on: Module 4)

- [ ] View per‑task timeline – **All roles** (with view access)
- [ ] Filter by activity type – **All roles**

---

## Dependency Summary (Module‑to‑Module)

| Module | Depends On |
|--------|------------|
| 1 (Auth) | None |
| 2 (Dashboards) | 1 |
| 3 (Boards) | 1 |
| 4 (Tasks) | 3 |
| 5 (Assignment) | 1, 4 |
| 6 (WIP) | 3, 4 |
| 7 (Real‑time) | 3, 4 |
| 8 (Undo) | 4, 7 |
| 9 (Offline) | 4 |
| 10 (Automation) | 4, 7, 11 |
| 11 (Notifications) | 5, 7, 10 |
| 12 (Reporting) | 4 |
| 13 (Audit Log) | All |
| 14a‑14g (Task Detail) | 4, 11 |

---

This checklist tells you **who** can do what and **what must be built first**. Use it to plan your development sprints.