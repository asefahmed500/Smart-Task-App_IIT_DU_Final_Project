'use server'

import prisma from '@/lib/prisma'
import { emitNotification, emitBoardEvent } from '@/lib/socket-emitter'
import { Priority } from '@/lib/prisma'
import { getSession } from '@/lib/auth-server'
import { revalidatePath } from 'next/cache'
import { createAutomationRuleSchema, updateAutomationRuleSchema, idSchema } from './schemas'
import { ActionResult } from '@/types/kanban'

export type Trigger = 'TASK_CREATED' | 'TASK_MOVED' | 'TASK_UPDATED' | 'TASK_ASSIGNED'
export type Action = 'SEND_NOTIFICATION' | 'MOVE_TASK' | 'SET_PRIORITY' | 'ADD_TAG'

interface TaskContext {
  taskId: string
  taskTitle: string
  columnId: string
  columnName: string
  boardId: string
  priority: string
  assigneeId: string | null
  previousColumnId?: string
}

// Internal evaluation logic (keep as is but exported for task-actions)
export async function evaluateAutomationRules(
  trigger: Trigger,
  context: TaskContext
): Promise<void> {
  const rules = await prisma.automationRule.findMany({
    where: {
      enabled: true,
      trigger: trigger,
      OR: [
        { boardId: null },
        { boardId: context.boardId }
      ]
    }
  })

  for (const rule of rules) {
    try {
      const matchesCondition = !rule.condition || evaluateCondition(rule.condition, context)
      
      if (matchesCondition) {
        await executeAction(rule.action, context, rule)
        
        await prisma.auditLog.create({
          data: {
            userId: 'system',
            action: 'AUTOMATION_EXECUTED',
            details: {
              ruleId: rule.id,
              ruleName: rule.name,
              trigger,
              taskId: context.taskId,
              action: rule.action,
              boardId: context.boardId
            }
          }
        })
      }
    } catch (error) {
      console.error(`Failed to execute rule ${rule.id}:`, error)
    }
  }
}

function evaluateCondition(condition: string, context: TaskContext): boolean {
  try {
    const conditionMap: Record<string, () => boolean> = {
      'priority=HIGH': () => context.priority === 'HIGH',
      'priority=URGENT': () => context.priority === 'URGENT',
      'priority=MEDIUM': () => context.priority === 'MEDIUM',
      'priority=LOW': () => context.priority === 'LOW',
      'assignee=null': () => context.assigneeId === null,
      'assignee!=null': () => context.assigneeId !== null,
      'column=In Progress': () => context.columnName.toLowerCase().includes('progress'),
      'column=Done': () => context.columnName.toLowerCase().includes('done'),
      'column=To Do': () => context.columnName.toLowerCase().includes('todo') || context.columnName.toLowerCase().includes('to do'),
    }

    const evaluator = conditionMap[condition]
    return evaluator ? evaluator() : true
  } catch {
    return true
  }
}

async function executeAction(action: string, context: TaskContext, rule: any): Promise<void> {
  const actionParts = action.split(':')
  const actionType = actionParts[0] as Action
  const actionParams = actionParts.slice(1).join(':')

  switch (actionType) {
    case 'SEND_NOTIFICATION':
      await handleSendNotification(actionParams, context, rule.name)
      break
    case 'MOVE_TASK':
      await handleMoveTask(actionParams, context)
      break
    case 'SET_PRIORITY':
      await handleSetPriority(actionParams, context)
      break
    case 'ADD_TAG':
      await handleAddTag(actionParams, context)
      break
  }
}

