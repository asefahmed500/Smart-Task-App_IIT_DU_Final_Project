import { io, Socket } from 'socket.io-client'
import { fetchSocketToken } from '@/utils/socket-auth'

let socket: Socket | null = null

async function getSocket(): Promise<Socket> {
  if (!socket) {
    // Server-side (server actions): use the internal token so the standalone
    // Socket.IO server authenticates without a user JWT (which only exists in
    // the httpOnly cookie, unreachable from server action code).
    // Browser-side: fetch the token from the same-origin /api/auth/socket-token
    // route (reads the httpOnly cookie) — never localStorage.
    const isServer = typeof window === 'undefined'
    const token = isServer ? process.env.SOCKET_INTERNAL_TOKEN : await fetchSocketToken()
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

async function emitOrQueue(s: Socket, event: string, data: any) {
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

export async function emitNotification(data: {
  userId: string
  type: string
  message: string
  link?: string
  notificationId: string
}) {
  try {
    const s = await getSocket()
    await emitOrQueue(s, 'notification', data)
  } catch (error) {
    console.error('Socket notification error:', error)
  }
}

export async function emitBoardEvent(event: string, data: any) {
  try {
    const s = await getSocket()
    await emitOrQueue(s, event, data)
  } catch (error) {
    console.error(`Socket event error (${event}):`, error)
  }
}
