'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { revalidatePath } from 'next/cache'
import { evaluateAutomationRules } from './automation-actions'
import { emitNotification, emitBoardEvent } from '@/utils/socket-emitter'
import {
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
  createCommentSchema,
  editCommentSchema,
  addChecklistItemSchema,
  toggleChecklistItemSchema,
  addAttachmentSchema,
  logTimeSchema,
  submitReviewSchema,
  completeReviewSchema,
  idSchema,
  createTagSchema,
  manageTaskTagSchema,
  updateChecklistItemSchema,
} from "@/lib/schemas"
import { createAuditLog } from "@/lib/create-audit-log"
import { Priority, Role } from '@/lib/prisma'
import { ActionResult } from '@/types/kanban'
import { checkBoardPermission, getTagsForBoard } from './board-actions'

// No need to redefine Role if imported from prisma

/**
 * Helper to check task-level permissions
 */
async function checkTaskPermission(input: { taskId: string, allowedRoles?: string[] }) {

  const { taskId, allowedRoles = ['ADMIN', 'MANAGER', 'MEMBER'] } = input;
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized: Please log in' }

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: { 
          include: { 
            board: {
              include: {
                members: { select: { id: true, role: true } }
              }
            } 
          } 
        }
      }
    })

    if (!task) return { success: false, error: 'Task not found' }

    const board = task.column.board
    const userRole = session.role as Role
    const isAdmin = userRole === 'ADMIN'
    const isOwner = board.ownerId === session.id
    const membership = board.members.find(m => m.id === session.id)
    const isMember = !!membership

    // Admin has full access
    if (isAdmin) return { success: true, task, session }

    // Check board membership or ownership
    if (!isMember && !isOwner) {
      return { success: false, error: 'Forbidden: You are not a member of this board' }
    }

    // Manager/Owner have full access on the board
    if (isOwner || membership?.role === 'MANAGER' || userRole === 'MANAGER') {
      return { success: true, task, session }
    }

    // If only MANAGER/ADMIN allowed but user is just a MEMBER
    if (allowedRoles.includes('MANAGER') && !allowedRoles.includes('MEMBER')) {
      return { success: false, error: 'Forbidden: Manager permissions required' }
    }

    // Default Member access: can only edit/delete tasks they are assigned to
    const isAssignee = task.assigneeId === session.id

    if (!isAssignee) {
       // At this point, the user is a MEMBER (not ADMIN/MANAGER/Owner)
       // If they aren't the assignee, they can only proceed if MEMBER_ALL is allowed (read-only ops)
       if (!allowedRoles.includes('MEMBER_ALL')) {
         return { success: false, error: 'Forbidden: You do not have permission to modify this task' }
       }
    }

    return { success: true, task, session, isAssignee }
  } catch (error) {
    console.error('[CHECK_TASK_PERMISSION_ERROR]', error)
    return { success: false, error: 'Failed to verify task permissions' }
  }
}

// --- TASK CRUD ---

export async function createTask(input: any): Promise<ActionResult> {
  const validation = createTaskSchema.safeParse(input)
  if (!validation.success) {
    return { success: false, error: 'Validation failed', fieldErrors: validation.error.flatten().fieldErrors }
  }

  try {
    const column = await prisma.column.findUnique({
      where: { id: validation.data.columnId },
      include: { board: true }
    })

    if (!column) return { success: false, error: 'Column not found' }

    // Board permission check
    const perm = await checkBoardPermission({ 
      boardId: column.boardId, 
      allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER'] 
    })
    if (!perm.success) return perm as any

    const session = (perm as any).session

    // Members can only assign tasks to themselves
    const createData = { ...validation.data, creatorId: session.id }
    if (session.role === "MEMBER") {
      createData.assigneeId = session.id
    }

    const task = await prisma.task.create({
      data: {
        ...createData,
        dueDate: validation.data.dueDate ? new Date(validation.data.dueDate) : null
      }
    })

    await createAuditLog({
      userId: session.id,
      action: 'CREATE_TASK',
      details: { 
        taskId: task.id, 
        title: task.title, 
        columnId: task.columnId,
        boardId: column.boardId
      }
    })

    // Real-time update
    emitBoardEvent('task:created', { boardId: column.boardId, task })

    // Automation
    evaluateAutomationRules('TASK_CREATED', {
      taskId: task.id,
      taskTitle: task.title,
      columnId: task.columnId,
      columnName: column.name,
      boardId: column.boardId,
      priority: task.priority,
      assigneeId: task.assigneeId
    }).catch(err => console.error('[AUTOMATION_ERROR]', err))

    revalidatePath(`/dashboard/board/${column.boardId}`)
    return { success: true, data: task }
  } catch (error) {
    console.error('[CREATE_TASK_ERROR]', error)
    return { success: false, error: 'Failed to create task' }
  }
}