// Helper handlers (keep as is)
async function handleSendNotification(params: string, context: TaskContext, ruleName: string): Promise<void> {
  const targetEmail = params.replace('email:', '') || 'manager'
  
  const board = await prisma.board.findUnique({
    where: { id: context.boardId },
    include: { members: true, owner: true }
  })
  
  let notifyUserId: string | undefined
  
  if (targetEmail === 'manager' && board) {
    const manager = board.members.find(m => m.role === 'MANAGER') || board.owner
    notifyUserId = manager.id
  } else if (targetEmail === 'assignee' && context.assigneeId) {
    notifyUserId = context.assigneeId
  } else if (targetEmail === 'creator') {
    const task = await prisma.task.findUnique({
      where: { id: context.taskId },
      select: { creatorId: true }
    })
    notifyUserId = task?.creatorId
  }

  if (notifyUserId) {
    const notification = await prisma.notification.create({
      data: {
        userId: notifyUserId,
        type: 'AUTOMATION_TRIGGERED',
        message: `Automation rule "${ruleName}" triggered: ${context.taskTitle}`,
        link: `/dashboard/board/${context.boardId}`
      }
    })
    emitNotification({
      userId: notifyUserId,
      type: 'AUTOMATION_TRIGGERED',
      message: `Automation rule "${ruleName}" triggered: ${context.taskTitle}`,
      link: `/dashboard/board/${context.boardId}`,
      notificationId: notification.id
    })
  }
}

async function handleMoveTask(params: string, context: TaskContext): Promise<void> {
  const targetColumnName = params.replace('column:', '')
  
  const targetColumn = await prisma.column.findFirst({
    where: {
      boardId: context.boardId,
      name: { contains: targetColumnName, mode: 'insensitive' }
    }
  })

  if (targetColumn && targetColumn.id !== context.columnId) {
    const updatedTask = await prisma.task.update({
      where: { id: context.taskId },
      data: {
        columnId: targetColumn.id,
        version: { increment: 1 }
      },
      include: { column: true }
    })

    // Real-time update for automation move
    emitBoardEvent('task:moved', {
      boardId: context.boardId,
      taskId: context.taskId,
      columnId: targetColumn.id,
      previousColumnId: context.columnId,
      task: updatedTask
    })
  }
}

async function handleSetPriority(params: string, context: TaskContext): Promise<void> {
  const priority = params.replace('priority:', '').toUpperCase()
  
  if (['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
    const updatedTask = await prisma.task.update({
      where: { id: context.taskId },
      data: {
        priority: priority as Priority,
        version: { increment: 1 }
      },
      include: { column: true }
    })

    // Real-time update for automation priority change
    emitBoardEvent('task:updated', {
      boardId: context.boardId,
      task: updatedTask
    })
  }
}

async function handleAddTag(params: string, context: TaskContext): Promise<void> {
  const tagName = params.replace('tag:', '')
  
  let tag = await prisma.tag.findFirst({
    where: { name: tagName, boardId: context.boardId }
  })

  if (!tag) {
    tag = await prisma.tag.create({
      data: { name: tagName, color: '#888888', boardId: context.boardId }
    })
  }

  const updatedTask = await prisma.task.update({
    where: { id: context.taskId },
    data: {
      tags: { connect: { id: tag.id } },
      version: { increment: 1 }
    },
    include: { column: true }
  })

  // Real-time update for automation tag add
  emitBoardEvent('task:updated', {
    boardId: context.boardId,
    task: updatedTask
  })
}

// --- NEW PUBLIC ACTIONS ---

async function checkAutomationPermission(boardId: string | null) {
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  if (session.role === 'ADMIN') return { success: true, session }

  if (!boardId) {
    return { success: false, error: 'Only administrators can manage system-wide rules' }
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      members: {
        where: { id: session.id },
        select: { id: true, role: true }
      }
    }
  })

  if (!board) return { success: false, error: 'Board not found' }

  const isOwner = board.ownerId === session.id
  const userRole = session.role as string
  const isMember = board.members.length > 0

  if (!isOwner && !isMember) {
    return { success: false, error: 'Forbidden: You are not a member of this board' }
  }

  const effectiveRole = isOwner ? 'MANAGER' : (board.members[0]?.role || 'MEMBER')

  if (effectiveRole !== 'MANAGER' && effectiveRole !== 'ADMIN' && userRole !== 'MANAGER' && userRole !== 'ADMIN') {
    return { success: false, error: 'Insufficient permissions' }
  }

  return { success: true, session }

}

