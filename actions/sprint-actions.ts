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
import { evaluateAutomationRules } from './automation-actions'
import { findDoneColumnName } from '@/lib/column-helpers'
import { isDoneColumn, isInProgressColumn, isTodoColumn } from '@/utils/column-utils'

// NOTE: do NOT re-export the (sync) column helpers from this "use server"
// file — Next.js only allows async function exports from server-action
// modules, and re-exporting them also dragged prisma into client bundles.

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
  // What to do with incomplete tasks when a sprint is COMPLETED.
  // 'backlog' (default) | 'nextSprint' | 'keep'
  incompleteAction: z.enum(['backlog', 'nextSprint', 'keep']).optional(),
})

const idSchema = z.string().cuid()

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
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { success: false, error: 'Invalid date format' }
    }
    if (endDate <= startDate) {
      return { success: false, error: 'End date must be after start date' }
    }

    const overlapping = await prisma.sprint.findFirst({
      where: {
        boardId: input.boardId,
        status: { in: ['PLANNED', 'ACTIVE'] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    })
    if (overlapping) {
      return { success: false, error: 'Sprint dates overlap with an existing sprint' }
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

    // Notify board members + owner that a new sprint was planned.
    const boardForNotify = await prisma.board.findUnique({
      where: { id: input.boardId },
      include: { members: { select: { id: true } }, owner: { select: { id: true } } },
    })
    if (boardForNotify) {
      const memberIds = [
        ...boardForNotify.members.map((m) => m.id),
        ...(boardForNotify.owner ? [boardForNotify.owner.id] : []),
      ]
      for (const uid of [...new Set(memberIds)]) {
        if (uid === session.id) continue
        await sendNotification({
          userId: uid,
          type: 'SPRINT_CREATED',
          message: `Sprint "${sprint.name}" has been planned`,
          link: `/member/sprints/${sprint.id}`,
        })
      }
    }

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

    // Check for date overlaps with other PLANNED/ACTIVE sprints
    const overlapping = await prisma.sprint.findFirst({
      where: {
        boardId: existing.boardId,
        status: { in: ['PLANNED', 'ACTIVE'] },
        id: { not: input.id },
        startDate: { lte: effectiveEnd },
        endDate: { gte: effectiveStart },
      },
    })
    if (overlapping) {
      return { success: false, error: 'Sprint dates overlap with an existing sprint' }
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
      await prisma.task.updateMany({ where: { sprintId: input }, data: { sprintId: null } })
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

    // Atomic sprint status update with concurrent-active check
    if (input.status === 'ACTIVE' || input.status === 'COMPLETED') {
      await prisma.$transaction(async (tx) => {
        if (input.status === 'ACTIVE') {
          const activeSprint = await tx.sprint.findFirst({
            where: { boardId: existing.boardId, status: 'ACTIVE', id: { not: input.id } },
          })
          if (activeSprint) {
            throw new Error('Another sprint is already active on this board')
          }
        }

        await tx.sprint.update({
          where: { id: input.id },
          data: { status: input.status },
        })

        if (input.status === 'COMPLETED') {
          const doneColName = await findDoneColumnName(existing.boardId)
          const incompleteTaskIds = await tx.task.findMany({
            where: {
              sprintId: input.id,
              column: { name: { not: doneColName } },
            },
            select: { id: true },
          })

          const action = input.incompleteAction || 'backlog'

          if (incompleteTaskIds.length > 0) {
            if (action === 'keep') {
              // Leave unfinished tasks attached to this (now completed) sprint.
            } else if (action === 'nextSprint') {
              // Move unfinished tasks to the next PLANNED sprint on the board.
              const nextSprint = await tx.sprint.findFirst({
                where: { boardId: existing.boardId, status: 'PLANNED', id: { not: input.id } },
                orderBy: { startDate: 'asc' },
                select: { id: true },
              })
              await tx.task.updateMany({
                where: { id: { in: incompleteTaskIds.map((t) => t.id) } },
                data: { sprintId: nextSprint?.id ?? null },
              })
            } else {
              // default: return to backlog
              await tx.task.updateMany({
                where: { id: { in: incompleteTaskIds.map((t) => t.id) } },
                data: { sprintId: null },
              })
            }
          }
        }
      })
    } else {
      await prisma.sprint.update({
        where: { id: input.id },
        data: { status: input.status },
      })
    }

    const sprint = await prisma.sprint.findUnique({
      where: { id: input.id },
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
        if (uid === session.id) continue
        await sendNotification({
          userId: uid as string,
          type: 'SPRINT_STARTED',
          message: `Sprint "${existing.name}" has started`,
          link: `/member/sprints/${input.id}`,
        })
      }
      // Fire SPRINT_STARTED automation rules for each task in the sprint
      for (const t of existing.tasks) {
        evaluateAutomationRules('SPRINT_STARTED', {
          taskId: t.id,
          taskTitle: t.title,
          columnId: t.columnId,
          columnName: '',
          boardId: existing.boardId,
          priority: t.priority,
          assigneeId: t.assigneeId,
          issueType: t.issueType,
          hasSprint: true,
        }).catch((err) => console.error('[AUTOMATION_ERROR]', err))
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
          if (uid === session.id) continue
          await sendNotification({
            userId: uid,
            type: 'SPRINT_COMPLETED',
            message: `Sprint "${existing.name}" has been completed`,
            link: `/member/sprints/${input.id}`,
          })
        }
      }
      // Fire SPRINT_COMPLETED automation rules for each task in the sprint
      for (const t of existing.tasks) {
        evaluateAutomationRules('SPRINT_COMPLETED', {
          taskId: t.id,
          taskTitle: t.title,
          columnId: t.columnId,
          columnName: '',
          boardId: existing.boardId,
          priority: t.priority,
          assigneeId: t.assigneeId,
          issueType: t.issueType,
          hasSprint: true,
        }).catch((err) => console.error('[AUTOMATION_ERROR]', err))
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
    if (error instanceof Error && error.message === 'Another sprint is already active on this board') {
      return { success: false, error: error.message }
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

    if (!['PLANNED', 'ACTIVE'].includes(sprint.status)) {
      return { success: false, error: 'Cannot assign tasks to a completed or cancelled sprint' }
    }

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

    if (updated.assignee && updated.assignee.id !== session.id) {
      await sendNotification({
        userId: updated.assignee.id,
        type: 'TASK_ADDED_TO_SPRINT',
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
      include: {
        sprint: { include: { board: true } },
        assignee: { select: { id: true } },
      },
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

    if (task.assignee && task.assignee.id !== session.id) {
      await sendNotification({
        userId: task.assignee.id,
        type: 'TASK_REMOVED_FROM_SPRINT',
        message: `Task "${task.title}" removed from sprint "${task.sprint.name}"`,
        link: `/member/sprints/${task.sprintId}`,
      })
    }

    emitBoardEvent('task:sprintRemoved', {
      taskId: input.taskId,
      sprintId: task.sprintId,
      boardId: task.sprint.boardId,
    })

    revalidatePath(`/manager/sprints/${task.sprintId}`)
    revalidatePath(`/member/sprints/${task.sprintId}`)
    revalidatePath(`/manager/sprints`)
    revalidatePath(`/member/sprints`)
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

/**
 * Returns ALL sprints across every board the caller owns or belongs to, each
 * with its board info and task count. Used by the sprints list page so the
 * manager always sees sprints from every board (no hunting via a board picker).
 */
export async function getSprintsForAllBoards(): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const boards = await prisma.board.findMany({
      where: {
        OR: [{ ownerId: session.id }, { members: { some: { id: session.id } } }],
      },
      select: { id: true },
    })

    const sprints = await prisma.sprint.findMany({
      where: { boardId: { in: boards.map((b) => b.id) } },
      include: {
        board: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
        tasks: { select: { id: true, column: { select: { name: true } } } },
      },
    })

    // Count per-sprint "done" tasks using each task's live column name (the
    // done-column token set is dynamic, so it must be evaluated per row).
    const list = sprints.map((s) => ({
      ...s,
      doneCount: s.tasks.filter((t) => isDoneColumn(t.column?.name)).length,
    }))

    // Order: ACTIVE first, then PLANNED, COMPLETED, CANCELLED; then by start date desc.
    const order: Record<string, number> = { ACTIVE: 0, PLANNED: 1, COMPLETED: 2, CANCELLED: 3 }
    list.sort((a, b) => {
      const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9)
      if (diff !== 0) return diff
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    })

    return { success: true, data: list }
  } catch (error) {
    console.error('[GET_ALL_SPRINTS_ERROR]', error)
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

    const doneColName = await findDoneColumnName(input)

    const tasks = await prisma.task.findMany({
      where: {
        column: { boardId: input, name: { not: doneColName } },
        sprintId: null,
        parentId: null,
      },
      include: {
        assignee: { select: { id: true, name: true, image: true } },
        tags: true,
        column: { select: { id: true, name: true } },
        _count: { select: { comments: true, attachments: true, checklists: true, subtasks: true } },
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

    const doneColumnName = await findDoneColumnName(sprint.boardId)
    const totalTasks = sprint.tasks.length
    const completedTasks = sprint.tasks.filter((t) =>
      t.column?.name?.toLowerCase() === doneColumnName.toLowerCase()
    ).length
    const totalStoryPoints = sprint.tasks.reduce(
      (sum, t) => sum + (t.storyPoints || 0),
      0
    )
    const completedStoryPoints = sprint.tasks
      .filter((t) => t.column?.name?.toLowerCase() === doneColumnName.toLowerCase())
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

    const doneCol = await findDoneColumnName(input)
    const velocity = completedSprints.map((s) => {
      const completedTasks = s.tasks.filter(
        (t) => t.column?.name?.toLowerCase() === doneCol.toLowerCase()
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
      epicId: z.string().optional().nullable(),
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
    if (input.epicId !== undefined) updateData.epicId = input.epicId

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

// --- Burndown Data ---

export async function getBurndownData(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = idSchema.parse(rawInput)

    const sprint = await prisma.sprint.findUnique({
      where: { id: input },
      include: {
        tasks: {
          include: { column: true },
        },
      },
    })
    if (!sprint) return { success: false, error: 'Sprint not found' }

    const perm = await checkBoardPermission({
      boardId: sprint.boardId,
      allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER'],
    })
    if (!perm.success) return perm

    const totalSP = sprint.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
    const totalTasks = sprint.tasks.length
    const useStoryPoints = totalSP > 0

    const start = new Date(sprint.startDate)
    const end = new Date(sprint.endDate)
    const totalDays = Math.max(Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)), 1)

    // Truthful "actual": reconstruct each task's completion time from the
    // audit log (earliest UPDATE_TASK_STATUS* entry whose target column is a
    // done column) instead of fabricating a linear approximation.
    const sprintTaskIds = new Set(sprint.tasks.map((t) => t.id))
    const statusLogs = await prisma.auditLog.findMany({
      where: {
        action: { in: ['UPDATE_TASK_STATUS', 'UPDATE_TASK_STATUS_OVERRIDE'] },
        createdAt: { gte: start },
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, details: true },
    })

    const completionByTask = new Map<string, Date>()
    for (const log of statusLogs) {
      const details = log.details as any
      if (
        typeof details?.taskId === 'string' &&
        sprintTaskIds.has(details.taskId) &&
        typeof details.newStatus === 'string' &&
        isDoneColumn(details.newStatus) &&
        !completionByTask.has(details.taskId)
      ) {
        completionByTask.set(details.taskId, log.createdAt)
      }
    }

    // Tasks already sitting in a done column when the sprint began (no log in
    // the window) count as completed from day one.
    for (const t of sprint.tasks) {
      if (isDoneColumn(t.column?.name) && !completionByTask.has(t.id)) {
        completionByTask.set(t.id, start)
      }
    }

    const points: { date: string; ideal: number; actual: number }[] = []

    for (let i = 0; i <= totalDays; i++) {
      const day = new Date(start)
      day.setDate(day.getDate() + i)
      const dateStr = day.toISOString().split('T')[0]
      const dayEnd = new Date(day)
      dayEnd.setHours(23, 59, 59, 999)

      const ideal = useStoryPoints
        ? Math.round((totalSP - (totalSP / totalDays) * (i + 1)) * 10) / 10
        : Math.round((totalTasks - (totalTasks / totalDays) * (i + 1)) * 10) / 10

      let completedUnits = 0
      for (const t of sprint.tasks) {
        const doneAt = completionByTask.get(t.id)
        if (doneAt && doneAt <= dayEnd) {
          completedUnits += useStoryPoints ? t.storyPoints || 0 : 1
        }
      }

      const currentVal = useStoryPoints ? totalSP : totalTasks
      const actual = Math.round((currentVal - completedUnits) * 10) / 10

      points.push({ date: dateStr, ideal: Math.max(ideal, 0), actual: Math.max(actual, 0) })
    }

    return { success: true, data: { points, useStoryPoints } }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[GET_BURNDOWN_ERROR]', error)
    return { success: false, error: 'Failed to fetch burndown data' }
  }
}

// --- Sprint Capacity ---

const capacitySchema = z.object({
  id: z.string(),
  capacity: z.number().int().min(0).nullable(),
})

export async function updateSprintCapacity(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = capacitySchema.parse(rawInput)

    const existing = await prisma.sprint.findUnique({ where: { id: input.id } })
    if (!existing) return { success: false, error: 'Sprint not found' }

    const perm = await checkBoardPermission({
      boardId: existing.boardId,
      allowedRoles: ['ADMIN', 'MANAGER'],
    })
    if (!perm.success) return perm

    const sprint = await prisma.sprint.update({
      where: { id: input.id },
      data: { capacity: input.capacity },
    })

    await createAuditLog({
      userId: session.id,
      action: 'SPRINT_CAPACITY_UPDATED',
      details: { sprintId: input.id, capacity: input.capacity },
    })

    emitBoardEvent('sprint:updated', { sprint, boardId: existing.boardId })

    revalidatePath(`/manager/sprints/${input.id}`)
    revalidatePath(`/member/sprints/${input.id}`)
    return { success: true, data: sprint, message: 'Sprint capacity updated' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[UPDATE_SPRINT_CAPACITY_ERROR]', error)
    return { success: false, error: 'Failed to update sprint capacity' }
  }
}

// --- Sprint Review & Retro ---

const reviewSchema = z.object({
  id: z.string(),
  reviewNotes: z.string().nullable(),
})

const retroSchema = z.object({
  id: z.string(),
  wentWell: z.string().nullable(),
  toImprove: z.string().nullable(),
  actionItems: z.array(z.object({
    text: z.string(),
    owner: z.string(),
    done: z.boolean(),
  })).nullable(),
})

export async function updateSprintReview(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = reviewSchema.parse(rawInput)

    const existing = await prisma.sprint.findUnique({ where: { id: input.id } })
    if (!existing) return { success: false, error: 'Sprint not found' }

    const perm = await checkBoardPermission({
      boardId: existing.boardId,
      allowedRoles: ['ADMIN', 'MANAGER'],
    })
    if (!perm.success) return perm

    const sprint = await prisma.sprint.update({
      where: { id: input.id },
      data: { reviewNotes: input.reviewNotes },
    })

    await createAuditLog({
      userId: session.id,
      action: 'SPRINT_REVIEW_UPDATED',
      details: { sprintId: input.id },
    })

    revalidatePath(`/manager/sprints/${input.id}/review`)
    return { success: true, data: sprint, message: 'Review notes saved' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[UPDATE_SPRINT_REVIEW_ERROR]', error)
    return { success: false, error: 'Failed to save review notes' }
  }
}

export async function updateSprintRetro(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = retroSchema.parse(rawInput)

    const existing = await prisma.sprint.findUnique({ where: { id: input.id } })
    if (!existing) return { success: false, error: 'Sprint not found' }

    const perm = await checkBoardPermission({
      boardId: existing.boardId,
      allowedRoles: ['ADMIN', 'MANAGER'],
    })
    if (!perm.success) return perm

    const sprint = await prisma.sprint.update({
      where: { id: input.id },
      data: {
        retroWentWell: input.wentWell,
        retroToImprove: input.toImprove,
        retroActionItems: input.actionItems as any,
      },
    })

    await createAuditLog({
      userId: session.id,
      action: 'SPRINT_RETRO_UPDATED',
      details: { sprintId: input.id },
    })

    revalidatePath(`/manager/sprints/${input.id}/retro`)
    return { success: true, data: sprint, message: 'Retro notes saved' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[UPDATE_SPRINT_RETRO_ERROR]', error)
    return { success: false, error: 'Failed to save retro notes' }
  }
}

// --- Blocker Toggle ---

const blockerSchema = z.object({
  taskId: z.string(),
  isBlocked: z.boolean(),
  blockerReason: z.string().max(500).optional().nullable(),
})

export async function toggleTaskBlocker(
  rawInput: unknown
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const input = blockerSchema.parse(rawInput)

    const task = await prisma.task.findUnique({
      where: { id: input.taskId },
      include: { column: { include: { board: true } }, sprint: true, assignee: true },
    })
    if (!task) return { success: false, error: 'Task not found' }

    const perm = await checkBoardPermission({
      boardId: task.column.boardId,
      allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER'],
    })
    if (!perm.success) return perm

    const updated = await prisma.task.update({
      where: { id: input.taskId },
      data: {
        isBlocked: input.isBlocked,
        blockerReason: input.isBlocked ? (input.blockerReason || null) : null,
      },
    })

    await createAuditLog({
      userId: session.id,
      action: 'TASK_BLOCKER_TOGGLED',
      details: { taskId: input.taskId, isBlocked: input.isBlocked, reason: input.blockerReason },
    })

    emitBoardEvent('task:blockerToggled', {
      taskId: input.taskId,
      isBlocked: input.isBlocked,
      boardId: task.column.boardId,
    })

    if (input.isBlocked && task.assignee && task.assignee.id !== session.id) {
      await sendNotification({
        userId: task.assignee.id,
        type: 'TASK_STATUS_CHANGED',
        message: `Task "${task.title}" is blocked: ${input.blockerReason || 'No reason given'}`,
        link: `/dashboard/board/${task.column.boardId}`,
      })
    }

    revalidatePath(`/dashboard/board/${task.column.boardId}`)
    if (task.sprintId) {
      revalidatePath(`/manager/sprints/${task.sprintId}`)
      revalidatePath(`/member/sprints/${task.sprintId}`)
    }
    revalidatePath(`/manager/backlog`)
    revalidatePath(`/member/backlog`)
    return { success: true, data: updated, message: input.isBlocked ? 'Task blocked' : 'Task unblocked' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    console.error('[TOGGLE_TASK_BLOCKER_ERROR]', error)
    return { success: false, error: 'Failed to toggle blocker' }
  }
}
