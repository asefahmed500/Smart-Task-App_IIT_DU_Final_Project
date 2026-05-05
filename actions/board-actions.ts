'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { revalidatePath } from 'next/cache'
import { 
  createBoardSchema, 
  updateBoardSchema, 
  createColumnSchema, 
  updateColumnSchema,
  reorderColumnsSchema,
  manageBoardMemberSchema,
  createTagSchema,
  manageTaskTagSchema,
  searchUserSchema,
  idSchema
} from '@/lib/schemas'
import { ActionResult } from '@/types/kanban'
import { emitBoardEvent } from '@/utils/socket-emitter'
import { createAuditLog } from '@/lib/create-audit-log'

/**
 * Helper to check board permissions
 * Returns the board and session if successful, or an error ActionResult
 */
export async function checkBoardPermission(input: { boardId: string, allowedRoles?: string[] }) {
  const { boardId, allowedRoles = ['ADMIN', 'MANAGER'] } = input;
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized: Please log in' }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { 
        members: { select: { id: true } } 
      }
    })

    if (!board) return { success: false, error: 'Board not found' }

    const isAdmin = session.role === 'ADMIN'
    const isOwner = board.ownerId === session.id
    const isMember = board.members.some(m => m.id === session.id)

    // Admins have full access to everything
    if (isAdmin) return { success: true, session, board }

    // If user is not even a member or owner, they can't do anything
    if (!isMember && !isOwner) {
      return { success: false, error: 'Forbidden: You are not a member of this board' }
    }

    // Special case: Owners have full management permissions on their own boards
    if (isOwner) return { success: true, session, board }

    // Check if the user's role is in the list of allowed roles for this action
    if (allowedRoles.includes(session.role)) {
      return { success: true, session, board }
    }

    return { success: false, error: `Forbidden: Your ${session.role} role does not have permission for this action` }
  } catch (error) {
    console.error('[CHECK_BOARD_PERMISSION_ERROR]', error)
    return { success: false, error: 'Failed to verify board permissions' }
  }
}

export async function getBoardData(input: { boardId: string }): Promise<ActionResult> {
  try {
    const { boardId } = input
    const validatedId = idSchema.parse(boardId)
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const board = await prisma.board.findUnique({
      where: { id: validatedId },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { updatedAt: 'desc' },
              include: {
                assignee: {
                  select: {
                    id: true,
                    name: true,
                    image: true,
                    email: true,
                    role: true
                  }
                },
                _count: {
                  select: {
                    comments: true,
                    attachments: true,
                    checklists: true
                  }
                },
                checklists: {
                  include: { items: true }
                },
                tags: true
              }
            }
          }
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true
          }
        },
        tags: true
      }
    })

    if (!board) return { success: false, error: 'Board not found' }

    const isMember = board.members.some(m => m.id === session.id)
    const isAdmin = session.role === 'ADMIN'

    if (!isMember && !isAdmin) {
      return { success: false, error: 'Unauthorized: You are not a member of this board' }
    }

    return { success: true, data: board }
  } catch (error: any) {
    console.error('Error fetching board:', error)
    return { success: false, error: error.message || 'Failed to fetch board' }
  }
}

export async function createBoard(rawInput: any): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }
    
    // Only ADMIN and MANAGER can create boards (PRD 3.1)
    if (session.role === 'MEMBER') {
      return { success: false, error: 'Forbidden: Only Admins and Managers can create boards' }
    }

    const validatedData = createBoardSchema.parse(rawInput)

    const board = await prisma.board.create({
      data: {
        ...validatedData,
        ownerId: session.id,
        members: {
          connect: { id: session.id }
        },
        columns: {
          create: [
            { name: 'To Do', order: 0 },
            { name: 'In Progress', order: 1 },
            { name: 'Done', order: 2 }
          ]
        }
      },
      include: {
        columns: true
      }
    })

    await createAuditLog({
      userId: session.id,
      action: 'CREATE_BOARD',
      details: { boardId: board.id, name: board.name },
    })

    revalidatePath('/dashboard')
    revalidatePath('/admin/boards')
    
    return { success: true, data: board }
  } catch (error: any) {
    console.error('[CREATE_BOARD_ERROR]', error)
    if (error.name === 'ZodError') {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    return { success: false, error: error.message || 'Failed to create board' }
  }
}

