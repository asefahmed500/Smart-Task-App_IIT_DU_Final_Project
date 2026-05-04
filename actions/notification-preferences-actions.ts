"use server"

import prisma from "@/lib/prisma"
import { getSession } from "@/lib/auth-server"
import { ActionResult } from "@/types/kanban"

export async function getNotificationPreferences(): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: "Unauthorized" }

  try {
    let prefs = await prisma.notificationPreference.findUnique({
      where: { userId: session.id },
    })

    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: { userId: session.id },
      })
    }

    return { success: true, data: prefs }
  } catch (error) {
    return { success: false, error: "Failed to fetch preferences" }
  }
}

export async function updateNotificationPreferences(
  data: Partial<
    Omit<
      NonNullable<
        Awaited<ReturnType<typeof prisma.notificationPreference.findUnique>>
      >,
      "id" | "userId" | "createdAt" | "updatedAt"
    >
  >
): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: "Unauthorized" }

  try {
    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: session.id },
      create: { userId: session.id, ...data },
      update: data,
    })

    return { success: true, data: prefs }
  } catch (error) {
    return { success: false, error: "Failed to update preferences" }
  }
}
