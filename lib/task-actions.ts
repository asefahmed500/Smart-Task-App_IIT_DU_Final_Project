'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

type Role = 'ADMIN' | 'MANAGER' | 'MEMBER'

async function checkTaskPermission(taskId: string, action: 'update' | 'delete') {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      column: { 
        include: { 
          board: {
            include: {
              members: { select: { id: true } }
            }
          } 
        } 
      },
      assignee: true
    }
  })

  if (!task) throw new Error('Task not found')

  const board = task.column.board
  const role = session.role as Role

  if (role === 'ADMIN') return true

  const isMember = board.members.some(m => m.id === session.id)
  if (!isMember) throw new Error('Not a member of this board')

  if (role === 'MANAGER') return true

  if (role === 'MEMBER') {
    if (task.assigneeId !== session.id && task.creatorId !== session.id) {
      throw new Error('You can only edit/delete tasks assigned to you or created by you')
    }
    return true
  }

  throw new Error('Unauthorized')
}

async function checkBoardPermission(columnId: string, action: 'create') {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const column = await prisma.column.findUnique({
    where: { id: columnId },
    include: { board: { include: { members: { select: { id: true } } } } }
  })

  if (!column) throw new Error('Column not found')

  const board = column.board
  const role = session.role as Role

  if (role === 'ADMIN') return true

  const isMember = board.members.some(m => m.id === session.id)
  if (!isMember) throw new Error('Not a member of this board')

  if (role === 'MANAGER') return true

  if (role === 'MEMBER') {
    return true
  }

  throw new Error('Unauthorized')
}

export async function updateTaskStatus(taskId: string, newColumnId: string, newStatusName: string, clientVersion?: number) {
  await checkTaskPermission(taskId, 'update')
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  if (clientVersion !== undefined) {
    const currentTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: { version: true }
    })
    if (currentTask && currentTask.version !== clientVersion) {
      throw new Error('Conflict: Task was modified by another user. Please refresh and try again.')
    }
  }

  const targetColumn = await prisma.column.findUnique({
    where: { id: newColumnId },
    select: { wipLimit: true, board: { include: { members: { select: { id: true } } } } }
  })

  if (!targetColumn) throw new Error('Column not found')

  const role = session.role as Role
  const isManagerOrAdmin = role === 'ADMIN' || role === 'MANAGER'

  if (targetColumn.wipLimit > 0 && !isManagerOrAdmin) {
    const currentTaskCount = await prisma.task.count({
      where: { columnId: newColumnId, id: { not: taskId } }
    })

    if (currentTaskCount >= targetColumn.wipLimit) {
      throw new Error(`WIP limit exceeded (${currentTaskCount}/${targetColumn.wipLimit}). Contact a manager to override.`)
    }
  }

  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
    select: { columnId: true, title: true }
  })
  const oldColumnId = existingTask?.columnId || ''

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { 
      columnId: newColumnId,
      updatedAt: new Date(),
      version: { increment: 1 }
    },
    include: {
      column: true
    }
  })

  const currentTaskCount = await prisma.task.count({
    where: { columnId: newColumnId }
  })
  const wasOverride = targetColumn.wipLimit > 0 && currentTaskCount > targetColumn.wipLimit

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: wasOverride ? 'UPDATE_TASK_STATUS_OVERRIDE' : 'UPDATE_TASK_STATUS',
      details: { 
        taskId, 
        newStatus: newStatusName,
        columnId: newColumnId,
        wipLimit: targetColumn.wipLimit,
        taskCountAfter: currentTaskCount,
        override: wasOverride
      },
    }
  })

  if (task.assigneeId && task.assigneeId !== session.id) {
    await prisma.notification.create({
      data: {
        userId: task.assigneeId,
        type: 'TASK_STATUS_CHANGED',
        message: `Task "${task.title}" moved to ${newStatusName}`,
        link: `/dashboard/board/${task.columnId}`
      }
    })
  }

  if (task.creatorId && task.creatorId !== session.id && task.creatorId !== task.assigneeId) {
    await prisma.notification.create({
      data: {
        userId: task.creatorId,
        type: 'TASK_STATUS_CHANGED',
        message: `Task "${task.title}" moved to ${newStatusName}`,
        link: `/dashboard/board/${task.columnId}`
      }
    })
  }

  revalidatePath('/admin/reports')
  revalidatePath('/dashboard')
  return task
}

import { Priority } from '../generated/prisma/enums'

export async function createTask(data: { title: string, description?: string, priority: Priority, columnId: string, assigneeId?: string }) {
  await checkBoardPermission(data.columnId, 'create')
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const role = session.role as Role
  let assigneeId = data.assigneeId

  if (role === 'MEMBER' && !assigneeId) {
    assigneeId = session!.id
  }

  const task = await prisma.task.create({
    data: {
      ...data,
      ...(assigneeId && { assigneeId }),
      creatorId: session!.id
    }
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'CREATE_TASK',
      details: { taskId: task.id, title: task.title },
    }
  })

  revalidatePath('/dashboard')
  return task
}

export async function deleteTask(taskId: string) {
  await checkTaskPermission(taskId, 'delete')
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  await prisma.task.delete({
    where: { id: taskId }
  })

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'DELETE_TASK',
      details: { taskId },
    }
  })

  revalidatePath('/dashboard')
}

