import { prisma } from '@/lib/prisma'
import { executeTrigger } from './triggers'
import { executeAction } from './actions'

export interface AutomationTrigger {
  type: 'TASK_MOVED' | 'TASK_ASSIGNED' | 'PRIORITY_CHANGED' | 'TASK_STALLED'
  value?: string | number
}

export interface AutomationCondition {
  field: 'priority' | 'assigneeId' | 'columnId' | 'label' | 'daysSinceLastMove'
  operator: 'EQ' | 'NEQ' | 'CONTAINS' | 'GT' | 'LT' | 'GTE' | 'LTE'
  value: string | number
}

export interface AutomationAction {
  type: 'NOTIFY_USER' | 'NOTIFY_ROLE' | 'AUTO_ASSIGN' | 'CHANGE_PRIORITY' | 'ADD_LABEL'
  target?: string
  value?: string
}

export interface AutomationRule {
  id: string
  boardId: string
  name: string
  enabled: boolean
  trigger: AutomationTrigger
  condition?: AutomationCondition
  action: AutomationAction
}

/**
 * Evaluate and execute automation rules for a given event
 * @param boardId - The board ID
 * @param eventType - The type of event that occurred
 * @param taskData - The task data related to the event
 * @param actorId - The user who triggered the event
 */
export async function evaluateAutomations(
  boardId: string,
  eventType: string,
  taskData: any,
  actorId: string
) {
  try {
    // Fetch all enabled automation rules for the board
    const rules = await prisma.automationRule.findMany({
      where: {
        boardId,
        enabled: true,
      },
    })

    if (rules.length === 0) {
      return { fired: [] }
    }

    const firedRules: Array<{ ruleId: string; ruleName: string; action: any }> = []

    // Evaluate each rule
    for (const rule of rules) {
      try {
        const trigger = JSON.parse(rule.trigger) as AutomationTrigger
        const condition = rule.condition ? JSON.parse(rule.condition) as AutomationCondition : null
        const action = JSON.parse(rule.action) as AutomationAction

        // Check if trigger matches
        const triggerMatches = await executeTrigger(trigger, eventType, taskData)
        if (!triggerMatches) {
          continue
        }

        // Check if condition matches (if present)
        if (condition) {
          const conditionMatches = await evaluateCondition(condition, taskData)
          if (!conditionMatches) {
            continue
          }
        }

        // Execute the action
        await executeAction(action, taskData, rule.boardId, actorId)

        // Update lastFiredAt
        await prisma.automationRule.update({
          where: { id: rule.id },
          data: { lastFiredAt: new Date() },
        })

        // Log the automation firing
        await prisma.auditLog.create({
          data: {
            action: 'AUTOMATION_FIRED',
            entityType: 'AutomationRule',
            entityId: rule.id,
            actorId,
            boardId,
            changes: JSON.stringify({
              ruleName: rule.name,
              trigger: {
                type: trigger.type,
                value: trigger.value,
              },
              action: {
                type: action.type,
                target: action.target,
                value: action.value,
              },
            }),
          },
        })

        firedRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          action,
        })
      } catch (error) {
        console.error(`Error evaluating automation rule ${rule.id}:`, error)
      }
    }

    return { fired: firedRules }
  } catch (error) {
    console.error('Error in automation engine:', error)
    return { fired: [] }
  }
}

/**
 * Evaluate a condition against task data
 */
async function evaluateCondition(condition: AutomationCondition, taskData: any): Promise<boolean> {
  const { field, operator, value } = condition
  const taskValue = getTaskFieldValue(taskData, field)

  switch (operator) {
    case 'EQ':
      return taskValue === value
    case 'NEQ':
      return taskValue !== value
    case 'CONTAINS':
      return Array.isArray(taskValue) ? taskValue.includes(value) : String(taskValue).includes(String(value))
    case 'GT':
      return Number(taskValue) > Number(value)
    case 'LT':
      return Number(taskValue) < Number(value)
    case 'GTE':
      return Number(taskValue) >= Number(value)
    case 'LTE':
      return Number(taskValue) <= Number(value)
    default:
      return false
  }
}

/**
 * Get a field value from task data
 */
function getTaskFieldValue(task: any, field: string): any {
  switch (field) {
    case 'priority':
      return task.priority
    case 'assigneeId':
      return task.assigneeId
    case 'columnId':
      return task.columnId
    case 'label':
      return task.labels || []
    case 'daysSinceLastMove':
      if (!task.lastMovedAt) return 999
      const daysSince = Math.floor((Date.now() - new Date(task.lastMovedAt).getTime()) / (1000 * 60 * 60 * 24))
      return daysSince
    default:
      return null
  }
}
