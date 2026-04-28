import { io, Socket } from 'socket.io-client'
import { CONSTANTS } from './constants'
import type { Task, Board, BoardMember } from './slices/boardsApi'
import type { AutomationRule } from './automation/engine'

let socket: Socket | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = CONSTANTS.SOCKET_MAX_RECONNECT_ATTEMPTS
const BASE_RECONNECT_DELAY = CONSTANTS.SOCKET_RECONNECT_DELAY

export const initSocket = () => {
  if (!socket) {
    // Get auth token from cookie for Socket.IO authentication
    // Note: better-auth uses cookies, but Socket.IO needs the token in auth handshake
    // The server will validate the session cookie directly
    const getAuthToken = () => {
      // Cookies are automatically sent by the browser
      // We don't need to manually extract them for Socket.IO
      return null // Server middleware validates session cookie
    }

    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      path: '/api/socket',
      addTrailingSlash: false,
      transports: ['websocket', 'polling'],
      // Note: Cookies are automatically sent by the browser
      // No auth token needed in handshake - server validates session cookie
      // Reconnection configuration with exponential backoff
      reconnection: true,
      reconnectionDelay: BASE_RECONNECT_DELAY,
      reconnectionDelayMax: CONSTANTS.SOCKET_RECONNECT_DELAY_MAX,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      timeout: CONSTANTS.SOCKET_CONNECTION_TIMEOUT,
    })

    socket.on('connect', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Connected to socket server')
      }
      reconnectAttempts = 0 // Reset on successful connection
    })

    socket.on('disconnect', (reason) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Disconnected from socket server:', reason)
      }

      // If server initiated disconnect, don't reconnect
      if (reason === 'io server disconnect') {
        socket?.disconnect()
      }
    })

    socket.on('connect_error', (error) => {
      // Only log first error to avoid spam
      if (reconnectAttempts === 0 && process.env.NODE_ENV === 'development') {
        console.warn('Socket.IO server unavailable - real-time features disabled', error)
      }
      reconnectAttempts++
    })

    socket.on('reconnect', (attemptNumber) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Reconnected after ${attemptNumber} attempts`)
      }
      reconnectAttempts = 0
    })

    socket.on('reconnect_attempt', (attemptNumber) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Reconnection attempt ${attemptNumber}`)
      }
    })

    socket.on('reconnect_failed', () => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to reconnect to socket server after maximum attempts')
      }
    })

    socket.on('error', (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Socket error:', error)
      }
    })
  }

  return socket
}

export const getSocket = () => {
  if (!socket) {
    return initSocket()
  }
  return socket
}

export const isConnected = () => {
  return socket?.connected ?? false
}

export const joinBoard = (boardId: string) => {
  const socket = getSocket()
  socket?.emit('board:join', { boardId })
}

export const leaveBoard = (boardId: string) => {
  const socket = getSocket()
  socket?.emit('board:leave', { boardId })
}

export const emitTaskUpdate = (data: unknown) => {
  const socket = getSocket()
  socket?.emit('task:update', data)
}

export const emitTaskMove = (data: unknown) => {
  const socket = getSocket()
  socket?.emit('task:move', data)
}

export const onPresenceUpdate = (callback: (data: unknown) => void) => {
  const socket = getSocket()
  socket?.on('presence:update', callback)
  return () => socket?.off('presence:update', callback)
}

export const onTaskUpdate = (callback: (data: Task) => void) => {
  const socket = getSocket()
  socket?.on('task:updated', callback)
  return () => socket?.off('task:updated', callback)
}

export const onTaskMove = (callback: (data: Task) => void) => {
  const socket = getSocket()
  socket?.on('task:moved', callback)
  return () => socket?.off('task:moved', callback)
}

export const onCursorMove = (callback: (data: unknown) => void) => {
  const socket = getSocket()
  socket?.on('presence:cursor', callback)
  return () => socket?.off('presence:cursor', callback)
}

export const onNotification = (callback: (data: any) => void) => {
  const socket = getSocket()
  socket?.on('notification:new', callback)
  return () => socket?.off('notification:new', callback)
}

export const emitCursorMove = (data: unknown) => {
  const socket = getSocket()
  socket?.emit('presence:cursor', data)
}

export const emitEditingStart = (taskId: string) => {
  const socket = getSocket()
  socket?.emit('presence:editing:start', { taskId })
}

export const emitEditingStop = (taskId: string) => {
  const socket = getSocket()
  socket?.emit('presence:editing:stop', { taskId })
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const onBoardUpdate = (callback: (data: Board) => void) => {
  const socket = getSocket()
  socket?.on('board:updated', callback)
  return () => socket?.off('board:updated', callback)
}

export const onMemberUpdate = (callback: (data: BoardMember[]) => void) => {
  const socket = getSocket()
  socket?.on('members:updated', callback)
  return () => socket?.off('members:updated', callback)
}

export const onAutomationUpdate = (callback: (data: AutomationRule[]) => void) => {
  const socket = getSocket()
  socket?.on('automations:updated', callback)
  return () => socket?.off('automations:updated', callback)
}

export const onTaskDelete = (callback: (taskId: string) => void) => {
  const socket = getSocket()
  socket?.on('task:deleted', callback)
  return () => socket?.off('task:deleted', callback)
}

export const onCommentUpdate = (callback: (data: { taskId: string }) => void) => {
  const socket = getSocket()
  socket?.on('comment:updated', callback)
  return () => socket?.off('comment:updated', callback)
}

export const onAttachmentUpdate = (callback: (data: { taskId: string }) => void) => {
  const socket = getSocket()
  socket?.on('attachment:updated', callback)
  return () => { socket?.off('attachment:updated', callback) }
}

export const onDependencyUpdate = (callback: (data: { taskId: string }) => void) => {
  const socket = getSocket()
  socket?.on('dependency:updated', callback)
  return () => socket?.off('dependency:updated', callback)
}

export const onTimeLogUpdate = (callback: (data: { taskId: string }) => void) => {
  const socket = getSocket()
  socket?.on('timelog:updated', callback)
  return () => socket?.off('timelog:updated', callback)
}