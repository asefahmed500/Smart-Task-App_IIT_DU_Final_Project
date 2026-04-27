import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { getEffectiveBoardRole } from '@/lib/board-roles'

// POST /api/columns/reorder - Reorder board columns (Manager/Admin only)
export async function POST(req: NextRequest) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const body = await req.json()
    const { columns } = body // Array of { id, position }

    if (!Array.isArray(columns) || columns.length === 0) {
      return NextResponse.json({ error: 'Invalid columns data' }, { status: 400 })
    }

    // Verify user has access to all columns' boards
    const columnIds = columns.map((c: { id: string }) => c.id)
    const columnsToReorder = await prisma.column.findMany({
      where: { id: { in: columnIds } },
      include: { board: { include: { members: true } } }
    })

    // Check board-level role for each column's board
    for (const col of columnsToReorder) {
      const effectiveRole = await getEffectiveBoardRole(session, col.boardId)
      if (effectiveRole === null || effectiveRole === 'MEMBER') {
        return NextResponse.json({ error: 'Forbidden: Only managers and admins can reorder columns' }, { status: 403 })
      }
    }

    // Update all column positions in a transaction
    await prisma.$transaction(
      columns.map(({ id, position }: { id: string; position: number }) =>
        prisma.column.update({
          where: { id },
          data: { position }
        })
      )
    )

    // Audit log for column reorder (use first column's boardId)
    if (columnsToReorder.length > 0) {
      const boardId = columnsToReorder[0].boardId
      await prisma.auditLog.create({
        data: {
          action: 'COLUMNS_REORDERED',
          entityType: 'Column',
          entityId: columnsToReorder[0].id,
          actorId: userId,
          boardId,
          changes: { columns: columns.map((c: { id: string; position: number }) => ({ id: c.id, position: c.position })) },
        },
      })

      // Broadcast board update (column reorder affects board)
      const { broadcastBoardUpdate } = await import('@/lib/socket-server')
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        include: {
          columns: { orderBy: { position: 'asc' } }
        }
      })
      if (board) broadcastBoardUpdate(boardId, board)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reorder columns error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
