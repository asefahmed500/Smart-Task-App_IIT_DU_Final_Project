# SmartTask — Authentication System

## Table of Contents

- [Overview](#overview)
- [Architecture Diagram](#architecture-diagram)
- [JWT Session Flow](#jwt-session-flow)
- [Login Flow](#login-flow)
- [Signup Flow](#signup-flow)
- [Password Reset Flow](#password-reset-flow)
- [Session Management](#session-management)
- [Middleware (proxy.ts)](#middleware-proxyts)
- [File Map](#file-map)

---

## Overview

SmartTask uses **custom JWT-based authentication** with HTTP-only cookies. There is no third-party auth provider (no NextAuth, no Clerk). The system uses the `jose` library for HS256 signing, 7-day token expiry, and session refresh via middleware.

Key principles:
- **Login and signup are API routes** (`POST /api/auth/login`, `POST /api/auth/signup`) — NOT server actions
- **All other cookie operations** (logout, getSession) use the `'use server'` module `lib/auth-server.ts`
- **Middleware** (`proxy.ts`) decrypts the session cookie on every request for auth guards
- **Password reset** uses a `PasswordResetToken` model with 1-hour expiry and email delivery via Nodemailer

---

## Architecture Diagram

```mermaid
graph TB
    subgraph "Browser"
        LOGIN_FORM["Login Form<br/>app/(auth)/login/page.tsx"]
        SIGNUP_FORM["Signup Form<br/>app/(auth)/signup/page.tsx"]
        FORGOT_FORM["Forgot Password Form"]
        RESET_FORM["Reset Password Form"]
    end

    subgraph "API Routes (app/api/auth/)"
        LOGIN_ROUTE["POST /api/auth/login<br/>route.ts"]
        SIGNUP_ROUTE["POST /api/auth/signup<br/>route.ts"]
        LOGOUT_ROUTE["POST /api/auth/logout<br/>route.ts"]
        ME_ROUTE["GET /api/auth/me<br/>route.ts"]
        REQUEST_ROUTE["POST .../reset-password/request"]
        CONFIRM_ROUTE["POST .../reset-password/confirm"]
    end

    subgraph "Server Modules"
        AUTH_LIB["lib/auth.ts<br/>encrypt() / decrypt()"]
        AUTH_SERVER["lib/auth-server.ts<br/>(use server)<br/>login() / logout() / getSession()"]
    end

    subgraph "Middleware"
        PROXY["proxy.ts<br/>Decrypts cookie<br/>Auth guard + RBAC"]
    end

    subgraph "Database"
        USER_TABLE["User model<br/>(email, password hash, role)"]
        TOKEN_TABLE["PasswordResetToken model<br/>(email, token, expires)"]
    end

    subgraph "Email"
        MAILER["Nodemailer<br/>Gmail SMTP"]
    end

    LOGIN_FORM -->|"POST {email, password}"| LOGIN_ROUTE
    SIGNUP_FORM -->|"POST {name, email, password}"| SIGNUP_ROUTE
    LOGIN_ROUTE -->|"bcrypt.compare()"| USER_TABLE
    LOGIN_ROUTE -->|"login(payload)"| AUTH_SERVER
    AUTH_SERVER -->|"encrypt() -> set cookie"| AUTH_LIB
    SIGNUP_ROUTE -->|"bcrypt.hash() + prisma.create"| USER_TABLE
    SIGNUP_ROUTE -->|"login(payload)"| AUTH_SERVER

    FORGOT_FORM -->|"server action<br/>requestPasswordReset()"| TOKEN_TABLE
    TOKEN_TABLE -->|"sendPasswordResetEmail()"| MAILER
    MAILER -->|"email with reset link"| RESET_FORM
    RESET_FORM -->|"POST {email, token, password}"| CONFIRM_ROUTE
    CONFIRM_ROUTE -->|"validate + hash + update"| USER_TABLE

    PROXY -->|"decrypt(cookie)"| AUTH_LIB
    ME_ROUTE -->|"getSession()"| AUTH_SERVER
    LOGOUT_ROUTE -->|"logout()"| AUTH_SERVER
```

---

## JWT Session Flow

```mermaid
sequenceDiagram
    participant Browser
    participant Proxy as proxy.ts<br/>(Middleware)
    participant AuthLib as lib/auth.ts<br/>(jose)
    participant AuthServer as lib/auth-server.ts<br/>(use server)
    participant DB as PostgreSQL

    Note over Browser,DB: === LOGIN ===

    Browser->>+AuthLib: POST /api/auth/login {email, password}
    AuthLib->>DB: prisma.user.findUnique({email})
    AuthLib->>AuthLib: bcrypt.compare(password, hash)
    AuthLib->>AuthServer: login({id, email, name, role})
    AuthServer->>AuthLib: encrypt(payload) → JWT string
    AuthLib-->>-Browser: Set-Cookie: session=<jwt>; HttpOnly; SameSite=Lax; 7-day expiry

    Note over Browser,DB: === SUBSEQUENT REQUEST ===

    Browser->>Proxy: GET /dashboard (with session cookie)
    Proxy->>AuthLib: decrypt(cookie)
    AuthLib-->>Proxy: {id, email, name, role}
    Proxy->>Proxy: Check RBAC rules
    Proxy-->>Browser: Allow or redirect

    Note over Browser,DB: === SESSION REFRESH ===

    Proxy->>AuthServer: updateSession(request)
    AuthServer->>AuthLib: decrypt(session) → re-encrypt with new expiry
    AuthServer-->>Browser: Set-Cookie: session=<new-jwt>
```

### JWT Payload Structure

```typescript
// Defined in lib/auth.ts
interface JWTPayload {
  id: string        // User ID (cuid)
  email: string
  name: string | null
  image: string | null
  role: 'ADMIN' | 'MANAGER' | 'MEMBER'
}
```

### Cookie Settings

| Property | Value |
|----------|-------|
| Name | `session` |
| HTTP-Only | `true` |
| Secure | `true` in production, `false` in dev |
| SameSite | `lax` |
| Path | `/` |
| Expiry | 7 days from issuance |
| Algorithm | HS256 |

---

## Login Flow

**File:** `app/api/auth/login/route.ts`

```mermaid
flowchart TD
    START["POST /api/auth/login<br/>{email, password}"] --> VALIDATE{"email & password<br/>provided?"}
    VALIDATE -->|No| ERR_400["400: Email and password required"]
    VALIDATE -->|Yes| FIND["prisma.user.findUnique({email})"]
    FIND --> NOT_FOUND{"User exists?"}
    NOT_FOUND -->|No| ERR_401["401: Invalid credentials"]
    NOT_FOUND -->|Yes| COMPARE["bcrypt.compare(password, user.password)"]
    COMPARE --> MISMATCH{"Password match?"}
    MISMATCH -->|No| ERR_401
    MISMATCH -->|Yes| LOGIN["login(payload)<br/>Set session cookie"]
    LOGIN --> AUDIT["createAuditLog({LOGIN})"]
    AUDIT --> SUCCESS["200: {user: {id, email, name, role}}"]
```

**Why an API route and not a server action?** Turbopack's dev server fails to resolve `cookies()` at runtime in server action files in certain edge cases. API routes with `'use server'` imports from `auth-server.ts` work reliably.

---

## Signup Flow

**File:** `app/api/auth/signup/route.ts`

```mermaid
flowchart TD
    START["POST /api/auth/signup<br/>{name, email, password}"] --> VALIDATE{"Valid input?<br/>email, password ≥ 6 chars, name"}
    VALIDATE -->|Invalid| ERR["400: Validation error"]
    VALIDATE -->|Valid| EXISTS["prisma.user.findUnique({email})"]
    EXISTS --> TAKEN{"User exists?"}
    TAKEN -->|Yes| ERR_EXISTS["400: User already exists"]
    TAKEN -->|No| HASH["bcrypt.hash(password, 12)"]
    HASH --> CREATE["prisma.user.create({<br/>  role: 'MEMBER',<br/>  password: hashed<br/>})"]
    CREATE --> PREFS["prisma.notificationPreference.create({userId})"]
    PREFS --> NOTIFY["notifyAdminsNewUser()"]
    NOTIFY --> AUTO_LOGIN["login(payload)<br/>Auto-login after signup"]
    AUTO_LOGIN --> SUCCESS["201: {user}"]
```

### Signup Defaults

- New users always get **MEMBER** role
- A **default NotificationPreference** record is created (all notifications enabled, email/push disabled)
- User is **auto-logged in** immediately after signup
- All **ADMIN users** receive a `NEW_USER_SIGNUP` notification

---

## Password Reset Flow

**Files:** `actions/auth-actions.ts` (server actions), `app/api/auth/reset-password/request/route.ts` and `confirm/route.ts` (API routes), `utils/mail.ts` (email)

```mermaid
sequenceDiagram
    participant Browser
    participant Action as auth-actions.ts<br/>(requestPasswordReset)
    participant DB as PostgreSQL
    participant Mailer as Nodemailer<br/>(Gmail SMTP)
    participant API as /api/auth/reset-password/confirm

    Browser->>Action: requestPasswordReset(email)
    Action->>DB: user.findUnique({email})

    alt User not found
        Action-->>Browser: "If an account exists, a reset link has been sent."
        Note over Action: Returns success even if no user (security)
    else User found
        Action->>DB: passwordResetToken.upsert({email, token, expires: +1hr})
        Action->>Mailer: sendPasswordResetEmail(email, token)
        Mailer->>Mailer: Construct reset link: /reset-password?token=...&email=...
        Note over Mailer: In dev: logs link to console<br/>In prod: sends via SMTP
        Action-->>Browser: "If an account exists, a reset link has been sent."
    end

    Note over Browser: User clicks link in email

    Browser->>API: POST /api/auth/reset-password/confirm<br/>{email, token, password}
    API->>DB: passwordResetToken.findUnique({token})
    API->>API: Verify email match + not expired
    API->>DB: $transaction([<br/>  user.update({password: hash}),<br/>  token.delete()<br/>])
    API-->>Browser: "Password has been successfully reset"
```

### Token Model

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  email     String   @unique
  token     String   @unique
  expires   DateTime
  createdAt DateTime @default(now())

  @@unique([email, token])
}
```

- Token: 32 random hex bytes (`crypto.randomBytes(32).toString('hex')`)
- Expiry: 1 hour
- Upsert: If a token already exists for the email, it is replaced
- Cleanup: Token is deleted in the same transaction as the password update

---

## Session Management

### Getting the Current Session

All three methods resolve to the same flow:

```mermaid
flowchart LR
    CALLER["Server Action or<br/>Server Component"] -->|"getSession()"| AUTH_SERVER["lib/auth-server.ts"]
    AUTH_SERVER -->|"cookies().get('session')"| COOKIE["Session Cookie"]
    COOKIE -->|"decrypt(value)"| AUTH_LIB["lib/auth.ts<br/>(jose)"]
    AUTH_LIB -->|"JWT verify + decode"| PAYLOAD["JWTPayload or null"]
```

### Where `getSession()` is Called

| Caller | Purpose |
|--------|---------|
| `proxy.ts` (middleware) | Auth guard: decrypt cookie, check role, allow/redirect |
| Dashboard layouts (`app/*/layout.tsx`) | Pass session to sidebar, redirect if no session |
| Server actions (`actions/*`) | Verify user is authenticated before mutations |
| API routes (`app/api/auth/me`) | Return current user for client-side checks |

### Session Refresh

The middleware does NOT currently refresh the session on every request (the `updateSession` function exists in `auth-server.ts` but is not called by `proxy.ts`). The session expires 7 days after login.

---

## Middleware (proxy.ts)

**File:** `proxy.ts` at project root

```mermaid
flowchart TD
    REQ["Incoming Request"] --> MATCH{"Matches route<br/>pattern?"}
    MATCH -->|No| NEXT["NextResponse.next()"]
    MATCH -->|Yes| COOKIE{"Session cookie<br/>present?"}

    COOKIE -->|No cookie + protected route| REDIRECT_LOGIN["Redirect → /login"]
    COOKIE -->|Has cookie| DECRYPT["decrypt(cookie)"]

    DECRYPT --> FAIL{"Decrypt<br/>success?"}
    FAIL -->|Error| REDIRECT_LOGIN
    FAIL -->|Success| SESSION["session = {id, email, role}"]

    SESSION --> ROUTE{"Route check"}
    ROUTE -->|"/admin" + role ≠ ADMIN| REDIRECT_DASH["Redirect → /dashboard"]
    ROUTE -->|"/manager" + role ∉ [ADMIN, MANAGER]| REDIRECT_DASH
    ROUTE -->|"/member" + role ∉ [ADMIN, MANAGER, MEMBER]| REDIRECT_DASH
    ROUTE -->|"/login" or "/signup" + has session| REDIRECT_DASH2["Redirect → /dashboard"]
    ROUTE -->|Authorized| NEXT

    style REDIRECT_LOGIN fill:#fee,stroke:#c00
    style REDIRECT_DASH fill:#fee,stroke:#c00
    style NEXT fill:#efe,stroke:#0a0
```

### Protected Routes

| Route Prefix | Required Role |
|-------------|---------------|
| `/dashboard` | Any authenticated user |
| `/admin` | ADMIN |
| `/manager` | ADMIN or MANAGER |
| `/member` | ADMIN, MANAGER, or MEMBER |
| `/settings` | Any authenticated user |
| `/boards` | Any authenticated user |
| `/profile` | Any authenticated user |

### Public Routes (redirect to dashboard if logged in)

- `/login`
- `/signup`
- `/` (landing page)

### Matcher Pattern

```typescript
matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)']
```

Skips API routes, static files, and images from middleware processing.

---

## File Map

| File | Responsibility |
|------|---------------|
| `lib/auth.ts` | JWT encrypt/decrypt using `jose` (HS256, 7-day expiry) |
| `lib/auth-server.ts` | `'use server'` module: login(), logout(), getSession(), updateSession() — all cookie operations |
| `proxy.ts` | Next.js 16 middleware: auth guards, RBAC redirects, session decryption |
| `app/api/auth/login/route.ts` | POST handler: validate credentials, set session cookie |
| `app/api/auth/signup/route.ts` | POST handler: create user, auto-login |
| `app/api/auth/logout/route.ts` | POST handler: clear session cookie |
| `app/api/auth/me/route.ts` | GET handler: return current user from session |
| `app/api/auth/reset-password/request/route.ts` | POST: create reset token, send email |
| `app/api/auth/reset-password/confirm/route.ts` | POST: validate token, update password |
| `actions/auth-actions.ts` | Server actions: requestPasswordReset, resetPassword, updateProfile, changePassword, getUserProfile |
| `utils/mail.ts` | Nodemailer transport + sendPasswordResetEmail() |
| `app/(auth)/login/page.tsx` | Login UI |
| `app/(auth)/signup/page.tsx` | Signup UI |
| `app/(auth)/forgot-password/page.tsx` | Forgot password UI |
| `app/(auth)/reset-password/page.tsx` | Reset password UI |
