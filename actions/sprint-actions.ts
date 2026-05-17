'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ActionResult } from '@/types/kanban'
import { emitBoardEvent } from '@/utils/socket-emitter'
import { sendNotification } from '@/utils/notification-utils'
import { createAuditLog } from '@/lib/create-audit-log'
import { checkBoardPermission } from './board-actions'

// --- Schemas ---

const createSprintSchema = z.object({
  name: z.string().min(1).max(100),
  goal: z.string().max(500).optional(),
  startDate: z.string(),
  endDate: z.string(),
  boardId: z.string(),
})

const updateSprintSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  goal: z.string().max(500).optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

const sprintStatusSchema = z.object({
  id: z.string(),
  status: z.enum(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
})

const idSchema = z.string()

const assignTaskToSprintSchema = z.object({
  taskId: z.string(),
  sprintId: z.string(),
})

const removeTaskFromSprintSchema = z.object({
  taskId: z.string(),
})

// --- Sprint CRUD ---

export async function createSprint(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = createSprintSchema.parse(rawInput)

    const perm = await checkBoardPermission({
      boardId: input.boardId,
      allowedRoles: ['ADMIN', 'MANAGER'],
    })
    if (!perm.success) return perm

    const startDate = new Date(input.startDate)
    const endDate = new Date(input.endDate)
    if (endDate <= startDate) {
      return { success: false, error: 'End date must be after start date' }
    }

    const sprint = await prisma.sprint.create({
      data: {
        name: input.name,
        goal: input.goal,
        startDate,
        endDate,
        boardId: input.boardId,
      },
    })

    await createAuditLog({
      userId: session.id,
      action: 'SPRINT_CREATED',
      details: { sprintId: sprint.id, name: sprint.name, boardId: input.boardId },
    })

    emitBoardEvent('sprint:created', { sprint, boardId: input.boardId })

    revalidatePath(`/manager/sprints`)
    revalidatePath(`/member/sprints`)
    revalidatePath(`/manager/backlog`)
    revalidatePath(`/member/backlog`)
    return { success: true, data: sprint, message: 'Sprint created' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[CREATE_SPRINT_ERROR]', error)
    return { success: false, error: 'Failed to create sprint' }
  }
}

export async function updateSprint(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = updateSprintSchema.parse(rawInput)

    const existing = await prisma.sprint.findUnique({ where: { id: input.id } })
    if (!existing) return { success: false, error: 'Sprint not found' }

    const perm = await checkBoardPermission({
      boardId: existing.boardId,
      allowedRoles: ['ADMIN', 'MANAGER'],
    })
    if (!perm.success) return perm

    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.goal !== undefined) updateData.goal = input.goal
    if (input.startDate !== undefined) updateData.startDate = new Date(input.startDate)
    if (input.endDate !== undefined) updateData.endDate = new Date(input.endDate)

    const effectiveStart = updateData.startDate
      ? new Date(updateData.startDate as Date)
      : existing.startDate
    const effectiveEnd = updateData.endDate
      ? new Date(updateData.endDate as Date)
      : existing.endDate
    if (effectiveEnd <= effectiveStart) {
      return { success: false, error: 'End date must be after start date' }
    }

    const sprint = await prisma.sprint.update({
      where: { id: input.id },
      data: updateData,
    })

    await createAuditLog({
      userId: session.id,
      action: 'SPRINT_UPDATED',
      details: { sprintId: sprint.id, changes: updateData },
    })

    emitBoardEvent('sprint:updated', { sprint, boardId: existing.boardId })

    revalidatePath(`/manager/sprints/${input.id}`)
    revalidatePath(`/member/sprints/${input.id}`)
    revalidatePath(`/manager/sprints`)
    revalidatePath(`/member/sprints`)
    revalidatePath(`/manager/backlog`)
    revalidatePath(`/member/backlog`)
    revalidatePath(`/dashboard/board/${existing.boardId}`)
    return { success: true, data: sprint, message: 'Sprint updated' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[UPDATE_SPRINT_ERROR]', error)
    return { success: false, error: 'Failed to update sprint' }
  }
}