export async function updateBoard(rawInput: any): Promise<ActionResult> {
  try {
    const validatedData = updateBoardSchema.parse(rawInput)
    const { id, ...data } = validatedData

    const permission = await checkBoardPermission({ boardId: id, allowedRoles: ['ADMIN', 'MANAGER'] })
    if (!permission.success) return permission as any

    const previousBoard = permission.board
    if (!previousBoard) return { success: false, error: 'Board context missing' }

    const updatedBoard = await prisma.board.update({
      where: { id },
      data
    })

    await createAuditLog({
      userId: (permission as any).session.id,
      action: 'UPDATE_BOARD',
      details: { 
        boardId: id, 
        ...data,
        previousName: previousBoard.name,
        previousDescription: previousBoard.description
      },
    })

    emitBoardEvent('board:updated', { boardId: id, name: updatedBoard.name })

    revalidatePath(`/dashboard/board/${id}`)
    revalidatePath('/dashboard')
    revalidatePath('/admin/boards')
    
    return { success: true, data: updatedBoard }
  } catch (error: any) {
    console.error('[UPDATE_BOARD_ERROR]', error)
    if (error.name === 'ZodError') {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    return { success: false, error: error.message || 'Failed to update board' }
  }
}

export async function deleteBoard(input: { boardId: string }): Promise<ActionResult> {
  try {
    const { boardId } = input
    const validatedId = idSchema.parse(boardId)
    const permission = await checkBoardPermission({ boardId: validatedId, allowedRoles: ['ADMIN', 'MANAGER'] })
    if (!permission.success) return permission as any

    await prisma.board.delete({
      where: { id: validatedId }
    })

    await createAuditLog({
      userId: (permission as any).session.id,
      action: 'DELETE_BOARD',
      details: { boardId: validatedId },
    })

    emitBoardEvent('board:deleted', { boardId: validatedId })

    revalidatePath('/dashboard')
    revalidatePath('/admin/boards')
    
    return { success: true }
  } catch (error: any) {
    console.error('[DELETE_BOARD_ERROR]', error)
    return { success: false, error: error.message || 'Failed to delete board' }
  }
}

export async function createColumn(rawInput: any): Promise<ActionResult> {
  try {
    const validatedData = createColumnSchema.parse(rawInput)
    const { boardId, name, wipLimit } = validatedData

    const permission = await checkBoardPermission({ boardId, allowedRoles: ['ADMIN', 'MANAGER'] })
    if (!permission.success) return permission as any

    // Get current max order if not provided
    let order = validatedData.order
    if (order === undefined) {
      const lastColumn = await prisma.column.findFirst({
        where: { boardId },
        orderBy: { order: 'desc' }
      })
      order = lastColumn ? lastColumn.order + 1 : 0
    }

    const column = await prisma.column.create({
      data: {
        name,
        order,
        boardId,
        wipLimit
      }
    })

    await createAuditLog({
      userId: (permission as any).session.id,
      action: 'CREATE_COLUMN',
      details: { boardId, columnId: column.id, name },
    })

    emitBoardEvent('column:created', { boardId, columnId: column.id })

    revalidatePath(`/dashboard/board/${boardId}`)
    return { success: true, data: column }
  } catch (error: any) {
    console.error('[CREATE_COLUMN_ERROR]', error)
    if (error.name === 'ZodError') {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    return { success: false, error: error.message || 'Failed to create column' }
  }
}

export async function deleteColumn(input: { columnId: string, boardId: string, targetColumnId?: string }): Promise<ActionResult> {
  try {
    const { columnId, boardId, targetColumnId } = input
    const vColumnId = idSchema.parse(columnId)
    const vBoardId = idSchema.parse(boardId)
    const vTargetColumnId = targetColumnId ? idSchema.parse(targetColumnId) : undefined

    const permission = await checkBoardPermission({ boardId: vBoardId, allowedRoles: ['ADMIN', 'MANAGER'] })
    if (!permission.success) return permission as any

    const columnToDelete = await prisma.column.findUnique({
      where: { id: vColumnId },
      include: { tasks: { select: { id: true } } }
    })

    if (!columnToDelete) return { success: false, error: 'Column not found' }
    const movedTaskIds = columnToDelete.tasks.map(t => t.id)

    let finalTargetId = vTargetColumnId

    if (!finalTargetId) {
      const otherColumn = await prisma.column.findFirst({
        where: { boardId: vBoardId, id: { not: vColumnId } },
        orderBy: { order: 'asc' }
      })
      if (otherColumn) {
        finalTargetId = otherColumn.id
      }
    }

    if (finalTargetId) {
      // Move tasks to the target column
      await prisma.task.updateMany({
        where: { columnId: vColumnId },
        data: { columnId: finalTargetId }
      })
    } else {
      // If no other column exists, we can't delete the last column if it has tasks
      if (movedTaskIds.length > 0) {
        return { success: false, error: 'Cannot delete the only column when it contains tasks. Create another column first.' }
      }
    }

    await prisma.column.delete({
      where: { id: vColumnId }
    })

    await createAuditLog({
      userId: (permission as any).session.id,
      action: 'DELETE_COLUMN',
      details: { 
        boardId: vBoardId, 
        columnId: vColumnId, 
        name: columnToDelete.name,
        order: columnToDelete.order,
        wipLimit: columnToDelete.wipLimit,
        rehomedTo: finalTargetId,
        movedTaskIds
      },
    })

    emitBoardEvent('column:deleted', { boardId: vBoardId, columnId: vColumnId })

    revalidatePath(`/dashboard/board/${vBoardId}`)
    return { success: true }
  } catch (error: any) {
    console.error('[DELETE_COLUMN_ERROR]', error)
    return { success: false, error: error.message || 'Failed to delete column' }
  }
}

export async function updateColumn(rawInput: any): Promise<ActionResult> {
  try {
    const validatedData = updateColumnSchema.parse(rawInput)
    const { id, ...data } = validatedData

    const column = await prisma.column.findUnique({
      where: { id },
      select: { boardId: true }
    })

    if (!column) return { success: false, error: 'Column not found' }

    const permission = await checkBoardPermission({ boardId: column.boardId, allowedRoles: ['ADMIN', 'MANAGER'] })
    if (!permission.success) return permission as any

    const existingColumn = await prisma.column.findUnique({
      where: { id }
    })

    const updatedColumn = await prisma.column.update({
      where: { id },
      data
    })

    await createAuditLog({
      userId: (permission as any).session.id,
      action: 'UPDATE_COLUMN',
      details: { 
        boardId: column.boardId, 
        columnId: id, 
        previousState: existingColumn,
        updatedFields: Object.keys(data)
      },
    })

    emitBoardEvent('column:updated', { boardId: column.boardId, columnId: id })

    revalidatePath(`/dashboard/board/${column.boardId}`)
    return { success: true, data: updatedColumn }
  } catch (error: any) {
    console.error('[UPDATE_COLUMN_ERROR]', error)
    if (error.name === 'ZodError') {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    return { success: false, error: error.message || 'Failed to update column' }
  }
}

export async function updateColumnWipLimit(input: { columnId: string, wipLimit: number }): Promise<ActionResult> {
  try {
    const { columnId, wipLimit } = input
    const vColumnId = idSchema.parse(columnId)
    
    const column = await prisma.column.findUnique({
      where: { id: vColumnId },
      select: { boardId: true }
    })

    if (!column) return { success: false, error: 'Column not found' }

    const permission = await checkBoardPermission({ boardId: column.boardId, allowedRoles: ['ADMIN', 'MANAGER'] })
    if (!permission.success) return permission as any

    const existingColumn = await prisma.column.findUnique({
      where: { id: vColumnId },
      select: { wipLimit: true }
    })

    const updatedColumn = await prisma.column.update({
      where: { id: vColumnId },
      data: { wipLimit }
    })

    await createAuditLog({
      userId: (permission as any).session.id,
      action: 'UPDATE_COLUMN_WIP_LIMIT',
      details: { 
        boardId: column.boardId, 
        columnId, 
        previousWipLimit: existingColumn?.wipLimit,
        newWipLimit: wipLimit 
      },
    })

    emitBoardEvent('column:updated', { boardId: column.boardId, columnId })

    revalidatePath(`/dashboard/board/${column.boardId}`)
    return { success: true, data: updatedColumn }
  } catch (error: any) {
    console.error('[UPDATE_COLUMN_WIP_LIMIT_ERROR]', error)
    return { success: false, error: error.message || 'Failed to update WIP limit' }
  }
}

export async function reorderColumns(rawInput: any): Promise<ActionResult> {
  try {
    const { boardId, columnIds } = reorderColumnsSchema.parse(rawInput)

    const permission = await checkBoardPermission({ boardId, allowedRoles: ['ADMIN', 'MANAGER'] })
    if (!permission.success) return permission as any

    // Fetch current order for undo
    const existingColumns = await prisma.column.findMany({
      where: { boardId },
      orderBy: { order: 'asc' },
      select: { id: true }
    })
    const previousColumnIds = existingColumns.map(c => c.id)

    // Bulk update orders in a transaction
    await prisma.$transaction(
      columnIds.map((id: string, index: number) =>
        prisma.column.update({
          where: { id, boardId },
          data: { order: index }
        })
      )
    )

    await createAuditLog({
      userId: (permission as any).session.id,
      action: 'REORDER_COLUMNS',
      details: { boardId, columnIds, previousColumnIds },
    })

    emitBoardEvent('columns:reordered', { boardId, columnIds })

    revalidatePath(`/dashboard/board/${boardId}`)
    return { success: true }
  } catch (error: any) {
    console.error('[REORDER_COLUMNS_ERROR]', error)
    if (error.name === 'ZodError') {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    return { success: false, error: error.message || 'Failed to reorder columns' }
  }
}

export async function searchUsers(input: { query: string }): Promise<ActionResult> {
  try {
    const { query } = input
    const { query: vQuery } = searchUserSchema.parse({ query })
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: vQuery, mode: 'insensitive' } },
          { email: { contains: vQuery, mode: 'insensitive' } }
        ]
      },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true
      }
    })

    return { success: true, data: users }
  } catch (error: any) {
    console.error('[SEARCH_USERS_ERROR]', error)
    return { success: false, error: error.message || 'Failed to search users' }
  }
}

