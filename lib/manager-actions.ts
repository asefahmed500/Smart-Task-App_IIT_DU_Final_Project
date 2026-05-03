'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { ActionResult } from '@/types/kanban'

async function checkManager() {
  const session = await getSession()
  if (!session || (session.role !== 'ADMIN' && session.role !== 'MANAGER')) {
    return { success: false, error: 'Unauthorized: Manager access required' }
  }
  return { success: true, session }
}

export async function getManagerBoards(): Promise<ActionResult> {
  const auth = await checkManager()
  if (!auth.success) return auth

  try {
    const boards = await prisma.board.findMany({
      where: {
        OR: [
          { ownerId: auth.session!.id },
          { members: { some: { id: auth.session!.id } } }
        ]
      },
      include: {
        owner: { select: { name: true, email: true, image: true } },
        members: { select: { id: true, name: true, email: true, role: true, image: true } },
        _count: { select: { members: true, columns: true } }
      },
      orderBy: { updatedAt: 'desc' }
    })
    return { success: true, data: boards }
  } catch (error) {
    return { success: false, error: 'Failed to fetch manager boards' }
  }
}

export async function getManagerTeam(): Promise<ActionResult> {
  const auth = await checkManager()
  if (!auth.success) return auth

  try {
    // Get all unique members across all boards the manager is in
    const boards = await prisma.board.findMany({
      where: {
        OR: [
          { ownerId: auth.session!.id },
          { members: { some: { id: auth.session!.id } } }
        ]
      },
      select: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            createdAt: true
          }
        }
      }
    })

    const memberMap = new Map()
    boards.forEach(board => {
      board.members.forEach(member => {
        memberMap.set(member.id, member)
      })
    })

    const team = Array.from(memberMap.values())
    return { success: true, data: team }
  } catch (error) {
    return { success: false, error: 'Failed to fetch manager team' }
  }
}

export async function getManagerAnalytics(): Promise<ActionResult> {
  const auth = await checkManager()
  if (!auth.success) return auth

  try {
    const userId = auth.session!.id
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // 1. Get boards the manager owns or is a member of
    const boards = await prisma.board.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { id: userId } } }
        ]
      },
      include: {
        columns: {
          include: {
            tasks: {
              include: {
                assignee: { select: { name: true } }
              }
            }
          }
        }
      }
    })

    const boardIds = boards.map(b => b.id)
    if (boardIds.length === 0) {
      return { success: true, data: { empty: true } }
    }

    // Get all task IDs in manager's boards for filtering
    const taskIds = boards.flatMap(b => b.columns.flatMap(c => c.tasks.map(t => t.id)))

    // 2. Throughput: Grouped tasks completed per day (last 30 days)
    const statusChanges = await prisma.auditLog.findMany({
      where: {
        action: { in: ['UPDATE_TASK_STATUS', 'UPDATE_TASK_STATUS_OVERRIDE'] },
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: 'asc' }
    })

    // Filter relevant changes manually since taskId is in JSON
    const relevantChanges = statusChanges.filter(log => {
      const details = log.details as any
      return taskIds.includes(details.taskId)
    })

    // Throughput calculation (Tasks moved to Done)
    const throughputMap = new Map<string, number>()
    // Initialize last 7 days at least
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      throughputMap.set(d.toISOString().split('T')[0], 0)
    }

    relevantChanges.forEach(log => {
      const details = log.details as any
      if (details.newStatus === 'Done') {
        const date = log.createdAt.toISOString().split('T')[0]
        throughputMap.set(date, (throughputMap.get(date) || 0) + 1)
      }
    })

    const throughput = Array.from(throughputMap.entries()).map(([name, value]) => ({
      name: new Date(name).toLocaleDateString('en-US', { weekday: 'short' }),
      value
    }))

    // 3. Cycle Time & Lead Time
    const completedTasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        column: { name: { contains: 'Done', mode: 'insensitive' } }
      }
    })

    // Fetch all logs for these tasks to calculate cycle time
    // We already have relevantChanges, but we might need more history for lead time if they started >30 days ago
    // For lead time, we use task.createdAt, so we just need the completion log.
    
    let totalLeadTime = 0
    let totalCycleTime = 0
    let leadTimeCount = 0
    let cycleTimeCount = 0

    completedTasks.forEach(task => {
      // Find the earliest completion log for this task
      const completionLog = relevantChanges.find(log => 
        (log.details as any).taskId === task.id && (log.details as any).newStatus === 'Done'
      )

      if (completionLog) {
        // Lead Time: From Task Creation to Done
        const lead = completionLog.createdAt.getTime() - task.createdAt.getTime()
        totalLeadTime += lead
        leadTimeCount++

        // Cycle Time: From first move to "In Progress" to Done
        const startLog = relevantChanges.find(log => 
          (log.details as any).taskId === task.id && 
          ['In Progress', 'Doing', 'Active'].includes((log.details as any).newStatus as string)
        )
        
        if (startLog) {
          const cycle = completionLog.createdAt.getTime() - startLog.createdAt.getTime()
          totalCycleTime += cycle
          cycleTimeCount++
        }
      }
    })

    const avgLeadTime = leadTimeCount > 0 ? (totalLeadTime / leadTimeCount / (1000 * 60 * 60 * 24)).toFixed(1) : '0'
    const avgCycleTime = cycleTimeCount > 0 ? (totalCycleTime / cycleTimeCount / (1000 * 60 * 60 * 24)).toFixed(1) : '0'

    // 4. Distribution (Pie Chart)
    const distribution = [
      { name: 'To Do', value: 0 },
      { name: 'In Progress', value: 0 },
      { name: 'Done', value: 0 },
      { name: 'Blocked', value: 0 },
    ]

    boards.forEach(board => {
      board.columns.forEach(col => {
        const status = col.name.toLowerCase()
        if (status.includes('done') || status.includes('complete')) distribution[2].value += col.tasks.length
        else if (status.includes('progress') || status.includes('doing')) distribution[1].value += col.tasks.length
        else if (status.includes('block')) distribution[3].value += col.tasks.length
        else distribution[0].value += col.tasks.length
      })
    })

    // 5. Bottlenecks
    const bottlenecks = boards.flatMap(board => 
      board.columns.map(col => ({
        boardName: board.name,
        columnName: col.name,
        taskCount: col.tasks.length,
        wipLimit: col.wipLimit,
        isBottleneck: col.wipLimit > 0 && col.tasks.length >= col.wipLimit && col.name !== 'Done'
      }))
    ).filter(b => b.isBottleneck).sort((a, b) => b.taskCount - a.taskCount)

    // Board summary stats
    const boardStats = boards.map(board => {
      const total = board.columns.reduce((sum, col) => sum + col.tasks.length, 0)
      const done = board.columns
        .filter(col => col.name.toLowerCase().includes('done'))
        .reduce((sum, col) => sum + col.tasks.length, 0)
      
      return {
        name: board.name,
        completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
        totalTasks: total
      }
    })

    return {
      success: true,
      data: {
        throughput,
        avgCycleTime,
        avgLeadTime,
        distribution,
        bottlenecks,
        boardStats,
        totalCompleted: leadTimeCount,
        overallCompletionRate: boardStats.length > 0 
          ? Math.round(boardStats.reduce((acc, curr) => acc + curr.completionRate, 0) / boardStats.length)
          : 0
      }
    }
  } catch (error) {
    console.error('Analytics Error:', error)
    return { success: false, error: 'Failed to generate metrics' }
  }
}
