import { prisma } from './prisma'

export type NotificationType = 
  | 'TASK_ASSIGNED' 
  | 'TASK_UNASSIGNED' 
  | 'COMMENT_ADDED' 
  | 'TASK_BLOCKED' 
  | 'TASK_UNBLOCKED' 
  | 'TASK_MOVED'
  | 'AUTOMATION_TRIGGER'

/**
 * Creates an in-app notification for a user
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string
) {
  try {
    return await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
        status: 'SENT',
      },
    })
  } catch (error: any) {
    console.error('Failed to create notification:', error)
    
    // Save as FAILED if possible, for future retry
    try {
      await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          link,
          status: 'FAILED',
          lastError: error.message || String(error),
        }
      })
    } catch (e) {
      console.error('Record failed notification error:', e)
    }
    // We don't throw here to avoid breaking the main request flow
  }
}

/**
 * Notify all participants of a task (e.g. for comments)
 * Excludes the actor who triggered the event
 */
export async function notifyTaskParticipants(
  taskId: string,
  actorId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string
) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        assigneeId: true,
        createdById: true,
        board: {
          select: { ownerId: true }
        }
      }
    })

    if (!task) return

    // Collect candidate user IDs
    const userIds = new Set<string>()
    if (task.assigneeId) userIds.add(task.assigneeId)
    if (task.createdById) userIds.add(task.createdById)
    if (task.board.ownerId) userIds.add(task.board.ownerId)

    // Remove the actor
    userIds.delete(actorId)

    // Send notifications
    const promises = Array.from(userIds).map(userId => 
      createNotification(userId, type, title, message, link)
    )

    await Promise.all(promises)
  } catch (error) {
    console.error('Failed to notify task participants:', error)
  }
}
