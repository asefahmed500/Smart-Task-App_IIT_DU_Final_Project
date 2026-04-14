import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/tasks/:id/audit - Get audit log for a task
export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params

    // Get task to verify access and get boardId
    const task = await prisma.task.findUnique({
      where: { id },
      select: { boardId: true },
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Build where clause based on role
    let whereClause: any = { entityId: id }

    if (session.user.role === 'MEMBER') {
      // Members only see their own actions
      whereClause.actorId = userId
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        actor: {
          select: { id: true, name: true, email: true, avatar: true, role: true },
        },
        target: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(auditLogs)
  } catch (error) {
    console.error('Get audit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
