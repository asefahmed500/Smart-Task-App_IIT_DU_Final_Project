import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth, requireApiRole } from '@/lib/session'

// GET /api/boards - List all boards the user has access to (all authenticated)
export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const boards = await prisma.board.findMany({
      where: {
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
          select: { members: true, tasks: true },
        },
        tasks: {
          where: {
            dueDate: { not: null },
            completedAt: null, // Only fetch uncompleted tasks for counts
          },
          select: {
            id: true,
            dueDate: true,
            column: {
              select: { name: true }
            }
          }
        }
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
    const body = await req.json()
    const { name, description, color = '#3b82f6' } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Board name is required' },
        { status: 400 }
      )
    }

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

    return NextResponse.json(board, { status: 201 })
  } catch (error) {
    console.error('Create board error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
