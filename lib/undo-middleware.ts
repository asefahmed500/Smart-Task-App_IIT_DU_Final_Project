'use client'

import { Middleware } from '@reduxjs/toolkit'
import { pushState } from '@/lib/slices/undoSlice'

// Actions that should be tracked in undo history
const TRACKED_ACTIONS = [
  'task/createTask/fulfilled',
  'task/updateTask/fulfilled',
  'task/deleteTask/fulfilled',
  'task/moveTask/fulfilled',
  'task/assignTask/fulfilled',
  'boards/createBoard/fulfilled',
  'boards/updateBoard/fulfilled',
  'boards/deleteBoard/fulfilled',
  'columns/createColumn/fulfilled',
  'columns/updateColumn/fulfilled',
  'columns/deleteColumn/fulfilled',
]

// Actions that should clear the undo history
const CLEAR_ACTIONS = [
  'auth/logout/fulfilled',
]

export const undoMiddleware: Middleware = () => (next) => (action: any) => {
  const result = next(action)

  // Clear history on logout
  if (CLEAR_ACTIONS.some((clearAction) => action.type?.includes?.(clearAction))) {
    return next({ type: 'undo/clearHistory' })
  }

  // Track mutations for undo
  if (TRACKED_ACTIONS.some((tracked) => action.type?.endsWith?.(tracked))) {
    // Store the action with its result for replay
    next(pushState({
      type: action.type,
      payload: action.payload,
      meta: action.meta,
      timestamp: Date.now(),
    }))
  }

  return result
}
