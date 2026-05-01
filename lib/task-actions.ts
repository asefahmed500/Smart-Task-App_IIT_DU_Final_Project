'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function updateTaskStatus(taskId: string, newColumnId: string, newStatusName: string) {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { 
      columnId: newColumnId,
      updatedAt: new Date()
    },
    include: {
      column: true
    }
  })

  // Create audit log for reporting
  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'UPDATE_TASK_STATUS',
      details: { 
        taskId, 
        newStatus: newStatusName,
        columnId: newColumnId
      },
    }
  })

  revalidatePath('/admin/reports')
  revalidatePath('/dashboard')
  return task
}

import { Priority } from '../generated/prisma/enums'

export async function createTask(data: { title: string, description?: string, priority: Priority, columnId: string, assigneeId?: string }) {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }

  const task = await prisma.task.create({
    data: {
      ...data,
      creatorId: session.id
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
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }

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
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const task = await prisma.task.update({
    where: { id: taskId },
    data
  })

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'UPDATE_TASK',
      details: { taskId, updatedFields: Object.keys(data) },
    }
  })

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

  revalidatePath('/dashboard')
  return comment
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
