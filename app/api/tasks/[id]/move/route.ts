import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { evaluateAutomations } from '@/lib/automation/engine'
import { handleTaskEvent } from '@/lib/notifications'
import { getEffectiveBoardRole } from '@/lib/board-roles'
import { validateRequest } from '@/lib/api/validation-middleware'
import { moveTaskSchema } from '@/lib/validations/task'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/tasks/:id/move - Move task to another column with WIP check
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params
    const validation = await validateRequest(req, moveTaskSchema)
    if (!validation.success) return validation.error

    const { targetColumnId, newPosition, version, override } = validation.data

    // Get existing task
    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        board: {
          include: {
            columns: true,
            members: true,
          },
        },
      },
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Verify access
    const hasAccess = existingTask.board.ownerId === userId ||
      existingTask.board.members.some((m: { userId: string }) => m.userId === userId)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Version check for optimistic locking
    if (existingTask.version !== version) {
      return NextResponse.json(
        {
          error: 'Version conflict',
          currentVersion: existingTask.version,
          yourVersion: version,
        },
        { status: 409 }
      )
    }

    // Check WIP limit
    const targetColumn = existingTask.board.columns.find((c: { id: string }) => c.id === targetColumnId)
    const effectiveRole = await getEffectiveBoardRole(session, existingTask.boardId)
    const isManagerOrAdmin = effectiveRole === 'MANAGER' || effectiveRole === 'ADMIN'

    if (targetColumn && 'wipLimit' in targetColumn && targetColumn.wipLimit) {
      const taskCount = await prisma.task.count({
        where: {
          columnId: targetColumnId,
          id: { not: id },
        },
      })

      if (taskCount >= targetColumn.wipLimit) {
        // Members are hard blocked - cannot override
        if (!isManagerOrAdmin) {
          return NextResponse.json(
            {
              error: 'WIP limit exceeded',
              wipLimit: targetColumn.wipLimit,
              currentCount: taskCount,
              requiresOverride: false // Members cannot override
            },
            { status: 409 }
          )
        }

        // Managers/Admins blocked unless they explicitly override
        if (!override) {
          return NextResponse.json(
            {
              error: 'WIP limit exceeded',
              wipLimit: targetColumn.wipLimit,
              currentCount: taskCount,
              requiresOverride: true // Managers/admins can override
            },
            { status: 409 }
          )
        }
      }
    }
    
    // Check Dependencies: Cannot move a blocked task to a terminal column
    if (targetColumn?.isTerminal) {
        const blockers = await prisma.taskBlock.findMany({
            where: { blockingId: id },
            include: { blocker: { include: { column: true } } }
        })
        
        const incompleteBlockers = blockers.filter((b: any) => !b.blocker.column.isTerminal) // eslint-disable-line @typescript-eslint/no-explicit-any
        
        if (incompleteBlockers.length > 0) {
            return NextResponse.json(
                { 
                  error: 'Task is blocked', 
                  message: `Cannot finish task while it is blocked by: ${incompleteBlockers.map((b: any) => b.blocker.title).join(', ')}` // eslint-disable-line @typescript-eslint/no-explicit-any
                },
                { status: 409 }
            )
        }
    }

    // Update task position and column in transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await prisma.$transaction(async (tx: any) => {
      // Update task
      const task = await tx.task.update({
        where: { id },
        data: {
          columnId: targetColumnId,
          position: newPosition,
          version: { increment: 1 },
          lastMovedAt: new Date(),
          // Status orchestration based on column type
          completedAt: targetColumn?.isTerminal ? new Date() : null,
          inProgressAt: (!targetColumn?.isTerminal && !existingTask.inProgressAt) ? new Date() : existingTask.inProgressAt,
        },
        include: {
          assignee: {
            select: { id: true, name: true, avatar: true, role: true },
          },
          column: true,
        },
      })

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'TASK_MOVED',
          entityType: 'Task',
          entityId: id,
          actorId: userId,
          boardId: existingTask.boardId,
          changes: {
            fromColumnId: existingTask.columnId,
            fromColumnName: existingTask.board.columns.find((c: { id: string; name: string }) => c.id === existingTask.columnId)?.name,
            toColumnId: targetColumnId,
            toColumnName: targetColumn?.name,
            newPosition,
          },
        },
      })

      return task
    })

    // Evaluate automation rules after successful move
    await evaluateAutomations(existingTask.boardId, 'TASK_MOVED', updated as any, userId)

    // CRITICAL: Refetch task after automation to get latest state
    // Automations may have updated assignee, priority, labels, etc.
    const finalTask = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true, role: true },
        },
        column: true,
      },
    })

    if (!finalTask) {
      return NextResponse.json({ error: 'Task not found after automation' }, { status: 500 })
    }

    // Broadcast update via socket with final state
    const { broadcastTaskUpdate } = await import('@/lib/socket-server')
    broadcastTaskUpdate(existingTask.boardId, finalTask as any)

    // Notify participants for important stage changes + Webhooks
    if (finalTask.column?.name.toLowerCase() === 'done' || finalTask.column?.name.toLowerCase() === 'review') {
      await handleTaskEvent(
        id,
        userId,
        'TASK_MOVED',
        'Task Status Update',
        `Task "${finalTask.title}" moved to ${finalTask.column.name}`,
        `/board/${existingTask.boardId}?task=${id}`
      )
    }

    return NextResponse.json(finalTask)
  } catch (error) {
    console.error('Move task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
