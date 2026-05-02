'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { revalidatePath } from 'next/cache'
import { checkDueDateReminders, checkOverdueTasks } from '@/lib/notification-utils'
import { ActionResult } from '@/types/kanban'
import { idSchema } from './schemas'

/**
 * Get notifications and also trigger due date/overdue checks for the current user
 */
export async function getNotifications(): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    // Run notification checks for this user's tasks
    // In a production system, you'd want to optimize this to check only the current user's tasks
    // or run it via a background job
    Promise.all([
      checkDueDateReminders(),
      checkOverdueTasks(),
    ]).catch(err => console.error('Error in background notification checks:', err))

    const notifications = await prisma.notification.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 50 // Increased limit
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: session.id, isRead: false }
    })

    return { 
      success: true, 
      data: { notifications, unreadCount } 
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch notifications' }
  }
}

export async function markNotificationRead(input: { notificationId: string }): Promise<ActionResult> {
  const { notificationId } = input
  try {
    const validatedId = idSchema.parse(notificationId)
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    await prisma.notification.update({
      where: { id: validatedId, userId: session.id },
      data: { isRead: true }
    })

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to mark notification as read' }
  }
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    await prisma.notification.updateMany({
      where: { userId: session.id, isRead: false },
      data: { isRead: true }
    })

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to mark all notifications as read' }
  }
}

export async function deleteNotification(input: { notificationId: string }): Promise<ActionResult> {
  const { notificationId } = input
  try {
    const validatedId = idSchema.parse(notificationId)
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    await prisma.notification.delete({
      where: { id: validatedId, userId: session.id }
    })

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete notification' }
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession()
  return session?.id || null
}