export async function deleteSprint(rawInput: unknown): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = idSchema.parse(rawInput)

    const existing = await prisma.sprint.findUnique({
      where: { id: input },
      include: { _count: { select: { tasks: true } } },
    })
    if (!existing) return { success: false, error: 'Sprint not found' }

    if (existing.status === 'ACTIVE') {
      return { success: false, error: 'Cannot delete an active sprint. Cancel it first.' }
    }

    const perm = await checkBoardPermission({
      boardId: existing.boardId,
      allowedRoles: ['ADMIN', 'MANAGER'],
    })
    if (!perm.success) return perm

    if (existing._count.tasks > 0) {
      return { success: false, error: 'Cannot delete sprint with tasks. Remove tasks first.' }
    }

    await prisma.sprint.delete({ where: { id: input } })

    await createAuditLog({
      userId: session.id,
      action: 'SPRINT_DELETED',
      details: { sprintId: input, boardId: existing.boardId },
    })

    emitBoardEvent('sprint:deleted', { sprintId: input, boardId: existing.boardId })

    revalidatePath(`/manager/sprints`)
    revalidatePath(`/member/sprints`)
    revalidatePath(`/manager/backlog`)
    revalidatePath(`/member/backlog`)
    return { success: true, message: 'Sprint deleted' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[DELETE_SPRINT_ERROR]', error)
    return { success: false, error: 'Failed to delete sprint' }
  }
}

// --- Sprint Lifecycle ---

export async function updateSprintStatus(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = sprintStatusSchema.parse(rawInput)

    const existing = await prisma.sprint.findUnique({
      where: { id: input.id },
      include: { tasks: true, board: true },
    })
    if (!existing) return { success: false, error: 'Sprint not found' }

    const perm = await checkBoardPermission({
      boardId: existing.boardId,
      allowedRoles: ['ADMIN', 'MANAGER'],
    })
    if (!perm.success) return perm

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      PLANNED: ['ACTIVE', 'CANCELLED'],
      ACTIVE: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: ['PLANNED'],
    }
    const allowed = validTransitions[existing.status] || []
    if (!allowed.includes(input.status)) {
      return {
        success: false,
        error: `Cannot transition from ${existing.status} to ${input.status}`,
      }
    }

    const sprint = await prisma.sprint.update({
      where: { id: input.id },
      data: { status: input.status },
    })

    await createAuditLog({
      userId: session.id,
      action: 'SPRINT_STATUS_CHANGED',
      details: { sprintId: input.id, from: existing.status, to: input.status },
    })

    // Notify assignees when sprint becomes active
    if (input.status === 'ACTIVE') {
      const assigneeIds = [...new Set(existing.tasks.map((t) => t.assigneeId).filter(Boolean))]
      for (const uid of assigneeIds) {
        await sendNotification({
          userId: uid as string,
          type: 'SPRINT_STARTED',
          message: `Sprint "${existing.name}" has started`,
          link: `/member/sprints/${input.id}`,
        })
      }
    }

    // Notify board members when sprint completes
    if (input.status === 'COMPLETED') {
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
          await sendNotification({
            userId: uid,
            type: 'SPRINT_COMPLETED',
            message: `Sprint "${existing.name}" has been completed`,
            link: `/member/sprints/${input.id}`,
          })
        }
      }
    }

    emitBoardEvent('sprint:statusChanged', {
      sprintId: input.id,
      status: input.status,
      boardId: existing.boardId,
    })

    revalidatePath(`/manager/sprints`)
    revalidatePath(`/member/sprints`)
    revalidatePath(`/manager/sprints/${input.id}`)
    revalidatePath(`/member/sprints/${input.id}`)
    return { success: true, data: sprint, message: `Sprint ${input.status.toLowerCase()}` }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[UPDATE_SPRINT_STATUS_ERROR]', error)
    return { success: false, error: 'Failed to update sprint status' }
  }
}

// --- Sprint Planning ---

