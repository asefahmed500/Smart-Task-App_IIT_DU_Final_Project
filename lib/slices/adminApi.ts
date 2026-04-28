import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface User {
  id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'MANAGER' | 'MEMBER'
  avatar: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    ownedBoards: number
    memberships: number
    assignedTasks: number
  }
}

export interface CreateUserData {
  email: string
  password: string
  name: string
  role: 'ADMIN' | 'MANAGER' | 'MEMBER'
}

export interface UpdateUserData {
  name?: string
  role?: 'ADMIN' | 'MANAGER' | 'MEMBER'
  isActive?: boolean
}

export interface SystemSettings {
  id: string
  platformName: string
  allowMemberBoardCreation: boolean
  defaultWipLimit: number
  allowedColors: string[]
  updatedAt: string
}

export interface PlatformStats {
  totalUsers: number
  activeUsers: number
  totalBoards: number
  totalTasks: number
  statusBreakdown: { status: string; count: number }[]
  priorityBreakdown: { priority: string; count: number }[]
  roleDistribution: { role: string; count: number }[]
}

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/admin',
    credentials: 'include',
  }),
  tagTypes: ['User', 'Settings'],
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => '/users',
      transformResponse: (response: { data: User[] }) => response.data,
      providesTags: ['User'],
    }),
    createUser: builder.mutation<User, CreateUserData>({
      query: (data) => ({
        url: '/users',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation<User, { id: string; data: UpdateUserData }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result) => [{ type: 'User', id: result?.id }, 'User'],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
    getPlatformAudit: builder.query<unknown[], void>({
      query: () => '/audit',
    }),
    getPlatformStats: builder.query<PlatformStats, void>({
      query: () => '/stats',
    }),
    resetUserPassword: builder.mutation<{ success: boolean; message?: string; resetUrl?: string; token?: string }, string>({
      query: (userId) => ({
        url: `/users/${userId}/reset-password`,
        method: 'POST',
        body: { userId }
      }),
    }),
    getSystemSettings: builder.query<SystemSettings, void>({
      query: () => '/settings',
      providesTags: ['Settings'],
    }),
    updateSystemSettings: builder.mutation<SystemSettings, Partial<SystemSettings>>({
      query: (data) => ({
        url: '/settings',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Settings'],
    }),
  }),
})

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetPlatformAuditQuery,
  useGetPlatformStatsQuery,
  useResetUserPasswordMutation,
  useGetSystemSettingsQuery,
  useUpdateSystemSettingsMutation,
} = adminApi
