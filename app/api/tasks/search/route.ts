import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'

export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json([])
    }

    // Find tasks where the user is a member of the board
    const tasks = await prisma.task.findMany({
      where: {
        AND: [
          {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          {
            board: {
              OR: [
                { ownerId: userId },
                { members: { some: { userId } } },
              ],
            },
          },
        ],
      },
      include: {
        board: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      take: 10,
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Task search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
