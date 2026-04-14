import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { evaluateAutomations } from '@/lib/automation/engine'

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
    const body = await req.json()
    const { targetColumnId, newPosition, version, override } = body

    if (!targetColumnId || newPosition === undefined) {
      return NextResponse.json(
        { error: 'Target column and position are required' },
        { status: 400 }
      )
    }

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
    const isManagerOrAdmin = session.user.role === 'MANAGER' || session.user.role === 'ADMIN'

    if (targetColumn && 'wipLimit' in targetColumn && targetColumn.wipLimit) {
      const taskCount = await prisma.task.count({
        where: {
          columnId: targetColumnId,
          id: { not: id },
        },
      })

      if (taskCount >= targetColumn.wipLimit) {
        // Members are hard blocked. Managers/Admins are blocked unless override is true.
        if (!isManagerOrAdmin || !override) {
          return NextResponse.json(
            {
              error: 'WIP limit exceeded',
              wipLimit: targetColumn.wipLimit,
              currentCount: taskCount,
              requiresOverride: isManagerOrAdmin // Send this back so UI knows a manager can override
            },
            { status: 409 }
          )
        }
      }
    }

    // Update task position and column in transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Update task
      const task = await tx.task.update({
        where: { id },
        data: {
          columnId: targetColumnId,
          position: newPosition,
          version: { increment: 1 },
          lastMovedAt: new Date(),
          // Set timestamps based on column
          ...(targetColumn?.name.toLowerCase() === 'in progress' && {
            inProgressAt: new Date(),
          }),
          ...(targetColumn?.name.toLowerCase() === 'done' && {
            completedAt: new Date(),
          }),
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
            toColumnId: targetColumnId,
            newPosition,
          },
        },
      })

      return task
    })

    // Evaluate automation rules after successful move
    await evaluateAutomations(existingTask.boardId, 'TASK_MOVED', updated, userId)

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Move task error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
