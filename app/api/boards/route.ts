import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth, requireApiRole } from '@/lib/session'
import { validateRequest } from '@/lib/api/validation-middleware'
import { createBoardSchema } from '@/lib/validations/board'

// GET /api/boards - List all boards the user has access to (all authenticated)
export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id
  const userRole = session.user.role

  try {
    // Platform admins can see all boards
    const isAdmin = userRole === 'ADMIN'

    const boards = await prisma.board.findMany({
      where: isAdmin ? undefined : {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        _count: {
          select: {
            members: true,
            tasks: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(boards)
  } catch (error) {
    console.error('Get boards error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/boards - Create a new board
export async function POST(req: NextRequest) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  let canCreate = session.user.role === 'ADMIN' || session.user.role === 'MANAGER'

  if (!canCreate) {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: 'global' },
    })

    // If setting doesn't exist, default to true or true depending on schema default. Let's say true.
    if (settings?.allowMemberBoardCreation || settings === null) {
      canCreate = true
    }
  }

  if (!canCreate) {
    return NextResponse.json(
      { error: 'Forbidden: Board creation is restricted to Managers and Admins.' },
      { status: 403 }
    )
  }

  try {
    const validation = await validateRequest(req, createBoardSchema)
    if (!validation.success) return validation.error

    const { name, description, color = '#3b82f6' } = validation.data

    // Create board with default columns
    const board = await prisma.board.create({
      data: {
        name,
        description,
        color,
        ownerId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: session.user.role === 'ADMIN' ? 'ADMIN' : 'MANAGER',
          },
        },
        columns: {
          create: [
            { name: 'Backlog', position: 0 },
            { name: 'Todo', position: 1, wipLimit: 5 },
            { name: 'In Progress', position: 2, wipLimit: 3 },
            { name: 'Review', position: 3, wipLimit: 2 },
            { name: 'Done', position: 4 },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        columns: true,
      },
    })

    // Audit log for board creation (non-blocking)
    try {
      await prisma.auditLog.create({
        data: {
          action: 'BOARD_CREATED',
          entityType: 'Board',
          entityId: board.id,
          actorId: session.user.id,
          boardId: board.id,
          changes: { name, description, color },
        },
      })
    } catch (auditError) {
      console.error('Failed to create audit log for board creation:', auditError)
      // Continue anyway - board was created successfully
    }

    return NextResponse.json(board, { status: 201 })
  } catch (error) {
    console.error('Create board error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
