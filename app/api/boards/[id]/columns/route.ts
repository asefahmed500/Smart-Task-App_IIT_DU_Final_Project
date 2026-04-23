import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { getEffectiveBoardRole } from '@/lib/board-roles'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/boards/:id/columns - Get board columns
export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const { id } = await params

    const columns = await prisma.column.findMany({
      where: { boardId: id },
      orderBy: { position: 'asc' },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    })

    return NextResponse.json(columns)
  } catch (error) {
    console.error('Get columns error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/boards/:id/columns - Create a new column
export async function POST(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  try {
    const { id: boardId } = await params
    const body = await req.json()
    const { name, wipLimit = null, isTerminal = false } = body

    if (!name) {
      return NextResponse.json({ error: 'Column name is required' }, { status: 400 })
    }

    // Check permissions (Admin or Manager of the board)
    const effectiveRole = await getEffectiveBoardRole(session, boardId)
    if (effectiveRole === 'MEMBER') {
      return NextResponse.json(
        { error: 'Forbidden. Board MANAGER/ADMIN access required.' },
        { status: 403 }
      )
    }

    // Get current max position
    const lastColumn = await prisma.column.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
      select: { position: true },
    })

    const newPosition = lastColumn ? lastColumn.position + 1 : 0

    const column = await prisma.column.create({
      data: {
        name,
        position: newPosition,
        wipLimit: wipLimit ? Number(wipLimit) : null,
        isTerminal,
        boardId,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'COLUMN_CREATED',
        entityType: 'Column',
        entityId: column.id,
        actorId: session.user.id,
        boardId,
        changes: { name, wipLimit, isTerminal },
      },
    })

    // Broadcast board update
    const { broadcastBoardUpdate } = await import('@/lib/socket-server')
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: { orderBy: { position: 'asc' } }
      }
    })
    if (board) broadcastBoardUpdate(boardId, board)

    return NextResponse.json(column, { status: 201 })
  } catch (error) {
    console.error('Create column error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
