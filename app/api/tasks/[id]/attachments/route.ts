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