export async function addBoardMember(rawInput: any): Promise<ActionResult> {
  try {
    const { boardId, userId } = manageBoardMemberSchema.parse(rawInput)

    const permission = await checkBoardPermission({ boardId, allowedRoles: ['ADMIN', 'MANAGER'] })
    if (!permission.success) return permission as any

    await prisma.board.update({
      where: { id: boardId },
      data: {
        members: {
          connect: { id: userId }
        }
      }
    })

    await createAuditLog({
      userId: (permission as any).session.id,
      action: 'ADD_BOARD_MEMBER',
      details: { boardId, addedUserId: userId },
    })

    emitBoardEvent('board:member_added', { boardId, userId })

    revalidatePath(`/dashboard/board/${boardId}`)
    return { success: true }
  } catch (error: any) {
    console.error('[ADD_BOARD_MEMBER_ERROR]', error)
    if (error.name === 'ZodError') {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    return { success: false, error: error.message || 'Failed to add member' }
  }
}

export async function removeBoardMember(rawInput: any): Promise<ActionResult> {
  try {
    const { boardId, userId } = manageBoardMemberSchema.parse(rawInput)

    const permission = await checkBoardPermission({ boardId, allowedRoles: ['ADMIN', 'MANAGER'] })
    if (!permission.success) return permission as any

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { ownerId: true }
    })

    if (board && userId === board.ownerId) {
      return { success: false, error: 'Cannot remove the board owner' }
    }

    await prisma.board.update({
      where: { id: boardId },
      data: {
        members: {
          disconnect: { id: userId }
        }
      }
    })

    await createAuditLog({
      userId: (permission as any).session.id,
      action: 'REMOVE_BOARD_MEMBER',
      details: { boardId, removedUserId: userId },
    })

    emitBoardEvent('board:member_removed', { boardId, userId })

    revalidatePath(`/dashboard/board/${boardId}`)
    return { success: true }
  } catch (error: any) {
    console.error('[REMOVE_BOARD_MEMBER_ERROR]', error)
    if (error.name === 'ZodError') {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    return { success: false, error: error.message || 'Failed to remove member' }
  }
}

