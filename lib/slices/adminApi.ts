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
  allowedColors: any
  updatedAt: string
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
    getPlatformAudit: builder.query<any[], void>({
      query: () => '/audit',
    }),
    getPlatformStats: builder.query<any, void>({
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