export async function assignTaskToSprint(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = assignTaskToSprintSchema.parse(rawInput)

    const sprint = await prisma.sprint.findUnique({
      where: { id: input.sprintId },
      include: { board: true },
    })
    if (!sprint) return { success: false, error: 'Sprint not found' }

    const perm = await checkBoardPermission({
      boardId: sprint.boardId,
      allowedRoles: ['ADMIN', 'MANAGER'],
    })
    if (!perm.success) return perm

    const task = await prisma.task.findUnique({
      where: { id: input.taskId },
      include: { column: { select: { boardId: true } } },
    })
    if (!task) return { success: false, error: 'Task not found' }

    if (task.column?.boardId !== sprint.boardId) {
      return { success: false, error: 'Task must be on the same board as the sprint' }
    }

    const updated = await prisma.task.update({
      where: { id: input.taskId },
      data: { sprintId: input.sprintId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
      },
    })

    await createAuditLog({
      userId: session.id,
      action: 'TASK_ASSIGNED_TO_SPRINT',
      details: { taskId: input.taskId, sprintId: input.sprintId },
    })

    if (updated.assignee) {
      await sendNotification({
        userId: updated.assignee.id,
        type: 'TASK_ASSIGNED',
        message: `Task "${task.title}" added to sprint "${sprint.name}"`,
        link: `/member/sprints/${input.sprintId}`,
      })
    }

    emitBoardEvent('task:sprintAssigned', {
      taskId: input.taskId,
      sprintId: input.sprintId,
      boardId: sprint.boardId,
    })

    revalidatePath(`/manager/sprints/${input.sprintId}`)
    revalidatePath(`/member/sprints/${input.sprintId}`)
    revalidatePath(`/manager/backlog`)
    revalidatePath(`/member/backlog`)
    revalidatePath(`/dashboard/board/${sprint.boardId}`)
    return { success: true, data: updated, message: 'Task assigned to sprint' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[ASSIGN_TASK_TO_SPRINT_ERROR]', error)
    return { success: false, error: 'Failed to assign task to sprint' }
  }
}

export async function removeTaskFromSprint(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = removeTaskFromSprintSchema.parse(rawInput)

    const task = await prisma.task.findUnique({
      where: { id: input.taskId },
      include: { sprint: { include: { board: true } } },
    })
    if (!task || !task.sprint) return { success: false, error: 'Task not in sprint' }

    const perm = await checkBoardPermission({
      boardId: task.sprint.boardId,
      allowedRoles: ['ADMIN', 'MANAGER'],
    })
    if (!perm.success) return perm

    const updated = await prisma.task.update({
      where: { id: input.taskId },
      data: { sprintId: null },
    })

    await createAuditLog({
      userId: session.id,
      action: 'TASK_REMOVED_FROM_SPRINT',
      details: { taskId: input.taskId, sprintId: task.sprintId },
    })

    emitBoardEvent('task:sprintRemoved', {
      taskId: input.taskId,
      sprintId: task.sprintId,
      boardId: task.sprint.boardId,
    })

    revalidatePath(`/manager/sprints/${task.sprintId}`)
    revalidatePath(`/member/sprints/${task.sprintId}`)
    revalidatePath(`/manager/backlog`)
    revalidatePath(`/member/backlog`)
    revalidatePath(`/dashboard/board/${task.sprint.boardId}`)
    return { success: true, data: updated, message: 'Task removed from sprint' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[REMOVE_TASK_FROM_SPRINT_ERROR]', error)
    return { success: false, error: 'Failed to remove task from sprint' }
  }
}

// --- Queries ---

export async function getSprintsByBoard(
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

    const sprints = await prisma.sprint.findMany({
      where: { boardId: input },
      include: {
        _count: { select: { tasks: true } },
      },
      orderBy: { startDate: 'desc' },
    })

    return { success: true, data: sprints }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[GET_SPRINTS_ERROR]', error)
    return { success: false, error: 'Failed to fetch sprints' }
  }
}

