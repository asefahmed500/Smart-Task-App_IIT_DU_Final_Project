"use server"

import { z } from "zod"
import prisma from "@/lib/prisma"
import { getSession } from "@/lib/auth-server"
import { ActionResult } from "@/types/kanban"

// Strict allowlist — only known boolean preference fields can be set.
// Prevents arbitrary field injection via raw Partial input.
const prefUpdateSchema = z
  .object({
    taskAssigned: z.boolean().optional(),
    taskUpdated: z.boolean().optional(),
    taskCommented: z.boolean().optional(),
    taskReviewed: z.boolean().optional(),
    dueDateReminder: z.boolean().optional(),
    overdueReminder: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
    boardMemberAdded: z.boolean().optional(),
    boardMemberRemoved: z.boolean().optional(),
    epicUpdated: z.boolean().optional(),
    issueLinkUpdated: z.boolean().optional(),
    sprintStarted: z.boolean().optional(),
    sprintCompleted: z.boolean().optional(),
    taskAddedToSprint: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
  })
  .strict() // reject unknown keys

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

export async function updateNotificationPreferences(data: unknown): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: "Unauthorized" }

  const validation = prefUpdateSchema.safeParse(data)
  if (!validation.success) {
    return { success: false, error: "Invalid preference data", fieldErrors: validation.error.flatten().fieldErrors }
  }

  // Only validated, allowlisted fields reach Prisma
  const cleanData = validation.data

  try {
    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: session.id },
      create: { userId: session.id, ...cleanData },
      update: cleanData,
    })

    return { success: true, data: prefs }
  } catch (error) {
    return { success: false, error: "Failed to update preferences" }
  }
}
