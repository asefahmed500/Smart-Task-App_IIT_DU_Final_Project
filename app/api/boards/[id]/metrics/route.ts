import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { calculateCycleTime } from '@/lib/metrics/cycle-time'
import { calculateLeadTime } from '@/lib/metrics/lead-time'
import { calculateThroughput } from '@/lib/metrics/throughput'

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

    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        members: true,
      }
    })

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const hasAccess = board.ownerId === userId || board.members.some((m: { userId: string }) => m.userId === userId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Process tasks for metrics using helper functions (parallel for performance)
    const [cycleTime, leadTime, throughput, totalTasks] = await Promise.all([
      calculateCycleTime(id),
      calculateLeadTime(id),
      calculateThroughput(id, 90), // Default to 90 days for throughput heatmap
      prisma.task.count({ where: { boardId: id } }),
    ])

    return NextResponse.json({
       cycleTime,
       leadTime,
       throughput,
       totalTasks,
       completedTasks: leadTime.count,
    })

  } catch (error) {
    console.error('Metrics API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
