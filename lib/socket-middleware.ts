'use client'

import { Middleware, UnknownAction } from '@reduxjs/toolkit'
import {
  userJoined,
  userLeft,
  userCursorMoved,
  userStartedEditing,
  userStoppedEditing,
} from '@/lib/slices/presenceSlice'
import {
  getSocket,
  onPresenceUpdate,
  onCursorMove,
  onTaskUpdate,
  onTaskDelete,
  onBoardUpdate,
  onMemberUpdate,
  onAutomationUpdate,
  onCommentUpdate,
  onAttachmentUpdate,
  onDependencyUpdate,
  onTimeLogUpdate,
  disconnectSocket,
} from '@/lib/socket'
import { tasksApi } from '@/lib/slices/tasksApi'
import { boardsApi } from '@/lib/slices/boardsApi'

let presenceCleanup: (() => void) | null = null
let cursorCleanup: (() => void) | null = null
let taskCleanup: (() => void) | null = null
let boardCleanup: (() => void) | null = null

interface SocketPayload {
  type: string
  userId?: string
  taskId?: string
  id?: string
  user?: import('@/lib/slices/presenceSlice').LiveUser
  cursor?: { x: number; y: number }
}

export const socketMiddleware: Middleware = (store) => (next) => (action) => {
  const { dispatch } = store

  const typedAction = action as UnknownAction & { payload?: { boardId?: string } }

  if (typedAction.type === 'boards/setBoardId' || typedAction.type === 'boards/joinBoard') {
    const boardId = typedAction.payload?.boardId

    if (boardId) {
      const socket = getSocket()
      socket.emit('board:join', { boardId })

      presenceCleanup = onPresenceUpdate((data) => {
        const payload = data as SocketPayload
        if (payload.type === 'join' && payload.user) next(userJoined(payload.user))
        else if (payload.type === 'leave') next(userLeft(payload.userId || ''))
      })

      cursorCleanup = onCursorMove((data) => {
        const payload = data as SocketPayload
        if (payload.type === 'move') next(userCursorMoved({ userId: payload.userId || '', cursor: payload.cursor || { x: 0, y: 0 } }))
        else if (payload.type === 'editing:start') next(userStartedEditing({ userId: payload.userId || '', taskId: payload.taskId || '' }))
        else if (payload.type === 'editing:stop') next(userStoppedEditing(payload.userId || ''))
      })

      // Real-time task updates
      const unsubTaskUpdate = onTaskUpdate((data) => {
        const payload = data as { id: string }
        dispatch(tasksApi.util.invalidateTags([{ type: 'Task', id: payload.id }, 'Board']))
      })

      const unsubTaskDelete = onTaskDelete(() => {
        dispatch(tasksApi.util.invalidateTags(['Task', 'Board']))
      })

      const unsubCommentUpdate = onCommentUpdate((data) => {
        const payload = data as { taskId: string }
        dispatch(tasksApi.util.invalidateTags([{ type: 'Task', id: `COMMENTS_${payload.taskId}` }]))
      })

      const unsubAttachmentUpdate = onAttachmentUpdate((data) => {
        const payload = data as { taskId: string }
        dispatch(tasksApi.util.invalidateTags([{ type: 'Task', id: `ATTACHMENTS_${payload.taskId}` }]))
      })

      const unsubDependencyUpdate = onDependencyUpdate((data) => {
        const payload = data as { taskId: string }
        dispatch(tasksApi.util.invalidateTags([{ type: 'Task', id: payload.taskId }]))
      })

      const unsubTimeLogUpdate = onTimeLogUpdate((data) => {
        const payload = data as { taskId: string }
        dispatch(tasksApi.util.invalidateTags([
          { type: 'Task', id: payload.taskId },
          { type: 'Task', id: `TIME_LOGS_${payload.taskId}` }
        ]))
      })

      taskCleanup = () => {
        unsubTaskUpdate()
        unsubTaskDelete()
        unsubCommentUpdate()
        unsubAttachmentUpdate()
        unsubDependencyUpdate()
        unsubTimeLogUpdate()
      }

      // Real-time board structure updates
      const unsubBoardUpdate = (data: unknown) => {
        const payload = data as { id?: string }
        if (payload?.id) {
          dispatch(boardsApi.util.invalidateTags([{ type: 'Board', id: payload.id }]))
        } else {
          dispatch(boardsApi.util.invalidateTags(['Board']))
        }
        dispatch(tasksApi.util.invalidateTags(['Board']))
      }
      const unsubBoardUpdateListener = onBoardUpdate(unsubBoardUpdate)

      const unsubMemberUpdateListener = onMemberUpdate(() => {
        dispatch(boardsApi.util.invalidateTags([{ type: 'Board', id: boardId }]))
      })

      const unsubAutomationUpdateListener = onAutomationUpdate(() => {
        dispatch(boardsApi.util.invalidateTags([{ type: 'Board', id: `${boardId}-automations` }]))
      })

      boardCleanup = () => {
        unsubBoardUpdateListener()
        unsubMemberUpdateListener()
        unsubAutomationUpdateListener()
      }
    }
  }

  if (typedAction.type === 'auth/logout/fulfilled') {
    if (presenceCleanup) presenceCleanup()
    if (cursorCleanup) cursorCleanup()
    if (taskCleanup) taskCleanup()
    if (boardCleanup) boardCleanup()
    getSocket().emit('board:leave')
    // Disconnect socket on logout to prevent memory leaks
    disconnectSocket()
  }

  return next(action)
}
