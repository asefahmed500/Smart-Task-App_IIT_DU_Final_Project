import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { evaluateAutomations } from '@/lib/automation/engine'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, avatar: true, role: true } },
        column: { select: { id: true, name: true, boardId: true } },
        board: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, avatar: true } }
              }
            },
            owner: { select: { id: true, name: true, avatar: true } }
          }
        },
        createdBy: { select: { id: true, name: true, avatar: true } },
        blockers: {
          include: {
            blocker: { select: { id: true, title: true, columnId: true } }
          }
        },
        blocking: {
          include: {
            blocking: { select: { id: true, title: true, columnId: true } }
          }
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const hasAccess = task.board.ownerId === userId ||
      task.board.members.some((m: { userId: string }) => m.userId === userId)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Get task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id
  const userRole = session.user.role

  try {
    const { id } = await params
    const body = await req.json()

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

    const { title, description, priority, assigneeId, dueDate, labels, isBlocked } = body

    // MEMBER: can only self-assign (or unassign self); cannot assign to others
    let finalAssigneeId = assigneeId
    if (userRole === 'MEMBER' && assigneeId !== undefined) {
      if (assigneeId !== null && assigneeId !== userId) {
        // Keep existing assignment — member cannot assign to other users
        finalAssigneeId = existingTask.assigneeId
      }
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(priority && { priority }),
        ...(finalAssigneeId !== undefined && { assigneeId: finalAssigneeId }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(labels && { labels }),
        ...(isBlocked !== undefined && { isBlocked }),
      },
      include: {
        assignee: { select: { id: true, name: true, avatar: true, role: true } },
        column: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        action: 'TASK_UPDATED',
        entityType: 'Task',
        entityId: id,
        actorId: userId,
        boardId: existingTask.boardId,
        changes: body,
      },
    })

    // Evaluate automation rules for assignment changes
    if (finalAssigneeId !== undefined && finalAssigneeId !== existingTask.assigneeId) {
      await evaluateAutomations(existingTask.boardId, 'TASK_ASSIGNED', updated, userId)
    }

    // Evaluate automation rules for priority changes
    if (priority && priority !== existingTask.priority) {
      await evaluateAutomations(existingTask.boardId, 'PRIORITY_CHANGED', updated, userId)
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id
  const userRole = session.user.role

  try {
    const { id } = await params

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        board: {
          include: { members: true }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check board access first
    const hasAccess = task.board.ownerId === userId ||
      task.board.members.some((m: { userId: string }) => m.userId === userId)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Role-based delete: MEMBERs cannot delete tasks (only ADMIN and MANAGER can)
    if (userRole === 'MEMBER') {
      return NextResponse.json(
        { error: 'Only managers and admins can delete tasks' },
        { status: 403 }
      )
    }

    await prisma.task.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        action: 'TASK_DELETED',
        entityType: 'Task',
        entityId: id,
        actorId: userId,
        boardId: task.boardId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
