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

/**
 * Emit a notification event to the socket server
 * The server will then forward it to the target user's room
 */
export function emitNotification(data: {
  userId: string
  type: string
  message: string
  link?: string
  notificationId: string
}) {
  const s = getSocket()
  s.emit('notification', data)
}
