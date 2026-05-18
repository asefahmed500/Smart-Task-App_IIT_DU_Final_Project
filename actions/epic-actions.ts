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

const createEpicSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  color: z.string().max(7).default('#6366F1'),
  boardId: z.string(),
})

const updateEpicSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  color: z.string().max(7).optional(),
  status: z.enum(['BACKLOG', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
})

const idSchema = z.string()

// --- Epic CRUD ---

export async function createEpic(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = createEpicSchema.parse(rawInput)

    const perm = await checkBoardPermission({
      boardId: input.boardId,
      allowedRoles: ['ADMIN', 'MANAGER'],
    })
    if (!perm.success) return perm

    const epic = await prisma.epic.create({
      data: {
        name: input.name,
        description: input.description,
        color: input.color,
        boardId: input.boardId,
      },
    })

    await createAuditLog({
      userId: session.id,
      action: 'EPIC_CREATED',
      details: { epicId: epic.id, name: epic.name, boardId: input.boardId },
    })

    emitBoardEvent('epic:created', { epic, boardId: input.boardId })

    // Notify board members
    const board = await prisma.board.findUnique({
      where: { id: input.boardId },
      include: { members: { select: { id: true } }, owner: { select: { id: true } } },
    })
    if (board) {
      const memberIds = [
        ...board.members.map((m) => m.id),
        ...(board.owner ? [board.owner.id] : []),
      ]
      for (const uid of memberIds) {
        if (uid === session.id) continue
        await sendNotification({
          userId: uid,
          type: 'EPIC_CREATED',
          message: `New epic "${epic.name}" created`,
          link: `/manager/epics/${epic.id}`,
        })
      }
    }

    revalidatePath(`/manager/epics`)
    revalidatePath(`/member/epics`)
    return { success: true, data: epic, message: 'Epic created' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[CREATE_EPIC_ERROR]', error)
    return { success: false, error: 'Failed to create epic' }
  }
}

export async function updateEpic(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = updateEpicSchema.parse(rawInput)

    const existing = await prisma.epic.findUnique({ where: { id: input.id } })
    if (!existing) return { success: false, error: 'Epic not found' }

    const perm = await checkBoardPermission({
      boardId: existing.boardId,
      allowedRoles: ['ADMIN', 'MANAGER'],
    })
    if (!perm.success) return perm

    const validTransitions: Record<string, string[]> = {
      BACKLOG: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: ['BACKLOG'],
    }
    const allowed = validTransitions[existing.status] || []
    if (input.status !== undefined && !allowed.includes(input.status)) {
      return { success: false, error: `Cannot transition epic from ${existing.status} to ${input.status}` }
    }

    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.description !== undefined) updateData.description = input.description
    if (input.color !== undefined) updateData.color = input.color
    if (input.status !== undefined) updateData.status = input.status

    const epic = await prisma.epic.update({
      where: { id: input.id },
      data: updateData,
    })

    await createAuditLog({
      userId: session.id,
      action: 'EPIC_UPDATED',
      details: { epicId: epic.id, changes: updateData },
    })

    emitBoardEvent('epic:updated', { epic, boardId: existing.boardId })

    // Notify board members of status changes
    if (input.status) {
      const board = await prisma.board.findUnique({
        where: { id: existing.boardId },
        include: { members: { select: { id: true } }, owner: { select: { id: true } } },
      })
      if (board) {
        const memberIds = [
          ...board.members.map((m) => m.id),
          ...(board.owner ? [board.owner.id] : []),
        ]
        for (const uid of memberIds) {
          if (uid === session.id) continue
          await sendNotification({
            userId: uid,
            type: 'EPIC_UPDATED',
            message: `Epic "${epic.name}" status changed to ${epic.status}`,
            link: `/manager/epics/${epic.id}`,
          })
        }
      }
    }

    revalidatePath(`/manager/epics`)
    revalidatePath(`/member/epics`)
    return { success: true, data: epic, message: 'Epic updated' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[UPDATE_EPIC_ERROR]', error)
    return { success: false, error: 'Failed to update epic' }
  }
}

export async function deleteEpic(rawInput: unknown): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = idSchema.parse(rawInput)

    const existing = await prisma.epic.findUnique({
      where: { id: input },
      include: { _count: { select: { tasks: true } } },
    })
    if (!existing) return { success: false, error: 'Epic not found' }

    const perm = await checkBoardPermission({
      boardId: existing.boardId,
      allowedRoles: ['ADMIN', 'MANAGER'],
    })
    if (!perm.success) return perm

    // Unlink tasks before deleting epic
    await prisma.task.updateMany({
      where: { epicId: input },
      data: { epicId: null },
    })

    await prisma.epic.delete({ where: { id: input } })

    await createAuditLog({
      userId: session.id,
      action: 'EPIC_DELETED',
      details: { epicId: input, boardId: existing.boardId },
    })

    emitBoardEvent('epic:deleted', { epicId: input, boardId: existing.boardId })

    // Notify board members
    const board = await prisma.board.findUnique({
      where: { id: existing.boardId },
      include: { members: { select: { id: true } }, owner: { select: { id: true } } },
    })
    if (board) {
      const memberIds = [
        ...board.members.map((m) => m.id),
        ...(board.owner ? [board.owner.id] : []),
      ]
      for (const uid of memberIds) {
        if (uid === session.id) continue
        await sendNotification({
          userId: uid,
          type: 'EPIC_DELETED',
          message: `Epic "${existing.name}" was deleted`,
          link: `/manager/epics`,
        })
      }
    }

    revalidatePath(`/manager/epics`)
    revalidatePath(`/member/epics`)
    return { success: true, message: 'Epic deleted' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[DELETE_EPIC_ERROR]', error)
    return { success: false, error: 'Failed to delete epic' }
  }
}

// --- Queries ---

export async function getEpicsByBoard(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = idSchema.parse(rawInput)

    const perm = await checkBoardPermission({
      boardId: input,
      allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER'],
    })
    if (!perm.success) return perm

    const epics = await prisma.epic.findMany({
      where: { boardId: input },
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, data: epics }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[GET_EPICS_ERROR]', error)
    return { success: false, error: 'Failed to fetch epics' }
  }
}

export async function getEpicDetail(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = idSchema.parse(rawInput)

    const epic = await prisma.epic.findUnique({
      where: { id: input },
      include: {
        board: { select: { id: true, name: true } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, image: true } },
            tags: true,
            column: { select: { id: true, name: true } },
            sprint: { select: { id: true, name: true, status: true } },
            _count: {
              select: { comments: true, subtasks: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!epic) return { success: false, error: 'Epic not found' }

    const perm = await checkBoardPermission({
      boardId: epic.boardId,
      allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER'],
    })
    if (!perm.success) return perm

    return { success: true, data: epic }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[GET_EPIC_DETAIL_ERROR]', error)
    return { success: false, error: 'Failed to fetch epic detail' }
  }
}
