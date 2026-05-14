# Vercel Deployment Guide

## Overview

SmartTask deploys the **Next.js app** to Vercel and the **Socket.IO server** to Railway separately. This guide covers the Vercel (Next.js) deployment.

See [RAILWAY.md](./RAILWAY.md) for the Socket.IO server deployment.

---

## Prerequisites

- Vercel CLI installed: `npm i -g vercel`
- Project pushed to GitHub
- Supabase PostgreSQL database set up with schema pushed and seeded

---

## Architecture

```
Browser → Vercel (Next.js) → Supabase (PostgreSQL)
         ↕ Socket.IO
Browser → Railway (Socket.IO server) → Supabase (PostgreSQL)
```

- **Vercel** hosts the Next.js app (API routes, server actions, SSR pages)
- **Railway** hosts the standalone Socket.IO server (`src/socket/server.ts`)
- **Supabase** hosts the PostgreSQL database

---

## Step 1: Push Schema to Supabase

If you haven't already pushed the Prisma schema to Supabase:

```bash
# Set Supabase env vars temporarily
$env:DATABASE_URL="postgresql://postgres.<ref>:<pass>@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
$env:DIRECT_URL="postgresql://postgres.<ref>:<pass>@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"

npx prisma db push
npx prisma generate
```

---

## Step 2: Set Vercel Environment Variables

Go to **Vercel Dashboard → your project → Settings → Environment Variables** and add these for **Production** (and Preview if desired):

### Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://postgres.<ref>:<pass>@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true` | Supabase pooled connection |
| `DIRECT_URL` | `postgresql://postgres.<ref>:<pass>@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres` | Supabase direct connection |
| `JWT_SECRET` | Your secret key (min 32 chars) | Same as local `.env.local` |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |
| `NEXT_PUBLIC_SOCKET_URL` | `https://your-railway-app.up.railway.app` | Railway Socket.IO server URL |

### CORS / Security Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `ALLOWED_ORIGIN` | `https://your-app.vercel.app` | Comma-separated for multiple origins |
| `PORT` | `3002` | Not strictly needed on Vercel but required by app |

### Email Variables (Optional)

| Variable | Value | Notes |
|----------|-------|-------|
| `EMAIL_HOST` | `smtp.gmail.com` | SMTP server |
| `EMAIL_PORT` | `587` | SMTP port |
| `EMAIL_SECURE` | `false` | Use TLS |
| `EMAIL_USER` | Your email | SMTP username |
| `EMAIL_PASS` | Your app password | SMTP password |
| `EMAIL_FROM` | `"SmartTask <your@email.com>"` | Sender address |

### Setting via CLI

```bash
vercel login

# Add each variable
echo "value" | vercel env add VARIABLE_NAME production
```

---

## Step 3: Deploy

```bash
# First-time deploy
vercel --prod

# Subsequent deploys
vercel --prod
```

Vercel will:
1. Install dependencies (`npm install`)
2. Run `prisma generate` (via `postinstall` script)
3. Build the Next.js app (`next build`)
4. Deploy serverless functions for API routes and server actions

---

## Important Notes

### Prisma Client Generation

The `postinstall` script runs `prisma generate`. The `generated/` directory is **gitignored** — Vercel regenerates it during build. The build uses `prisma.config.ts` which reads `DIRECT_URL` for schema operations.

### Node.js Version

Vercel auto-detects Node version from `.nvmrc` (set to Node 22). Prisma v7 and Next.js 16 require Node 20.19+ or 22.12+.

### Middleware

The project uses `proxy.ts` (not `middleware.ts`) at the project root. Next.js 16 auto-detects it for auth guards and RBAC redirects.

### `.env.production` is gitignored

Never commit `.env.production` to the repo. Set all production env vars via the Vercel dashboard or CLI.

### `scripts/` is excluded from TypeScript compilation

The `tsconfig.json` excludes `scripts/` — utility scripts like `db-check.ts` and `seed.ts` are not compiled by Next.js build. They use `npx tsx` to run directly.

---

## Updating After Changes

```bash
# Push code to GitHub
git push origin main

# Deploy to Vercel
vercel --prod
```

If you only changed env vars (no code changes), redeploy from the Vercel dashboard or run `vercel --prod` again.

### Changing Socket URL

If the Railway URL changes:

1. Update `NEXT_PUBLIC_SOCKET_URL` in Vercel env vars
2. Update `ALLOWED_ORIGIN` on Railway to include the Vercel URL
3. Redeploy on both platforms

---

## Troubleshooting

### Build fails with "Module has no exported member 'PrismaClient'"

Files in `scripts/` that import from `@prisma/client` instead of `../generated/prisma` will cause TypeScript build errors. The `tsconfig.json` excludes `scripts/` and `scratch/` from compilation — make sure temp scripts go there.

### Build fails with "Prisma only supports Node.js versions 20.19+"

Vercel may default to an older Node version. Ensure `.nvmrc` contains `22` and the `engines` field is not overriding it.

### Database connection errors in production

Verify that `DATABASE_URL` has `?pgbouncer=true` and `DIRECT_URL` uses port 5432 (direct, no pgbouncer). Supabase SSL is handled automatically by `lib/prisma.ts` when the connection string contains `supabase.com`.

### Socket.IO not connecting

1. Verify `NEXT_PUBLIC_SOCKET_URL` points to the Railway deployment URL
2. Verify `ALLOWED_ORIGIN` on Railway includes the Vercel app URL
3. Check browser console for CORS errors
4. Ensure Railway service is running (check Railway logs)

---

## Production URLs

| Service | URL |
|---------|-----|
| Vercel App | `https://smart-task-dusky.vercel.app` |
| Railway Socket.IO | `https://smart-task-appiitdufinalproject-production.up.railway.app` |
| Supabase Database | `aws-1-ap-northeast-1.pooler.supabase.com` |

---

## Production Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@gmail.com | admin123 | ADMIN |
| manager@gmail.com | manager123 | MANAGER |
| admin@smarttask.com | AdminPassword123! | ADMIN (seed) |
| manager@smarttask.com | AdminPassword123! | MANAGER (seed) |
| member@smarttask.com | AdminPassword123! | MEMBER (seed) |