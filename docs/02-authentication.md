# SmartTask — Authentication System

## Table of Contents

- [Overview](#overview)
- [Libraries](#libraries)
- [Database Models](#database-models)
- [JWT & Session Flow](#jwt--session-flow)
- [RBAC & Middleware](#rbac--middleware)
- [API Routes Reference](#api-routes-reference)
- [Server Actions Reference](#server-actions-reference)
- [UI Pages](#ui-pages)
- [Schemas & Validation](#schemas--validation)
- [TypeScript Types](#typescript-types)
- [Email Configuration](#email-configuration)
- [Notification System](#notification-system)
- [Audit Logging](#audit-logging)
- [Complete File Index](#complete-file-index)

---

## Overview

SmartTask uses **custom JWT-based authentication** with HTTP-only cookies. No third-party auth provider (NextAuth, Clerk, etc.). The `jose` library handles HS256 signing with a 7-day token expiry.

**Architecture rules:**
- Login and signup are **API routes** (`POST /api/auth/*`) — NOT server actions
- Cookie operations use the `'use server'` module `lib/auth-server.ts`
- Middleware (`proxy.ts`) decrypts the session cookie on every page request
- Password reset has both API routes AND server actions (the UI uses server actions)
- All mutations are logged to `AuditLog` via `createAuditLog()`

```
┌──────────┐     POST /api/auth/*     ┌──────────────┐     cookies()      ┌────────────────┐
│  Browser │ ─────────────────────────→│  API Routes  │ ───────────────────→│ lib/auth-server│
│          │ ←─────────────────────────│  (route.ts)  │ ←───────────────────│ (use server)   │
└──────────┘     JSON responses        └──────────────┘     getSession()    └───────┬────────┘
       │                                                                             │
       │  Every page request                                                         │
       ▼                                                                             ▼
┌──────────┐     decrypt(cookie)     ┌──────────────┐     encrypt/decrypt    ┌────────────┐
│ proxy.ts │ ◄───────────────────────│  RBAC guard  │ ◄──────────────────────│ lib/auth.ts│
│ (root)   │     allow / redirect    │  & redirect  │    HS256 via jose      │ (jose JWT) │
└──────────┘                         └──────────────┘                        └────────────┘
```

---

## Libraries

| Library | Purpose | Imported In |
|---------|---------|-------------|
| `jose` | JWT creation (`SignJWT`) and verification (`jwtVerify`) with HS256 | `lib/auth.ts` |
| `bcryptjs` | Password hashing (10-12 salt rounds) and comparison | Login API, Signup API, Server Actions |
| `nodemailer` | SMTP email delivery for password reset | `utils/mail.ts` |
| `next/headers` → `cookies()` | HTTP-only cookie read/write | `lib/auth-server.ts` |
| `zod` v4 | Input validation schemas | `lib/schemas.ts`, server actions |
| Node.js `crypto` | `randomBytes(32)` for reset token generation | Password reset API, server actions |

---

## Database Models

### User Model

```prisma
model User {
  id        String   @id @default(cuid())
  name      String?
  email     String   @unique
  password  String               // bcrypt hash
  image     String?
  role      Role     @default(MEMBER)
  isActive  Boolean  @default(true)
  // Relations
  ownedBoards      Board[]              @relation("BoardOwner")
  memberOfBoards   Board[]              @relation("BoardMembers")
  assignedTasks    Task[]               @relation("TaskAssignee")
  createdTasks     Task[]               @relation("TaskCreator")
  comments         Comment[]
  notifications    Notification[]
  notificationPrefs NotificationPreference?
  auditLogs        AuditLog[]
  passwordResetToken PasswordResetToken?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### PasswordResetToken Model

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  email     String   @unique       // One active token per email
  token     String   @unique       // 64-char hex (crypto.randomBytes(32))
  expires   DateTime               // 1 hour from creation
  createdAt DateTime @default(now())
  @@unique([email, token])
}
```

### NotificationPreference Model

```prisma
model NotificationPreference {
  id                  String   @id @default(cuid())
  userId              String   @unique
  taskAssigned        Boolean  @default(true)
  statusChanged       Boolean  @default(true)
  commentMention      Boolean  @default(true)
  automationTriggered Boolean  @default(true)
  dueDateReminder     Boolean  @default(true)
  overdueReminder     Boolean  @default(true)
  reviewRequested    Boolean  @default(true)
  reviewCompleted    Boolean  @default(true)
  newUserSignup      Boolean  @default(true)
  boardMemberAdded   Boolean  @default(true)
  boardMemberRemoved Boolean  @default(true)
  epicUpdated        Boolean  @default(true)
  issueLinkUpdated   Boolean  @default(true)
  emailEnabled       Boolean  @default(false)
  pushEnabled        Boolean  @default(false)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### AuditLog Model

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String               // e.g., LOGIN, SIGNUP, PASSWORD_RESET_COMPLETED
  details   Json                 // Action-specific metadata
  ipAddress String?              // Extracted from x-forwarded-for / x-real-ip
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Role Enum

```prisma
enum Role {
  ADMIN
  MANAGER
  MEMBER
}
```

---

## JWT & Session Flow

### JWT Details

| Property | Value |
|----------|-------|
| Library | `jose` (not `jsonwebtoken`) |
| Algorithm | HS256 (symmetric, shared secret) |
| Secret | `JWT_SECRET` env var; dev fallback `'dev-secret-key-change-in-production'` |
| Expiry | 7 days (`setExpirationTime('7d')`) |
| Payload | `{ id, email, name, image, role }` |

### Cookie Configuration

| Property | Value |
|----------|-------|
| Name | `session` |
| HttpOnly | `true` |
| Secure | `true` in production, `false` in dev |
| SameSite | `lax` |
| Path | `/` |

### Session Lifecycle

```
LOGIN / SIGNUP                        SUBSEQUENT REQUEST                   LOGOUT
──────────────                        ──────────────────                   ──────
login(payload)                        decrypt(cookie)                      logout()
  → encrypt({id,email,name,role})         → jwtVerify(token, key)              → set cookie to ""
  → set cookie 'session' = jwt            → return JWTPayload | null           → expires: Date(0)
  → expires: +7 days
```

**Key behaviors:**
- **No server-side session table** — JWT is stateless, stored only in the cookie
- **No refresh tokens** — single 7-day JWT, session refresh via middleware re-encrypt on each request (updateSession exists but is not currently wired into proxy.ts)
- **No session invalidation on password change** — old JWTs remain valid until expiry
- **No concurrent session tracking** — multiple devices can use the same account

### Session Retrieval

Three methods all resolve to the same code path:

```typescript
// Method 1: Server Components / Server Actions
import { getSession } from '@/lib/auth-server'
const session = await getSession() // reads cookie → decrypt → JWTPayload | null

// Method 2: Client Components
const res = await fetch('/api/auth/me')
const { user } = await res.json()  // calls getSession() internally

// Method 3: Middleware
const cookie = req.cookies.get('session')?.value
const session = await decrypt(cookie)  // imported from lib/auth.ts
```

**Critical:** API route handlers MUST import cookie functions from `@/lib/auth-server.ts` (not `next/headers` directly). Turbopack returns 404 at runtime if `cookies()` is used directly in route files.

---

## RBAC & Middleware

**File:** `proxy.ts` (project root, not `middleware.ts` — Next.js 16 auto-detects it)

### Route Protection Matrix

| Route Prefix | Required Role(s) | Unauthorized → Redirect |
|-------------|-------------------|------------------------|
| `/admin` | `ADMIN` only | `/dashboard` |
| `/manager` | `ADMIN`, `MANAGER` | `/dashboard` |
| `/member` | `ADMIN`, `MANAGER`, `MEMBER` | `/dashboard` |
| `/dashboard`, `/boards`, `/settings`, `/profile` | Any authenticated user | `/login` |
| `/login`, `/signup` | Must be logged OUT | `/dashboard` |
| `/` (landing) | Any authenticated user → role dash | (handled in `app/page.tsx`) |

### Matcher Pattern

```typescript
matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)']
```

API routes, static files, and PNGs bypass middleware.

### Landing Page Redirect

Handled in `app/page.tsx` (server component):
- `ADMIN` → `/admin`
- `MANAGER` → `/manager`
- `MEMBER` → `/member`
- No session → static marketing page

### Server-Side RBAC

Beyond middleware, RBAC checks live inside each server action file:
- `checkAdmin()` in `actions/admin-actions.ts` — asserts `session.role === 'ADMIN'`
- `checkManager()` in `actions/manager-actions.ts` — asserts `session.role` is `ADMIN` or `MANAGER`
- `checkBoardPermission()` in `actions/board-actions.ts` — checks board membership + owner + role
- `checkTaskPermission()` in `actions/task-actions.ts` — checks board membership + ownership + role

**MEMBER permissions:** Can edit/delete/add tasks in any board they belong to. Cannot create boards, cannot manage board members.

---

## API Routes Reference

### POST `/api/auth/login`

Authenticates a user and sets the session cookie.

**Request Body:**
```json
{ "email": "string", "password": "string" }
```

**Validation:** Both fields required. No Zod schema used (manual checks).

**Flow:**
1. Check email + password present → 400 if not
2. `prisma.user.findUnique({ where: { email } })`
3. `bcrypt.compare(password, user.password)`
4. Generic `"Invalid credentials"` for both missing user and wrong password (prevents email enumeration)
5. `login({ id, email, name, image, role })` → sets HTTP-only session cookie
6. `createAuditLog({ action: 'LOGIN', ... })`
7. Returns `200` with `{ user: { id, email, name, image, role } }`

**Error Responses:**
- `400` — Missing email or password
- `401` — Invalid credentials
- `500` — Server error

### POST `/api/auth/signup`

Creates a new user account and auto-logs in.

**Request Body:**
```json
{ "name": "string (required, max 50)", "email": "string", "password": "string (min 6)" }
```

**Flow:**
1. Validate name, email, password (min 6 chars) — manual checks
2. Check email uniqueness → `400 "User already exists"`
3. `bcrypt.hash(password, 12)` — 12 salt rounds
4. `prisma.user.create({ role: 'MEMBER' })` — always MEMBER for self-signup
5. `prisma.notificationPreference.create({ userId })` — all notification types default `true`
6. `notifyAdminsNewUser(user.id, user.name, user.email)` — fire-and-forget (`.catch(console.error)`)
7. `login(payload)` — auto-login after signup
8. **Auto-welcome-board:** Creates a board `"{name}'s Board"` with 3 columns (To Do / In Progress / Done), user as owner + member. Sends `BOARD_MEMBER_ADDED` notification: *"Developer assigned you a board to check the functionality of the system"*. Wrapped in try/catch — board failure does NOT block signup.
9. Returns `201` with `{ user: { id, email, name, image, role } }`

**Error Responses:**
- `400` — Validation failure or duplicate email
- `500` — Server error

### POST `/api/auth/logout`

Clears the session cookie.

**Request Body:** None

**Flow:**
1. `logout()` → sets cookie `session=''` with `expires: new Date(0)`
2. Returns `200` with `{ success: true }`

### GET `/api/auth/me`

Returns the current authenticated user or null.

**Request Body:** None

**Response:**
- Authenticated: `200 { user: { id, email, name, image, role } }`
- Not authenticated: `200 { user: null }`

### POST `/api/auth/reset-password/request`

Generates a password reset token and sends an email.

**Request Body:**
```json
{ "email": "string" }
```

**Flow:**
1. Validates email present → `400` if not
2. Looks up user by email
3. **Returns generic success message** even if user not found (prevents email enumeration)
4. Generates token: `crypto.randomBytes(32).toString('hex')` → 64-char hex
5. Token expiry: 1 hour (`Date.now() + 3600000`)
6. `prisma.passwordResetToken.upsert({ where: { email }, ... })` — replaces any existing token
7. Logs reset link to console (email sending via Nodemailer is in the server action path, not this API route)

**Response:** Always `200 { message: "If an account exists with this email, a reset link has been sent." }`

### POST `/api/auth/reset-password/confirm`

Validates a reset token and updates the password.

**Request Body:**
```json
{ "email": "string", "token": "string", "password": "string" }
```

**Flow:**
1. Validates all fields present → `400` if any missing
2. Finds `PasswordResetToken` by token
3. Verifies token email matches request email
4. Checks expiry → deletes expired tokens, returns `400 "Token has expired"`
5. `bcrypt.hash(password, 10)` — 10 salt rounds
6. `prisma.$transaction([ user.update({ password: hash }), token.delete() ])` — atomic password update + token cleanup
7. Returns `200 { message: "Password has been successfully reset" }`

**Error Responses:**
- `400` — Missing fields, invalid/expired token, email mismatch
- `500` — Server error

---

## Server Actions Reference

**File:** `actions/auth-actions.ts` (`'use server'`)

All return `ActionResult<T>` = `{ success: boolean, data?: T, error?: string, message?: string, fieldErrors?: Record<string, string[]> }`

### `requestPasswordReset(email: string): Promise<ActionResult>`

Server action version of the password reset API. **Used by the forgot-password UI page.**

**Difference from API route:** This version actually **sends the email** via `sendPasswordResetEmail()` from `utils/mail.ts`. The API route version only logs to console.

**Flow:**
1. Validates email via `forgotPasswordSchema` (Zod: `z.string().email()`)
2. If user not found → logs to console, returns generic success
3. Generates token (64-char hex, 1-hour expiry)
4. Upserts `PasswordResetToken`
5. Calls `sendPasswordResetEmail(email, token)` — Nodemailer SMTP
6. `createAuditLog({ action: 'PASSWORD_RESET_REQUESTED' })`
7. Returns generic success message

### `resetPassword(token: string, password: string): Promise<ActionResult>`

Server action version of password reset confirmation. **Used by the reset-password UI page.**

**Flow:**
1. Validates via `resetPasswordSchema` (Zod: token string, password min 6)
2. Finds `PasswordResetToken` by token, checks expiry
3. Ensures user still exists
4. `bcrypt.hash(password, 10)`
5. `prisma.$transaction([ user.update, token.delete ])`
6. `createAuditLog({ action: 'PASSWORD_RESET_COMPLETED' })`
7. Returns success

### `changePassword(data): Promise<ActionResult>`

Changes password for the **currently authenticated user**. Requires current password verification.

**Auth Required:** Yes (reads `session.id`)

**Input:**
```typescript
{ currentPassword: string, newPassword: string (min 6), confirmPassword: string }
```

**Flow:**
1. Validates via `changePasswordSchema` (Zod: currentPassword required, newPassword min 6, confirmPassword must match)
2. Finds user by session ID
3. `bcrypt.compare(currentPassword, user.password)` — verifies old password
4. `bcrypt.hash(newPassword, 10)`
5. Updates user password
6. `createAuditLog({ action: 'CHANGE_PASSWORD' })`
7. **Does NOT invalidate existing sessions**

### `updateProfile(data): Promise<ActionResult>`

Updates name and optionally password for the currently authenticated user.

**Auth Required:** Yes

**Input:**
```typescript
{ name?: string (min 1, max 50), password?: string (min 6) }
```
Uses `updateProfileSchema` from `lib/schemas.ts`.

**Flow:**
1. Validates input
2. Builds update data (name always, password only if provided)
3. If password provided: `bcrypt.hash(password, 10)`
4. `prisma.user.update({ where: { id: session.id }, data: updateData })`
5. `createAuditLog({ action: 'UPDATE_PROFILE' })`
6. `revalidatePath('/dashboard')`, `revalidatePath('/profile')`

### `getUserProfile(): Promise<ActionResult>`

Returns the current user's profile data.

**Auth Required:** Yes

**Returns:** `{ id, name, email, role, image, createdAt }`

---

## UI Pages

All under `app/(auth)/`:

### Login — `app/(auth)/login/page.tsx`

- **Type:** Client component (`'use client'`)
- **State:** `email`, `password`, `error`, `loading`
- **Endpoint:** `POST /api/auth/login`
- **On success:** `router.push('/dashboard')` + `router.refresh()`
- **Links:** `"Forgot password?"` → `/forgot-password`, `"Sign up"` → `/signup`

### Signup — `app/(auth)/signup/page.tsx`

- **Type:** Client component (`'use client'`)
- **State:** `name`, `email`, `password`, `error`, `loading`
- **Client-side validation:** password min 6 chars
- **Endpoint:** `POST /api/auth/signup`
- **On success:** `router.push('/dashboard')` + `router.refresh()`
- **Links:** `"Log in"` → `/login`

### Forgot Password — `app/(auth)/forgot-password/page.tsx`

- **Type:** Client component (`'use client'`)
- **Uses:** Server action `requestPasswordReset(email)` (dynamically imported from `@/actions/auth-actions`)
- **States:** `idle` → `loading` → `success` (green checkmark) / `error`
- **Link:** `"Back to login"` → `/login`

### Reset Password — `app/(auth)/reset-password/page.tsx`

- **Type:** Client component (`'use client'`)
- **URL params:** Reads `token` and `email` from query string via `useSearchParams()`
- **Wrapped in:** `<Suspense>` (required by `useSearchParams`)
- **Uses:** Server action `resetPassword(token, password)` (dynamically imported)
- **Validation:** passwords must match, min 6 chars
- **On success:** Shows success message, auto-redirects to `/login` after 3 seconds
- **Feature:** Show/hide password toggle

### Landing Page — `app/page.tsx`

- **Type:** Server component
- **Auth-aware:** Calls `getSession()` server-side
- **Redirects:** `ADMIN` → `/admin`, `MANAGER` → `/manager`, `MEMBER` → `/member`
- **Fallback:** Static marketing page for unauthenticated visitors

---

## Schemas & Validation

**File:** `lib/schemas.ts`

```typescript
import { z } from 'zod' // v4

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(50),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  password: z.string().min(6).optional(),
})
```

**Usage notes:**
- `loginSchema` and `signupSchema` are defined but **NOT used** — the login/signup API routes do manual validation
- `forgotPasswordSchema` and `resetPasswordSchema` are used by `auth-actions.ts` server actions
- `updateProfileSchema` is used by `updateProfile()` server action

---

## TypeScript Types

### `JWTPayload` — `lib/auth.ts`

```typescript
export interface JWTPayload {
  id: string
  email: string
  name: string | null
  image: string | null
  role: 'ADMIN' | 'MANAGER' | 'MEMBER'
  [key: string]: unknown        // Index signature for jose library compatibility
}
```

### `User` — `types/kanban.ts`

```typescript
export type Role = 'ADMIN' | 'MANAGER' | 'MEMBER'

export interface User {
  id: string
  name: string | null
  email: string
  image: string | null
  role: Role
}
```

### `ActionResult<T>` — `types/kanban.ts`

All server actions return this shape:

```typescript
export type ActionResult<T = any> = {
  success: boolean
  data?: T
  error?: string
  message?: string
  fieldErrors?: Record<string, string[] | undefined>
}
```

### `NotificationPreference` — `types/kanban.ts`

Exported from `@/lib/prisma` (re-exports from `generated/prisma`). Import enums and model types via `@/lib/prisma`, not from `@prisma/client` or `generated/prisma` directly.

---

## Email Configuration

**File:** `utils/mail.ts`

Uses **Nodemailer** with SMTP transport. Configured via env vars:

| Variable | Purpose | Default |
|----------|---------|---------|
| `EMAIL_HOST` | SMTP host | — |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_SECURE` | Use TLS | `false` |
| `EMAIL_USER` | SMTP username | — |
| `EMAIL_PASS` | SMTP password | — |
| `EMAIL_FROM` | From address | — |
| `NEXT_PUBLIC_APP_URL` | Base URL for reset links | — |

**Reset email content:** HTML email with styled button linking to `{APP_URL}/reset-password?token=...&email=...`

**Graceful degradation:** If SMTP is not configured (`transport.sendMail` throws), the function catches the error, logs the reset link to console, and returns `{ success: true }` — the server action continues normally.

**Dev flow:** In development without SMTP configured, reset links are printed to the server console:
```
[PASSWORD RESET] Link: http://localhost:3002/reset-password?token=...&email=...
```

---

## Notification System

Auth-related notification events:

| Event | Trigger | Type | Recipients |
|-------|---------|------|------------|
| New signup | `POST /api/auth/signup` succeeds | `NEW_USER_SIGNUP` | All ADMIN users |
| Welcome board | Auto-created on MEMBER signup | `BOARD_MEMBER_ADDED` | The new user |

**Notification flow:**
```
Server action / API route
  → sendNotification({ userId, type, message, link })
    → Checks NotificationPreference (skips if pref is false)
    → Prisma: notification.create()
    → Socket.IO: emitNotification() → real-time delivery to browser
```

**Fire-and-forget:** `notifyAdminsNewUser()` is called with `.catch(console.error)` so failures don't block the parent request. `sendNotification()` is wrapped in try/catch internally.

See `utils/notification-utils.ts` for the full notification system, and `docs/06-notification-system.md` for complete documentation.

---

## Audit Logging

Auth-related audit actions:

| Action | Triggering Event |
|--------|-----------------|
| `LOGIN` | User logs in via `POST /api/auth/login` |
| `PASSWORD_RESET_REQUESTED` | User requests password reset |
| `PASSWORD_RESET_COMPLETED` | User successfully resets password |
| `CHANGE_PASSWORD` | User changes own password (authenticated) |
| `UPDATE_PROFILE` | User updates name and/or password |

**Implementation:**
```typescript
import { createAuditLog } from '@/lib/create-audit-log'

await createAuditLog({
  userId: user.id,
  action: 'LOGIN',
  details: { email: user.email, role: user.role },
})
```

`createAuditLog()` auto-extracts the client IP from `x-forwarded-for` or `x-real-ip` headers. The `details` field is stored as Prisma `Json`, not a string — never render it directly.

---

## Complete File Index

| # | File | Responsibility |
|---|------|---------------|
| 1 | `lib/auth.ts` | JWT encrypt/decrypt via `jose` (HS256, 7d expiry), `JWTPayload` interface |
| 2 | `lib/auth-server.ts` | `'use server'` module: `login()`, `logout()`, `getSession()`, `updateSession()` — all cookie I/O |
| 3 | `proxy.ts` | Middleware: decrypt session cookie, RBAC route guards, redirect unauthenticated users |
| 4 | `app/api/auth/login/route.ts` | `POST` login — validate credentials, set session cookie, audit log |
| 5 | `app/api/auth/signup/route.ts` | `POST` signup — create user (MEMBER), welcome board, auto-login, notify admins |
| 6 | `app/api/auth/logout/route.ts` | `POST` logout — clear session cookie |
| 7 | `app/api/auth/me/route.ts` | `GET` current user — returns session or null |
| 8 | `app/api/auth/reset-password/request/route.ts` | `POST` request reset — generate token, log to console |
| 9 | `app/api/auth/reset-password/confirm/route.ts` | `POST` confirm reset — validate token, update password |
| 10 | `actions/auth-actions.ts` | Server actions: `requestPasswordReset`, `resetPassword`, `updateProfile`, `changePassword`, `getUserProfile` |
| 11 | `lib/schemas.ts` | Zod schemas: `loginSchema`, `signupSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `updateProfileSchema` |
| 12 | `types/kanban.ts` | TypeScript types: `Role`, `User`, `ActionResult<T>`, `NotificationPreference` |
| 13 | `utils/mail.ts` | Nodemailer SMTP transport + `sendPasswordResetEmail()` |
| 14 | `utils/notification-utils.ts` | `sendNotification()`, `notifyAdminsNewUser()` |
| 15 | `lib/create-audit-log.ts` | `createAuditLog()` — writes to AuditLog table, auto-extracts IP |
| 16 | `lib/audit.ts` | `getClientIp()` — reads `x-forwarded-for` / `x-real-ip` headers |
| 17 | `prisma/schema.prisma` | Models: `User`, `PasswordResetToken`, `NotificationPreference`, `AuditLog`, `Role` enum |
| 18 | `prisma/seed.ts` | Seeds 5 test accounts with hashed passwords |
| 19 | `app/(auth)/login/page.tsx` | Login form UI |
| 20 | `app/(auth)/signup/page.tsx` | Signup form UI |
| 21 | `app/(auth)/forgot-password/page.tsx` | Forgot password form UI |
| 22 | `app/(auth)/reset-password/page.tsx` | Reset password form UI |
| 23 | `app/page.tsx` | Landing page — auth-aware redirect |
| 24 | `app/dashboard/page.tsx` | Dashboard redirect — routes to role-specific page |
| 25 | `components/notification-bell.tsx` | Notification bell with real-time updates |
| 26 | `lib/prisma.ts` | Prisma client setup with `@prisma/adapter-pg` |
