import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { Task, Priority } from './boardsApi'

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
}

export interface MoveTaskRequest {
  taskId: string
  targetColumnId: string
  newPosition: number
  version: number
  override?: boolean
}

export interface AssignTaskRequest {
  assigneeId: string | null
}

export interface CommentPayload {
  id: string
  text: string
  createdAt: string
  user: { id: string; name: string | null; avatar: string | null }
}

export const tasksApi = createApi({
  reducerPath: 'tasksApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    credentials: 'include',
  }),
  tagTypes: ['Task'],
  endpoints: (builder) => ({
    getTasks: builder.query<Task[], string>({
      query: (boardId) => `/boards/${boardId}/tasks`,
      providesTags: (result) =>
        result?.map(task => ({ type: 'Task' as const, id: task.id })) || [],
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
      invalidatesTags: ['Task'],
    }),
    updateTask: builder.mutation<Task, { id: string; data: UpdateTaskRequest }>({
      query: ({ id, data }) => ({
        url: `/tasks/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result) => [{ type: 'Task', id: result?.id }],
    }),
    moveTask: builder.mutation<Task, MoveTaskRequest>({
      query: ({ taskId, ...data }) => ({
        url: `/tasks/${taskId}/move`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result) => [{ type: 'Task', id: result?.id }],
    }),
    assignTask: builder.mutation<Task, { id: string; assigneeId: string | null }>({
      query: ({ id, assigneeId }) => ({
        url: `/tasks/${id}/assign`,
        method: 'PATCH',
        body: { assigneeId },
      }),
      invalidatesTags: (result) => [{ type: 'Task', id: result?.id }],
    }),
    deleteTask: builder.mutation<void, string>({
      query: (id) => ({
        url: `/tasks/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Task'],
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
    addTaskDependency: builder.mutation<any, { taskId: string; linkedTaskId: string; type: 'BLOCKS' | 'IS_BLOCKED_BY' }>({
      query: ({ taskId, ...body }) => ({
        url: `/tasks/${taskId}/dependencies`,
        method: 'POST',
        body
      }),
      invalidatesTags: ['Task']
    }),
    searchTasks: builder.query<Task[], string>({
      query: (q) => `/tasks/search?q=${encodeURIComponent(q)}`,
      providesTags: (result) => 
        result?.map(task => ({ type: 'Task' as const, id: task.id })) || [],
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
  useAddTaskDependencyMutation,
  useSearchTasksQuery,
} = tasksApi
