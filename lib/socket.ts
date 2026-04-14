import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const initSocket = () => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      console.log('Connected to socket server')
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server')
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
