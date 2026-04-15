import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  
  try {
    const { id } = await params
    const attachments = await prisma.taskAttachment.findMany({
      where: { taskId: id },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(attachments)
  } catch (error) {
    console.error('Get attachments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id: taskId } = await params
    const body = await req.json()
    const { name, url, type, size } = body

    if (!name || !url) {
      return NextResponse.json({ error: 'Missing name or url' }, { status: 400 })
    }

    // File validation - security: prevent malicious uploads
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    const ALLOWED_FILE_TYPES = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    // Validate file type
    if (type && !ALLOWED_FILE_TYPES.includes(type)) {
      return NextResponse.json({
        error: 'File type not allowed',
        allowedTypes: ALLOWED_FILE_TYPES
      }, { status: 400 })
    }

    // Validate file size
    const fileSize = size || 0
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: 'File too large',
        maxSize: MAX_FILE_SIZE,
        yourSize: fileSize
      }, { status: 400 })
    }

    // Validate filename for path traversal attempts
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    const attachment = await prisma.taskAttachment.create({
      data: {
        name,
        url,
        type: type || 'application/octet-stream',
        size: size || 0,
        taskId,
        userId
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'ATTACHMENT_ADDED',
        entityType: 'Task',
        entityId: taskId,
        actorId: userId,
        changes: { name, type }
      }
    })

    return NextResponse.json(attachment)
  } catch (error) {
    console.error('Add attachment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
