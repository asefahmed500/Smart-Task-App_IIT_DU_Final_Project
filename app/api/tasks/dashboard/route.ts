import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'

export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const userId = authResult.user.id

  try {
    const tasks = await prisma.task.findMany({
      where: {
        board: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } }
          ]
        }
      },
      select: {
        id: true,
        title: true,
        priority: true,
        dueDate: true,
        assigneeId: true,
        columnId: true,
        boardId: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        lastMovedAt: true,
        column: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, avatar: true } }
      }
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Get dashboard tasks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
