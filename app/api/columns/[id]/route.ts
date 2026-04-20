import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth, requireApiRole } from '@/lib/session'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/columns/:id - Update column (title, wipLimit, etc.)
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  try {
    const { id } = await params
    const body = await req.json()
    const { name, wipLimit, isTerminal } = body

    // Verify access - only Admins and Managers can update columns
    if (session.user.role === 'MEMBER') {
       return NextResponse.json({ error: 'Forbidden: Members cannot modify columns.' }, { status: 403 })
    }

    // Get column details for audit log
    const column = await prisma.column.findUnique({
      where: { id },
      select: { boardId: true, name: true },
    })

    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }

    const updated = await prisma.column.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(wipLimit !== undefined && { wipLimit: wipLimit === null ? null : Number(wipLimit) }),
        ...(isTerminal !== undefined && { isTerminal }),
      },
    })

    // Audit log for column update
    await prisma.auditLog.create({
      data: {
        action: 'COLUMN_UPDATED',
        entityType: 'Column',
        entityId: id,
        actorId: session.user.id,
        boardId: column.boardId,
        changes: body,
      },
    })

    // Broadcast board update (column changes affect board)
    const { broadcastBoardUpdate } = await import('@/lib/socket-server')
    const board = await prisma.board.findUnique({
      where: { id: column.boardId },
      include: {
        columns: { orderBy: { position: 'asc' } }
      }
    })
    if (board) broadcastBoardUpdate(column.boardId, board)

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update column error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/columns/:id - Delete a column
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  // Only Admin can delete columns (destructive)
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Only Admins can delete columns.' }, { status: 403 })
  }

  try {
    const { id } = await params

    // Check if column exists and has tasks
    const column = await prisma.column.findUnique({
      where: { id },
      include: { _count: { select: { tasks: true } } }
    })

    if (!column) {
       return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }

    if (column._count.tasks > 0) {
       return NextResponse.json({ error: 'Cannot delete column with tasks. Move tasks first.' }, { status: 400 })
    }

    await prisma.column.delete({ where: { id } })

    // Audit log for column deletion
    await prisma.auditLog.create({
      data: {
        action: 'COLUMN_DELETED',
        entityType: 'Column',
        entityId: id,
        actorId: session.user.id,
        boardId: column.boardId,
        changes: { name: column.name },
      },
    })

    // Broadcast board update (column changes affect board)
    const { broadcastBoardUpdate } = await import('@/lib/socket-server')
    const board = await prisma.board.findUnique({
      where: { id: column.boardId },
      include: {
        columns: { orderBy: { position: 'asc' } }
      }
    })
    if (board) broadcastBoardUpdate(column.boardId, board)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete column error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
