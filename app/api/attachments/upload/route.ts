import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-server'
import prisma from '@/lib/prisma'
import { createAuditLog } from '@/lib/create-audit-log'
import { emitBoardEvent } from '@/utils/socket-emitter'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * Board-level permission check for the target task (mirrors
 * checkTaskPermission's default behavior: ADMIN/owner always, else board
 * member). Done inline here rather than importing from a 'use server' module
 * — importing a server action into a route handler compiles it into an RPC
 * proxy instead of a plain function call.
 */
async function canAccessTask(taskId: string, sessionId: string): Promise<{ boardId: string } | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: { include: { board: { include: { members: { select: { id: true } } } } } } },
  })
  if (!task) return null
  const board = task.column.board
  const isMember = board.members.some((m) => m.id === sessionId)
  const isOwner = board.ownerId === sessionId
  if (!isMember && !isOwner) return null
  return { boardId: board.id }
}

/**
 * Server-side file upload for task attachments.
 *
 * Flow:
 *  1. Authenticates via the httpOnly session cookie (getSession).
 *  2. Verifies the caller has permission on the target task's board.
 *  3. Validates the file server-side (size cap, presence, name length).
 *  4. Reads the bytes and stores them base64-encoded in the `FileBlob` table.
 *  5. Creates the `Attachment` row (url = /api/attachments/<attachmentId>/file).
 *  6. Writes an audit log + emits a real-time board event.
 *
 * The file is NEVER read client-side as base64 (previously the browser
 * embedded the whole file as a data: URL into the DB). Files are stored in
 * the database (works on Vercel/Render serverless — no local disk) and
 * served by GET /api/attachments/[id]/file.
 *
 * Note: Vercel's serverless functions cap request bodies (~4.5MB for
 * functions, ~10MB for the Hobby plan); a file larger than the platform
 * limit will be rejected at the gateway before this handler runs.
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const taskId = formData.get('taskId')
  const file = formData.get('file')

  if (typeof taskId !== 'string' || !taskId) {
    return NextResponse.json({ error: 'Missing taskId' }, { status: 400 })
  }
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 413 })
  }
  if (file.name.length > 255) {
    return NextResponse.json({ error: 'File name too long' }, { status: 400 })
  }

  // Board-level permission on the target task
  const access = await canAccessTask(taskId, session.id)
  if (!access) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
  const boardId = access.boardId

  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const base64 = Buffer.from(bytes).toString('base64')

    const { attachment } = await prisma.$transaction(async (tx) => {
      const created = await tx.attachment.create({
        data: { name: file.name, type: file.type || 'application/octet-stream', size: file.size, taskId, url: '' },
      })
      await tx.fileBlob.create({
        data: { data: base64, size: file.size, attachmentId: created.id },
      })
      const withUrl = await tx.attachment.update({
        data: { url: `/api/attachments/${created.id}/file` },
        where: { id: created.id },
      })
      return { attachment: withUrl }
    })

    await createAuditLog({
      userId: session.id,
      action: 'ADD_ATTACHMENT',
      details: { taskId, attachmentId: attachment.id, boardId },
    })

    emitBoardEvent('task:updated', { boardId, taskId })

    return NextResponse.json({ success: true, data: attachment })
  } catch (error) {
    console.error('[ATTACHMENT_UPLOAD_ERROR]', error)
    const msg = error instanceof Error ? error.message : 'Failed to upload file'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
