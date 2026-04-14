import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { notifyTaskParticipants } from '@/lib/notifications'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  
  try {
    const { id } = await params

    const comments = await prisma.comment.findMany({
      where: { taskId: id },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Fetch comments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  
  try {
    const { id } = await params
    const body = await req.json()

    if (!body.text?.trim()) {
       return NextResponse.json({ error: 'Comment text is required' }, { status: 400 })
    }

    const task = await prisma.task.findUnique({
      where: { id },
      select: { boardId: true }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const comment = await prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({
        data: {
          text: body.text,
          taskId: id,
          userId: session.user.id
        },
        include: {
          user: { select: { id: true, name: true, avatar: true } }
        }
      })

      await tx.auditLog.create({
        data: {
          action: 'COMMENT_ADDED',
          entityType: 'Task',
          entityId: id,
          actorId: session.user.id,
          boardId: task.boardId,
          changes: { text: body.text }
        }
      })

      return c
    })

    // Notify participants (Assignee, Creator, Board Owner)
    await notifyTaskParticipants(
      id,
      session.user.id,
      'COMMENT_ADDED',
      'New Comment',
      `${session.user.name} commented on "${task.title || 'a task'}"`,
      `/board/${task.boardId}?task=${id}`
    )

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
