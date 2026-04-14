import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { authApi } from '@/lib/slices/authApi'
import { boardsApi } from '@/lib/slices/boardsApi'
import { tasksApi } from '@/lib/slices/tasksApi'
import { adminApi } from '@/lib/slices/adminApi'
import { usersApi } from '@/lib/slices/usersApi'
import { notificationsApiConst as notificationsApi } from '@/lib/slices/notificationsApi'
import roleSlice from '@/lib/slices/roleSlice'
import presenceSlice from '@/lib/slices/presenceSlice'
import uiSlice from '@/lib/slices/uiSlice'
import undoReducer from '@/lib/slices/undoSlice'
import { socketMiddleware } from '@/lib/socket-middleware'
import { undoMiddleware } from '@/lib/undo-middleware'
import { createOfflineMiddleware } from '@/lib/offlineQueue'

export const makeStore = () => {
  const store = configureStore({
    reducer: {
      [authApi.reducerPath]: authApi.reducer,
      [boardsApi.reducerPath]: boardsApi.reducer,
      [tasksApi.reducerPath]: tasksApi.reducer,
      [adminApi.reducerPath]: adminApi.reducer,
      [usersApi.reducerPath]: usersApi.reducer,
      [notificationsApi.reducerPath]: notificationsApi.reducer,
      role: roleSlice,
      presence: presenceSlice,
      ui: uiSlice,
      undo: undoReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware()
        .concat(authApi.middleware)
        .concat(boardsApi.middleware)
        .concat(tasksApi.middleware)
        .concat(adminApi.middleware)
        .concat(usersApi.middleware)
        .concat(notificationsApi.middleware)
        .concat(socketMiddleware)
        .concat(undoMiddleware)
        .concat(createOfflineMiddleware()),
  })

  setupListeners(store.dispatch)

  return store
}

export type AppStore = ReturnType<typeof makeStore>
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
