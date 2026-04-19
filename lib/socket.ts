import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10
const BASE_RECONNECT_DELAY = 1000 // 1 second

export const initSocket = () => {
  if (!socket) {
    // Get auth token from cookie for Socket.IO authentication
    const getAuthToken = () => {
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(^|;) *auth_token=([^;]*)/)
        return match ? match[2] : null
      }
      return null
    }

    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      path: '/api/socket',
      addTrailingSlash: false,
      transports: ['websocket', 'polling'],
      auth: {
        token: getAuthToken(),
      },
      // Reconnection configuration with exponential backoff
      reconnection: true,
      reconnectionDelay: BASE_RECONNECT_DELAY,
      reconnectionDelayMax: 30000, // Max 30 seconds between attempts
      maxReconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      timeout: 10000, // Connection timeout
    })

    socket.on('connect', () => {
      console.log('Connected to socket server')
      reconnectAttempts = 0 // Reset on successful connection
    })

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason)

      // If server initiated disconnect, don't reconnect
      if (reason === 'io server disconnect') {
        socket?.disconnect()
      }
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      reconnectAttempts++

      // Exponential backoff for manual reconnection handling
      const delay = Math.min(
        BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
        30000 // Max 30 seconds
      )

      console.log(`Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}. Next attempt in ${delay}ms`)
    })

    socket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`)
      reconnectAttempts = 0
    })

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Reconnection attempt ${attemptNumber}`)
    })

    socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect to socket server after maximum attempts')
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
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

export const emitTaskUpdate = (data: any) => {
  const socket = getSocket()
  socket?.emit('task:update', data)
}

export const emitTaskMove = (data: any) => {
  const socket = getSocket()
  socket?.emit('task:move', data)
}

export const onPresenceUpdate = (callback: (data: any) => void) => {
  const socket = getSocket()
  socket?.on('presence:update', callback)
  return () => socket?.off('presence:update', callback)
}

export const onTaskUpdate = (callback: (data: any) => void) => {
  const socket = getSocket()
  socket?.on('task:updated', callback)
  return () => socket?.off('task:updated', callback)
}

export const onCursorMove = (callback: (data: any) => void) => {
  const socket = getSocket()
  socket?.on('presence:cursor', callback)
  return () => socket?.off('presence:cursor', callback)
}

export const onNotification = (callback: (data: any) => void) => {
  const socket = getSocket()
  socket?.on('notification:new', callback)
  return () => socket?.off('notification:new', callback)
}

export const emitCursorMove = (data: any) => {
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
