'use server'

import prisma from '@/lib/prisma'
import { emitNotification } from '@/lib/socket-emitter'

/**
 * Check for tasks that are due within the next 24 hours and create DUE_DATE_REMINDER notifications
 * This should be called periodically (e.g., via cron job or API route)
 */
export async function checkDueDateReminders(): Promise<number> {
  const now = new Date()
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  // Find tasks with dueDate between now and 24 hours from now
  // that haven't had a reminder sent yet (we track this via notification existence)
  const tasksDueSoon = await prisma.task.findMany({
    where: {
      dueDate: {
        gte: now,
        lte: in24Hours,
      },
      assigneeId: { not: null },
    },
    include: {
      assignee: true,
      column: {
        include: {
          board: true,
        },
      },
    },
  })

  let reminderCount = 0

  for (const task of tasksDueSoon) {
    if (!task.assigneeId) continue

    // Check if we already sent a reminder for this task
    const existingReminder = await prisma.notification.findFirst({
      where: {
        userId: task.assigneeId,
        type: 'DUE_DATE_REMINDER',
        message: { contains: task.id },
      },
    })

    if (!existingReminder) {
      const notification = await prisma.notification.create({
        data: {
          userId: task.assigneeId,
          type: 'DUE_DATE_REMINDER',
          message: `Task "${task.title}" (ID: ${task.id}) is due within 24 hours`,
          link: `/dashboard/board/${task.column.boardId}`,
        },
      })
      emitNotification({
        userId: task.assigneeId,
        type: 'DUE_DATE_REMINDER',
        message: `Task "${task.title}" (ID: ${task.id}) is due within 24 hours`,
        link: `/dashboard/board/${task.column.boardId}`,
        notificationId: notification.id,
      })
      reminderCount++
    }
  }

  return reminderCount
}

/**
 * Check for overdue tasks and create OVERDUE notifications
 * This should be called periodically
 */
export async function checkOverdueTasks(): Promise<number> {
  const now = new Date()

  // Find tasks with dueDate in the past that are not in a "Done" column
  const overdueTasks = await prisma.task.findMany({
    where: {
      dueDate: {
        lt: now,
      },
      column: {
        name: { not: { contains: 'done' }, mode: 'insensitive' },
      },
      assigneeId: { not: null },
    },
    include: {
      assignee: true,
      column: {
        include: {
          board: true,
        },
      },
    },
  })

  let overdueCount = 0

  for (const task of overdueTasks) {
    if (!task.assigneeId) continue

    // Check if we already sent an overdue notification for this task today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const existingOverdue = await prisma.notification.findFirst({
      where: {
        userId: task.assigneeId,
        type: 'OVERDUE',
        message: { contains: task.id },
        createdAt: { gte: todayStart },
      },
    })

    if (!existingOverdue) {
      const notification = await prisma.notification.create({
        data: {
          userId: task.assigneeId,
          type: 'OVERDUE',
          message: `Task "${task.title}" (ID: ${task.id}) is overdue`,
          link: `/dashboard/board/${task.column.boardId}`,
        },
      })
      emitNotification({
        userId: task.assigneeId,
        type: 'OVERDUE',
        message: `Task "${task.title}" (ID: ${task.id}) is overdue`,
        link: `/dashboard/board/${task.column.boardId}`,
        notificationId: notification.id,
      })
      overdueCount++
    }
  }

  return overdueCount
}

/**
 * Notify all admins about a new user signup
 * @param excludeUserId - Optional user ID to exclude from notifications (e.g., the admin who created the user)
 */
export async function notifyAdminsNewUser(
  newUserId: string,
  newUserName: string | null,
  newUserEmail: string,
  excludeUserId?: string
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: {
      role: 'ADMIN',
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  })

  for (const admin of admins) {
    const notification = await prisma.notification.create({
      data: {
        userId: admin.id,
        type: 'NEW_USER_SIGNUP',
        message: `New user signed up: ${newUserName || newUserEmail} (${newUserEmail})`,
        link: `/admin/users`,
      },
    })
    emitNotification({
      userId: admin.id,
      type: 'NEW_USER_SIGNUP',
      message: `New user signed up: ${newUserName || newUserEmail} (${newUserEmail})`,
      link: `/admin/users`,
      notificationId: notification.id,
    })
  }
}

/**
 * Combined function to run all notification checks
 */
export async function runNotificationChecks(): Promise<{
  dueDateReminders: number
  overdueTasks: number
}> {
  const [dueDateReminders, overdueTasks] = await Promise.all([
    checkDueDateReminders(),
    checkOverdueTasks(),
  ])

  return { dueDateReminders, overdueTasks }
}
