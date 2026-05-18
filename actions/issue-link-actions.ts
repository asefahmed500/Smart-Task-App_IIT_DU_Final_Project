'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ActionResult } from '@/types/kanban'
import { emitBoardEvent } from '@/utils/socket-emitter'
import { createAuditLog } from '@/lib/create-audit-log'
import { checkBoardPermission } from './board-actions'
import { sendNotification } from '@/utils/notification-utils'

// --- Schemas ---

const createIssueLinkSchema = z.object({
  sourceTaskId: z.string(),
  targetTaskId: z.string(),
  linkType: z.enum(['BLOCKS', 'BLOCKED_BY', 'RELATES_TO', 'DUPLICATES', 'DUPLICATED_BY']),
})

const deleteIssueLinkSchema = z.object({
  id: z.string(),
})

const idSchema = z.string()

// --- Issue Linking ---

export async function createIssueLink(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = createIssueLinkSchema.parse(rawInput)

    if (input.sourceTaskId === input.targetTaskId) {
      return { success: false, error: 'Cannot link a task to itself' }
    }

    const sourceTask = await prisma.task.findUnique({
      where: { id: input.sourceTaskId },
      include: { column: { include: { board: true } } },
    })
    if (!sourceTask) return { success: false, error: 'Source task not found' }

    const targetTask = await prisma.task.findUnique({
      where: { id: input.targetTaskId },
      include: { column: { include: { board: true } } },
    })
    if (!targetTask) return { success: false, error: 'Target task not found' }

    if (sourceTask.column.boardId !== targetTask.column.boardId) {
      return { success: false, error: 'Both tasks must be on the same board' }
    }

    const perm = await checkBoardPermission({
      boardId: sourceTask.column.boardId,
      allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER'],
    })
    if (!perm.success) return perm

    const inverseMap: Record<string, string> = {
      BLOCKS: 'BLOCKED_BY',
      BLOCKED_BY: 'BLOCKS',
      DUPLICATES: 'DUPLICATED_BY',
      DUPLICATED_BY: 'DUPLICATES',
      RELATES_TO: 'RELATES_TO',
    }
    const inverse = inverseMap[input.linkType] as string | undefined

    const existingLink = await prisma.issueLink.findFirst({
      where: {
        OR: [
          { sourceTaskId: input.sourceTaskId, targetTaskId: input.targetTaskId, linkType: input.linkType },
          { sourceTaskId: input.targetTaskId, targetTaskId: input.sourceTaskId, linkType: inverse ? { in: [input.linkType, inverse as any] } : input.linkType },
        ],
      },
    })
    if (existingLink) {
      return { success: false, error: 'A similar link already exists between these tasks' }
    }

    const link = await prisma.issueLink.create({
      data: {
        sourceTaskId: input.sourceTaskId,
        targetTaskId: input.targetTaskId,
        linkType: input.linkType,
      },
      include: {
        sourceTask: { select: { id: true, title: true } },
        targetTask: { select: { id: true, title: true } },
      },
    })

    await createAuditLog({
      userId: session.id,
      action: 'ISSUE_LINK_CREATED',
      details: {
        sourceTaskId: input.sourceTaskId,
        targetTaskId: input.targetTaskId,
        linkType: input.linkType,
      },
    })

    emitBoardEvent('issueLink:created', {
      link,
      boardId: sourceTask.column.boardId,
    })

    // Notify assignee of target task
    if (targetTask.assigneeId && targetTask.assigneeId !== session.id) {
      await sendNotification({
        userId: targetTask.assigneeId,
        type: 'ISSUE_LINK_CREATED',
        message: `Task "${sourceTask.title}" now ${input.linkType.toLowerCase().replace('_', ' ')} "${targetTask.title}"`,
        link: `/dashboard/board/${sourceTask.column.boardId}`,
      })
    }

    revalidatePath(`/dashboard/board/${sourceTask.column.boardId}`)
    return { success: true, data: link, message: 'Issue link created' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[CREATE_ISSUE_LINK_ERROR]', error)
    return { success: false, error: 'Failed to create issue link' }
  }
}

export async function deleteIssueLink(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = deleteIssueLinkSchema.parse(rawInput)

    const link = await prisma.issueLink.findUnique({
      where: { id: input.id },
      include: {
        sourceTask: { include: { column: { include: { board: true } } } },
      },
    })
    if (!link) return { success: false, error: 'Issue link not found' }

    const perm = await checkBoardPermission({
      boardId: link.sourceTask.column.boardId,
      allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER'],
    })
    if (!perm.success) return perm

    await prisma.issueLink.delete({ where: { id: input.id } })

    await createAuditLog({
      userId: session.id,
      action: 'ISSUE_LINK_DELETED',
      details: { linkId: input.id },
    })

    emitBoardEvent('issueLink:deleted', {
      linkId: input.id,
      boardId: link.sourceTask.column.boardId,
    })

    // Notify assignee of target task if different from deleter
    const targetTask = await prisma.task.findUnique({
      where: { id: link.targetTaskId },
      select: { assigneeId: true, title: true },
    })
    if (targetTask?.assigneeId && targetTask.assigneeId !== session.id) {
      await sendNotification({
        userId: targetTask.assigneeId,
        type: 'ISSUE_LINK_DELETED',
        message: `Issue link removed from "${targetTask.title}"`,
        link: `/dashboard/board/${link.sourceTask.column.boardId}`,
      })
    }

    revalidatePath(`/dashboard/board/${link.sourceTask.column.boardId}`)
    return { success: true, message: 'Issue link deleted' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[DELETE_ISSUE_LINK_ERROR]', error)
    return { success: false, error: 'Failed to delete issue link' }
  }
}

// --- Queries ---

export async function getTaskIssueLinks(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = idSchema.parse(rawInput)

    const task = await prisma.task.findUnique({
      where: { id: input },
      include: { column: { include: { board: true } } },
    })
    if (!task) return { success: false, error: 'Task not found' }

    const perm = await checkBoardPermission({
      boardId: task.column.boardId,
      allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER'],
    })
    if (!perm.success) return perm

    const links = await prisma.issueLink.findMany({
      where: {
        OR: [{ sourceTaskId: input }, { targetTaskId: input }],
      },
      include: {
        sourceTask: {
          select: {
            id: true,
            title: true,
            issueType: true,
            priority: true,
            status: true,
          },
        },
        targetTask: {
          select: {
            id: true,
            title: true,
            issueType: true,
            priority: true,
            status: true,
          },
        },
      },
    })

    return { success: true, data: links }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[GET_ISSUE_LINKS_ERROR]', error)
    return { success: false, error: 'Failed to fetch issue links' }
  }
}