export async function getSprintDetail(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = idSchema.parse(rawInput)

    const sprint = await prisma.sprint.findUnique({
      where: { id: input },
      include: {
        board: { select: { id: true, name: true } },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, image: true } },
            tags: true,
            column: { select: { id: true, name: true } },
            _count: {
              select: { comments: true, attachments: true, checklists: true, subtasks: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!sprint) return { success: false, error: 'Sprint not found' }

    const perm = await checkBoardPermission({
      boardId: sprint.boardId,
      allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER'],
    })
    if (!perm.success) return perm

    return { success: true, data: sprint }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[GET_SPRINT_DETAIL_ERROR]', error)
    return { success: false, error: 'Failed to fetch sprint detail' }
  }
}

export async function getBacklogTasks(
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

    const tasks = await prisma.task.findMany({
      where: {
        column: { boardId: input },
        sprintId: null,
      },
      include: {
        assignee: { select: { id: true, name: true, image: true } },
        tags: true,
        column: { select: { id: true, name: true } },
        _count: { select: { comments: true, subtasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, data: tasks }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[GET_BACKLOG_ERROR]', error)
    return { success: false, error: 'Failed to fetch backlog' }
  }
}

export async function getSprintMetrics(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = idSchema.parse(rawInput)

    const sprint = await prisma.sprint.findUnique({
      where: { id: input },
      include: {
        board: true,
        tasks: {
          include: {
            timeEntries: true,
            column: true,
          },
        },
      },
    })
    if (!sprint) return { success: false, error: 'Sprint not found' }

    const perm = await checkBoardPermission({
      boardId: sprint.boardId,
      allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER'],
    })
    if (!perm.success) return perm

    const totalTasks = sprint.tasks.length
    const completedTasks = sprint.tasks.filter((t) =>
      t.column?.name?.toLowerCase() === 'done'
    ).length
    const totalStoryPoints = sprint.tasks.reduce(
      (sum, t) => sum + (t.storyPoints || 0),
      0
    )
    const completedStoryPoints = sprint.tasks
      .filter((t) => t.column?.name?.toLowerCase() === 'done')
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0)
    const totalTimeLogged = sprint.tasks.reduce(
      (sum, t) => sum + t.timeEntries.reduce((s, e) => s + e.duration, 0),
      0
    )

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    const scopeCompletionRate =
      totalStoryPoints > 0 ? (completedStoryPoints / totalStoryPoints) * 100 : 0

    return {
      success: true,
      data: {
        totalTasks,
        completedTasks,
        totalStoryPoints,
        completedStoryPoints,
        completionRate: Math.round(completionRate * 10) / 10,
        scopeCompletionRate: Math.round(scopeCompletionRate * 10) / 10,
        totalTimeLogged,
      },
    }
  } catch (error) {
    console.error('[GET_SPRINT_METRICS_ERROR]', error)
    return { success: false, error: 'Failed to fetch sprint metrics' }
  }
}

export async function getVelocityData(
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

    const completedSprints = await prisma.sprint.findMany({
      where: {
        boardId: input,
        status: 'COMPLETED',
      },
      include: {
        tasks: {
          include: {
            column: true,
          },
        },
      },
      orderBy: { endDate: 'desc' },
      take: 10,
    })

    const velocity = completedSprints.map((s) => {
      const completedTasks = s.tasks.filter(
        (t) => t.column?.name?.toLowerCase() === 'done'
      )
      return {
        name: s.name,
        storyPoints: completedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0),
        tasksCompleted: completedTasks.length,
        endDate: s.endDate,
      }
    }).reverse()

    return { success: true, data: velocity }
  } catch (error) {
    console.error('[GET_VELOCITY_ERROR]', error)
    return { success: false, error: 'Failed to fetch velocity data' }
  }
}

export async function updateTaskIssueFields(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = z.object({
      taskId: z.string(),
      issueType: z.enum(['BUG', 'FEATURE', 'STORY', 'TASK', 'EPIC', 'SUBTASK']).optional(),
      storyPoints: z.number().int().min(0).max(100).optional().nullable(),
      parentId: z.string().optional().nullable(),
      resolution: z.enum(['FIXED', 'WONT_FIX', 'DUPLICATE', 'CANNOT_REPRODUCE', 'LATER', 'MOVED']).optional().nullable(),
    }).parse(rawInput)

    const task = await prisma.task.findUnique({
      where: { id: input.taskId },
      include: { column: { include: { board: true } } },
    })
    if (!task) return { success: false, error: 'Task not found' }

    const perm = await checkBoardPermission({
      boardId: task.column.boardId,
      allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER'],
    })
    if (!perm.success) return perm

    const updateData: Record<string, unknown> = {}
    if (input.issueType !== undefined) updateData.issueType = input.issueType
    if (input.storyPoints !== undefined) updateData.storyPoints = input.storyPoints
    if (input.parentId !== undefined) updateData.parentId = input.parentId
    if (input.resolution !== undefined) updateData.resolution = input.resolution

    const updated = await prisma.task.update({
      where: { id: input.taskId },
      data: updateData,
    })

    await createAuditLog({
      userId: session.id,
      action: 'TASK_ISSUE_FIELDS_UPDATED',
      details: { taskId: input.taskId, changes: updateData },
    })

    emitBoardEvent('task:issueFieldsUpdated', {
      taskId: input.taskId,
      boardId: task.column.boardId,
    })

    revalidatePath(`/manager/backlog`)
    revalidatePath(`/member/backlog`)
    revalidatePath(`/dashboard/board/${task.column.boardId}`)
    if (task.sprintId) {
      revalidatePath(`/manager/sprints/${task.sprintId}`)
      revalidatePath(`/member/sprints/${task.sprintId}`)
    }
    return { success: true, data: updated, message: 'Task issue fields updated' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[UPDATE_TASK_ISSUE_FIELDS_ERROR]', error)
    return { success: false, error: 'Failed to update task issue fields' }
  }
}