export async function updateTask(input: { id: string } & any): Promise<ActionResult> {
  const { id: taskId, ...rest } = input
  const validation = updateTaskSchema.safeParse({ ...rest, id: taskId })
  if (!validation.success) {
    return { success: false, error: 'Validation failed', fieldErrors: validation.error.flatten().fieldErrors }
  }

  const perm = await checkTaskPermission({ taskId })
  if (!perm.success) return perm

  try {
    const existingTask = perm.task!
    const session = perm.session!

    // Conflict detection
    if (validation.data.version !== existingTask.version) {
      return { success: false, error: "Conflict: Task was modified by another user" }
    }

    // Members can only assign tasks to themselves
    const { id, version, ...data } = validation.data
    if (session.role === "MEMBER" && data.assigneeId && data.assigneeId !== session.id) {
      return { success: false, error: "Members can only assign tasks to themselves" }
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        version: { increment: 1 }
      },
      include: { column: true }
    })

    await createAuditLog({
      userId: session.id,
      action: 'UPDATE_TASK',
      details: { 
        taskId, 
        updatedFields: Object.keys(data), 
        previousState: existingTask,
        boardId: task.column.boardId
      }
    })

    // Real-time update
    emitBoardEvent('task:updated', { boardId: task.column.boardId, task })

    // Assignment notification
    if (data.assigneeId && data.assigneeId !== existingTask.assigneeId && data.assigneeId !== session.id) {
      const notification = await prisma.notification.create({
        data: {
          userId: data.assigneeId,
          type: 'TASK_ASSIGNED',
          message: `You have been assigned to task: ${task.title}`,
          link: `/dashboard/board/${task.column.boardId}`
        }
      })
      emitNotification({
        userId: data.assigneeId,
        type: 'TASK_ASSIGNED',
        message: `You have been assigned to task: ${task.title}`,
        link: `/dashboard/board/${task.column.boardId}`,
        notificationId: notification.id
      })
    }

    // Automation
    evaluateAutomationRules('TASK_UPDATED', {
      taskId: task.id,
      taskTitle: task.title,
      columnId: task.columnId,
      columnName: task.column.name,
      boardId: task.column.boardId,
      priority: task.priority,
      assigneeId: task.assigneeId
    }).catch(err => console.error('[AUTOMATION_ERROR]', err))

    revalidatePath(`/dashboard/board/${task.column.boardId}`)
    return { success: true, data: task }
  } catch (error) {
    console.error('[UPDATE_TASK_ERROR]', error)
    return { success: false, error: 'Failed to update task' }
  }
}

export async function updateTaskStatus(input: { taskId: string, columnId: string, statusName: string, version?: number }): Promise<ActionResult> {
  const { taskId, columnId: newColumnId, statusName: newStatusName, version: clientVersion } = input
  const validation = moveTaskSchema.safeParse({ taskId, columnId: newColumnId, version: clientVersion || 1 })
  if (!validation.success) {
    return { success: false, error: 'Validation failed', fieldErrors: validation.error.flatten().fieldErrors }
  }

  const perm = await checkTaskPermission({ taskId })
  if (!perm.success) return perm

  const session = perm.session!

  try {
    const existingTask = perm.task!
    if (clientVersion !== undefined && existingTask.version !== clientVersion) {
      return { success: false, error: 'Conflict: Task was modified by another user' }
    }

    const targetColumn = await prisma.column.findUnique({
      where: { id: newColumnId },
      include: { board: true }
    })

    if (!targetColumn) return { success: false, error: 'Target column not found' }

    // WIP Limit Check
    const role = session.role as Role
    const isManagerOrAdmin = role === 'ADMIN' || role === 'MANAGER'

    if (targetColumn.wipLimit > 0 && !isManagerOrAdmin) {
      const currentTaskCount = await prisma.task.count({
        where: { columnId: newColumnId, id: { not: taskId } }
      })

      if (currentTaskCount >= targetColumn.wipLimit) {
        return { success: false, error: `WIP limit exceeded in "${targetColumn.name}".` }
      }
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { 
        columnId: newColumnId,
        updatedAt: new Date(),
        version: { increment: 1 }
      },
      include: { column: true }
    })

    const wasOverride = targetColumn.wipLimit > 0 && (await prisma.task.count({ where: { columnId: newColumnId } })) > targetColumn.wipLimit

    await createAuditLog({
      userId: session.id,
      action: wasOverride ? 'UPDATE_TASK_STATUS_OVERRIDE' : 'UPDATE_TASK_STATUS',
      details: { 
        taskId, 
        newStatus: newStatusName,
        columnId: newColumnId,
        override: wasOverride,
        previousColumnId: existingTask.columnId,
        boardId: task.column.boardId
      }
    })

    // Real-time update
    emitBoardEvent('task:moved', { 
      boardId: task.column.boardId,
      taskId, 
      columnId: newColumnId, 
      previousColumnId: existingTask.columnId,
      task 
    })

    // Notifications
    const notifyUsers = new Set<string>()
    if (task.assigneeId && task.assigneeId !== session.id) notifyUsers.add(task.assigneeId)
    if (task.creatorId && task.creatorId !== session.id) notifyUsers.add(task.creatorId)

    for (const userId of notifyUsers) {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'TASK_STATUS_CHANGED',
          message: `Task "${task.title}" moved to ${newStatusName}`,
          link: `/dashboard/board/${task.column.boardId}`
        }
      })
      emitNotification({
        userId,
        type: 'TASK_STATUS_CHANGED',
        message: `Task "${task.title}" moved to ${newStatusName}`,
        link: `/dashboard/board/${task.column.boardId}`,
        notificationId: notification.id
      })
    }

    // Automation
    evaluateAutomationRules('TASK_MOVED', {
      taskId: task.id,
      taskTitle: task.title,
      columnId: task.columnId,
      columnName: newStatusName,
      boardId: task.column.boardId,
      priority: task.priority,
      assigneeId: task.assigneeId,
      previousColumnId: existingTask.columnId
    }).catch(err => console.error('[AUTOMATION_ERROR]', err))

    revalidatePath(`/dashboard/board/${task.column.boardId}`)
    return { success: true, data: task }
  } catch (error) {
    console.error('[MOVE_TASK_ERROR]', error)
    return { success: false, error: 'Failed to move task' }
  }
}

