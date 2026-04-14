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

    const { searchParams } = new URL(req.url)
    const hardDelete = searchParams.get('hard') === 'true'

    if (hardDelete) {
      await prisma.board.delete({
        where: { id },
      })
    } else {
      await prisma.board.update({
        where: { id },
        data: { archived: true }
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
