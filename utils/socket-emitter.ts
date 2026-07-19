import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

function getSocket(): Socket {
  if (!socket) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : undefined
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
    })
  }
  return socket
}

function emitOrQueue(s: Socket, event: string, data: any) {
  if (s.connected) {
    s.emit(event, data)
  } else {
    const timeout = setTimeout(() => {
      console.warn(`Socket timeout: event "${event}" dropped`)
    }, 10000)
    s.once('connect', () => {
      clearTimeout(timeout)
      s.emit(event, data)
    })
    s.connect()
  }
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
    emitOrQueue(s, 'notification', data)
  } catch (error) {
    console.error('Socket notification error:', error)
  }
}

export function emitBoardEvent(event: string, data: any) {
  try {
    const s = getSocket()
    emitOrQueue(s, event, data)
  } catch (error) {
    console.error(`Socket event error (${event}):`, error)
  }
}