export async function deleteTask(input: { id: string }): Promise<ActionResult> {
  const { id: taskId } = input
  const validation = idSchema.safeParse(taskId)
  if (!validation.success) return { success: false, error: 'Invalid Task ID' }

  const perm = await checkTaskPermission({ taskId })
  if (!perm.success) return perm

  try {
    const task = await prisma.task.delete({
      where: { id: taskId },
      include: { 
        column: true,
        tags: true,
        checklists: {
          include: { items: true }
        },
        attachments: true,
        comments: {
          include: { user: true }
        },
        timeEntries: {
          include: { user: true }
        },
        reviews: {
          include: { reviewer: true }
        }
      }
    })

    await createAuditLog({
      userId: perm.session!.id,
      action: 'DELETE_TASK',
      details: { 
        taskId, 
        title: task.title, 
        boardId: task.column.boardId,
        fullTask: task // Store full task for undo
      }
    })

    // Real-time update
    emitBoardEvent('task:deleted', { boardId: task.column.boardId, taskId })

    revalidatePath(`/dashboard/board/${task.column.boardId}`)
    return { success: true }
  } catch (error) {
    console.error('[DELETE_TASK_ERROR]', error)
    return { success: false, error: 'Failed to delete task' }
  }
}

export async function getTaskDetails(input: { id: string }): Promise<ActionResult> {
  const { id: taskId } = input
  const validation = idSchema.safeParse(taskId)
  if (!validation.success) return { success: false, error: 'Invalid Task ID' }

  const perm = await checkTaskPermission({ taskId, allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER', 'MEMBER_ALL'] })
  if (!perm.success) return perm

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: true,
        creator: true,
        column: { include: { board: true } },
        comments: {
          include: { user: true, reactions: { include: { user: true } } },
          orderBy: { createdAt: "desc" },
        },
        attachments: { orderBy: { createdAt: 'desc' } },
        checklists: {
          include: { items: { orderBy: { id: 'asc' } } }
        },
        tags: true,
        timeEntries: { include: { user: true }, orderBy: { createdAt: 'desc' } },
        reviews: { include: { reviewer: true }, orderBy: { createdAt: 'desc' } }
      }
    })

    if (!task) return { success: false, error: 'Task not found' }


    return { success: true, data: task }
  } catch (error) {
    console.error('[GET_TASK_DETAILS_ERROR]', error)
    return { success: false, error: 'Failed to fetch task details' }
  }
}

// --- COMMENTS ---

export async function addComment(input: { taskId: string, content: string }): Promise<ActionResult> {
  const { taskId, content } = input
  const validation = createCommentSchema.safeParse({ taskId, content })
  if (!validation.success) {
    return { success: false, error: 'Validation failed', fieldErrors: validation.error.flatten().fieldErrors }
  }

  const perm = await checkTaskPermission({ taskId, allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER', 'MEMBER_ALL'] })
  if (!perm.success) return perm

  const session = perm.session!
  const taskData = perm.task!

  try {
    const comment = await prisma.comment.create({
      data: { content: validation.data.content, taskId, userId: session.id },
      include: { user: true }
    })

    await createAuditLog({
      userId: session.id,
      action: 'ADD_COMMENT',
      details: { 
        taskId, 
        commentId: comment.id,
        boardId: taskData.column.boardId
      }
    })

    // Real-time update
    emitBoardEvent('task:updated', { boardId: taskData.column.boardId, taskId })

    // Mentions
    const mentionRegex = /@([\w\s]+?)(?=\s|$|[,.!?:;])/g
    const mentions = validation.data.content.match(mentionRegex)
    if (mentions) {
      const mentionedNames = mentions.map((m: string) => m.slice(1).trim())
      const mentionedUsers = await prisma.user.findMany({
        where: { name: { in: mentionedNames } }
      })

      for (const user of mentionedUsers) {
        if (user.id !== session.id) {
          const notification = await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'COMMENT_MENTION',
              message: `${session.name || 'Someone'} mentioned you on task: ${taskData.title}`,
              link: `/dashboard/board/${taskData.column.boardId}`
            }
          })
          emitNotification({
            userId: user.id,
            type: 'COMMENT_MENTION',
            message: `${session.name || 'Someone'} mentioned you on task: ${taskData.title}`,
            link: `/dashboard/board/${taskData.column.boardId}`,
            notificationId: notification.id
          })
        }
      }
    }

    await createAuditLog({
      userId: session.id,
      action: 'ADD_COMMENT',
      details: { taskId, commentId: comment.id, boardId: taskData.column.boardId }
    })

    return { success: true, data: comment }
  } catch (error) {
    console.error('[ADD_COMMENT_ERROR]', error)
    return { success: false, error: 'Failed to add comment' }
  }
}

