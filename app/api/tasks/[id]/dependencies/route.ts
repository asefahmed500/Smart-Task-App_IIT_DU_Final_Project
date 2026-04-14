import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { createNotification } from '@/lib/notifications'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  
  try {
    const { id } = await params
    const body = await req.json()
    const { type, linkedTaskId } = body

    if (!type || !linkedTaskId) {
       return NextResponse.json({ error: 'Type and linked taskId required' }, { status: 400 })
    }

    if (id === linkedTaskId) {
       return NextResponse.json({ error: 'Cannot depend on self' }, { status: 400 })
    }

    // Identify which is blocking which
    const blockerId = type === 'BLOCKS' ? id : linkedTaskId
    const blockingId = type === 'BLOCKS' ? linkedTaskId : id

    // See if exists
    const exists = await prisma.taskBlock.findUnique({
      where: {
        blockerId_blockingId: {
          blockerId,
          blockingId
        }
      }
    })

    if (exists) {
      return NextResponse.json({ message: 'Dependency already exists' }, { status: 200 })
    }

    const dep = await prisma.taskBlock.create({
      data: {
        blockerId,
        blockingId,
        createdById: session.user.id
      }
    })

    // Optionally mark the blocked task as Blocked if not already
    await prisma.task.update({
       where: { id: blockingId },
       data: { isBlocked: true }
    })

    // Log the dependency creation
    await prisma.auditLog.create({
      data: {
        action: 'DEPENDENCY_ADDED',
        entityType: 'Task',
        entityId: id,
        actorId: session.user.id,
        changes: { type, linkedTaskId, blockerId, blockingId },
      },
    })

    // Notify the assignee of the blocking task
    const blockedTask = await prisma.task.findUnique({
      where: { id: blockingId },
      select: { title: true, assigneeId: true, boardId: true }
    })

    if (blockedTask?.assigneeId && blockedTask.assigneeId !== session.user.id) {
      await createNotification(
        blockedTask.assigneeId,
        'TASK_BLOCKED',
        'Task Blocked',
        `Your task "${blockedTask.title}" is now blocked by another task.`,
        `/board/${blockedTask.boardId}?task=${blockingId}`
      )
    }

    return NextResponse.json(dep)
  } catch (error) {
    console.error('Create dependency error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/tasks/:id/dependencies - Remove a dependency
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id
  
  try {
    const { id } = await params
    const body = await req.json()
    const { type, linkedTaskId } = body

    if (!type || !linkedTaskId) {
       return NextResponse.json({ error: 'Type and linked taskId required' }, { status: 400 })
    }

    const blockerId = type === 'BLOCKS' ? id : linkedTaskId
    const blockingId = type === 'BLOCKS' ? linkedTaskId : id

    await prisma.taskBlock.delete({
      where: {
        blockerId_blockingId: {
          blockerId,
          blockingId
        }
      }
    })

    // Check if task still has other blockers
    const remainingBlockers = await prisma.taskBlock.count({
      where: { blockingId }
    })

    if (remainingBlockers === 0) {
      await prisma.task.update({
        where: { id: blockingId },
        data: { isBlocked: false }
      })
    }

    await prisma.auditLog.create({
      data: {
        action: 'DEPENDENCY_REMOVED',
        entityType: 'Task',
        entityId: id,
        actorId: userId,
        changes: { type, linkedTaskId },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete dependency error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
