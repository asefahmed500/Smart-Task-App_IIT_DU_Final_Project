import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'

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
        tasks: {
          select: {
            id: true,
            createdAt: true,
            inProgressAt: true,
            completedAt: true,
            lastMovedAt: true,
            columnId: true,
          }
        }
      }
    })

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const hasAccess = board.ownerId === userId || board.members.some(m => m.userId === userId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Process tasks for metrics
    let totalCycleTime = 0
    let totalLeadTime = 0
    let completedTasksWithCycleTime = 0
    let completedTasksWithLeadTime = 0
    
    // Throughput arrays tracking tasks completed per day over the last 14 days
    const throughput: { date: string, count: number }[] = []
    const now = new Date()
    
    // Initialize throughput heatmap framework for last 14 days
    for (let i = 13; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        // format YYYY-MM-DD local
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
        throughput.push({ date: dateStr, count: 0 })
    }

    board.tasks.forEach(task => {
      // Metric Calculation
      if (task.completedAt) {
          // Lead Time = CompletedAt - CreatedAt
          const leadTimeSec = (task.completedAt.getTime() - task.createdAt.getTime()) / 1000
          totalLeadTime += leadTimeSec
          completedTasksWithLeadTime++
          
          if (task.inProgressAt) {
             // Cycle Time = CompletedAt - InProgressAt
             const cycleTimeSec = (task.completedAt.getTime() - task.inProgressAt.getTime()) / 1000
             if (cycleTimeSec > 0) { // Safety validation
                totalCycleTime += cycleTimeSec
                completedTasksWithCycleTime++
             }
          }
          
          // Throughput distribution map
          const cd = task.completedAt
          const cDateStr = `${cd.getFullYear()}-${String(cd.getMonth()+1).padStart(2,'0')}-${String(cd.getDate()).padStart(2,'0')}`
          const tDay = throughput.find(t => t.date === cDateStr)
          if(tDay) tDay.count++
      }
    })

    const avgCycleTimeHours = completedTasksWithCycleTime > 0 
        ? Math.round(totalCycleTime / completedTasksWithCycleTime / 3600 * 100) / 100 
        : 0
        
    const avgLeadTimeHours = completedTasksWithLeadTime > 0
        ? Math.round(totalLeadTime / completedTasksWithLeadTime / 3600 * 100) / 100
        : 0

    return NextResponse.json({
       avgCycleTimeHours,
       avgLeadTimeHours,
       throughput,
       totalTasks: board.tasks.length,
       completedTasks: completedTasksWithLeadTime,
    })

  } catch (error) {
    console.error('Metrics API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
