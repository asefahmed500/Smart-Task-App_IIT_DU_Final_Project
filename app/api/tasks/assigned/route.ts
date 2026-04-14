import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'

export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const tasks = await prisma.task.findMany({
      where: {
        assigneeId: userId
      },
      include: {
        column: { select: { id: true, name: true } },
        board: { select: { id: true, name: true, color: true } }
      },
      orderBy: { dueDate: 'asc' }
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Get assigned tasks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
