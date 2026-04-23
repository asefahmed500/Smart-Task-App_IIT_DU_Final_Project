import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { getEffectiveBoardRole } from '@/lib/board-roles'
import { verifyBoardAccess } from '@/lib/board-access'

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

    // Get column details with board info
    const column = await prisma.column.findUnique({
      where: { id },
      include: { board: true },
    })

    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }

    // Verify user has access to the board
    const board = await verifyBoardAccess(session.user.id, column.board.id)
    if (!board) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }

    // Use board-specific role instead of platform role
    const effectiveRole = await getEffectiveBoardRole(session, column.board.id)

    // Members cannot modify columns; Managers and Admins can
    if (effectiveRole !== 'ADMIN' && effectiveRole !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Forbidden: Only managers and admins can modify columns.' },
        { status: 403 }
      )
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
        boardId: column.board.id,
        changes: body,
      },
    })

    // Broadcast board update (column changes affect board)
    const { broadcastBoardUpdate } = await import('@/lib/socket-server')
    const updatedBoard = await prisma.board.findUnique({
      where: { id: column.board.id },
      include: {
        columns: { orderBy: { position: 'asc' } }
      }
    })
    if (updatedBoard) broadcastBoardUpdate(column.board.id, updatedBoard)

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

  try {
    const { id } = await params

    // Get column details
    const column = await prisma.column.findUnique({
      where: { id },
      include: { 
        _count: { select: { tasks: true } },
        board: true,
      }
    })

    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }

    // Verify user has access to the board
    const board = await verifyBoardAccess(session.user.id, column.board.id)
    if (!board) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }

    // Use board-specific role - Only Board Admin can delete columns (destructive action)
    const effectiveRole = await getEffectiveBoardRole(session, column.board.id)
    if (effectiveRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: Only board admins can delete columns.' },
        { status: 403 }
      )
    }

    // Check if column has tasks
    if (column._count.tasks > 0) {
      return NextResponse.json(
        { error: 'Cannot delete column with tasks. Move tasks first.' },
        { status: 400 }
      )
    }

    await prisma.column.delete({ where: { id } })

    // Audit log for column deletion
    await prisma.auditLog.create({
      data: {
        action: 'COLUMN_DELETED',
        entityType: 'Column',
        entityId: id,
        actorId: session.user.id,
        boardId: column.board.id,
        changes: { name: column.name },
      },
    })

    // Broadcast board update (column changes affect board)
    const { broadcastBoardUpdate } = await import('@/lib/socket-server')
    const updatedBoard = await prisma.board.findUnique({
      where: { id: column.board.id },
      include: {
        columns: { orderBy: { position: 'asc' } }
      }
    })
    if (updatedBoard) broadcastBoardUpdate(column.board.id, updatedBoard)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete column error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}