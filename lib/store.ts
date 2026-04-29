import { configureStore, Middleware, UnknownAction } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
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

/**
 * RTK Query Error Logger Middleware
 * Logs all RTK Query rejections (failed requests) to console for debugging
 * Note: Aborted queries are expected behavior and not logged
 */
const rtkQueryErrorLogger: Middleware = () => (next) => (action) => {
  const typedAction = action as UnknownAction & {
    error?: { message?: string; status?: number | string };
    payload?: { data?: unknown; status?: number | string };
    meta?: { arg?: { endpointName?: string; originalArgs?: unknown } };
  }

  if (typedAction.type.endsWith('/rejected')) {
    const errorMessage = typedAction.error?.message || (typedAction.payload as Record<string, unknown>)?.data || typedAction.payload

    // Don't log expected aborts - these happen when components unmount or queries are deduplicated
    if (errorMessage === 'Aborted due to condition callback returning false.') {
      return next(action)
    }

    console.error('🔴 RTK Query Error:', {
      type: typedAction.type,
      status: typedAction.error?.status || typedAction.payload?.status,
      error: errorMessage,
      endpoint: typedAction.meta?.arg?.endpointName,
      request: typedAction.meta?.arg?.originalArgs,
    })
  }
  return next(action)
}

export const makeStore = () => {
  const store = configureStore({
    reducer: {
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
        .concat(rtkQueryErrorLogger)
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
