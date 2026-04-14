import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiRole } from '@/lib/session'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/columns/:id - Update column (WIP limit, name) - Manager/Admin only
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiRole(['MANAGER', 'ADMIN'])
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params
    const body = await req.json()

    const column = await prisma.column.findUnique({
      where: { id },
      include: { board: { include: { members: true } } }
    })

    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }

    const hasAccess = column.board.ownerId === userId ||
      column.board.members.some((m: { userId: string }) => m.userId === userId)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { wipLimit, name } = body

    const updated = await prisma.column.update({
      where: { id },
      data: {
        ...(wipLimit !== undefined && { wipLimit }),
        ...(name && { name }),
      },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        action: 'COLUMN_UPDATED',
        entityType: 'Column',
        entityId: id,
        actorId: userId,
        boardId: column.boardId,
        changes: body,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update column error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/columns/:id - Delete column - Manager/Admin only
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiRole(['MANAGER', 'ADMIN'])
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params

    const column = await prisma.column.findUnique({
      where: { id },
      include: {
        board: { include: { members: true } },
        tasks: {
          select: { id: true }
        }
      }
    })

    if (!column) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }

    const hasAccess = column.board.ownerId === userId ||
      column.board.members.some((m: { userId: string }) => m.userId === userId)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (column.tasks.length > 0) {
      return NextResponse.json({ error: 'Cannot delete column with tasks. Please move or delete tasks first.' }, { status: 400 })
    }

    await prisma.column.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        action: 'COLUMN_DELETED',
        entityType: 'Column',
        entityId: id,
        actorId: userId,
        boardId: column.boardId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete column error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
