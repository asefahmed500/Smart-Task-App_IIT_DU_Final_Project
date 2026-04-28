import { prisma } from './prisma'
import { getIO } from './socket-server'
import { sendEmail } from './mail'
import { triggerWebhooks } from './webhooks'

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_UNASSIGNED'
  | 'COMMENT_ADDED'
  | 'TASK_BLOCKED'
  | 'TASK_UNBLOCKED'
  | 'TASK_MOVED'
  | 'AUTOMATION_TRIGGER'

/**
 * Creates an in-app notification for a user and broadcasts via Socket.IO
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  shouldEmail = false
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    })

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
        status: 'SENT',
      },
    })

    // 1. Broadcast via Socket.IO if server is available
    const io = getIO()
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        read: notification.read,
        createdAt: notification.createdAt,
      })
    }

    // 2. Send Email if requested
    if (shouldEmail && user?.email) {
      await sendEmail({
        to: user.email,
        subject: `[SmartTask] ${title}`,
        text: `${message}\n\nView here: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${link || ''}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>${title}</h2>
            <p>${message}</p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${link || ''}" 
               style="display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">
              View in SmartTask
            </a>
          </div>
        `
      })
    }

    return notification
  } catch (error) {
    console.error('Failed to create notification:', error)

    try {
      await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          link,
          status: 'FAILED',
          lastError: error instanceof Error ? error.message : String(error),
        }
      })
    } catch (e) {
      console.error('Record failed notification error:', e)
    }
  }
}

/**
 * Centralized task event handler: Notifications + Webhooks
 */
export async function handleTaskEvent(
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
      include: {
        board: {
          select: { id: true, ownerId: true },
          include: { members: { select: { userId: true } } }
        },
        createdBy: { select: { id: true } }
      }
    })

    if (!task) return

    // 1. Trigger Webhooks
    await triggerWebhooks(task.boardId, type, {
      taskId,
      actorId,
      title,
      message,
      taskTitle: task.title
    })

    // 2. Notify participants: assignee, creator, board owner, AND all board members
    const userIds = new Set<string>()
    if (task.assigneeId) userIds.add(task.assigneeId)
    if (task.createdById) userIds.add(task.createdById)
    if (task.board.ownerId) userIds.add(task.board.ownerId)
    // Add all board members
    task.board.members.forEach((member) => userIds.add(member.userId))

    userIds.delete(actorId)

    const emailTypes: NotificationType[] = ['TASK_ASSIGNED', 'COMMENT_ADDED', 'TASK_BLOCKED']

    const promises = Array.from(userIds).map(userId =>
      createNotification(userId, type, title, message, link, emailTypes.includes(type))
    )

    await Promise.all(promises)
  } catch (error) {
    console.error('Failed to handle task event:', error)
  }
}
