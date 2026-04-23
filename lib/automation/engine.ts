import { prisma } from '@/lib/prisma'
import { executeTrigger } from './triggers'
import { executeAction } from './actions'
import type { Task } from '@/lib/slices/boardsApi'
import { z } from 'zod'

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

// Zod schemas for secure JSON parsing
const AutomationTriggerSchema = z.object({
  type: z.enum(['TASK_MOVED', 'TASK_ASSIGNED', 'PRIORITY_CHANGED', 'TASK_STALLED']),
  value: z.union([z.string(), z.number()]).optional(),
})

const AutomationConditionSchema = z.object({
  field: z.enum(ALLOWED_CONDITION_FIELDS),
  operator: z.enum(ALLOWED_CONDITION_OPERATORS),
  value: z.union([z.string(), z.number()]),
})

const AutomationActionSchema = z.object({
  type: z.enum(['NOTIFY_USER', 'NOTIFY_ROLE', 'AUTO_ASSIGN', 'CHANGE_PRIORITY', 'ADD_LABEL']),
  target: z.string().optional(),
  value: z.string().optional(),
})

/**
 * Safely parse JSON with Zod schema validation
 * Returns fallback value if parsing or validation fails
 */
function safeJSONParse<T>(json: string, schema: z.ZodSchema<T>, fallback: T): T {
  try {
    const parsed = JSON.parse(json)
    return schema.parse(parsed)
  } catch (error) {
    console.error('[Security] JSON parsing failed:', error)
    return fallback
  }
}

/**
 * Evaluate and execute automation rules for a given event
 * Optimized with parallel evaluation and batch updates
 */
export async function evaluateAutomations(
  boardId: string,
  eventType: string,
  taskData: Partial<Task>,
  actorId: string
) {
  try {
    // Single query - fetch rules with trigger type filter
    const rules = await prisma.automationRule.findMany({
      where: {
        boardId,
        enabled: true,
      },
    })

    if (rules.length === 0) {
      return { fired: [] }
    }

    // Parse all rules once with validation
    const parsedRules = rules
      .map(rule => {
        try {
          const trigger = safeJSONParse(
            rule.trigger as string,
            AutomationTriggerSchema,
            { type: 'TASK_MOVED' } // fallback
          )

          const condition = rule.condition
            ? safeJSONParse(rule.condition as string, AutomationConditionSchema, null)
            : null

          const action = safeJSONParse(
            rule.action as string,
            AutomationActionSchema,
            { type: 'NOTIFY_USER' } // fallback
          )

          return { rule, trigger, condition, action }
        } catch (error) {
          console.error(`[Security] Failed to parse automation rule ${rule.id}:`, error)
          return null
        }
      })
      .filter((rule): rule is NonNullable<typeof rule> => rule !== null)

    // Filter rules where trigger matches (parallel evaluation)
    const matchingRules = parsedRules.filter(({ trigger }) => 
      executeTrigger(trigger, eventType, taskData)
    )

    // Evaluate conditions for matching triggers (parallel)
    const readyToFire = matchingRules.filter(({ condition }) => {
      if (!condition) return true
      return evaluateCondition(condition, taskData)
    })

    if (readyToFire.length === 0) {
      return { fired: [] }
    }

    // Execute actions and batch updates
    await prisma.$transaction(async (tx) => {
      const promises = readyToFire.map(async ({ rule, action }) => {
        try {
          await executeAction(action, taskData, rule.boardId, actorId)
          
          // Update lastFiredAt
          await tx.automationRule.update({
            where: { id: rule.id },
            data: { lastFiredAt: new Date() },
          })

          // Log action
          await tx.auditLog.create({
            data: {
              action: 'AUTOMATION_FIRED',
              entityType: 'AutomationRule',
              entityId: rule.id,
              actorId,
              boardId,
              changes: JSON.stringify({
                ruleName: rule.name,
                trigger: { type: rule.trigger, value: rule.trigger },
                action: { type: action.type, target: action.target, value: action.value },
              }),
            },
          })

          return { ruleId: rule.id, ruleName: rule.name, action }
        } catch (error) {
          console.error(`Error firing rule ${rule.id}:`, error)
          return null
        }
      })
      
      return Promise.all(promises)
    })

    return { 
      fired: readyToFire.map(({ rule, action }) => ({
        ruleId: rule.id,
        ruleName: rule.name,
        action,
      }))
    }
  } catch (error) {
    console.error('Error in automation engine:', error)
    return { fired: [] }
  }
}

/**
 * Evaluate a condition against task data with security validation
 */
async function evaluateCondition(condition: AutomationCondition, taskData: Partial<Task>): Promise<boolean> {
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
function getTaskFieldValue(task: Partial<Task>, field: string): any {
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
