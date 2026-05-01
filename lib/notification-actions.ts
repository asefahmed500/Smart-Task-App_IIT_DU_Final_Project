'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getNotifications() {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

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