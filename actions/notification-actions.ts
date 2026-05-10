'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { revalidatePath } from 'next/cache'
import { ActionResult } from '@/types/kanban'
import { idSchema } from '@/lib/schemas'

/**
 * Get notifications for the current user
 * Background checks run on the Socket.IO server every 60s, not here
 */
export async function getNotifications(): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const notifications = await prisma.notification.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 50
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