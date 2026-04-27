import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { Board } from './boardsApi'

export interface UserProfile {
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

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/users',
    credentials: 'include',
  }),
  tagTypes: ['Profile', 'Board'],
  endpoints: (builder) => ({
    getProfile: builder.query<UserProfile, void>({
      query: () => '/profile',
      providesTags: ['Profile'],
    }),
    updateProfile: builder.mutation<UserProfile, { name?: string; avatar?: string }>({
      query: (data) => ({
        url: '/profile',
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Profile'],
    }),
    getUserBoards: builder.query<Board[], void>({
      query: () => '/boards',
      providesTags: (result) => {
        if (!result || !Array.isArray(result)) return []
        return result.map((board) => ({ type: 'Board' as const, id: board.id }))
      },
    }),
    getUserActivity: builder.query<any[], void>({
      query: () => '/activity',
    }),
    changePassword: builder.mutation<void, { currentPassword: string; newPassword: string }>({
      query: (data) => ({
        url: '/change-password',
        method: 'POST',
        body: data,
      }),
    }),
    searchUsers: builder.query<UserProfile[], string>({
      query: (q) => `/search?q=${encodeURIComponent(q)}`,
    }),
  }),
})

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useGetUserBoardsQuery,
  useGetUserActivityQuery,
  useChangePasswordMutation,
  useSearchUsersQuery,
} = usersApi
