import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'

// GET /api/users/boards - Get boards for current user
export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const userId = authResult.user.id

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
          select: { id: true, name: true, avatar: true },
        },
        _count: {
          select: { members: true, tasks: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(boards)
  } catch (error) {
    console.error('Get user boards error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