export async function createTag(rawInput: any): Promise<ActionResult> {
  try {
    const validatedData = createTagSchema.parse(rawInput)
    const { boardId, name, color } = validatedData
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }
    
    // Only admins can create global tags (no boardId)
    if (!boardId && session.role !== 'ADMIN') {
      return { success: false, error: 'Forbidden: Only admins can create global tags' }
    }

    if (boardId) {
      // Permission check for board-specific tags — only Admin and Manager can create tags
      const permission = await checkBoardPermission({ boardId, allowedRoles: ['ADMIN', 'MANAGER'] })
      if (!permission.success) return permission as any
    }

    const tag = await prisma.tag.create({
      data: { name, color, boardId }
    })

    await createAuditLog({
      userId: session.id,
      action: 'CREATE_TAG',
      details: { tagId: tag.id, name, color, boardId },
    })

    if (boardId) {
      emitBoardEvent('tag:created', { boardId, tagId: tag.id })
      revalidatePath(`/dashboard/board/${boardId}`)
    }
    
    return { success: true, data: tag }
  } catch (error: any) {
    console.error('[CREATE_TAG_ERROR]', error)
    if (error.name === 'ZodError') {
      return { success: false, error: 'Validation failed', fieldErrors: error.flatten().fieldErrors }
    }
    return { success: false, error: error.message || 'Failed to create tag' }
  }
}

