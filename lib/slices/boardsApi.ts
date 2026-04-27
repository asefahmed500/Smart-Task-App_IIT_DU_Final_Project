import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/lib/store'

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface BoardMember {
  id: string
  userId: string
  role: 'ADMIN' | 'MANAGER' | 'MEMBER'
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
    avatar: string | null
  }
}

export interface Column {
  id: string
  name: string
  position: number
  wipLimit: number | null
  isTerminal: boolean
  _count?: {
    tasks: number
  }
}

export interface Task {
  id: string
  title: string
  description: string | null
  priority: Priority
  status: string
  labels: string[]
  dueDate: string | null
  columnId: string
  boardId: string
  assigneeId: string | null
  createdById: string
  version: number
  position: number
  isBlocked: boolean
  inProgressAt: string | null
  completedAt: string | null
  lastMovedAt: string
  createdAt: string
  updatedAt: string
  assignee?: {
    id: string
    name: string | null
    avatar: string | null
  }
  column?: Column
  blockers?: Array<{
    id: string
    blockerId: string
    blockingId: string
    blocker?: Task
  }>
  blocking?: Array<{
    id: string
    blockerId: string
    blockingId: string
    blocking?: Task
  }>
  attachments?: TaskAttachment[]
}

export interface TaskAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  taskId: string
  userId: string
  createdAt: string
  user: { id: string; name: string | null; avatar: string | null }
}

export interface Board {
  id: string
  name: string
  description: string | null
  color: string
  ownerId: string
  createdAt: string
  updatedAt: string
  archived: boolean
  members: BoardMember[]
  columns: Column[]
  tasks?: Task[]
  _count?: {
    members: number
    tasks: number
  }
}

export interface CreateBoardRequest {
  name: string
  description?: string
  color?: string
}

export interface UpdateBoardRequest {
  name?: string
  description?: string
  color?: string
  previousState?: any // Metadata for undo
}

export interface MetricsPayload {
  cycleTime: {
    avg: number
    median: number
    p95: number
    count: number
  };
  leadTime: {
    avg: number
    median: number
    p95: number
    count: number
  };
  throughput: { date: string, count: number }[];
  totalTasks: number;
  completedTasks: number;
}

