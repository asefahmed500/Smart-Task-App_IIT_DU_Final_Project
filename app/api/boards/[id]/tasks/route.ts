import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'

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

    // Verify user has access to board
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
    })

    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }

    const tasks = await prisma.task.findMany({
      where: { boardId },
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true, role: true },
        },
        column: true,
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(tasks)
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
  const userRole = session.user.role

  try {
    const { id: boardId } = await params
    const body = await req.json()

    const { title, description, priority = 'MEDIUM', columnId, assigneeId, dueDate, labels = [] } = body

    if (!title || !columnId) {
      return NextResponse.json(
        { error: 'Title and column are required' },
        { status: 400 }
      )
    }

    // Verify user has access to board
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        columns: true,
      },
    })

    if (!board) {
      return NextResponse.json(
        { error: 'Board not found or access denied' },
        { status: 404 }
      )
    }

    // Check WIP limit — MEMBERs are hard blocked; MANAGER/ADMIN can override
    const column = board.columns.find((c: { id: string; wipLimit: number | null }) => c.id === columnId)
    if (column?.wipLimit && userRole === 'MEMBER') {
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
    if (userRole === 'MEMBER' && assigneeId && assigneeId !== userId) {
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
        priority,
        columnId,
        boardId,
        assigneeId: finalAssigneeId,
        dueDate: dueDate ? new Date(dueDate) : null,
        labels,
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
