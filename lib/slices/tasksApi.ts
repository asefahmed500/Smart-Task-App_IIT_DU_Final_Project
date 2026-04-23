import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { Task, Priority, TaskAttachment } from './boardsApi'

export interface CreateTaskRequest {
  title: string
  description?: string
  priority?: Priority
  columnId: string
  assigneeId?: string | null
  dueDate?: string | null
  labels?: string[]
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  priority?: Priority
  assigneeId?: string | null
  dueDate?: string | null
  labels?: string[]
  isBlocked?: boolean
  previousState?: any // Metadata for undo
}

export interface MoveTaskRequest {
  taskId: string
  targetColumnId: string
  newPosition: number
  version: number
  override?: boolean
  fromColumnId?: string // Metadata for undo
  fromPosition?: number // Metadata for undo
}

export interface AssignTaskRequest {
  assigneeId: string | null
}

export interface CommentPayload {
  id: string
  text: string
  createdAt: string
  updatedAt: string
  user: { id: string; name: string | null; avatar: string | null }
  taskId: string
  userId: string
}

export const tasksApi = createApi({
  reducerPath: 'tasksApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    credentials: 'include',
  }),
  tagTypes: ['Task', 'Board'],
  endpoints: (builder) => ({
    getTasks: builder.query<Task[], string>({
      query: (boardId) => `/boards/${boardId}/tasks`,
      providesTags: (result, error, boardId) => [
        { type: 'Task' as const, id: 'LIST' },
        ...(result?.map(task => ({ type: 'Task' as const, id: task.id })) || [])
      ],
    }),
    getAssignedTasks: builder.query<Task[], void>({
      query: () => '/tasks/assigned',
      providesTags: (result) => [
        { type: 'Task' as const, id: 'LIST' },
        ...(result?.map(task => ({ type: 'Task' as const, id: task.id })) || [])
      ],
    }),
    getTask: builder.query<Task, string>({
      query: (taskId) => `/tasks/${taskId}`,
      providesTags: (result) => [{ type: 'Task', id: result?.id }],
    }),
    createTask: builder.mutation<Task, { boardId: string; data: CreateTaskRequest }>({
      query: ({ boardId, data }) => ({
        url: `/boards/${boardId}/tasks`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Task', 'Board'],
    }),
    updateTask: builder.mutation<Task, { id: string; data: UpdateTaskRequest }>({
      query: ({ id, data }) => ({
        url: `/tasks/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result) => [{ type: 'Task', id: result?.id }, 'Board'],
    }),
    moveTask: builder.mutation<Task, MoveTaskRequest>({
      query: ({ taskId, ...data }) => ({
        url: `/tasks/${taskId}/move`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result) => [{ type: 'Task', id: result?.id }, 'Board'],
    }),
    assignTask: builder.mutation<Task, { id: string; assigneeId: string | null }>({
      query: ({ id, assigneeId }) => ({
        url: `/tasks/${id}/assign`,
        method: 'PATCH',
        body: { assigneeId },
      }),
      invalidatesTags: (result) => [{ type: 'Task', id: result?.id }, 'Board'],
    }),
    deleteTask: builder.mutation<void, string>({
      query: (id) => ({
        url: `/tasks/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Task', 'Board'],
    }),
    getTaskAudit: builder.query<any[], string>({
      query: (taskId) => `/tasks/${taskId}/audit`,
      providesTags: () => [{ type: 'Task', id: 'audit' }],
    }),
    getTaskComments: builder.query<CommentPayload[], string>({
      query: (taskId) => `/tasks/${taskId}/comments`,
      providesTags: (result, error, taskId) => [{ type: 'Task', id: `COMMENTS_${taskId}` }]
    }),
    addComment: builder.mutation<CommentPayload, { taskId: string; text: string }>({
      query: ({ taskId, text }) => ({
        url: `/tasks/${taskId}/comments`,
        method: 'POST',
        body: { text }
      }),
      invalidatesTags: (result, error, { taskId }) => [{ type: 'Task', id: `COMMENTS_${taskId}` }]
    }),
    deleteComment: builder.mutation<void, { id: string; taskId: string }>({
      query: ({ id }) => ({
        url: `/comments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { taskId }) => [{ type: 'Task', id: `COMMENTS_${taskId}` }]
    }),
    updateComment: builder.mutation<CommentPayload, { id: string; taskId: string; text: string }>({
      query: ({ id, text }) => ({
        url: `/comments/${id}`,
        method: 'PATCH',
        body: { text }
      }),
      invalidatesTags: (result, error, { taskId }) => [{ type: 'Task', id: `COMMENTS_${taskId}` }]
    }),
    addTaskDependency: builder.mutation<any, { taskId: string; linkedTaskId: string; type: 'BLOCKS' | 'IS_BLOCKED_BY' }>({
      query: ({ taskId, ...body }) => ({
        url: `/tasks/${taskId}/dependencies`,
        method: 'POST',
        body
      }),
      invalidatesTags: (result, error, { taskId }) => [{ type: 'Task', id: taskId }]
    }),
    removeTaskDependency: builder.mutation<void, { taskId: string; linkedTaskId: string; type: 'BLOCKS' | 'IS_BLOCKED_BY' }>({
      query: ({ taskId, ...body }) => ({
        url: `/tasks/${taskId}/dependencies`,
        method: 'DELETE',
        body
      }),
      invalidatesTags: (result, error, { taskId }) => [{ type: 'Task', id: taskId }]
    }),
    searchTasks: builder.query<Task[], string>({
      query: (q) => `/tasks/search?q=${encodeURIComponent(q)}`,
      providesTags: (result) => 
        result?.map(task => ({ type: 'Task' as const, id: task.id })) || [],
    }),
    getAttachments: builder.query<any[], string>({
      query: (taskId) => `/tasks/${taskId}/attachments`,
      providesTags: (result, error, taskId) => [{ type: 'Task', id: `ATTACHMENTS_${taskId}` }]
    }),
    addAttachment: builder.mutation<TaskAttachment, { taskId: string; name: string; url: string; type?: string; size?: number }>({
      query: ({ taskId, ...body }) => ({
        url: `/tasks/${taskId}/attachments`,
        method: 'POST',
        body
      }),
      invalidatesTags: (result, error, { taskId }) => [{ type: 'Task', id: taskId }, { type: 'Task', id: `ATTACHMENTS_${taskId}` }]
    }),
    deleteAttachment: builder.mutation<void, { id: string; taskId: string }>({
      query: ({ id }) => ({
        url: `/attachments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { taskId }) => [{ type: 'Task', id: taskId }, { type: 'Task', id: `ATTACHMENTS_${taskId}` }]
    }),
    getTimeLogs: builder.query<any[], string>({
      query: (taskId) => `/tasks/${taskId}/time-logs`,
      providesTags: (result, error, taskId) => [{ type: 'Task', id: `TIME_LOGS_${taskId}` }]
    }),
    logTime: builder.mutation<any, { taskId: string; action: 'start' | 'stop' | 'manual'; description?: string; duration?: number }>({
      query: ({ taskId, ...body }) => ({
        url: `/tasks/${taskId}/time-logs`,
        method: 'POST',
        body
      }),
      invalidatesTags: (result, error, { taskId }) => [
        { type: 'Task', id: taskId },
        { type: 'Task', id: `TIME_LOGS_${taskId}` }
      ]
    }),
  }),
})

export const {
  useGetTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useMoveTaskMutation,
  useAssignTaskMutation,
  useDeleteTaskMutation,
  useGetTaskAuditQuery,
  useGetTaskCommentsQuery,
  useAddCommentMutation,
  useDeleteCommentMutation,
  useUpdateCommentMutation,
  useAddTaskDependencyMutation,
  useRemoveTaskDependencyMutation,
  useSearchTasksQuery,
  useGetAttachmentsQuery,
  useAddAttachmentMutation,
  useDeleteAttachmentMutation,
  useGetAssignedTasksQuery,
  useGetTimeLogsQuery,
  useLogTimeMutation,
} = tasksApi
