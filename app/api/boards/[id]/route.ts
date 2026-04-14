import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'

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

// PATCH /api/boards/:id - Update a board (owner, MANAGER or ADMIN only)
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params
    const body = await req.json()

    // Check if user is owner or admin
    const board = await prisma.board.findUnique({
      where: { id },
      select: { ownerId: true },
    })

    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }

    if (board.ownerId !== userId && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
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

// DELETE /api/boards/:id - Delete a board (owner or ADMIN only)
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params

    // Check if user is owner or admin
    const board = await prisma.board.findUnique({
      where: { id },
      select: { ownerId: true },
    })

    if (!board) {
      return NextResponse.json(
        { error: 'Board not found' },
        { status: 404 }
      )
    }

    if (board.ownerId !== userId && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    await prisma.board.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete board error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
