'use client'

import { Middleware } from '@reduxjs/toolkit'
import {
  userJoined,
  userLeft,
  userCursorMoved,
  userStartedEditing,
  userStoppedEditing,
} from '@/lib/slices/presenceSlice'
import { getSocket, onPresenceUpdate, onCursorMove } from '@/lib/socket'

let presenceCleanup: (() => void) | null = null
let cursorCleanup: (() => void) | null = null

export const socketMiddleware: Middleware = () => (next) => (action: any) => {
  if (action.type === 'ui/setCurrentBoard' || action.type === 'presence/setCurrentBoard') {
    const boardId = action.payload
    if (presenceCleanup) presenceCleanup()
    if (cursorCleanup) cursorCleanup()

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
    }
  }

  if (action.type === 'auth/logout/fulfilled') {
    if (presenceCleanup) presenceCleanup()
    if (cursorCleanup) cursorCleanup()
    getSocket().emit('board:leave')
    // Disconnect socket on logout to prevent memory leaks
    const { disconnectSocket } = require('@/lib/socket')
    disconnectSocket()
  }

  return next(action)
}
