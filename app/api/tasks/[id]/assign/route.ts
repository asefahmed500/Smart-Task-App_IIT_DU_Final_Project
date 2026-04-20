import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { getEffectiveBoardRole } from '@/lib/board-roles'
import { createNotification } from '@/lib/notifications'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params
    const body = await req.json()
    const { assigneeId } = body

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        board: {
          include: {
            members: true,
            owner: true
          }
        }
      },
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const hasAccess = existingTask.board.ownerId === userId ||
      existingTask.board.members.some((m: { userId: string }) => m.userId === userId)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Role-based Enforcement: Board Members can only self-assign or unassign themselves.
    const effectiveRole = await getEffectiveBoardRole(session, existingTask.boardId)
    if (effectiveRole === 'MEMBER') {
       if (assigneeId && assigneeId !== userId) {
          return NextResponse.json({ error: 'Members can only self-assign or unassign themselves' }, { status: 403 })
       }
    }
    
    let finalAssigneeId = assigneeId

    if (finalAssigneeId) {
      const isMember = await prisma.boardMember.findFirst({
        where: { boardId: existingTask.boardId, userId: finalAssigneeId },
      })
      if (!isMember && existingTask.board.ownerId !== finalAssigneeId) {
        return NextResponse.json({ error: 'Assignee is not a board member' }, { status: 400 })
      }
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { assigneeId: finalAssigneeId || null },
      include: {
        assignee: { select: { id: true, name: true, avatar: true, role: true } },
        column: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        action: 'TASK_ASSIGNED',
        entityType: 'Task',
        entityId: id,
        actorId: userId,
        targetId: finalAssigneeId,
        boardId: existingTask.boardId,
        changes: { from: existingTask.assigneeId, to: finalAssigneeId },
      },
    })

    // Broadcast update via socket
    const { broadcastTaskUpdate } = await import('@/lib/socket-server')
    broadcastTaskUpdate(existingTask.boardId, updated)

    // Notify the new assignee
    if (finalAssigneeId && finalAssigneeId !== userId) {
      await createNotification(
        finalAssigneeId,
        'TASK_ASSIGNED',
        'New Task Assigned',
        `${session.user.name} assigned you to "${updated.title}"`,
        `/board/${existingTask.boardId}?task=${id}`
      )
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Assign task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