export async function deleteComment(input: { id: string }): Promise<ActionResult> {
  const { id: commentId } = input
  const validation = idSchema.safeParse(commentId)
  if (!validation.success) return { success: false, error: 'Invalid ID' }

  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { task: { include: { column: { include: { board: true } } } } }
    })

    if (!comment) return { success: false, error: 'Comment not found' }

    // Use checkTaskPermission to get user role context
    const perm = await checkTaskPermission({ taskId: comment.taskId })
    if (!perm.success) return perm

    const isOwner = comment.userId === session.id
    const isAdmin = session.role === 'ADMIN'
    const isBoardManager = perm.task?.column.board.ownerId === session.id || 
                       perm.task?.column.board.members.find(m => m.id === session.id)?.role === 'MANAGER'

    if (!isOwner && !isAdmin && !isBoardManager) {
      return { success: false, error: 'Access denied: You do not have permission to delete this comment' }
    }

    await prisma.comment.delete({ where: { id: commentId } })

    await createAuditLog({
      userId: session.id,
      action: 'DELETE_COMMENT',
      details: { 
        commentId, 
        taskId: comment.taskId,
        boardId: comment.task.column.boardId,
        content: comment.content,
        commentUserId: comment.userId,
        createdAt: comment.createdAt
      }
    })

    // Real-time update
    emitBoardEvent('task:updated', { boardId: comment.task.column.boardId, taskId: comment.taskId })

    return { success: true }
  } catch (error) {
    console.error("[DELETE_COMMENT_ERROR]", error)
    return { success: false, error: "Failed to delete comment" }
  }
}

const FIVE_MINUTES_MS = 5 * 60 * 1000

export async function editComment(input: {
  id: string
  content: string
}): Promise<ActionResult> {
  const { id: commentId, content } = input
  const validation = editCommentSchema.safeParse({ id: commentId, content })
  if (!validation.success) {
    return { success: false, error: "Validation failed", fieldErrors: validation.error.flatten().fieldErrors }
  }

  const session = await getSession()
  if (!session) return { success: false, error: "Unauthorized" }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: {
            column: {
              include: {
                board: {
                  include: {
                    members: { select: { id: true, role: true } },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!comment) return { success: false, error: "Comment not found" }

    const isOwner = comment.userId === session.id
    const isAdmin = session.role === "ADMIN"
    const isBoardManager =
      comment.task.column.board.ownerId === session.id ||
      comment.task.column.board.members.find((m) => m.id === session.id)?.role === "MANAGER"

    if (!isOwner && !isAdmin && !isBoardManager) {
      return { success: false, error: "Access denied: You cannot edit this comment" }
    }

    const ageMs = Date.now() - comment.createdAt.getTime()
    if (!isAdmin && !isBoardManager && ageMs > FIVE_MINUTES_MS) {
      return { success: false, error: "Comments can only be edited within 5 minutes of creation" }
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content },
      include: { user: true },
    })

    await createAuditLog({
      userId: session.id,
      action: "EDIT_COMMENT",
      details: {
        commentId,
        taskId: comment.taskId,
        boardId: comment.task.column.boardId,
        previousContent: comment.content,
      },
    })

    emitBoardEvent("task:updated", {
      boardId: comment.task.column.boardId,
      taskId: comment.taskId,
    })

    return { success: true, data: updated }
  } catch (error) {
    console.error("[EDIT_COMMENT_ERROR]", error)
    return { success: false, error: "Failed to edit comment" }
  }
}

export async function toggleReaction(input: {
  commentId: string
  emoji: string
}): Promise<ActionResult> {
  const { commentId, emoji } = input
  const validation = idSchema.safeParse(commentId)
  if (!validation.success) return { success: false, error: "Invalid comment ID" }

  const session = await getSession()
  if (!session) return { success: false, error: "Unauthorized" }

  try {
    const existing = await prisma.reaction.findFirst({
      where: { userId: session.id, commentId, emoji },
    })

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } })
    } else {
      await prisma.reaction.create({
        data: { userId: session.id, commentId, emoji },
      })
    }

    const updatedComment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        reactions: { include: { user: { select: { id: true, name: true, image: true } } } },
        user: true,
      },
    })

    return { success: true, data: updatedComment }
  } catch (error) {
    console.error("[TOGGLE_REACTION_ERROR]", error)
    return { success: false, error: "Failed to toggle reaction" }
  }
}

// --- CHECKLISTS ---

export async function addChecklist(input: { taskId: string, title: string }): Promise<ActionResult> {
  const { taskId, title } = input
  const validation = idSchema.safeParse(taskId)
  if (!validation.success) return { success: false, error: 'Invalid Task ID' }

  const perm = await checkTaskPermission({ taskId })
  if (!perm.success) return perm

  try {
    const checklist = await prisma.checklist.create({
      data: { taskId, title },
      include: { items: true }
    })

    await createAuditLog({
      userId: perm.session!.id,
      action: 'ADD_CHECKLIST',
      details: { taskId, checklistId: checklist.id, title, boardId: perm.task!.column.boardId }
    })

    emitBoardEvent('task:updated', { boardId: perm.task!.column.boardId, taskId })
    return { success: true, data: checklist }
  } catch (error) {
    console.error('[ADD_CHECKLIST_ERROR]', error)
    return { success: false, error: 'Failed to add checklist' }
  }
}

