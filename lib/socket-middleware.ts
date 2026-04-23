'use client'

import { Middleware } from '@reduxjs/toolkit'
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
} from '@/lib/socket'
import { tasksApi } from '@/lib/slices/tasksApi'
import { boardsApi } from '@/lib/slices/boardsApi'

let presenceCleanup: (() => void) | null = null
let cursorCleanup: (() => void) | null = null
let taskCleanup: (() => void) | null = null
let boardCleanup: (() => void) | null = null

export const socketMiddleware: Middleware = (store) => (next) => (action: any) => {
  const { dispatch } = store

  if (action.type === 'ui/setCurrentBoard' || action.type === 'presence/setCurrentBoard') {
    const boardId = action.payload
    
    // Cleanup previous listeners
    if (presenceCleanup) presenceCleanup()
    if (cursorCleanup) cursorCleanup()
    if (taskCleanup) taskCleanup()
    if (boardCleanup) boardCleanup()

    if (boardId) {
      const socket = getSocket()
      socket.emit('board:join', { boardId })

      presenceCleanup = onPresenceUpdate((data: any) => {
        if (data.type === 'join') next(userJoined(data.user))
        else if (data.type === 'leave') next(userLeft(data.userId))
      })

      cursorCleanup = onCursorMove((data: any) => {
        if (data.type === 'move') next(userCursorMoved({ userId: data.userId, cursor: data.cursor }))
        else if (data.type === 'editing:start') next(userStartedEditing({ userId: data.userId, taskId: data.taskId }))
        else if (data.type === 'editing:stop') next(userStoppedEditing(data.userId))
      })

      // Real-time task updates
      const unsubTaskUpdate = onTaskUpdate((data: any) => {
        dispatch(tasksApi.util.invalidateTags([{ type: 'Task', id: data.id }, 'Board']))
      })

      const unsubTaskDelete = onTaskDelete((taskId: string) => {
        dispatch(tasksApi.util.invalidateTags(['Task', 'Board']))
      })

      const unsubCommentUpdate = onCommentUpdate((data: any) => {
        dispatch(tasksApi.util.invalidateTags([{ type: 'Task', id: `COMMENTS_${data.taskId}` }]))
      })

      const unsubAttachmentUpdate = onAttachmentUpdate((data: any) => {
        dispatch(tasksApi.util.invalidateTags([{ type: 'Task', id: `ATTACHMENTS_${data.taskId}` }]))
      })

      const unsubDependencyUpdate = onDependencyUpdate((data: any) => {
        dispatch(tasksApi.util.invalidateTags([{ type: 'Task', id: data.taskId }]))
      })

      const unsubTimeLogUpdate = onTimeLogUpdate((data: any) => {
        dispatch(tasksApi.util.invalidateTags([
          { type: 'Task', id: data.taskId },
          { type: 'Task', id: `TIME_LOGS_${data.taskId}` }
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
      const unsubBoardUpdate = (data: any) => {
        if (data?.id) {
          dispatch(boardsApi.util.invalidateTags([{ type: 'Board', id: data.id }]))
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

  if (action.type === 'auth/logout/fulfilled') {
    if (presenceCleanup) presenceCleanup()
    if (cursorCleanup) cursorCleanup()
    if (taskCleanup) taskCleanup()
    if (boardCleanup) boardCleanup()
    getSocket().emit('board:leave')
    // Disconnect socket on logout to prevent memory leaks
    const { disconnectSocket } = require('@/lib/socket')
    disconnectSocket()
  }

  return next(action)
}
