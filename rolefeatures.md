# Smart Task Manager – Complete Role-Based Features Specification
**Fully Detailed & Production-Ready**  
**Version:** 2.4  
**Date:** April 13, 2026  
**Prepared by:** Asef Ahmed  

This document contains **only** the role-based features of Smart Task Manager.  
All features are strictly enforced on the **server side** (Next.js API Routes + Prisma) and **client side** (Redux role checks + shadcn/ui conditional rendering).  

Every user has **exactly one role**. Roles are stored in the `User` model and embedded in the JWT token.

---

### 1. Role Hierarchy 


**Enforcement Rule:**  
- Server-side role check in **every** API Route Handler.  
- Frontend UI hides/disables elements based on Redux-stored role.  
- Database queries are scoped by role and board membership.

---

### 2. Role-Based Capability Matrix (Full Overview)

| Feature / Capability                          | Admin          | Team Manager         | Team Member          |
|-----------------------------------------------|----------------|----------------------|----------------------|
| User Account Management (create/edit/delete)  | ✅ Full        | ❌                   | ❌                   |
| Role Assignment                               | ✅ Full        | ❌                   | ❌                   |
| Platform-wide Audit Log                       | ✅ Full        | ❌                   | ❌                   |
| Board & Column Creation / Management          | ✅             | ✅                   | ❌                   |
| Set / Edit WIP Limits                         | ✅             | ✅                   | ❌                   |
| No-Code Automation Rules                      | ✅             | ✅                   | ❌                   |
| Swimlane View                                 | ✅             | ✅                   | View only            |
| Full Flow Metrics & Throughput Dashboard      | ✅             | ✅                   | Limited (own tasks)  |
| Override WIP Limits                           | ✅             | ✅                   | ❌                   |
| Delete Any Task                               | ✅             | ✅                   | ❌                   |
| Assign Task to Anyone                         | ✅             | ✅                   | Self only            |
| Create / Update / Move Tasks                  | ✅             | ✅                   | ✅                   |
| Focus Mode (F key)                            | Optional       | ✅                   | ✅ Full              |
| Full Undo History (20 steps)                  | ✅             | ✅                   | ✅                   |
| Offline Action Queue                          | ✅             | ✅                   | ✅                   |
| Live Presence Avatars on Cards                | ✅             | ✅                   | ✅                   |
| **Live Cursor** (who is editing this card)    | ✅             | ✅                   | ✅                   |
| Due Timeline on Every Card                    | ✅             | ✅                   | ✅                   |
| Visual Card Aging                             | ✅             | ✅                   | ✅                   |
| Dependency Arrows                             | ✅             | ✅                   | View only            |
| Command Palette (Cmd+K)                       | ✅             | ✅                   | ✅                   |
| Conflict Resolution Modal                     | ✅             | ✅                   | Participates         |
| Hard WIP Enforcement (physical block)         | Can override   | Can override         | Hard blocked         |

---

### 3. Admin Role – Full Platform Governance Features

**Scope:** Platform-wide (all boards and users)

**Text Description of All Features:**
- Full user lifecycle management in dedicated `/admin` panel (create, edit, deactivate, reactivate, reset password).
- Role assignment with safety rule (cannot demote the last active Admin).
- Platform-wide audit log showing every mutation across the entire system.
- Can act as super-user on any board (create boards, set WIP, build rules, delete tasks, override everything).
- All admin actions are logged in AuditLog.

**Server Enforcement:**  
All `/api/admin/*` routes return 403 if `session.user.role !== "ADMIN"`.

---

### 4. Team Manager Role – Workflow Control Features

**Scope:** Boards they own or manage

**Text Description of All Features:**
- Create, archive, and fully manage boards and workflow columns.
- Set per-column WIP limits (hard enforcement for everyone else).
- Build and manage **No-Code Automation Rules** (visual builder with triggers, conditions, actions).
- Override WIP limits with confirmation modal when needed.
- Access Swimlane View, full Flow Metrics (Cycle Time, Lead Time), and 90-day Throughput Calendar.
- Board-level audit log.
- Assign tasks to **anyone** on the board.
- Delete any task.
- All manager actions are logged and broadcast via Socket.io.

**Server Enforcement:**  
API routes check `if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") return 403`.

---

### 5. Team Member Role – Focused Execution Features

**Scope:** Only boards they are invited to

**Text Description of All Features:**
- Create tasks, update fields, move tasks between columns (subject to hard WIP enforcement).
- Self-assign only (cannot assign to others).
- Use **Focus Mode** (F key) – instantly hides/distraction-fades all non-assigned cards.
- Full Undo History (Cmd/Ctrl+Z, own actions only, 20 steps).
- Offline Action Queue (all actions work offline and replay on reconnect).
- See **Due Timeline** on every card (“Due in 2 days”, color-coded).
- See **Live Cursor** (✏️ + initials) showing exactly who is editing any card.
- See Live Presence avatars and visual card aging.
- Participate in Conflict Resolution when version conflict occurs.
- Cannot delete tasks, change WIP limits, create rules, or view full metrics.

**Server Enforcement:**  
Assignment and delete routes explicitly block Members. WIP enforcement is hard-coded for Members.

---

### 6. Shared Features (Role-Aware – Available to All)

These features work for everyone but behave differently based on role:

| Shared Feature                     | How It Behaves by Role                                      |
|------------------------------------|-------------------------------------------------------------|
| Hard WIP Enforcement               | Members = hard blocked<br>Managers/Admins = can override    |
| Live Cursor (who is editing)       | Visible to all roles                                        |
| Due Timeline on cards              | Visible to all roles                                        |
| Live Presence Avatars              | Visible to all roles                                        |
| Visual Card Aging                  | Visible to all roles                                        |
| Dependency Arrows                  | Create = Manager/Admin<br>View only = Member                |
| Command Palette (Cmd+K)            | Full access for all roles                                   |
| Conflict Resolution Modal          | All roles participate                                       |
| Immutable Audit Log                | Member = own actions only<br>Manager = board level<br>Admin = platform-wide |

---

### 7. How Role Enforcement Works (Server-Side & Client-Side)

**Server-Side (Every API Route):**
```ts
const session = await getServerSession(authOptions);
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const role = session.user.role;

// Example for WIP override
if (action === "WIP_OVERRIDE" && role !== "MANAGER" && role !== "ADMIN") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}