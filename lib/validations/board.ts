import { z } from 'zod'

export const createBoardSchema = z.object({
  name: z.string().min(1, 'Board name is required').max(100, 'Board name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format').optional(),
})

export const updateBoardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
})

export const updateColumnSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  wipLimit: z.number().int().min(0).nullable().optional(),
})

export const addMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']),
})

export const removeMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
})

export const updateMemberRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']),
})

export const reorderColumnsSchema = z.array(
  z.object({
    id: z.string().min(1, 'Column ID is required'),
    position: z.number().int().min(0),
  })
)

export const createAutomationSchema = z.object({
  name: z.string().min(1).max(100),
  trigger: z.object({
    type: z.enum(['TASK_MOVED', 'TASK_ASSIGNED', 'PRIORITY_CHANGED', 'TASK_STALLED']),
    value: z.any(),
  }),
  condition: z.object({
    field: z.string(),
    operator: z.enum(['EQ', 'NE', 'GT', 'LT', 'IN', 'NOT_IN']),
    value: z.any(),
  }).optional(),
  action: z.object({
    type: z.enum(['NOTIFY_USER', 'NOTIFY_ROLE', 'AUTO_ASSIGN', 'CHANGE_PRIORITY', 'ADD_LABEL']),
    target: z.any().optional(),
    value: z.any().optional(),
  }),
})
