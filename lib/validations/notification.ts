import { z } from 'zod'

export const markNotificationReadSchema = z.object({
  read: z.boolean(),
})

export const bulkMarkReadSchema = z.object({
  notificationIds: z.array(z.string()).min(1, 'At least one notification ID required'),
})

export const deleteNotificationSchema = z.object({
  notificationId: z.string().min(1, 'Notification ID is required'),
})
