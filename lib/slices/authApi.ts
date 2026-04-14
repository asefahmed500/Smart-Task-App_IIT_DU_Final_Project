import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface User {
  id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'MANAGER' | 'MEMBER'
  avatar: string | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  role?: 'ADMIN' | 'MANAGER' | 'MEMBER'
}

export interface AuthResponse {
  user: User
  token: string
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/auth',
    credentials: 'include',
  }),
  tagTypes: ['Auth'],
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (data) => ({
        url: '/register',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),
    getSession: builder.query<User | null, void>({
      query: () => '/session',
      providesTags: ['Auth'],
    }),
  }),
})

export const { useLoginMutation, useRegisterMutation, useLogoutMutation, useGetSessionQuery } = authApi