export async function deleteTag(input: { tagId: string }): Promise<ActionResult> {
  try {
    const { tagId } = input
    const vTagId = idSchema.parse(tagId)
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }
    
    const tag = await prisma.tag.findUnique({ 
      where: { id: vTagId }
    })
    
    if (!tag) return { success: false, error: 'Tag not found' }

    if (tag.boardId) {
      const permission = await checkBoardPermission({ boardId: tag.boardId, allowedRoles: ['ADMIN', 'MANAGER'] })
      if (!permission.success) return permission as any
    } else {
      // Global tag deletion requires ADMIN
      if (session.role !== 'ADMIN') {
        return { success: false, error: 'Forbidden: Only admins can delete global tags' }
      }
    }

    await prisma.tag.delete({ where: { id: vTagId } })

    await createAuditLog({
      userId: session.id,
      action: 'DELETE_TAG',
      details: { 
        tagId: vTagId, 
        boardId: tag.boardId,
        name: tag.name,
        color: tag.color
      },
    })

    if (tag.boardId) {
      emitBoardEvent('tag:deleted', { boardId: tag.boardId, tagId: vTagId })
      revalidatePath(`/dashboard/board/${tag.boardId}`)
    }
    
    return { success: true }
  } catch (error: any) {
    console.error('[DELETE_TAG_ERROR]', error)
    return { success: false, error: error.message || 'Failed to delete tag' }
  }
}