export const boardsApi = createApi({
  reducerPath: 'boardsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    credentials: 'include', // Cookie-based authentication via better-auth
  }),
  tagTypes: ['Board', 'Column', 'Task', 'Webhook'],
  endpoints: (builder) => ({
    getBoards: builder.query<Board[], void>({
      query: () => '/boards',
      transformResponse: (response: { data: Board[] }) => response.data,
      providesTags: ['Board'],
    }),
    getBoard: builder.query<Board, string>({
      query: (id) => `/boards/${id}`,
      providesTags: (result) => [{ type: 'Board', id: result?.id }],
    }),
    createBoard: builder.mutation<Board, CreateBoardRequest>({
      query: (data) => ({
        url: '/boards',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Board'],
    }),
    updateBoard: builder.mutation<Board, { id: string; data: UpdateBoardRequest }>({
      query: ({ id, data }) => ({
        url: `/boards/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result) => [{ type: 'Board', id: result?.id }],
    }),
    deleteBoard: builder.mutation<void, string>({
      query: (id) => ({
        url: `/boards/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Board'],
    }),
    getBoardColumns: builder.query<Column[], string>({
      query: (boardId) => `/boards/${boardId}/columns`,
      providesTags: (result, error, boardId) => {
        if (!result || !Array.isArray(result)) return [{ type: 'Column' as const, id: 'LIST' }]
        return [{ type: 'Column' as const, id: 'LIST' }, ...result.map(col => ({ type: 'Column' as const, id: col.id }))]
      },
    }),
    getBoardMetrics: builder.query<MetricsPayload, string>({
      query: (boardId) => `/boards/${boardId}/metrics`,
      providesTags: [{ type: 'Task' as const, id: 'LIST' }]
    }),
    updateColumn: builder.mutation<Column, { id: string; wipLimit?: number | null; name?: string; previousState?: any }>({
      query: ({ id, ...data }) => ({
        url: `/columns/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result) => [{ type: 'Column', id: result?.id }],
    }),
    deleteColumn: builder.mutation<void, string>({
      query: (id) => ({
        url: `/columns/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, arg) => [
        'Column',
        { type: 'Board', id: 'LIST' },
      ],
    }),
    reorderColumns: builder.mutation<void, Array<{ id: string; position: number }>>({
      query: (columns) => ({
        url: '/columns/reorder',
        method: 'POST',
        body: { columns },
      }),
      invalidatesTags: ['Column'],
    }),
    createColumn: builder.mutation<Column, { boardId: string; name: string; wipLimit?: number | null }>({
      query: ({ boardId, ...data }) => ({
        url: `/boards/${boardId}/columns`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { boardId }) => [{ type: 'Board', id: boardId }, 'Column'],
    }),
    toggleArchiveBoard: builder.mutation<{ archived: boolean }, { id: string; archived: boolean }>({
      query: ({ id, archived }) => ({
        url: `/boards/${id}/archive`,
        method: 'POST',
        body: { archived }
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'Board', id: arg.id }],
    }),
    addBoardMember: builder.mutation<BoardMember, { boardId: string; userId: string; role: 'ADMIN' | 'MANAGER' | 'MEMBER' }>({
      query: ({ boardId, userId, role }) => ({
        url: `/boards/${boardId}/members`,
        method: 'POST',
        body: { userId, role }
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'Board', id: arg.boardId }],
    }),
    removeBoardMember: builder.mutation<void, { boardId: string; userId: string }>({
      query: ({ boardId, userId }) => ({
        url: `/boards/${boardId}/members`,
        method: 'DELETE',
        body: { userId }
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'Board', id: arg.boardId }],
    }),
    updateBoardMemberRole: builder.mutation<BoardMember, { boardId: string; userId: string; role: 'ADMIN' | 'MANAGER' | 'MEMBER' }>({
      query: ({ boardId, userId, role }) => ({
        url: `/boards/${boardId}/members`,
        method: 'PATCH',
        body: { userId, role }
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'Board', id: arg.boardId }],
    }),
    getBoardAutomations: builder.query<any[], string>({
      query: (boardId) => `/boards/${boardId}/automations`,
      transformResponse: (response: any) => {
        // Handle both direct array and wrapped response
        return Array.isArray(response) ? response : (response?.data || [])
      },
      providesTags: (result, error, boardId) => {
        if (!result || !Array.isArray(result)) return []
        return [{ type: 'Board', id: `${boardId}-automations` }]
      },
    }),
    getBoardAudit: builder.query<any[], string>({
      query: (boardId) => `/boards/${boardId}/audit`,
      transformResponse: (response: any) => {
        // Handle both direct array and wrapped response
        return Array.isArray(response) ? response : (response?.data || [])
      },
      providesTags: (result, error, boardId) => {
        if (!result || !Array.isArray(result)) return []
        return [{ type: 'Board', id: `${boardId}-audit` }]
      },
    }),
    createAutomation: builder.mutation<any, { boardId: string; name: string; trigger: any; condition?: any; action: any }>({
      query: ({ boardId, name, trigger, condition, action }) => ({
        url: `/boards/${boardId}/automations`,
        method: 'POST',
        body: { name, trigger: JSON.stringify(trigger), condition: condition ? JSON.stringify(condition) : null, action: JSON.stringify(action) },
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'Board', id: `${arg.boardId}-automations` }],
    }),
    updateAutomation: builder.mutation<any, { id: string; name?: string; trigger?: any; condition?: any; action?: any; enabled?: boolean }>({
      query: ({ id, ...data }) => ({
        url: `/automations/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'Board', id: 'AUTOMATIONS' }],
    }),
    deleteAutomation: builder.mutation<void, string>({
      query: (id) => ({
        url: `/automations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: () => [{ type: 'Board', id: 'AUTOMATIONS' }],
    }),
    getMetricsCounts: builder.query<{ dueToday: number; overdue: number }, void>({
      query: () => '/metrics/counts',
      providesTags: ['Task'],
    }),
    getBoardWebhooks: builder.query<Webhook[], string>({
      query: (boardId) => `/boards/${boardId}/webhooks`,
      transformResponse: (response: any) => {
        // Handle both direct array and wrapped response
        return Array.isArray(response) ? response : (response?.data || [])
      },
      providesTags: (result, error, boardId) => {
        if (!result || !Array.isArray(result)) return [{ type: 'Webhook', id: boardId }]
        return result.map(w => ({ type: 'Webhook' as const, id: w.id }))
      },
    }),
    createWebhook: builder.mutation<Webhook, { boardId: string; name: string; url: string; secret?: string; events: string[] }>({
      query: ({ boardId, ...data }) => ({
        url: `/boards/${boardId}/webhooks`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, arg) => [{ type: 'Webhook', id: arg.boardId }],
    }),
    updateWebhook: builder.mutation<Webhook, { id: string; name?: string; url?: string; secret?: string; events?: string[]; isActive?: boolean }>({
      query: ({ id, ...data }) => ({
        url: `/webhooks/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result) => [{ type: 'Webhook', id: result?.id }],
    }),
    deleteWebhook: builder.mutation<void, string>({
      query: (id) => ({
        url: `/webhooks/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Webhook'],
    }),
  }),
})

export interface Webhook {
  id: string
  name: string
  url: string
  secret: string | null
  events: string[]
  isActive: boolean
  boardId: string
  createdAt: string
  updatedAt: string
}

export const {
  useGetBoardsQuery,
  useGetBoardQuery,
  useCreateBoardMutation,
  useUpdateBoardMutation,
  useDeleteBoardMutation,
  useGetBoardColumnsQuery,
  useGetBoardMetricsQuery,
  useUpdateColumnMutation,
  useCreateColumnMutation,
  useDeleteColumnMutation,
  useReorderColumnsMutation,
  useToggleArchiveBoardMutation,
  useAddBoardMemberMutation,
  useRemoveBoardMemberMutation,
  useUpdateBoardMemberRoleMutation,
  useGetBoardAutomationsQuery,
  useCreateAutomationMutation,
  useUpdateAutomationMutation,
  useDeleteAutomationMutation,
  useGetBoardAuditQuery,
  useGetMetricsCountsQuery,
  useGetBoardWebhooksQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
} = boardsApi
