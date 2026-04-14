import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    credentials: 'include',
  }),
  tagTypes: ['Notification'],
  endpoints: (builder) => ({
    getNotifications: builder.query<Notification[], void>({
      query: () => '/notifications',
      providesTags: ['Notification'],
    }),
    markAsRead: builder.mutation<Notification, string>({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: 'PATCH',
        body: { read: true },
      }),
      invalidatesTags: ['Notification'],
    }),
    markAllAsRead: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications',
        method: 'POST',
        body: { markAllAsRead: true },
      }),
      invalidatesTags: ['Notification'],
    }),
    deleteNotification: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Notification'],
    }),
  }),
})

export const notificationsApiConst = notificationsApi

export const {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
} = notificationsApi
