'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function getManagerDashboardData() {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

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

export async function getMemberDashboardData() {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

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
      priority: t.priority,
      column: { name: t.column.name, board: { id: t.column.board.id, name: t.column.board.name } }
    })),
    focusTasks: activeTasks.slice(0, 3).map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      column: { name: t.column.name, board: { id: t.column.board.id, name: t.column.board.name } }
    })),
    recentActivity: recentActivity.map(a => ({
      action: a.action,
      details: a.details,
      createdAt: a.createdAt.toISOString()
    }))
  }
}