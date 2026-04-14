import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'

// GET /api/users/activity - Get activity for current user
export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const userId = authResult.user.id

  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const activity = await prisma.auditLog.findMany({
      where: { actorId: userId },
      include: {
        board: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Get activity error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
