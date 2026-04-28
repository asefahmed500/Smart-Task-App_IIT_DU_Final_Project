import { Middleware, UnknownAction } from '@reduxjs/toolkit'
import { pushState } from '@/lib/slices/undoSlice'
import { revertAction } from './undo/revert-handlers'
import type { RootState } from './store'

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

export const undoMiddleware: Middleware = (store) => (next) => (action) => {
  const typedAction = action as UnknownAction

  // 1. Check if this is an UNDO request
  if (typedAction.type === 'undo/undo') {
    const state = store.getState() as RootState
    const lastPresent = state.undo.present
    
    if (lastPresent) {
      // Execute the inverse operation
      revertAction(store.dispatch, lastPresent).catch(err => {
        console.error('Failed to revert action during undo:', err)
      })
    }
  }

  const result = next(action)

  // 2. Clear history on logout
  if (CLEAR_ACTIONS.some((clearAction) => typedAction.type?.includes?.(clearAction))) {
    return next({ type: 'undo/clearHistory' })
  }

  // 3. Track mutations for undo (skip if the action itself was a revert)
  const meta = typedAction.meta as { isRevert?: boolean } | undefined
  if (!meta?.isRevert && TRACKED_ACTIONS.some((tracked) => typedAction.type?.endsWith?.(tracked))) {
    // Store the action with its result for replay
    next(pushState({
      type: typedAction.type,
      payload: typedAction.payload,
      meta: typedAction.meta,
      timestamp: Date.now(),
    }))
  }

  return result
}
