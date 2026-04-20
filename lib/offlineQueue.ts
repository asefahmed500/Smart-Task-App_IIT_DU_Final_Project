'use client'

import { createStore } from 'redux'
import { Middleware } from '@reduxjs/toolkit'

interface QueuedAction {
  id: string
  timestamp: number
  action: any
  retryCount: number
}

interface OfflineState {
  isOnline: boolean
  queue: QueuedAction[]
  lastSync: number | null
}

const OFFLINE_QUEUE_KEY = 'smarttask_offline_queue'
const MAX_QUEUE_SIZE = 100
const MAX_RETRY_COUNT = 3

// Load queue from localStorage
function loadQueue(): QueuedAction[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Save queue to localStorage
function saveQueue(queue: QueuedAction[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
  } catch (error) {
    console.error('Failed to save offline queue:', error)
  }
}

// Create offline middleware
export function createOfflineMiddleware(): Middleware {
  return (store) => (next) => (action) => {
    const state = store.getState() as any
    const isOnline = state.ui?.isOnline ?? true

    // If offline and action is a mutation, queue it
    if (!isOnline && shouldQueueAction(action)) {
      const queue = loadQueue()
      if (queue.length < MAX_QUEUE_SIZE) {
        const queuedAction: QueuedAction = {
          id: `${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          action,
          retryCount: 0,
        }
        queue.push(queuedAction)
        saveQueue(queue)

        // Notify UI that action is queued
        store.dispatch({
          type: 'offline/actionQueued',
          payload: { actionId: queuedAction.id, action },
        })

        // Still pass through for optimistic UI updates
        return next(action)
      }
    }

    return next(action)
  }
}

// Check if action should be queued
function shouldQueueAction(action: any): boolean {
  if (!action.type) return false

  // RTK Query mutation patterns: tasksApi/createTask/pending, boardsApi/updateBoard/pending, etc.
  const mutationPrefixes = ['tasksApi/', 'boardsApi/', 'columnsApi/', 'adminApi/', 'usersApi/']
  const isMutationAction = action.type.endsWith('/pending') &&
                         mutationPrefixes.some(prefix => action.type.startsWith(prefix))

  return isMutationAction
}

// Replay queued actions when back online
export async function replayQueue(store: any) {
  const queue = loadQueue()
  if (queue.length === 0) return

  console.log(`Replaying ${queue.length} queued actions...`)

  for (const queuedAction of queue) {
    try {
      // Replay the action
      await store.dispatch(queuedAction.action)

      // Remove from queue on success
      const updatedQueue = loadQueue().filter((a) => a.id !== queuedAction.id)
      saveQueue(updatedQueue)

      store.dispatch({
        type: 'offline/actionReplayed',
        payload: { actionId: queuedAction.id },
      })
    } catch (error) {
      console.error(`Failed to replay action ${queuedAction.id}:`, error)

      // Increment retry count
      queuedAction.retryCount++

      if (queuedAction.retryCount >= MAX_RETRY_COUNT) {
        // Remove from queue after max retries
        const updatedQueue = loadQueue().filter((a) => a.id !== queuedAction.id)
        saveQueue(updatedQueue)

        store.dispatch({
          type: 'offline/actionFailed',
          payload: { actionId: queuedAction.id, error },
        })
      } else {
        // Update retry count in storage
        const updatedQueue = loadQueue().map((a) =>
          a.id === queuedAction.id ? queuedAction : a
        )
        saveQueue(updatedQueue)
      }
    }
  }
}

// Get queue size
export function getQueueSize(): number {
  return loadQueue().length
}

// Clear queue
export function clearQueue() {
  saveQueue([])
}