export async function getTagsForBoard(input: { boardId: string }): Promise<ActionResult> {
  try {
    const { boardId } = input
    const vBoardId = idSchema.parse(boardId)
    const session = await getSession()
    if (!session) return { success: false, error: 'Unauthorized' }

    const board = await prisma.board.findUnique({
      where: { id: vBoardId },
      include: {
        tags: {
          include: {
            _count: { select: { tasks: true } }
          }
        },
        members: { select: { id: true } }
      }
    })

    if (!board) return { success: false, error: 'Board not found' }

    const isMember = board.members.some(m => m.id === session.id)
    const isAdmin = session.role === 'ADMIN'

    if (!isMember && !isAdmin) {
      return { success: false, error: 'Forbidden: You do not have access to this board\'s tags' }
    }

    const globalTags = await prisma.tag.findMany({
      where: { boardId: null },
      include: { _count: { select: { tasks: true } } }
    })

    return { success: true, data: [...board.tags, ...globalTags] }
  } catch (error: any) {
    console.error('[GET_TAGS_ERROR]', error)
    return { success: false, error: error.message || 'Failed to fetch tags' }
  }
}
export async function undoLastAction(): Promise<ActionResult> {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    // Cleanup: Delete audit logs older than 5 minutes for this user
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    await prisma.auditLog.deleteMany({
      where: {
        userId: session.id,
        createdAt: { lt: fiveMinutesAgo }
      }
    })

    // Find the most recent undoable action for this user within the last 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000)
    const lastAction = await prisma.auditLog.findFirst({
      where: {
        userId: session.id,
        createdAt: { gte: thirtySecondsAgo },
        action: {
          in: [
            'CREATE_TASK', 
            'DELETE_TASK', 
            'UPDATE_TASK',
            'UPDATE_TASK_STATUS', 
            'UPDATE_TASK_STATUS_OVERRIDE', 
            'CREATE_COLUMN', 
            'DELETE_COLUMN',
            'UPDATE_COLUMN',
            'UPDATE_COLUMN_WIP_LIMIT',
            'REORDER_COLUMNS',
            'DELETE_COMMENT',
            'DELETE_CHECKLIST_ITEM',
            'DELETE_ATTACHMENT',
            'COMPLETE_REVIEW',
            'ADD_TAG',
            'REMOVE_TAG',
            'TOGGLE_CHECKLIST_ITEM',
            'ADD_COMMENT',
            'ADD_CHECKLIST_ITEM',
            'UPDATE_CHECKLIST_ITEM',
            'ADD_ATTACHMENT'
          ]
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!lastAction) return { success: false, error: 'No recent actions to undo' }

    const details = lastAction.details as any
    const actionType = lastAction.action

    switch (actionType) {
      case 'CREATE_TASK': {
        await prisma.task.delete({ where: { id: details.taskId } })
        emitBoardEvent('task:deleted', { boardId: details.boardId, taskId: details.taskId })
        break
      }

      case 'DELETE_TASK': {
        const t = details.fullTask
        // Re-create the task
        const newTask = await prisma.task.create({
          data: {
            id: t.id,
            title: t.title,
            description: t.description,
            priority: t.priority,
            dueDate: t.dueDate,
            columnId: t.columnId,
            assigneeId: t.assigneeId,
            creatorId: t.creatorId,
            version: t.version,
            tags: {
              connect: t.tags?.map((tag: any) => ({ id: tag.id })) || []
            }
          }
        })

        // Re-create checklists
        if (t.checklists) {
          for (const cl of t.checklists) {
            await prisma.checklist.create({
              data: {
                id: cl.id,
                title: cl.title,
                taskId: newTask.id,
                items: {
                  create: cl.items?.map((item: any) => ({
                    id: item.id,
                    content: item.content,
                    isCompleted: item.isCompleted
                  })) || []
                }
              }
            })
          }
        }

        // Re-create attachments
        if (t.attachments) {
          await prisma.attachment.createMany({
            data: t.attachments.map((a: any) => ({
              id: a.id,
              name: a.name,
              url: a.url,
              type: a.type,
              size: a.size,
              taskId: newTask.id
            }))
          })
        }

        // Re-create comments
        if (t.comments && t.comments.length > 0) {
          await prisma.comment.createMany({
            data: t.comments.map((c: any) => ({
              id: c.id,
              content: c.content,
              taskId: newTask.id,
              userId: c.userId,
              createdAt: c.createdAt
            }))
          })
        }

        // Re-create time entries
        if (t.timeEntries && t.timeEntries.length > 0) {
          await prisma.timeEntry.createMany({
            data: t.timeEntries.map((te: any) => ({
              id: te.id,
              duration: te.duration,
              description: te.description,
              taskId: newTask.id,
              userId: te.userId,
              createdAt: te.createdAt
            }))
          })
        }

        // Re-create reviews
        if (t.reviews && t.reviews.length > 0) {
          await prisma.review.createMany({
            data: t.reviews.map((r: any) => ({
              id: r.id,
              status: r.status,
              feedback: r.feedback,
              taskId: newTask.id,
              reviewerId: r.reviewerId,
              createdAt: r.createdAt
            }))
          })
        }

        emitBoardEvent('task:created', { boardId: details.boardId, task: newTask })
        break
      }

      case 'UPDATE_TASK': {
        const s = details.previousState
        const updatedTask = await prisma.task.update({
          where: { id: details.taskId },
          data: {
            title: s.title,
            description: s.description,
            priority: s.priority,
            dueDate: s.dueDate,
            assigneeId: s.assigneeId,
            version: { increment: 1 }
          },
          include: { column: true }
        })
        emitBoardEvent('task:updated', { boardId: details.boardId, task: updatedTask })
        break
      }

      case 'UPDATE_TASK_STATUS':
      case 'UPDATE_TASK_STATUS_OVERRIDE': {
        const task = await prisma.task.update({
          where: { id: details.taskId },
          data: { columnId: details.previousColumnId, version: { increment: 1 } },
          include: { column: true }
        })
        emitBoardEvent('task:moved', { 
          boardId: details.boardId, 
          taskId: details.taskId, 
          columnId: details.previousColumnId, 
          previousColumnId: details.columnId,
          task 
        })
        break
      }

      case 'CREATE_COLUMN': {
        await prisma.column.delete({ where: { id: details.columnId } })
        emitBoardEvent('column:deleted', { boardId: details.boardId, columnId: details.columnId })
        break
      }

      case 'DELETE_COLUMN': {
        // Re-create column
        const newColumn = await prisma.column.create({
          data: {
            id: details.columnId,
            name: details.name,
            order: details.order,
            wipLimit: details.wipLimit,
            boardId: details.boardId
          }
        })

        // Move tasks back
        if (details.movedTaskIds?.length > 0) {
          await prisma.task.updateMany({
            where: { id: { in: details.movedTaskIds } },
            data: { columnId: newColumn.id }
          })
        }

        emitBoardEvent('column:created', { boardId: details.boardId, column: newColumn })
        break
      }

      case 'UPDATE_COLUMN': {
        const s = details.previousState
        await prisma.column.update({
          where: { id: details.columnId },
          data: {
            name: s.name,
            wipLimit: s.wipLimit
          }
        })
        emitBoardEvent('column:updated', { boardId: details.boardId, columnId: details.columnId })
        break
      }

      case 'UPDATE_COLUMN_WIP_LIMIT': {
        await prisma.column.update({
          where: { id: details.columnId },
          data: { wipLimit: details.previousWipLimit }
        })
        emitBoardEvent('column:updated', { boardId: details.boardId, columnId: details.columnId })
        break
      }

      case 'REORDER_COLUMNS': {
        const pIds = details.previousColumnIds
        await prisma.$transaction(
          pIds.map((id: string, index: number) =>
            prisma.column.update({
              where: { id, boardId: details.boardId },
              data: { order: index }
            })
          )
        )
        emitBoardEvent('columns:reordered', { boardId: details.boardId, columnIds: pIds })
        break
      }

      case 'DELETE_COMMENT': {
        await prisma.comment.create({
          data: {
            id: details.commentId,
            content: details.content,
            taskId: details.taskId,
            userId: details.commentUserId,
            createdAt: details.createdAt
          }
        })
        emitBoardEvent('task:updated', { boardId: details.boardId, taskId: details.taskId })
        break
      }

      case 'DELETE_CHECKLIST_ITEM': {
        await prisma.checklistItem.create({
          data: {
            id: details.itemId,
            content: details.content,
            checklistId: details.checklistId,
            isCompleted: false
          }
        })
        emitBoardEvent('task:updated', { boardId: details.boardId, taskId: details.taskId })
        break
      }

      case 'DELETE_ATTACHMENT': {
        await prisma.attachment.create({
          data: {
            id: details.attachmentId,
            name: details.name,
            url: details.url,
            type: details.type,
            size: details.size,
            taskId: details.taskId
          }
        })
        emitBoardEvent('task:updated', { boardId: details.boardId, taskId: details.taskId })
        break
      }

      case 'COMPLETE_REVIEW': {
        await prisma.review.update({
          where: { id: details.reviewId },
          data: { status: details.previousStatus }
        })
        emitBoardEvent('task:updated', { boardId: details.boardId, taskId: details.taskId })
        break
      }

      case 'ADD_TAG': {
        await prisma.task.update({
          where: { id: details.taskId },
          data: { tags: { disconnect: { id: details.tagId } }, version: { increment: 1 } }
        })
        emitBoardEvent('task:updated', { boardId: details.boardId, taskId: details.taskId })
        break
      }

      case 'REMOVE_TAG': {
        await prisma.task.update({
          where: { id: details.taskId },
          data: { tags: { connect: { id: details.tagId } }, version: { increment: 1 } }
        })
        emitBoardEvent('task:updated', { boardId: details.boardId, taskId: details.taskId })
        break
      }

      case 'TOGGLE_CHECKLIST_ITEM': {
        await prisma.checklistItem.update({
          where: { id: details.itemId },
          data: { isCompleted: !details.isCompleted }
        })
        emitBoardEvent('task:updated', { boardId: details.boardId, taskId: details.taskId })
        break
      }

      case 'ADD_COMMENT': {
        await prisma.comment.delete({ where: { id: details.commentId } })
        emitBoardEvent('task:updated', { boardId: details.boardId, taskId: details.taskId })
        break
      }

      case 'ADD_CHECKLIST_ITEM': {
        await prisma.checklistItem.delete({ where: { id: details.itemId } })
        emitBoardEvent('task:updated', { boardId: details.boardId, taskId: details.taskId })
        break
      }

      case 'UPDATE_CHECKLIST_ITEM': {
        await prisma.checklistItem.update({
          where: { id: details.itemId },
          data: { content: details.previousContent }
        })
        emitBoardEvent('task:updated', { boardId: details.boardId, taskId: details.taskId })
        break
      }

      case 'ADD_ATTACHMENT': {
        await prisma.attachment.delete({ where: { id: details.attachmentId } })
        emitBoardEvent('task:updated', { boardId: details.boardId, taskId: details.taskId })
        break
      }

      case 'UPDATE_BOARD': {
        await prisma.board.update({
          where: { id: details.boardId },
          data: {
            name: details.previousName,
            description: details.previousDescription
          }
        })
        emitBoardEvent('board:updated', { boardId: details.boardId, name: details.previousName })
        break
      }

      case 'ADD_BOARD_MEMBER': {
        await prisma.board.update({
          where: { id: details.boardId },
          data: {
            members: {
              disconnect: { id: details.addedUserId }
            }
          }
        })
        emitBoardEvent('board:member_removed', { boardId: details.boardId, userId: details.addedUserId })
        break
      }

      case 'REMOVE_BOARD_MEMBER': {
        await prisma.board.update({
          where: { id: details.boardId },
          data: {
            members: {
              connect: { id: details.removedUserId }
            }
          }
        })
        emitBoardEvent('board:member_added', { boardId: details.boardId, userId: details.removedUserId })
        break
      }

      case 'CREATE_TAG': {
        await prisma.tag.delete({ where: { id: details.tagId } })
        if (details.boardId) {
          emitBoardEvent('tag:deleted', { boardId: details.boardId, tagId: details.tagId })
        }
        break
      }

      case 'DELETE_TAG': {
        await prisma.tag.create({
          data: {
            id: details.tagId,
            name: details.name,
            color: details.color,
            boardId: details.boardId
          }
        })
        if (details.boardId) {
          emitBoardEvent('tag:created', { boardId: details.boardId, tagId: details.tagId })
        }
        break
      }

      case 'LOG_TIME': {
        await prisma.timeEntry.delete({ where: { id: details.entryId } })
        emitBoardEvent('task:updated', { boardId: details.boardId, taskId: details.taskId })
        break
      }

      case 'SUBMIT_REVIEW': {
        await prisma.review.delete({ where: { id: details.reviewId } })
        emitBoardEvent('task:updated', { boardId: details.boardId, taskId: details.taskId })
        break
      }
    }

    // Log the undo action (keep original audit log for traceability)
    await createAuditLog({
      userId: session.id,
      action: 'UNDO',
      details: {
        originalAction: lastAction.action,
        originalActionId: lastAction.id,
        boardId: details.boardId,
        taskId: details.taskId,
      },
    })

    revalidatePath(`/dashboard/board/${details.boardId}`)
    return { success: true }
  } catch (error: any) {
    console.error('[UNDO_ACTION_ERROR]', error)
    return { success: false, error: 'Failed to undo action: ' + error.message }
  }
}
