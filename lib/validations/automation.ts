import { z } from 'zod'

export const automationTriggerSchema = z.object({
  type: z.enum(['TASK_MOVED', 'TASK_ASSIGNED', 'PRIORITY_CHANGED', 'TASK_STALLED']),
  value: z.union([z.string(), z.number()]).optional(),
})

export const automationConditionSchema = z.object({
  field: z.enum(['priority', 'assigneeId', 'columnId', 'label', 'daysSinceLastMove', 'title', 'description']),
  operator: z.enum(['EQ', 'NEQ', 'CONTAINS', 'GT', 'LT', 'GTE', 'LTE', 'EMPTY', 'NOT_EMPTY']),
  value: z.union([z.string(), z.number()]),
})

export const automationActionSchema = z.object({
  type: z.enum(['NOTIFY_USER', 'NOTIFY_ROLE', 'AUTO_ASSIGN', 'CHANGE_PRIORITY', 'ADD_LABEL']),
  target: z.string().optional(),
  value: z.string().optional(),
})

export const createAutomationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  trigger: automationTriggerSchema,
  condition: automationConditionSchema.optional(),
  action: automationActionSchema,
  enabled: z.boolean().optional().default(true),
})

export const updateAutomationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  trigger: automationTriggerSchema.optional(),
  condition: automationConditionSchema.optional().nullable(),
  action: automationActionSchema.optional(),
  enabled: z.boolean().optional(),
})

export type AutomationTrigger = z.infer<typeof automationTriggerSchema>
export type AutomationCondition = z.infer<typeof automationConditionSchema>
export type AutomationAction = z.infer<typeof automationActionSchema>
