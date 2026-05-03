import { z } from 'zod';

// Base ID schema
export const idSchema = z.string().cuid();

// Role and Priority enums
export const roleSchema = z.enum(['ADMIN', 'MANAGER', 'MEMBER']);
export const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

// Task Schemas
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(1000).optional().nullable(),
  priority: prioritySchema.default('MEDIUM'),
  columnId: idSchema,
  assigneeId: idSchema.optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

export const updateTaskSchema = z.object({
  id: idSchema,
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  priority: prioritySchema.optional(),
  assigneeId: idSchema.optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  version: z.number().int().min(1),
});

export const moveTaskSchema = z.object({
  taskId: idSchema,
  columnId: idSchema,
  version: z.number().int().min(1),
});

// Board Schemas
export const createBoardSchema = z.object({
  name: z.string().min(1, 'Board name is required').max(50),
  description: z.string().max(255).optional().nullable(),
});

export const updateBoardSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(255).optional().nullable(),
});

// Column Schemas
export const createColumnSchema = z.object({
  name: z.string().min(1).max(30),
  boardId: idSchema,
  wipLimit: z.number().int().min(0).default(0),
  order: z.number().int().min(0).optional(),
});

export const updateColumnSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(30).optional(),
  wipLimit: z.number().int().min(0).optional(),
  order: z.number().int().min(0).optional(),
});

// Member Schemas
export const manageBoardMemberSchema = z.object({
  boardId: idSchema,
  userId: idSchema,
});

export const searchUserSchema = z.object({
  query: z.string().min(1).max(50),
});

// Tag Schemas
export const createTagSchema = z.object({
  boardId: idSchema.optional().nullable(),
  name: z.string().min(1).max(20),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
});

export const manageTaskTagSchema = z.object({
  taskId: idSchema,
  tagId: idSchema,
});

// Reorder Schemas
export const reorderColumnsSchema = z.object({
  boardId: idSchema,
  columnIds: z.array(idSchema),
});

// Checklist Item Schemas
export const addChecklistItemSchema = z.object({
  taskId: idSchema,
  content: z.string().min(1).max(200),
});

export const updateChecklistItemSchema = z.object({
  id: idSchema,
  content: z.string().min(1).max(200),
});

export const toggleChecklistItemSchema = z.object({
  itemId: idSchema,
  isCompleted: z.boolean(),
});

// Attachment Schemas
export const addAttachmentSchema = z.object({
  taskId: idSchema,
  name: z.string().min(1).max(255),
  url: z.string().url(),
  type: z.string(),
  size: z.number().int().min(0),
});

// Time Entry Schemas
export const logTimeSchema = z.object({
  taskId: idSchema,
  duration: z.number().int().min(1),
  description: z.string().max(500).optional().nullable(),
});

// Review Schemas
export const submitReviewSchema = z.object({
  taskId: idSchema,
  reviewerId: idSchema,
});

export const completeReviewSchema = z.object({
  reviewId: idSchema,
  status: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED']),
  feedback: z.string().max(1000).optional().nullable(),
});

// Automation Schemas
export const createAutomationRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required').max(100),
  trigger: z.enum(['TASK_CREATED', 'TASK_MOVED', 'TASK_UPDATED', 'TASK_ASSIGNED']),
  condition: z.string().max(255).optional().nullable(),
  action: z.string().min(1, 'Action is required').max(255),
  enabled: z.boolean().default(true),
  boardId: idSchema.optional().nullable(),
});

export const updateAutomationRuleSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(100).optional(),
  trigger: z.enum(['TASK_CREATED', 'TASK_MOVED', 'TASK_UPDATED', 'TASK_ASSIGNED']).optional(),
  condition: z.string().max(255).optional().nullable(),
  action: z.string().min(1).max(255).optional(),
  enabled: z.boolean().optional(),
});

// Comment Schemas
export const createCommentSchema = z.object({
  taskId: idSchema,
  content: z.string().min(1, 'Comment cannot be empty').max(1000),
});
// Auth Schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(50),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  password: z.string().min(8).optional(),
});