export async function deleteChecklist(input: { id: string }): Promise<ActionResult> {
  const { id: checklistId } = input
  const validation = idSchema.safeParse(checklistId)
  if (!validation.success) return { success: false, error: 'Invalid ID' }

  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const checklist = await prisma.checklist.findUnique({
      where: { id: checklistId },
      include: { task: { include: { column: true } } }
    })

    if (!checklist) return { success: false, error: 'Checklist not found' }

    const perm = await checkTaskPermission({ taskId: checklist.taskId })
    if (!perm.success) return perm

    await prisma.checklist.delete({ where: { id: checklistId } })

    await createAuditLog({
      userId: session.id,
      action: 'DELETE_CHECKLIST',
      details: { 
        taskId: checklist.taskId, 
        checklistId, 
        title: checklist.title,
        boardId: checklist.task.column.boardId 
      }
    })

    emitBoardEvent('task:updated', { boardId: checklist.task.column.boardId, taskId: checklist.taskId })
    return { success: true }
  } catch (error) {
    console.error('[DELETE_CHECKLIST_ERROR]', error)
    return { success: false, error: 'Failed to delete checklist' }
  }
}

export async function addChecklistItem(input: { taskId: string, content: string, checklistId?: string }): Promise<ActionResult> {
  const { taskId, content, checklistId } = input
  const validation = addChecklistItemSchema.safeParse({ taskId, content })
  if (!validation.success) return { success: false, error: 'Validation failed' }

  const perm = await checkTaskPermission({ taskId })
  if (!perm.success) return perm

  try {
    let targetChecklistId = checklistId

    if (!targetChecklistId) {
      const checklist = await prisma.checklist.findFirst({ where: { taskId } })
      if (!checklist) {
        const newCl = await prisma.checklist.create({ data: { taskId, title: 'Checklist' } })
        targetChecklistId = newCl.id
      } else {
        targetChecklistId = checklist.id
      }
    }

    const item = await prisma.checklistItem.create({
      data: { content, checklistId: targetChecklistId! }
    })

    await createAuditLog({
      userId: perm.session!.id,
      action: 'ADD_CHECKLIST_ITEM',
      details: { taskId, itemId: item.id, boardId: perm.task!.column.boardId }
    })

    // Real-time update
    emitBoardEvent('task:updated', { boardId: perm.task!.column.boardId, taskId })

    return { success: true, data: item }
  } catch (error) {
    console.error('[ADD_CHECKLIST_ITEM_ERROR]', error)
    return { success: false, error: 'Failed to add item' }
  }
}

export async function updateChecklistItem(input: { id: string, content: string }): Promise<ActionResult> {
  const { id: itemId, content } = input
  const validation = updateChecklistItemSchema.safeParse({ id: itemId, content })
  if (!validation.success) return { success: false, error: 'Validation failed' }

  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: { checklist: { include: { task: true } } }
    })

    if (!item) return { success: false, error: 'Item not found' }

    const perm = await checkTaskPermission({ taskId: item.checklist.taskId })
    if (!perm.success) return perm

    const updatedItem = await prisma.checklistItem.update({
      where: { id: itemId },
      data: { content }
    })

    await createAuditLog({
      userId: session.id,
      action: 'UPDATE_CHECKLIST_ITEM',
      details: { 
        taskId: item.checklist.taskId, 
        itemId, 
        content,
        previousContent: item.content,
        boardId: perm.task!.column.boardId
      }
    })

    emitBoardEvent('task:updated', { boardId: perm.task!.column.boardId, taskId: item.checklist.taskId })

    return { success: true, data: updatedItem }
  } catch (error) {
    console.error('[UPDATE_CHECKLIST_ITEM_ERROR]', error)
    return { success: false, error: 'Failed to update item' }
  }
}

export async function deleteChecklistItem(input: { id: string }): Promise<ActionResult> {
  const { id: itemId } = input
  const validation = idSchema.safeParse(itemId)
  if (!validation.success) return { success: false, error: 'Invalid ID' }

  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: { checklist: { include: { task: true } } }
    })

    if (!item) return { success: false, error: 'Item not found' }

    const perm = await checkTaskPermission({ taskId: item.checklist.taskId })
    if (!perm.success) return perm

    await prisma.checklistItem.delete({ where: { id: itemId } })

    await createAuditLog({
      userId: session.id,
      action: 'DELETE_CHECKLIST_ITEM',
      details: { 
        taskId: item.checklist.taskId, 
        itemId,
        boardId: perm.task!.column.boardId,
        content: item.content,
        checklistId: item.checklistId
      }
    })

    emitBoardEvent('task:updated', { boardId: perm.task!.column.boardId, taskId: item.checklist.taskId })

    return { success: true }
  } catch (error) {
    console.error('[DELETE_CHECKLIST_ITEM_ERROR]', error)
    return { success: false, error: 'Failed to delete item' }
  }
}

