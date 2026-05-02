import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })
  }
  return socket
}

export function emitNotification(data: {
  userId: string
  type: string
  message: string
  link?: string
  notificationId: string
}) {
  try {
    const s = getSocket()
    s.emit('notification', data)
  } catch (error) {
    console.error('Socket notification error:', error)
  }
}

export function emitBoardEvent(event: string, data: any) {
  try {
    const s = getSocket()
    s.emit(event, data)
  } catch (error) {
    console.error(`Socket event error (${event}):`, error)
  }
}
