# Railway Deployment Guide (Socket.IO Server)

## Overview

SmartTask uses **Railway** to host the standalone Socket.IO server (`src/socket/server.ts`). This is separate from the Next.js app on Vercel because Vercel is serverless and cannot run persistent WebSocket connections.

See [VERCEL.md](./VERCEL.md) for the Next.js app deployment.

---

## Why Railway?

The Socket.IO server requires a persistent Node.js process for WebSocket connections. Vercel's serverless functions have execution time limits and don't maintain persistent connections. Railway provides:

- Persistent Node.js process for WebSocket connections
- Background worker (due date reminders every 60s, audit log cleanup at midnight)
- Direct database access via Prisma + pg
- Auto-deploy from GitHub

---

## Architecture

```
Browser ↔ Railway (Socket.IO :3001) ↔ Supabase (PostgreSQL)
     ↕
Browser → Vercel (Next.js :3002) → Supabase (PostgreSQL)
```

The Socket.IO server is **self-contained** — it has its own Prisma + pg pool and does NOT import from `@/` paths or `utils/notification-utils.ts`. This is required because Railway builds only the socket server, not the entire Next.js app.

---

## Prerequisites

- Railway CLI installed: `npm i -g @railway/cli`
- Railway account (sign up at railway.app)
- Project pushed to GitHub
- Supabase database set up with schema pushed

---

## Step 1: Create Railway Project

```bash
# Login
railway login

# Initialize (from project root)
railway init
# → Select "Create new project"
# → Name it "smart-task-socket"
```

Or create via the Railway dashboard at railway.app → New Project → Deploy from GitHub.

---

## Step 2: Set Environment Variables

Go to **Railway Dashboard → your service → Variables** tab and add:

### Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `PORT` | *auto-assigned by Railway* | **Do NOT manually set this** — Railway injects it automatically. The app reads `PORT` first, then falls back to `SOCKET_PORT`, then `3001`. |
| `DATABASE_URL` | `postgresql://postgres.<ref>:<pass>@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true` | Supabase pooled connection |
| `DIRECT_URL` | `postgresql://postgres.<ref>:<pass>@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres` | Supabase direct connection |
| `JWT_SECRET` | Your secret key (min 32 chars) | Same as Vercel |
| `ALLOWED_ORIGIN` | `https://your-app.vercel.app` | Comma-separated for multiple origins |
| `NODE_ENV` | `production` | Production mode |
| `NIXPACKS_NODE_VERSION` | `22` | Prisma v7 requires Node 20.19+ |

### Setting via CLI

```bash
railway variables set DATABASE_URL="postgresql://postgres.<ref>:<pass>@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
railway variables set DIRECT_URL="postgresql://postgres.<ref>:<pass>@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
railway variables set JWT_SECRET="your_jwt_secret_here"
railway variables set ALLOWED_ORIGIN="https://your-app.vercel.app"
railway variables set NODE_ENV="production"
railway variables set NIXPACKS_NODE_VERSION="22"
# Do NOT set PORT — Railway injects it automatically
```

---

## Step 3: Deploy

```bash
# From project root
railway up
```

Railway uses the `railway.toml` configuration:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npx prisma generate"

[deploy]
startCommand = "npx tsx src/socket/server.ts"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