export async function toggleChecklistItem(input: { id: string, isCompleted: boolean }): Promise<ActionResult> {
  const { id: itemId, isCompleted } = input
  const validation = toggleChecklistItemSchema.safeParse({ itemId, isCompleted })
  if (!validation.success) return { success: false, error: 'Validation failed' }

  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: { checklist: { include: { task: { include: { column: true } } } } }
    })

    if (!item) return { success: false, error: 'Item not found' }

    const perm = await checkTaskPermission({ taskId: item.checklist.taskId })
    if (!perm.success) return perm

    const updatedItem = await prisma.checklistItem.update({
      where: { id: itemId },
      data: { isCompleted }
    })

    await createAuditLog({
      userId: session.id,
      action: 'TOGGLE_CHECKLIST_ITEM',
      details: { 
        taskId: item.checklist.taskId, 
        itemId, 
        isCompleted,
        boardId: item.checklist.task.column.boardId
      }
    })

    // Real-time update
    emitBoardEvent('task:updated', { boardId: item.checklist.task.column.boardId, taskId: item.checklist.taskId })

    return { success: true, data: updatedItem }
  } catch (error) {
    console.error('[TOGGLE_CHECKLIST_ITEM_ERROR]', error)
    return { success: false, error: 'Failed to toggle item' }
  }
}

// --- ATTACHMENTS ---

export async function addAttachment(input: { 
  taskId: string, 
  name: string, 
  url: string, 
  type: string, 
  size: number 
}): Promise<ActionResult> {
  const { taskId, ...rest } = input
  const validation = addAttachmentSchema.safeParse({ ...rest, taskId })
  if (!validation.success) return { success: false, error: 'Validation failed' }

  const perm = await checkTaskPermission({ taskId })
  if (!perm.success) return perm

  try {
    const attachment = await prisma.attachment.create({
      data: { ...validation.data, taskId }
    })

    await createAuditLog({
      userId: perm.session!.id,
      action: 'ADD_ATTACHMENT',
      details: { taskId, attachmentId: attachment.id, boardId: perm.task!.column.boardId }
    })

    // Real-time update
    emitBoardEvent('task:updated', { boardId: perm.task!.column.boardId, taskId })

    return { success: true, data: attachment }
  } catch (error) {
    console.error('[ADD_ATTACHMENT_ERROR]', error)
    return { success: false, error: 'Failed to add attachment' }
  }
}

export async function deleteAttachment(input: { id: string }): Promise<ActionResult> {
  const { id: attachmentId } = input
  const validation = idSchema.safeParse(attachmentId)
  if (!validation.success) return { success: false, error: 'Invalid ID' }

  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { task: true }
    })

    if (!attachment) return { success: false, error: 'Attachment not found' }

    const perm = await checkTaskPermission({ taskId: attachment.taskId })
    if (!perm.success) return perm

    await prisma.attachment.delete({ where: { id: attachmentId } })

    await createAuditLog({
      userId: session.id,
      action: 'DELETE_ATTACHMENT',
      details: { 
        taskId: attachment.taskId, 
        attachmentId,
        boardId: perm.task!.column.boardId,
        name: attachment.name,
        url: attachment.url,
        type: attachment.type,
        size: attachment.size
      }
    })

    emitBoardEvent('task:updated', { boardId: perm.task!.column.boardId, taskId: attachment.taskId })

    return { success: true }
  } catch (error) {
    console.error('[DELETE_ATTACHMENT_ERROR]', error)
    return { success: false, error: 'Failed to delete attachment' }
  }
}

// --- TAGS ---

export async function addTagToTask(input: { taskId: string, tagId: string }): Promise<ActionResult> {
  const { taskId, tagId } = input
  const validation = manageTaskTagSchema.safeParse({ taskId, tagId })
  if (!validation.success) return { success: false, error: 'Invalid input' }

  const perm = await checkTaskPermission({ taskId })
  if (!perm.success) return perm

  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { tags: { connect: { id: tagId } }, version: { increment: 1 } },
      include: { tags: true, column: true }
    })

    await createAuditLog({
      userId: perm.session!.id,
      action: 'ADD_TAG',
      details: { taskId, tagId, boardId: task.column.boardId }
    })

    // Real-time update
    emitBoardEvent('task:updated', { boardId: task.column.boardId, taskId })

    return { success: true, data: task }
  } catch (error) {
    console.error('[ADD_TAG_ERROR]', error)
    return { success: false, error: 'Failed to add tag' }
  }
}

export async function removeTagFromTask(input: { taskId: string, tagId: string }): Promise<ActionResult> {
  const { taskId, tagId } = input
  const validation = manageTaskTagSchema.safeParse({ taskId, tagId })
  if (!validation.success) return { success: false, error: 'Invalid input' }

  const perm = await checkTaskPermission({ taskId })
  if (!perm.success) return perm

  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { tags: { disconnect: { id: tagId } }, version: { increment: 1 } },
      include: { tags: true, column: true }
    })

    await createAuditLog({
      userId: perm.session!.id,
      action: 'REMOVE_TAG',
      details: { taskId, tagId, boardId: task.column.boardId }
    })

    // Real-time update
    emitBoardEvent('task:updated', { boardId: task.column.boardId, taskId })

    return { success: true, data: task }
  } catch (error) {
    console.error('[REMOVE_TAG_ERROR]', error)
    return { success: false, error: 'Failed to remove tag' }
  }
}

// --- TIME TRACKING ---

