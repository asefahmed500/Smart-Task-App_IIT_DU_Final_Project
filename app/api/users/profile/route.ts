import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'

// GET /api/users/profile - Get current user profile
export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const userId = authResult.user.id

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            ownedBoards: true,
            memberships: true,
            assignedTasks: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/users/profile - Update current user profile
export async function PATCH(req: NextRequest) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const userId = authResult.user.id

  try {
    const body = await req.json()
    const { name, avatar } = body

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(avatar && { avatar }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