export async function getAutomationRules(input?: { boardId?: string }): Promise<ActionResult> {
  const boardId = input?.boardId
  const session = await getSession()
  if (!session) return { success: false, error: 'Unauthorized' }

  try {
    const rules = await prisma.automationRule.findMany({
      where: boardId ? { boardId } : { boardId: null },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, data: rules }
  } catch (error) {
    return { success: false, error: 'Failed to fetch automation rules' }
  }
}

export async function createAutomationRule(data: any): Promise<ActionResult> {
  const validation = createAutomationRuleSchema.safeParse(data)
  if (!validation.success) {
    return { success: false, error: 'Validation failed', fieldErrors: validation.error.flatten().fieldErrors }
  }

  const perm = await checkAutomationPermission(validation.data.boardId || null)
  if (!perm.success) return perm

  try {
    const rule = await prisma.automationRule.create({
      data: validation.data
    })

    await prisma.auditLog.create({
      data: {
        userId: perm.session!.id,
        action: 'CREATE_AUTOMATION_RULE',
        details: { ruleId: rule.id, name: rule.name, boardId: rule.boardId }
      }
    })

    if (rule.boardId) revalidatePath(`/dashboard/board/${rule.boardId}`)
    return { success: true, data: rule }
  } catch (error) {
    return { success: false, error: 'Failed to create automation rule' }
  }
}

export async function updateAutomationRule(data: any): Promise<ActionResult> {
  const validation = updateAutomationRuleSchema.safeParse(data)
  if (!validation.success) {
    return { success: false, error: 'Validation failed', fieldErrors: validation.error.flatten().fieldErrors }
  }

  try {
    const existingRule = await prisma.automationRule.findUnique({
      where: { id: validation.data.id }
    })
    if (!existingRule) return { success: false, error: 'Rule not found' }

    const perm = await checkAutomationPermission(existingRule.boardId)
    if (!perm.success) return perm

    const rule = await prisma.automationRule.update({
      where: { id: validation.data.id },
      data: validation.data
    })

    await prisma.auditLog.create({
      data: {
        userId: perm.session!.id,
        action: 'UPDATE_AUTOMATION_RULE',
        details: { ruleId: rule.id, changes: validation.data }
      }
    })

    if (rule.boardId) revalidatePath(`/dashboard/board/${rule.boardId}`)
    return { success: true, data: rule }
  } catch (error) {
    return { success: false, error: 'Failed to update automation rule' }
  }
}

export async function deleteAutomationRule(input: { id: string }): Promise<ActionResult> {
  const { id } = input
  const validation = idSchema.safeParse(id)
  if (!validation.success) return { success: false, error: 'Invalid ID' }

  try {
    const existingRule = await prisma.automationRule.findUnique({
      where: { id }
    })
    if (!existingRule) return { success: false, error: 'Rule not found' }

    const perm = await checkAutomationPermission(existingRule.boardId)
    if (!perm.success) return perm

    await prisma.automationRule.delete({
      where: { id }
    })

    await prisma.auditLog.create({
      data: {
        userId: perm.session!.id,
        action: 'DELETE_AUTOMATION_RULE',
        details: { ruleId: id, name: existingRule.name, boardId: existingRule.boardId }
      }
    })

    if (existingRule.boardId) revalidatePath(`/dashboard/board/${existingRule.boardId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete automation rule' }
  }
}

export async function toggleAutomationRule(input: { id: string, enabled: boolean }): Promise<ActionResult> {
  const { id, enabled } = input
  const validation = idSchema.safeParse(id)
  if (!validation.success) return { success: false, error: 'Invalid ID' }

  try {
    const existingRule = await prisma.automationRule.findUnique({
      where: { id }
    })
    if (!existingRule) return { success: false, error: 'Rule not found' }

    const perm = await checkAutomationPermission(existingRule.boardId)
    if (!perm.success) return perm

    const rule = await prisma.automationRule.update({
      where: { id },
      data: { enabled }
    })

    await prisma.auditLog.create({
      data: {
        userId: perm.session!.id,
        action: 'TOGGLE_AUTOMATION_RULE',
        details: { ruleId: rule.id, enabled }
      }
    })

    if (rule.boardId) revalidatePath(`/dashboard/board/${rule.boardId}`)
    return { success: true, data: rule }
  } catch (error) {
    return { success: false, error: 'Failed to toggle automation rule' }
  }
}

