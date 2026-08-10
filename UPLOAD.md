# File Upload Architecture

How task-attachment file uploads work in SmartTask.

## Overview

Files are uploaded **server-side** (never read client-side as base64) and stored in the **database** as base64 blobs. This works on serverless deployments (Vercel/Render) where there is no persistent local disk.

```
Browser (task details dialog)
   │  POST /api/attachments/upload  (multipart/form-data: taskId + file)
   ▼
Next.js route handler
   │  1. Authenticate (httpOnly session cookie → getSession)
   │  2. Validate file server-side (size ≤ 10MB, name ≤ 255 chars)
   │  3. Permission check (caller must be board member/owner/admin of the task's board)
   │  4. Read bytes → base64
   │  5. Transaction:
   │       • create Attachment row (url = /api/attachments/<id>/file)
   │       • create FileBlob row (the base64 bytes)
   │  6. Audit log (ADD_ATTACHMENT) + socket emit (task:updated)
   ▼
PostgreSQL (FileBlob table)
   │
Browser renders attachment → GET /api/attachments/<id>/file
   │  1. Authenticate + board-access check
   │  2. Read base64 → bytes
   │  3. Return with original Content-Type + Content-Disposition (download)
```

## Database

```prisma
model Attachment {
  id        String   @id @default(cuid())
  name      String
  url       String   // /api/attachments/<attachmentId>/file
  type      String   // MIME type
  size      Int
  taskId    String
  createdAt DateTime @default(now())
  task      Task     @relation(... onDelete: Cascade)
  blob      FileBlob?
}

model FileBlob {
  id           String     @id @default(cuid())
  data         String     // base64-encoded file content
  size         Int
  createdAt    DateTime   @default(now())
  attachment   Attachment @relation(fields: [attachmentId], references: [id], onDelete: Cascade)
  attachmentId String     @unique
}
```

- **FileBlob → Attachment cascade:** deleting an attachment (or its task) deletes the blob. No orphans.
- **FileBlob.attachmentId is unique:** each blob belongs to exactly one attachment.

## Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/attachments/upload` | POST | Upload a file for a task (multipart form-data: `taskId`, `file`) |
| `/api/attachments/[id]/file` | GET | Serve/download a stored file |

### Upload route (`app/api/attachments/upload/route.ts`)

- Authenticates via `getSession()` (httpOnly cookie).
- Validates: `taskId` present, `file` is a non-empty `File`, size ≤ 10 MB, name ≤ 255 chars.
- Permission: loads `task → column → board → members`; caller must be a member, owner, or ADMIN.
- Stores bytes base64-encoded in `FileBlob`, creates `Attachment` with a served URL, writes an audit log, emits a real-time `task:updated` socket event.
- Returns `{ success, data: attachment }`.

### Serve route (`app/api/attachments/[id]/file/route.ts`)

- Authenticates + checks board access (same-origin requests send the cookie automatically — works for `<img>` and `<a download>`).
- Returns the decoded bytes with the original `Content-Type`, `Content-Length`, and `Content-Disposition: attachment` for download.
- `Cache-Control: private, max-age=3600`.

## Client side (`hooks/use-task/use-task-attachments.ts`)

- `handleUpload` builds `FormData` with `taskId` + the raw `File` and POSTs to `/api/attachments/upload`.
- The file is **not** read client-side (no `FileReader`, no base64 in the browser).
- On success it appends the returned attachment to local task state and shows a success toast with Undo.
- Upload is disabled while offline (`useOfflineStore`) — offline file upload is not queued.

## Schema changes

Adding this feature required:
- New `FileBlob` model
- `Attachment.blob` relation
- After changing `prisma/schema.prisma`, run:
  ```bash
  npx prisma db push && npx prisma generate
  ```
  Then **restart the dev server** (the running server keeps a stale Prisma client).

## Platform limits

Vercel's serverless functions cap request bodies (~4.5 MB functions / ~10 MB Hobby). A file larger than the platform limit is rejected by the gateway before the handler runs. The app-level cap is 10 MB.
