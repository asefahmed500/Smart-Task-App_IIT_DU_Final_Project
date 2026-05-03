'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { ActionResult } from '@/types/kanban'

export async function getManagerDashboardData(): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const boards = await prisma.board.findMany({
      where: {
        members: { some: { id: session.id } }
      },
      include: {
        columns: { include: { tasks: true } },
        owner: { select: { name: true, email: true } },
        members: { select: { id: true } }
      }
    })

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const boardIds = boards.map(b => b.id)

    const completedTasksThisWeek = await prisma.task.count({
      where: {
        column: { 
          boardId: { in: boardIds },
          name: { in: ['Done', 'done', 'Completed', 'completed'] } 
        },
        updatedAt: { gte: oneWeekAgo }
      }
    })

    const allTeamTasks = await prisma.task.findMany({
      where: {
        column: { boardId: { in: boardIds } }
      },
      include: { column: true }
    })

    const unassignedTasks = allTeamTasks.filter(t => !t.assigneeId).length

    const columnStats = new Map<string, number>()

    for (const task of allTeamTasks) {
      const colName = task.column.name
      if (!['Done', 'done', 'Completed', 'completed'].includes(colName)) {
        columnStats.set(colName, (columnStats.get(colName) || 0) + 1)
      }
    }

    const bottleneckColumns = Array.from(columnStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, taskCount]) => ({ name, taskCount }))

    const allMemberIds = new Set<string>()
    boards.forEach(b => b.members.forEach(m => allMemberIds.add(m.id)))

    return {
      success: true,
      data: {
        boards: boards.map(b => ({
          id: b.id,
          name: b.name,
          memberCount: b.members.length,
          taskCount: b.columns.reduce((sum, col) => sum + col.tasks.length, 0)
        })),
        totalTasks: allTeamTasks.length,
        completedThisWeek: completedTasksThisWeek,
        teamMemberCount: allMemberIds.size,
        unassignedTasks,
        bottleneckColumns
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to fetch manager dashboard data' }
  }
}

export async function getAdvancedReports(boardId: string): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: true,
        members: { select: { id: true } }
      }
    })

    if (!board) return { success: false, error: 'Board not found' }

    const tasks = await prisma.task.findMany({
      where: { column: { boardId } },
      include: { column: true }
    })

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: { in: ['UPDATE_TASK_STATUS', 'UPDATE_TASK_STATUS_OVERRIDE'] },
      },
      orderBy: { createdAt: 'asc' }
    })

    const filteredLogs = auditLogs.filter(log => (log.details as any).boardId === boardId)

    const taskLogs = new Map<string, any[]>()
    filteredLogs.forEach(log => {
      const details = log.details as any
      if (!taskLogs.has(details.taskId)) {
        taskLogs.set(details.taskId, [])
      }
      taskLogs.get(details.taskId)!.push(log)
    })

    const cycleTimes: number[] = []
    const leadTimes: number[] = []
    const columnDurations: Record<string, number[]> = {}
    
    board.columns.forEach(col => {
      columnDurations[col.name] = []
    })

    const sortedColumns = [...board.columns].sort((a, b) => a.order - b.order)
    const firstColumnId = sortedColumns[0]?.id
    const firstColumnName = sortedColumns[0]?.name || ''

    tasks.forEach(task => {
      const logs = taskLogs.get(task.id) || []
      const creationTime = task.createdAt.getTime()
      
      let startTime: number | null = null
      let completionTime: number | null = null
      
      let lastTransitionTime = creationTime
      let currentColumnName = firstColumnName

      logs.forEach(log => {
        const details = log.details as any
        const transitionTime = log.createdAt.getTime()
        const duration = transitionTime - lastTransitionTime
        
        if (columnDurations[currentColumnName]) {
          columnDurations[currentColumnName].push(duration)
        }

        if (!startTime && details.previousColumnId === firstColumnId) {
          startTime = transitionTime
        }

        if (['done', 'completed'].includes(details.newStatus.toLowerCase())) {
          if (!completionTime) completionTime = transitionTime
        } else {
          completionTime = null
        }

        currentColumnName = details.newStatus
        lastTransitionTime = transitionTime
      })

      const now = Date.now()
      if (columnDurations[currentColumnName]) {
        columnDurations[currentColumnName].push(now - lastTransitionTime)
      }

      if (completionTime) {
        leadTimes.push((completionTime - creationTime) / (1000 * 60 * 60 * 24))
        if (startTime) {
          cycleTimes.push((completionTime - startTime) / (1000 * 60 * 60 * 24))
        }
      }
    })

    const averageLeadTime = leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0
    const averageCycleTime = cycleTimes.length > 0 ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0

    const bottleneckData = Object.entries(columnDurations).map(([name, durations]) => ({
      name,
      averageDuration: durations.length > 0 ? (durations.reduce((a, b) => a + b, 0) / durations.length) / (1000 * 60 * 60) : 0
    }))

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const throughputData: Record<string, number> = {}
    for (let i = 0; i < 30; i++) {
      const d = new Date()
      d.setDate(thirtyDaysAgo.getDate() + i)
      throughputData[d.toISOString().split('T')[0]] = 0
    }

    tasks.forEach(task => {
      const logs = taskLogs.get(task.id) || []
      const doneLog = logs.find(log => ['done', 'completed'].includes((log.details as any).newStatus.toLowerCase()))
      if (doneLog && doneLog.createdAt >= thirtyDaysAgo) {
        const dateStr = doneLog.createdAt.toISOString().split('T')[0]
        if (throughputData[dateStr] !== undefined) {
          throughputData[dateStr]++
        }
      }
    })

    return {
      success: true,
      data: {
        averageLeadTime,
        averageCycleTime,
        bottleneckData,
        throughputData: Object.entries(throughputData).map(([date, count]) => ({ date, count })),
        totalTasks: tasks.length,
        completedTasks: leadTimes.length
      }
    }
  } catch (error) {
    console.error('[GET_ADVANCED_REPORTS_ERROR]', error)
    return { success: false, error: 'Failed to generate advanced reports' }
  }
}

export async function getMemberDashboardData(): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const myTasks = await prisma.task.findMany({
      where: { assigneeId: session.id },
      include: { column: { include: { board: { select: { id: true, name: true } } } } },
      orderBy: { updatedAt: 'desc' },
      take: 10
    })

    const myBoards = await prisma.board.findMany({
      where: { members: { some: { id: session.id } } },
      select: { id: true, name: true }
    })

    const recentActivity = await prisma.auditLog.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    const unreadNotifications = await prisma.notification.count({
      where: { userId: session.id, isRead: false }
    })

    const activeTasks = myTasks.filter(t => {
      const status = t.column.name.toLowerCase()
      return !['done', 'completed'].includes(status)
    })

    return {
      success: true,
      data: {
        assignedTasks: myTasks.length,
        completedTasks: myTasks.filter(t => {
          const status = t.column.name.toLowerCase()
          return ['done', 'completed'].includes(status)
        }).length,
        activeBoardCount: myBoards.length,
        unreadNotifications,
        myTasks: myTasks.map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority as string,
          column: { name: t.column.name, board: { id: t.column.board.id, name: t.column.board.name } }
        })),
        focusTasks: activeTasks.slice(0, 3).map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority as string,
          column: { name: t.column.name, board: { id: t.column.board.id, name: t.column.board.name } }
        })),
        recentActivity: recentActivity.map(a => ({
          action: a.action,
          details: a.details as Record<string, unknown>,
          createdAt: a.createdAt.toISOString()
        }))
      }
    }
  } catch (error) {
    return { success: false, error: 'Failed to fetch member dashboard data' }
  }
}