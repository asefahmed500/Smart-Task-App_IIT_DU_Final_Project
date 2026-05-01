'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { checkDueDateReminders, checkOverdueTasks } from '@/lib/notification-utils'

export async function getCurrentUserId() {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session.id
}

/**
 * Get notifications and also trigger due date/overdue checks for the current user
 */
export async function getNotifications() {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  // Run notification checks for this user's tasks
  // Note: These functions check all users, but they have deduplication logic
  // In a production system, you'd want to optimize this to check only the current user's tasks
  Promise.all([
    checkDueDateReminders(),
    checkOverdueTasks(),
  ]).catch(console.error)

  const notifications = await prisma.notification.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  const unreadCount = await prisma.notification.count({
    where: { userId: session.id, isRead: false }
  })

  return { notifications, unreadCount }
}

export async function markNotificationRead(notificationId: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  await prisma.notification.update({
    where: { id: notificationId, userId: session.id },
    data: { isRead: true }
  })

  revalidatePath('/dashboard')
  return { success: true }
}

export async function markAllNotificationsRead() {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  await prisma.notification.updateMany({
    where: { userId: session.id, isRead: false },
    data: { isRead: true }
  })

  revalidatePath('/dashboard')
  return { success: true }
}