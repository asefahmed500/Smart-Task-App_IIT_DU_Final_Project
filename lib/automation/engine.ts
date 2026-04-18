import { prisma } from '@/lib/prisma'
import { executeTrigger } from './triggers'
import { executeAction } from './actions'

export interface AutomationTrigger {
  type: 'TASK_MOVED' | 'TASK_ASSIGNED' | 'PRIORITY_CHANGED' | 'TASK_STALLED'
  value?: string | number
}

// Whitelisted fields for automation conditions to prevent injection
export const ALLOWED_CONDITION_FIELDS = [
  'priority',
  'assigneeId',
  'columnId',
  'label',
  'daysSinceLastMove',
  'title',
  'description',
] as const

// Whitelisted operators for automation conditions
export const ALLOWED_CONDITION_OPERATORS = [
  'EQ',
  'NEQ',
  'CONTAINS',
  'GT',
  'LT',
  'GTE',
  'LTE',
  'EMPTY',
  'NOT_EMPTY',
] as const

export interface AutomationCondition {
  field: typeof ALLOWED_CONDITION_FIELDS[number]
  operator: typeof ALLOWED_CONDITION_OPERATORS[number]
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
        const trigger = JSON.parse(rule.trigger as string) as AutomationTrigger
        const condition = rule.condition ? JSON.parse(rule.condition as string) as AutomationCondition : null
        const action = JSON.parse(rule.action as string) as AutomationAction

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
 * Evaluate a condition against task data with security validation
 */
async function evaluateCondition(condition: AutomationCondition, taskData: any): Promise<boolean> {
  const { field, operator, value } = condition

  // Security: Validate field and operator against whitelist
  if (!ALLOWED_CONDITION_FIELDS.includes(field as any)) {
    console.error(`[Security] Invalid automation condition field: ${field}`)
    return false
  }

  if (!ALLOWED_CONDITION_OPERATORS.includes(operator as any)) {
    console.error(`[Security] Invalid automation condition operator: ${operator}`)
    return false
  }

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
    case 'EMPTY':
      return !taskValue || (Array.isArray(taskValue) && taskValue.length === 0)
    case 'NOT_EMPTY':
      return taskValue && (!Array.isArray(taskValue) || taskValue.length > 0)
    default:
      return false
  }
}

/**
 * Get a field value from task data with safe defaults
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
    case 'title':
      return task.title || ''
    case 'description':
      return task.description || ''
    default:
      // Security: Return null for unknown fields instead of throwing
      console.warn(`[Security] Unknown field requested in automation: ${field}`)
      return null
  }
}
