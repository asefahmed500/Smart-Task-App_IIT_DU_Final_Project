import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { verifyBoardAccess } from '@/lib/board-access'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params

    const board = await verifyBoardAccess(userId, id)
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: { boardId: id },
      include: {
        actor: {
          select: { id: true, name: true, avatar: true, role: true },
        },
        target: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(auditLogs)
  } catch (error) {
    console.error('Get board audit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}