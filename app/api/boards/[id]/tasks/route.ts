import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { getEffectiveBoardRole } from '@/lib/board-roles'
import { validateRequest } from '@/lib/api/validation-middleware'
import { createTaskSchema } from '@/lib/validations/task'
import { verifyBoardAccess } from '@/lib/board-access'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/boards/:id/tasks - Get all tasks for a board (all members)
export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id: boardId } = await params

    // Parse pagination params
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Verify user has access to board
    const board = await verifyBoardAccess(userId, boardId)
    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }

    // Get total count for pagination
    const totalCount = await prisma.task.count({
      where: { boardId },
    })

    const tasks = await prisma.task.findMany({
      where: { boardId },
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true, role: true },
        },
        column: true,
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    })

    return NextResponse.json({
      data: tasks,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1,
      },
    })
  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/boards/:id/tasks - Create a new task (all board members)
export async function POST(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id: boardId } = await params

    // Validate input using Zod schema
    const validation = await validateRequest(req, createTaskSchema)
    if (!validation.success) return validation.error

    const { title, description, priority, columnId, assigneeId, dueDate, labels } = validation.data

    // Verify user has access to board
    const board = await verifyBoardAccess(userId, boardId)
    if (!board) {
      return NextResponse.json(
        { error: 'Board not found or access denied' },
        { status: 404 }
      )
    }

    // Get board columns to verify column exists and for WIP check
    const boardWithColumns = await prisma.board.findUnique({
      where: { id: boardId },
      include: { columns: true },
    })

    if (!boardWithColumns) {
      return NextResponse.json(
        { error: 'Board not found or access denied' },
        { status: 404 }
      )
    }

    // Verify the column belongs to this board
    const column = boardWithColumns.columns.find(c => c.id === columnId)
    if (!column) {
      return NextResponse.json(
        { error: 'Invalid column ID' },
        { status: 400 }
      )
    }

    // Use board-specific role for WIP limit check
    const effectiveRole = await getEffectiveBoardRole(session, boardId)
    const isMember = effectiveRole === 'MEMBER'

    // Check WIP limit — MEMBERs are hard blocked; MANAGER/ADMIN can override
    if (column?.wipLimit && isMember) {
      const taskCount = await prisma.task.count({
        where: { columnId },
      })

      if (taskCount >= column.wipLimit) {
        return NextResponse.json(
          { error: 'WIP limit exceeded', wipLimit: column.wipLimit },
          { status: 409 }
        )
      }
    }

    // MEMBERs can only self-assign (force userId as assignee if they try to pick someone else)
    let finalAssigneeId = assigneeId
    if (isMember && assigneeId && assigneeId !== userId) {
      finalAssigneeId = userId
    }

    // Get next position in column
    const maxPosition = await prisma.task.findFirst({
      where: { columnId },
      orderBy: { position: 'desc' },
      select: { position: true },
    })

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority || 'MEDIUM',
        columnId,
        boardId,
        assigneeId: finalAssigneeId,
        dueDate: dueDate ? new Date(dueDate) : null,
        labels: labels || [],
        createdById: userId,
        position: (maxPosition?.position ?? -1) + 1,
      },
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true, role: true },
        },
        column: true,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'TASK_CREATED',
        entityType: 'Task',
        entityId: task.id,
        actorId: userId,
        boardId,
        changes: { title, priority },
      },
    })

    // Broadcast update via socket
    const { broadcastTaskUpdate } = await import('@/lib/socket-server')
    broadcastTaskUpdate(boardId, task)

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}