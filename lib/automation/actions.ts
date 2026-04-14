import { prisma } from '@/lib/prisma'
import { AutomationAction } from './engine'

/**
 * Execute an automation action
 * @param action - The action configuration
 * @param taskData - The task data
 * @param boardId - The board ID
 * @param actorId - The user who triggered the automation
 */
export async function executeAction(
  action: AutomationAction,
  taskData: any,
  boardId: string,
  actorId: string
): Promise<void> {
  const { type, target, value } = action

  switch (type) {
    case 'NOTIFY_USER':
      await notifyUser(target!, taskData, boardId)
      break

    case 'NOTIFY_ROLE':
      await notifyRole(target!, taskData, boardId)
      break

    case 'AUTO_ASSIGN':
      await autoAssign(target!, taskData, actorId, boardId)
      break

    case 'CHANGE_PRIORITY':
      await changePriority(value!, taskData, actorId, boardId)
      break

    case 'ADD_LABEL':
      await addLabel(value!, taskData, actorId, boardId)
      break

    default:
      console.warn(`Unknown action type: ${type}`)
  }
}

/**
 * Notify a specific user
 */
async function notifyUser(userId: string, taskData: any, boardId: string) {
  // Create a notification for the user
  await prisma.notification.create({
    data: {
      userId,
      type: 'AUTOMATION_TRIGGER',
      title: `Automation: "${taskData.title}"`,
      message: `An automation rule was triggered for this task.`,
      link: `/board/${boardId}?task=${taskData.id}`,
    },
  })
}

/**
 * Notify all users with a specific role on the board
 */
async function notifyRole(role: string, taskData: any, boardId: string) {
  // Find all board members with the specified role
  const members = await prisma.boardMember.findMany({
    where: {
      boardId,
      role: role as any,
    },
    include: {
      user: true,
    },
  })

  // Create notifications for each member
  for (const member of members) {
    await prisma.notification.create({
      data: {
        userId: member.user.id,
        type: 'AUTOMATION_TRIGGER',
        title: `Automation: "${taskData.title}"`,
        message: `An automation rule was triggered for this task.`,
        link: `/board/${boardId}?task=${taskData.id}`,
      },
    })
  }
}

/**
 * Automatically assign the task to a user
 */
async function autoAssign(userId: string, taskData: any, actorId: string, boardId: string) {
  await prisma.task.update({
    where: { id: taskData.id },
    data: {
      assigneeId: userId,
    },
  })

  // Log the assignment
  await prisma.auditLog.create({
    data: {
      action: 'TASK_AUTO_ASSIGNED',
      entityType: 'Task',
      entityId: taskData.id,
      actorId,
      boardId,
      changes: {
        assigneeId: userId,
        automation: true,
      },
    },
  })
}

/**
 * Change the task priority
 */
async function changePriority(priority: string, taskData: any, actorId: string, boardId: string) {
  await prisma.task.update({
    where: { id: taskData.id },
    data: {
      priority: priority as any,
    },
  })

  // Log the priority change
  await prisma.auditLog.create({
    data: {
      action: 'TASK_PRIORITY_CHANGED',
      entityType: 'Task',
      entityId: taskData.id,
      actorId,
      boardId,
      changes: {
        priority,
        automation: true,
      },
    },
  })
}

/**
 * Add a label to the task
 */
async function addLabel(label: string, taskData: any, actorId: string, boardId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskData.id },
    select: { labels: true },
  })

  if (!task) return

  const labels = task.labels || []
  if (!labels.includes(label)) {
    await prisma.task.update({
      where: { id: taskData.id },
      data: {
        labels: [...labels, label],
      },
    })

    // Log the label addition
    await prisma.auditLog.create({
      data: {
        action: 'TASK_LABEL_ADDED',
        entityType: 'Task',
        entityId: taskData.id,
        actorId,
        boardId,
        changes: {
          label,
          automation: true,
        },
      },
    })
  }
}
