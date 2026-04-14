import { useMemo } from 'react'
import type { Task } from '@/lib/slices/boardsApi'

interface DashboardStats {
  tasksDueToday: number
  overdueTasks: number
  inProgressTasks: number
  completedTasks: number
  totalTasks: number
  avgCycleTime: string
  throughput: number
}

export function useDashboardStats(
  tasks: Task[],
  userId?: string
): DashboardStats {
  return useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    let tasksDueToday = 0
    let overdueTasks = 0
    let inProgressTasks = 0
    let completedTasks = 0
    let totalCycleTime = 0
    let completedWithCycleTime = 0
    let completedTasksThisWeek = 0

    const tasksToProcess = userId
      ? tasks.filter((task) => task.assigneeId === userId)
      : tasks

    tasksToProcess.forEach((task) => {
      // Count tasks by status
      if (task.status === 'done') {
        completedTasks++
      } else if (task.status === 'in_progress') {
        inProgressTasks++
      }

      // Count due today
      if (task.dueDate && task.status !== 'done') {
        const dueDate = new Date(task.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        if (dueDate.getTime() === today.getTime()) {
          tasksDueToday++
        } else if (dueDate.getTime() < today.getTime()) {
          overdueTasks++
        }
      }

      // Count completed this week
      if (task.completedAt) {
        const completedAt = new Date(task.completedAt)
        if (completedAt >= weekAgo) {
          completedTasksThisWeek++
        }
      }

      // Calculate cycle time
      if (task.completedAt && task.inProgressAt) {
        const completedTime = new Date(task.completedAt).getTime()
        const startedTime = new Date(task.inProgressAt).getTime()
        totalCycleTime += completedTime - startedTime
        completedWithCycleTime++
      }
    })

    const avgCycleTimeDays = completedWithCycleTime > 0
      ? totalCycleTime / completedWithCycleTime / (1000 * 60 * 60 * 24)
      : 0

    return {
      tasksDueToday,
      overdueTasks,
      inProgressTasks,
      completedTasks,
      totalTasks: tasksToProcess.length,
      avgCycleTime: avgCycleTimeDays.toFixed(1) + 'd',
      throughput: completedTasksThisWeek,
    }
  }, [tasks, userId])
}
