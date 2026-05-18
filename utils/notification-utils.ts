import prisma from '@/lib/prisma'
import { emitNotification } from '@/utils/socket-emitter'

type NotifType =
  | 'TASK_ASSIGNED'
  | 'TASK_STATUS_CHANGED'
  | 'COMMENT_MENTION'
  | 'REVIEW_REQUESTED'
  | 'REVIEW_COMPLETED'
  | 'AUTOMATION_TRIGGERED'
  | 'DUE_DATE_REMINDER'
  | 'OVERDUE'
  | 'NEW_USER_SIGNUP'
  | 'BOARD_MEMBER_ADDED'
  | 'BOARD_MEMBER_REMOVED'
  | 'SPRINT_STARTED'
  | 'SPRINT_COMPLETED'
  | 'TASK_ADDED_TO_SPRINT'

const notifTypeToPrefKey: Partial<Record<NotifType, keyof Pick<
  import('@/lib/prisma').NotificationPreference,
  'taskAssigned' | 'statusChanged' | 'commentMention' |
  'automationTriggered' | 'dueDateReminder' | 'overdueReminder' |
  'reviewRequested' | 'reviewCompleted' | 'newUserSignup' |
  'boardMemberAdded' | 'boardMemberRemoved'
>>> = {
  TASK_ASSIGNED: 'taskAssigned',
  TASK_STATUS_CHANGED: 'statusChanged',
  COMMENT_MENTION: 'commentMention',
  REVIEW_REQUESTED: 'reviewRequested',
  REVIEW_COMPLETED: 'reviewCompleted',
  AUTOMATION_TRIGGERED: 'automationTriggered',
  DUE_DATE_REMINDER: 'dueDateReminder',
  OVERDUE: 'overdueReminder',
  NEW_USER_SIGNUP: 'newUserSignup',
  BOARD_MEMBER_ADDED: 'boardMemberAdded',
  BOARD_MEMBER_REMOVED: 'boardMemberRemoved',
  SPRINT_STARTED: 'taskAssigned',
  SPRINT_COMPLETED: 'statusChanged',
  TASK_ADDED_TO_SPRINT: 'taskAssigned',
}

const booleanPrefKeys = new Set([
  'taskAssigned', 'statusChanged', 'commentMention',
  'automationTriggered', 'dueDateReminder', 'overdueReminder',
  'reviewRequested', 'reviewCompleted', 'newUserSignup',
  'boardMemberAdded', 'boardMemberRemoved',
]) as Set<string & keyof import('@/lib/prisma').NotificationPreference>

export async function sendNotification(input: {
  userId: string
  type: NotifType
  message: string
  link?: string
}): Promise<void> {
  try {
    const prefKey = notifTypeToPrefKey[input.type]
    if (prefKey && booleanPrefKeys.has(prefKey)) {
      const prefs = await prisma.notificationPreference.findUnique({
        where: { userId: input.userId },
      })
      if (prefs && (prefs[prefKey] as boolean | undefined) === false) return
    }

    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        message: input.message,
        link: input.link ?? null,
      },
    })
    emitNotification({
      userId: input.userId,
      type: input.type,
      message: input.message,
      link: input.link,
      notificationId: notification.id,
    })
  } catch (error) {
    console.error('[NOTIFICATION_ERROR]', error)
  }
}

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
      await sendNotification({
        userId: task.assigneeId,
        type: 'DUE_DATE_REMINDER',
        message: `Task "${task.title}" (ID: ${task.id}) is due within 24 hours`,
        link: `/dashboard/board/${task.column.boardId}`,
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
      await sendNotification({
        userId: task.assigneeId,
        type: 'OVERDUE',
        message: `Task "${task.title}" (ID: ${task.id}) is overdue`,
        link: `/dashboard/board/${task.column.boardId}`,
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
    await sendNotification({
      userId: admin.id,
      type: 'NEW_USER_SIGNUP',
      message: `New user signed up: ${newUserName || newUserEmail} (${newUserEmail})`,
      link: `/admin/users`,
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
