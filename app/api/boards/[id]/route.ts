import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { getEffectiveBoardRole } from '@/lib/board-roles'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/boards/:id - Get a single board
export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params

    const board = await prisma.board.findFirst({
      where: {
        id,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true, role: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, role: true },
            },
          },
        },
        columns: {
          orderBy: { position: 'asc' },
          include: {
            _count: {
              select: { tasks: true },
            },
          },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, avatar: true, role: true },
            },
            column: true,
          },
          orderBy: { position: 'asc' },
        },
      },
    })

    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(board)
  } catch (error) {
    console.error('Get board error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/boards/:id - Update a board
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  try {
    const { id } = await params
    const body = await req.json()

    const effectiveRole = await getEffectiveBoardRole(session, id)

    if (effectiveRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden. Board ADMIN access required.' },
        { status: 403 }
      )
    }

    const updated = await prisma.board.update({
      where: { id },
      data: body,
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, role: true },
            },
          },
        },
      },
    })

    // Audit log for board update
    await prisma.auditLog.create({
      data: {
        action: 'BOARD_UPDATED',
        entityType: 'Board',
        entityId: id,
        actorId: session.user.id,
        boardId: id,
        changes: body,
      },
    })

    // Broadcast board update
    const { broadcastBoardUpdate } = await import('@/lib/socket-server')
    broadcastBoardUpdate(id, updated as any)

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update board error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/boards/:id - Delete a board
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  try {
    const { id } = await params

    const effectiveRole = await getEffectiveBoardRole(session, id)

    if (effectiveRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden. Board ADMIN access required.' },
        { status: 403 }
      )
    }

    // Get board details before deletion for audit log
    const board = await prisma.board.findUnique({
      where: { id },
      select: { name: true, description: true },
    })

    const { searchParams } = new URL(req.url)
    const hardDelete = searchParams.get('hard') === 'true'

    if (hardDelete) {
      await prisma.board.delete({
        where: { id },
      })

      // Audit log for board deletion
      await prisma.auditLog.create({
        data: {
          action: 'BOARD_DELETED',
          entityType: 'Board',
          entityId: id,
          actorId: session.user.id,
          boardId: id,
          changes: { name: board?.name, description: board?.description },
        },
      })
    } else {
      await prisma.board.update({
        where: { id },
        data: { archived: true }
      })

      // Audit log for board archival
      await prisma.auditLog.create({
        data: {
          action: 'BOARD_ARCHIVED',
          entityType: 'Board',
          entityId: id,
          actorId: session.user.id,
          boardId: id,
          changes: { name: board?.name },
        },
      })
    }

    return NextResponse.json({
      success: true,
      action: hardDelete ? 'DELETED' : 'ARCHIVED'
    })
  } catch (error) {
    console.error('Delete board error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
