import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { getEffectiveBoardRole } from '@/lib/board-roles'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/boards/:id/members - List board members (all board members)
export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params

    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, isActive: true }
            }
          }
        },
        owner: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    })

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const hasAccess = board.ownerId === userId ||
      board.members.some((m: { userId: string }) => m.userId === userId)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(board.members)
  } catch (error) {
    console.error('Get board members error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/boards/:id/members - Add member to board
export async function POST(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params
    const body = await req.json()
    const { userId: targetUserId, role = 'MEMBER' } = body

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const effectiveRole = await getEffectiveBoardRole(session, id)
    if (effectiveRole !== 'ADMIN' && effectiveRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden – Only board administrators and managers can add members' }, { status: 403 })
    }

    const board = await prisma.board.findUnique({
      where: { id },
      include: { members: true }
    })

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const existingMember = board.members.find((m: { userId: string }) => m.userId === targetUserId)
    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this board' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId, isActive: true }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 404 })
    }

    const member = await prisma.boardMember.create({
      data: {
        boardId: id,
        userId: targetUserId,
        role: role.toUpperCase(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'MEMBER_ADDED',
        entityType: 'Board',
        entityId: id,
        actorId: userId,
        boardId: id,
        changes: { targetUserId, role },
      },
    })

    return NextResponse.json(member)
  } catch (error) {
    console.error('Add board member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/boards/:id/members - Remove member from board
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id: boardId } = await params
    const body = await req.json()
    const targetUserId = body.userId

    if (!targetUserId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const effectiveRole = await getEffectiveBoardRole(session, boardId)
    // A user can leave the board themselves if they are NOT the owner. Let's allow self-removal
    if (effectiveRole !== 'ADMIN' && effectiveRole !== 'MANAGER' && userId !== targetUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { members: true }
    })

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    if (board.ownerId === targetUserId) {
      return NextResponse.json({ error: 'Cannot remove board owner' }, { status: 400 })
    }

    await prisma.boardMember.delete({
      where: {
        boardId_userId: {
          boardId,
          userId: targetUserId
        }
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'MEMBER_REMOVED',
        entityType: 'Board',
        entityId: boardId,
        actorId: userId,
        boardId: boardId,
        changes: { targetUserId },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove board member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/boards/:id/members - Update member role
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id: boardId } = await params
    const body = await req.json()
    const { userId: targetUserId, role } = body

    if (!targetUserId || !role) {
      return NextResponse.json({ error: 'User ID and role are required' }, { status: 400 })
    }

    if (!['ADMIN', 'MANAGER', 'MEMBER'].includes(role.toUpperCase())) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const effectiveRole = await getEffectiveBoardRole(session, boardId)
    if (effectiveRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden – Only board admins can change roles' }, { status: 403 })
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { members: true }
    })

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const member = await prisma.boardMember.update({
      where: {
        boardId_userId: {
          boardId,
          userId: targetUserId
        }
      },
      data: { role: role.toUpperCase() },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'MEMBER_ROLE_CHANGED',
        entityType: 'Board',
        entityId: boardId,
        actorId: userId,
        targetId: targetUserId,
        boardId: boardId,
        changes: { targetUserId, newRole: role },
      },
    })

    return NextResponse.json(member)
  } catch (error) {
    console.error('Update board member role error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