export async function logTime(input: { 
  taskId: string, 
  duration: number, 
  description?: string, 
  date?: string 
}): Promise<ActionResult> {
  const { taskId, ...rest } = input
  const validation = logTimeSchema.safeParse({ ...rest, taskId })
  if (!validation.success) return { success: false, error: 'Validation failed' }

  const perm = await checkTaskPermission({ taskId })
  if (!perm.success) return perm

  const session = perm.session!

  try {
    const entry = await prisma.timeEntry.create({
      data: { ...validation.data, taskId, userId: session.id }
    })

    await createAuditLog({
      userId: session.id,
      action: 'LOG_TIME',
      details: { 
        taskId, 
        entryId: entry.id, 
        duration: validation.data.duration,
        boardId: perm.task!.column.boardId
      }
    })

    // Real-time update
    emitBoardEvent('task:updated', { boardId: perm.task!.column.boardId, taskId })

    return { success: true, data: entry }
  } catch (error) {
    console.error('[LOG_TIME_ERROR]', error)
    return { success: false, error: 'Failed to log time' }
  }
}

// --- REVIEWS ---

export async function submitForReview(input: { taskId: string, reviewerId: string }): Promise<ActionResult> {
  const { taskId, reviewerId } = input
  const validation = submitReviewSchema.safeParse({ taskId, reviewerId })
  if (!validation.success) return { success: false, error: 'Validation failed' }

  const perm = await checkTaskPermission({ taskId })
  if (!perm.success) return perm

  const session = perm.session!

  try {
    const review = await prisma.review.create({
      data: { taskId, reviewerId, status: 'PENDING' }
    })

    await prisma.task.update({ where: { id: taskId }, data: { version: { increment: 1 } } })

    await createAuditLog({
      userId: session.id,
      action: 'SUBMIT_REVIEW',
      details: { taskId, reviewId: review.id, reviewerId, boardId: perm.task!.column.boardId }
    })

    // Real-time update
    emitBoardEvent('task:updated', { boardId: perm.task!.column.boardId, taskId })

    // Notification
    const notification = await prisma.notification.create({
      data: {
        userId: reviewerId,
        type: 'REVIEW_REQUESTED',
        message: `${session.name} requested a review for: ${perm.task!.title}`,
        link: `/dashboard/board/${perm.task!.column.boardId}`
      }
    })
    emitNotification({
      userId: reviewerId,
      type: 'REVIEW_REQUESTED',
      message: `${session.name} requested a review for: ${perm.task!.title}`,
      link: `/dashboard/board/${perm.task!.column.boardId}`,
      notificationId: notification.id
    })

    return { success: true, data: review }
  } catch (error) {
    console.error('[SUBMIT_REVIEW_ERROR]', error)
    return { success: false, error: 'Failed to submit review' }
  }
}

export async function completeReview(input: { id: string, status: any, feedback: string }): Promise<ActionResult> {
  const { id: reviewId, status, feedback } = input
  const validation = completeReviewSchema.safeParse({ reviewId, status, feedback })
  if (!validation.success) return { success: false, error: 'Validation failed' }

  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { task: { include: { column: true } } }
    })

    if (!review) return { success: false, error: 'Review not found' }

    const perm = await checkTaskPermission({ taskId: review.taskId })
    if (!perm.success) return perm

    const session = perm.session!

    // Only designated reviewer or Admin/Manager can complete a review
    const isReviewer = review.reviewerId === session.id
    const isPrivileged = session.role === 'ADMIN' || session.role === 'MANAGER'

    if (!isReviewer && !isPrivileged) {
      return { success: false, error: 'Access denied: You are not the assigned reviewer' }
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: { status: validation.data.status, feedback },
      include: { task: { include: { column: true } } }
    })

    await createAuditLog({
      userId: session.id,
      action: 'COMPLETE_REVIEW',
      details: { 
        taskId: updatedReview.taskId, 
        reviewId, 
        status: validation.data.status,
        previousStatus: review.status,
        boardId: updatedReview.task.column.boardId
      }
    })

    // Real-time update
    emitBoardEvent('task:updated', { boardId: updatedReview.task.column.boardId, taskId: updatedReview.taskId })

    // Move task based on review outcome
    const statusValue = validation.data.status as string
    let targetColumnName: string | null = null
    if (statusValue === 'APPROVED') {
      targetColumnName = 'Done'
    } else if (statusValue === 'CHANGES_REQUESTED') {
      targetColumnName = 'In Progress'
    } else if (statusValue === 'REJECTED') {
      targetColumnName = 'To Do'
    }

    if (targetColumnName) {
      const boardColumns = await prisma.column.findMany({
        where: { boardId: updatedReview.task.column.boardId },
      })
      const targetColumn = boardColumns.find(
        (c) => c.name.toLowerCase() === targetColumnName!.toLowerCase()
      )
      if (targetColumn && targetColumn.id !== updatedReview.task.columnId) {
        await prisma.task.update({
          where: { id: updatedReview.taskId },
          data: { columnId: targetColumn.id, version: { increment: 1 } },
        })
        emitBoardEvent('task:moved', {
          boardId: updatedReview.task.column.boardId,
          taskId: updatedReview.taskId,
          columnId: targetColumn.id,
        })
      }
    }

    // Notification to creator
    const notification = await prisma.notification.create({
      data: {
        userId: updatedReview.task.creatorId,
        type: 'REVIEW_COMPLETED',
        message: `Review completed for "${updatedReview.task.title}": ${status}`,
        link: `/dashboard/board/${updatedReview.task.column.boardId}`
      }
    })
    emitNotification({
      userId: updatedReview.task.creatorId,
      type: 'REVIEW_COMPLETED',
      message: `Review completed for "${updatedReview.task.title}": ${status}`,
      link: `/dashboard/board/${updatedReview.task.column.boardId}`,
      notificationId: notification.id
    })

    return { success: true, data: updatedReview }
  } catch (error) {
    console.error('[COMPLETE_REVIEW_ERROR]', error)
    return { success: false, error: 'Failed to complete review' }
  }
}

