import { z } from 'zod'

export const TaskPriorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
export type TaskPriority = z.infer<typeof TaskPriorityEnum>

export const TaskStatusEnum = z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'])
export type TaskStatus = z.infer<typeof TaskStatusEnum>

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(5000, 'Description must be less than 5000 characters').optional(),
  priority: TaskPriorityEnum.optional(),
  columnId: z.string().min(1, 'Column ID is required'),
  assigneeId: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  labels: z.array(z.string().max(50)).max(10, 'Maximum 10 labels allowed').optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  priority: TaskPriorityEnum.optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  labels: z.array(z.string().max(50)).max(10).optional(),
  isBlocked: z.boolean().optional(),
})

export const moveTaskSchema = z.object({
  targetColumnId: z.string().min(1, 'Target column ID is required'),
  newPosition: z.number().min(0, 'Position must be non-negative'),
  version: z.number().int().positive('Version must be positive'),
  override: z.boolean().optional(),
})

export const assignTaskSchema = z.object({
  assigneeId: z.string().nullable(),
})

export const addDependencySchema = z.object({
  linkedTaskId: z.string().min(1, 'Linked task ID is required'),
  type: z.enum(['BLOCKS', 'IS_BLOCKED_BY']),
})

export const removeDependencySchema = z.object({
  linkedTaskId: z.string().min(1, 'Linked task ID is required'),
  type: z.enum(['BLOCKS', 'IS_BLOCKED_BY']),
})

export const addCommentSchema = z.object({
  text: z.string().min(1, 'Comment text is required').max(5000, 'Comment must be less than 5000 characters'),
})

export const updateCommentSchema = z.object({
  text: z.string().min(1, 'Comment text is required').max(5000),
})

export const addAttachmentSchema = z.object({
  name: z.string().min(1, 'File name is required').max(255, 'File name must be less than 255 characters'),
  url: z.string().url('Invalid URL format'),
  type: z.string().max(100, 'File type must be less than 100 characters'),
  size: z.number().int().positive('File size must be positive').max(50 * 1024 * 1024, 'File size must be less than 50MB'),
})
