'use server'

import prisma from '@/lib/prisma'
import { emitNotification } from '@/lib/socket-emitter'

type Trigger = 'TASK_CREATED' | 'TASK_MOVED' | 'TASK_UPDATED' | 'TASK_ASSIGNED'
type Action = 'SEND_NOTIFICATION' | 'MOVE_TASK' | 'SET_PRIORITY' | 'ADD_TAG'

interface AutomationRule {
  id: string
  name: string
  trigger: string
  condition: string | null
  action: string
  enabled: boolean
  boardId: string | null
}

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

async function executeAction(action: string, context: TaskContext, rule: AutomationRule): Promise<void> {
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
    await prisma.task.update({
      where: { id: context.taskId },
      data: {
        columnId: targetColumn.id,
        version: { increment: 1 }
      }
    })
  }
}

async function handleSetPriority(params: string, context: TaskContext): Promise<void> {
  const priority = params.replace('priority:', '').toUpperCase()
  
  if (['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
    await prisma.task.update({
      where: { id: context.taskId },
      data: {
        priority: priority as any,
        version: { increment: 1 }
      }
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

  await prisma.task.update({
    where: { id: context.taskId },
    data: {
      tags: { connect: { id: tag.id } }
    }
  })
}