// --- UTILS ---

export async function getAllUsers(): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true
      },
      orderBy: { name: 'asc' }
    })
    return { success: true, data: users }
  } catch (error) {
    console.error('[GET_ALL_USERS_ERROR]', error)
    return { success: false, error: 'Failed to fetch users' }
  }
}

export async function getTaskActivityLog(input: { id: string }): Promise<ActionResult> {
  const { id: taskId } = input
  const validation = idSchema.safeParse(taskId)
  if (!validation.success) return { success: false, error: 'Invalid ID' }

  const perm = await checkTaskPermission({ taskId, allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER', 'MEMBER_ALL'] })
  if (!perm.success) return perm

  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        details: {
          path: ['taskId'],
          equals: taskId
        }
      },
      include: { user: { select: { name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
    return { success: true, data: logs }
  } catch (error) {
    console.error('[GET_TASK_ACTIVITY_ERROR]', error)
    return { success: false, error: 'Failed to fetch activity log' }
  }
}

export async function deleteTimeEntry(input: { entryId: string }): Promise<ActionResult> {
  const { entryId } = input
  const validation = idSchema.safeParse(entryId)
  if (!validation.success) return { success: false, error: 'Invalid ID' }

  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const entry = await prisma.timeEntry.findUnique({
      where: { id: entryId },
      include: { task: { include: { column: true } } }
    })

    if (!entry) return { success: false, error: 'Time entry not found' }

    // Only allow owner, admin, or manager to delete
    const isOwner = entry.userId === session.id
    const isAdmin = session.role === 'ADMIN'
    const isManager = session.role === 'MANAGER'
    if (!isOwner && !isAdmin && !isManager) {
      return { success: false, error: 'Forbidden: You can only delete your own time entries' }
    }

    await prisma.timeEntry.delete({ where: { id: entryId } })

    await createAuditLog({
      userId: session.id,
      action: 'DELETE_TIME_ENTRY',
      details: {
        taskId: entry.taskId,
        entryId,
        duration: entry.duration,
        boardId: entry.task.column.boardId
      }
    })

    emitBoardEvent('task:updated', { boardId: entry.task.column.boardId, taskId: entry.taskId })

    return { success: true }
  } catch (error) {
    console.error('[DELETE_TIME_ENTRY_ERROR]', error)
    return { success: false, error: 'Failed to delete time entry' }
  }
}

export async function updateTimeEntry(input: { entryId: string, duration: number, description?: string | null }): Promise<ActionResult> {
  const { entryId, duration, description } = input
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  if (isNaN(duration) || duration <= 0) {
    return { success: false, error: 'Invalid duration' }
  }

  try {
    const entry = await prisma.timeEntry.findUnique({
      where: { id: entryId },
      include: { task: { include: { column: true } } }
    })

    if (!entry) return { success: false, error: 'Time entry not found' }

    const isOwner = entry.userId === session.id
    const isAdmin = session.role === 'ADMIN'
    const isManager = session.role === 'MANAGER'
    if (!isOwner && !isAdmin && !isManager) {
      return { success: false, error: 'Forbidden: You can only edit your own time entries' }
    }

    const updatedEntry = await prisma.timeEntry.update({
      where: { id: entryId },
      data: { duration, description: description || null }
    })

    await createAuditLog({
      userId: session.id,
      action: 'UPDATE_TIME_ENTRY',
      details: {
        taskId: entry.taskId,
        entryId,
        duration,
        boardId: entry.task.column.boardId
      }
    })

    emitBoardEvent('task:updated', { boardId: entry.task.column.boardId, taskId: entry.taskId })

    return { success: true, data: updatedEntry }
  } catch (error) {
    console.error('[UPDATE_TIME_ENTRY_ERROR]', error)
    return { success: false, error: 'Failed to update time entry' }
  }
}

export async function getTimeEntries(input: { id: string }): Promise<ActionResult> {
  const { id: taskId } = input
  const validation = idSchema.safeParse(taskId)
  if (!validation.success) return { success: false, error: 'Invalid ID' }

  const perm = await checkTaskPermission({ taskId, allowedRoles: ['ADMIN', 'MANAGER', 'MEMBER', 'MEMBER_ALL'] })
  if (!perm.success) return perm

  try {
    const entries = await prisma.timeEntry.findMany({
      where: { taskId },
      include: { user: { select: { name: true, image: true } } },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, data: entries }
  } catch (error) {
    console.error('[GET_TIME_ENTRIES_ERROR]', error)
    return { success: false, error: 'Failed to fetch time entries' }
  }
}

export { getTagsForBoard as getBoardTags }