[[deploy.envVars]]
name = "NIXPACKS_NODE_VERSION"
value = "22"
```

This tells Railway to:
1. Install all npm dependencies
2. Run `npx prisma generate` to create the Prisma client
3. Start the socket server with `npx tsx src/socket/server.ts`

---

## Step 4: Generate a Public URL

After deployment, generate a public domain:

```bash
railway domain
```

Or go to **Railway Dashboard → your service → Settings → Networking → Generate Domain**.

This gives you a URL like:
```
https://smart-task-appiitdufinalproject-production.up.railway.app
```

Set this as `NEXT_PUBLIC_SOCKET_URL` in your Vercel environment variables.

---

## Configuration

### `railway.toml`

Located at project root. Controls the build and deploy process:

| Setting | Value | Why |
|---------|-------|-----|
| `builder` | `NIXPACKS` | Railway's default builder |
| `buildCommand` | `npx prisma generate` | Generates Prisma client from schema |
| `startCommand` | `npx tsx src/socket/server.ts` | Runs the socket server with TypeScript support |
| `NIXPACKS_NODE_VERSION` | `22` | Prisma v7 needs Node 20.19+, Railway defaults to older versions |

### `.nvmrc`

Contains `22`. Pins the Node.js version for all environments (Vercel, Railway, local).

### Socket Server (`src/socket/server.ts`)

The socket server is **self-contained**:

- Loads env vars via `dotenv` (`.env.local` in dev, `.env` in production)
- Creates its own `pg.Pool` + `PrismaPg` adapter (separate from Next.js)
- Auto-detects Supabase connections and adds SSL config (`rejectUnauthorized: false`)
- CORS origins from `ALLOWED_ORIGIN` env var (comma-separated, defaults to `*`)
- Runs background jobs: due date reminders/overdue checks every 60s, audit log cleanup at midnight

---

## Environment Differences

| Env file | `.env.local` | Railway env vars |
| Database | Local PostgreSQL | Supabase (pgbouncer) |
| SSL | Not needed | Auto-applied for Supabase |
| Node version | Per `.nvmrc` | `NIXPACKS_NODE_VERSION=22` |
| Port | `SOCKET_PORT` or `3001` | **`PORT` (auto-injected by Railway)** |
| Start command | `npm run socket:dev` | `npx tsx src/socket/server.ts` |
| CORS | `*` (all origins) | `ALLOWED_ORIGIN` (Vercel URL) |

---

## Monitoring

### View Logs

```bash
railway logs
```

Or go to Railway Dashboard → your service → **Deployments** → click a deployment → **Logs**

### Health Check

The socket server runs on port 3001. Railway will show it as healthy when the process is listening. There is no HTTP health endpoint — the server is purely WebSocket.

### Background Worker Logs

You should see periodic logs:
```
[Worker] Running background notification checks...
```

If you see database connection errors, verify `DATABASE_URL` and `DIRECT_URL` are set correctly.

---

## Troubleshooting

### Build fails: "Prisma only supports Node.js versions 20.19+"

Railway defaults to Node 18 which is too old. Fix by setting:
```toml
[[deploy.envVars]]
name = "NIXPACKS_NODE_VERSION"
value = "22"
```
Also add `NIXPACKS_NODE_VERSION=22` in Railway dashboard → Variables.

### Build fails: "Module has no exported member 'PrismaClient'"

The `scripts/` directory imports from `@prisma/client` instead of `../generated/prisma`. Since `tsconfig.json` excludes `scripts/`, this shouldn't affect the build. If it does, check that no app code imports from `scripts/`.

### Socket connection fails from browser

1. Verify `NEXT_PUBLIC_SOCKET_URL` in Vercel matches the Railway URL
2. Check `ALLOWED_ORIGIN` on Railway includes the Vercel URL
3. Verify Railway service is running: `railway logs`
4. Check browser DevTools → Network → WS tab for connection errors

### "Application failed to respond"

This is the most common Railway error. It means Railway's health check couldn't connect to your app's HTTP port. Causes:

1. **App not listening on `PORT` env var** — Railway auto-injects a `PORT` env var (usually `3001` or higher). Your app **must** read `process.env.PORT`. If it listens only on `SOCKET_PORT` or a hardcoded port, Railway thinks it's dead. The socket server reads `PORT` first: `parseInt(process.env.PORT || process.env.SOCKET_PORT || '3001', 10)`.

2. **App crashes on startup** — Check Railway deploy logs for errors. Common causes: missing env vars, database connection failure, Prisma client not generated.

3. **Do NOT manually set `PORT` in Railway env vars** — Railway injects it automatically. Setting it manually can conflict with Railway's proxy.

To fix: verify the app reads `process.env.PORT` and redeploy.

Verify the connection strings:
- `DATABASE_URL` must have `?pgbouncer=true` and port `6543`
- `DIRECT_URL` must use port `5432` without `?pgbouncer=true`
- SSL is auto-applied when the URL contains `supabase.com`

### Redeploy after env var changes

After changing Railway env vars, redeploy:
```bash
railway up
```
Or trigger a redeploy from the Railway dashboard.

---

## Updating

### After Code Changes

```bash
# Push to GitHub
git push origin main

# Railway auto-deploys from GitHub if connected
# Or manually deploy:
railway up
```

### After Schema Changes

If you changed `prisma/schema.prisma`:

1. Push schema to Supabase locally:
   ```bash
   $env:DATABASE_URL="...supabase_pgbouncer_url..."
   $env:DIRECT_URL="...supabase_direct_url..."
   npx prisma db push
   ```

2. Push to GitHub (Railway will run `prisma generate` during build):
   ```bash
   git push origin main
   ```

---

## Production URLs

| Service | URL |
|---------|-----|
| Railway Socket.IO | `https://smart-task-appiitdufinalproject-production.up.railway.app` |
| Vercel App | `https://smart-task-dusky.vercel.app` |
| Supabase Database | `aws-1-ap-northeast-1.pooler.supabase.com` |

---

## Production Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@gmail.com | admin123 | ADMIN |
| manager@gmail.com | manager123 | MANAGER |