export async function getTaskDetails(taskId: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: true,
      creator: true,
      column: true,
      comments: {
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      },
      attachments: true,
      checklists: {
        include: { items: { orderBy: { id: 'asc' } } }
      }
    }
  })

  return task
}

export async function updateTask(taskId: string, data: any) {
  await checkTaskPermission(taskId, 'update')
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
    select: { assigneeId: true, title: true, columnId: true }
  })

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...data,
      version: { increment: 1 }
    }
  })

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'UPDATE_TASK',
      details: { taskId, updatedFields: Object.keys(data) },
    }
  })

  if (data.assigneeId !== undefined && data.assigneeId !== existingTask?.assigneeId && data.assigneeId !== null) {
    await prisma.notification.create({
      data: {
        userId: data.assigneeId,
        type: 'TASK_ASSIGNED',
        message: `You have been assigned to task: ${existingTask?.title || task.title}`,
        link: `/dashboard/board/${existingTask?.columnId}`
      }
    })
  }

  revalidatePath('/dashboard')
  return task
}

export async function addComment(taskId: string, content: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const comment = await prisma.comment.create({
    data: {
      content,
      taskId,
      userId: session.id
    },
    include: {
      user: true
    }
  })

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'ADD_COMMENT',
      details: { taskId, commentId: comment.id },
    }
  })

  const mentionRegex = /@(\w+)/g
  const mentions = content.match(mentionRegex)
  
  if (mentions) {
    const mentionedNames = mentions.map(m => m.slice(1))
    const mentionedUsers = await prisma.user.findMany({
      where: { name: { in: mentionedNames } }
    })

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true, column: { select: { boardId: true } } }
    })

    for (const user of mentionedUsers) {
      if (user.id !== session.id) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'COMMENT_MENTION',
            message: `${session.name || 'Someone'} mentioned you in a comment on task: ${task?.title}`,
            link: `/dashboard/board/${task?.column.boardId}`
          }
        })
      }
    }
  }

  revalidatePath('/dashboard')
  return comment
}

export async function deleteComment(commentId: string, taskId: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { task: { include: { column: { include: { board: { include: { members: { select: { id: true } } } } } } } } }
  })

  if (!comment) throw new Error('Comment not found')

  const role = session.role as Role
  const task = comment.task
  const board = task.column.board

  if (role === 'ADMIN') {
    // Admin can delete any comment
  } else if (role === 'MANAGER') {
    const isBoardMember = board.members.some(m => m.id === session.id)
    if (!isBoardMember) throw new Error('Not a member of this board')
  } else {
    // Member: can only delete own comment within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    if (comment.userId !== session.id) {
      throw new Error('You can only delete your own comments')
    }
    if (comment.createdAt < fiveMinutesAgo) {
      throw new Error('You can only delete comments within 5 minutes')
    }
  }

  await prisma.comment.delete({ where: { id: commentId } })

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'DELETE_COMMENT',
      details: { commentId, taskId },
    }
  })

  revalidatePath('/dashboard')
}

export async function addChecklistItem(taskId: string, content: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  // Find or create checklist
  let checklist = await prisma.checklist.findFirst({
    where: { taskId }
  })

  if (!checklist) {
    checklist = await prisma.checklist.create({
      data: {
        taskId,
        title: 'Task Checklist'
      }
    })
  }

  const item = await prisma.checklistItem.create({
    data: {
      content,
      checklistId: checklist.id
    }
  })

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'ADD_CHECKLIST_ITEM',
      details: { taskId, itemId: item.id },
    }
  })

  revalidatePath('/dashboard')
  return item
}

export async function toggleChecklistItem(itemId: string, isCompleted: boolean) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const item = await prisma.checklistItem.update({
    where: { id: itemId },
    data: { isCompleted }
  })

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'TOGGLE_CHECKLIST_ITEM',
      details: { itemId, isCompleted },
    }
  })

  revalidatePath('/dashboard')
  return item
}

export async function deleteChecklistItem(itemId: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  await prisma.checklistItem.delete({
    where: { id: itemId }
  })

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'DELETE_CHECKLIST_ITEM',
      details: { itemId },
    }
  })

  revalidatePath('/dashboard')
}

export async function updateChecklistItem(itemId: string, content: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  await prisma.checklistItem.update({
    where: { id: itemId },
    data: { content }
  })

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'UPDATE_CHECKLIST_ITEM',
      details: { itemId, content },
    }
  })

  revalidatePath('/dashboard')
}

export async function getAllUsers() {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  if (session.role !== 'ADMIN') throw new Error('Only admins can view all users')

  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true
    },
    orderBy: { name: 'asc' }
  })
}

export async function addAttachment(taskId: string, data: { name: string, url: string, type: string, size: number }) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const attachment = await prisma.attachment.create({
    data: {
      ...data,
      taskId
    }
  })

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'ADD_ATTACHMENT',
      details: { taskId, attachmentId: attachment.id, name: data.name },
    }
  })

  revalidatePath('/dashboard')
  return attachment
}

export async function getTaskActivityLog(taskId: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const logs = await prisma.auditLog.findMany({
    where: {
      details: { path: ['taskId'], equals: taskId }
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      user: {
        select: { id: true, name: true, image: true, email: true }
      }
    }
  })

  return logs
}
