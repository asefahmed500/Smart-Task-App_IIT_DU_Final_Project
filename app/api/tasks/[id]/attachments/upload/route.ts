import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'

interface RouteContext {
  params: Promise<{ id: string }>
}

// Allowed file types for security
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
]

// Allowed file extensions for security (must match MIME types above)
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'zip']

// MIME type to extension mapping for validation
const MIME_TYPE_MAP: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/jpg': ['jpg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  'application/pdf': ['pdf'],
  'text/plain': ['txt'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/zip': ['zip'],
}

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

// POST /api/tasks/:id/attachments/upload - Upload file attachment
export async function POST(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id: taskId } = await params

    // Verify task exists and user has access
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        board: {
          include: { members: true }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const hasAccess = task.board.ownerId === userId ||
      task.board.members.some((m: { userId: string }) => m.userId === userId)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      )
    }

    // Validate filename for security
    const originalName = file.name
    if (!originalName || originalName.includes('..') || originalName.includes('/') || originalName.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      )
    }

    // Secure extension extraction using path module
    const ext = extname(originalName).toLowerCase().substring(1)

    // Validate extension is in allowed list
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `File extension not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate MIME type matches extension (prevent double-extension attacks)
    const allowedMimes = MIME_TYPE_MAP[file.type]
    if (!allowedMimes || !allowedMimes.includes(ext)) {
      return NextResponse.json(
        { error: 'File type does not match extension' },
        { status: 400 }
      )
    }

    // Generate unique filename with only the single validated extension
    const uniqueFileName = `${randomUUID()}.${ext}`

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'attachments')
    await mkdir(uploadsDir, { recursive: true })

    // Save file
    const filePath = join(uploadsDir, uniqueFileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create attachment record
    const attachment = await prisma.taskAttachment.create({
      data: {
        name: originalName,
        url: `/uploads/attachments/${uniqueFileName}`,
        type: file.type,
        size: file.size,
        taskId,
        userId,
      },
      })

    // Broadcast update via socket
    const { broadcastAttachmentUpdate } = await import('@/lib/socket-server')
    broadcastAttachmentUpdate(task.boardId, taskId)

    // Log the attachment upload
    await prisma.auditLog.create({
      data: {
        action: 'ATTACHMENT_UPLOADED',
        entityType: 'Task',
        entityId: taskId,
        actorId: userId,
        boardId: task.boardId,
        changes: { fileName: originalName, fileSize: file.size },
      },
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    console.error('Upload attachment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
