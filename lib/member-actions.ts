'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { ActionResult } from '@/types/kanban'

async function checkMember() {
  const session = await getSession()
  if (!session) {
    return { success: false, error: 'Unauthorized' }
  }
  return { success: true, session }
}

export async function getMemberTasks(): Promise<ActionResult> {
  const auth = await checkMember()
  if (!auth.success) return auth

  try {
    const tasks = await prisma.task.findMany({
      where: { assigneeId: auth.session!.id },
      include: {
        column: {
          include: {
            board: {
              select: { id: true, name: true }
            }
          }
        },
        tags: true,
        _count: {
          select: {
            comments: true,
            attachments: true,
            checklists: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })
    return { success: true, data: tasks }
  } catch (error) {
    return { success: false, error: 'Failed to fetch member tasks' }
  }
}

export async function getMemberBoards(): Promise<ActionResult> {
  const auth = await checkMember()
  if (!auth.success) return auth

  try {
    const boards = await prisma.board.findMany({
      where: {
        members: { some: { id: auth.session!.id } }
      },
      include: {
        owner: { select: { name: true, email: true } },
        _count: { select: { members: true, columns: true } }
      }
    })
    return { success: true, data: boards }
  } catch (error) {
    return { success: false, error: 'Failed to fetch member boards' }
  }
}

export async function getMemberStats(): Promise<ActionResult> {
  const auth = await checkMember()
  if (!auth.success) return auth

  try {
    const totalTasks = await prisma.task.count({
      where: { assigneeId: auth.session!.id }
    })
    
    const completedTasks = await prisma.task.count({
      where: { 
        assigneeId: auth.session!.id,
        column: { name: { contains: 'Done', mode: 'insensitive' } }
      }
    })

    const activeTasks = totalTasks - completedTasks

    // Daily velocity for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      return d
    }).reverse()

    const dailyCompletions = await Promise.all(last7Days.map(async (date) => {
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      
      const count = await prisma.task.count({
        where: {
          assigneeId: auth.session!.id,
          updatedAt: { gte: date, lt: nextDay },
          column: { name: { contains: 'Done', mode: 'insensitive' } }
        }
      })
      return { 
        day: date.toLocaleDateString('en-US', { weekday: 'short' }), 
        tasks: count 
      }
    }))

    // Calculate accuracy (checklist completion)
    const assignedTasksWithChecklists = await prisma.task.findMany({
      where: { assigneeId: auth.session!.id },
      include: { checklists: { include: { items: true } } }
    })

    let totalItems = 0
    let completedItems = 0

    assignedTasksWithChecklists.forEach(task => {
      task.checklists.forEach(checklist => {
        totalItems += checklist.items.length
        completedItems += checklist.items.filter(item => item.isCompleted).length
      })
    })

    const accuracyRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 100

    // Calculate Completion Speed (On-time completion rate)
    const doneTasksWithDates = await prisma.task.findMany({
      where: {
        assigneeId: auth.session!.id,
        column: { name: { contains: 'Done', mode: 'insensitive' } },
        dueDate: { not: null }
      },
      select: { updatedAt: true, dueDate: true }
    })

    const onTimeCompletions = doneTasksWithDates.filter(t => t.updatedAt <= t.dueDate!).length
    const completionSpeed = doneTasksWithDates.length > 0 
      ? Math.round((onTimeCompletions / doneTasksWithDates.length) * 100) 
      : 100

    // Calculate Collaboration Rate (Tasks with comments or attachments)
    const tasksWithCollaboration = await prisma.task.count({
      where: {
        assigneeId: auth.session!.id,
        OR: [
          { comments: { some: {} } },
          { attachments: { some: {} } }
        ]
      }
    })
    const collaborationRate = totalTasks > 0 ? Math.round((tasksWithCollaboration / totalTasks) * 100) : 0

    // Calculate Consistency Score (Stability of daily output)
    // Score = 100 - (CV * 100), where CV is coefficient of variation
    const counts = dailyCompletions.map(d => d.tasks)
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length
    
    let consistencyScore = 0
    if (avg > 0) {
      const variance = counts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / counts.length
      const stdDev = Math.sqrt(variance)
      const cv = stdDev / avg
      consistencyScore = Math.max(0, Math.min(100, Math.round(100 * (1 - Math.min(cv, 1)))))
    } else {
      consistencyScore = totalTasks > 0 ? 50 : 0 // Neutral if no activity yet
    }

    // Activity in the last 7 days
    const recentActivity = await prisma.auditLog.findMany({
      where: { 
        userId: auth.session!.id,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { 
      success: true, 
      data: { 
        totalTasks, 
        completedTasks, 
        activeTasks, 
        recentActivityCount: recentActivity.length,
        productivityData: dailyCompletions,
        accuracyRate,
        completionSpeed,
        collaborationRate,
        consistencyScore
      } 
    }
  } catch (error) {
    return { success: false, error: 'Failed to fetch member stats' }
  }
}
