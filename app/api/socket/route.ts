import { Server as NetServer } from 'http'
import { NextRequest } from 'next/server'
import { Server as IOServer } from 'socket.io'

export const dynamic = 'force-dynamic'

let io: IOServer

/**
 * Next.js 15+ App Router Socket.IO initialization "hack"
 * This attaches the IO server to the underlying HTTP server.
 */
export async function GET(req: NextRequest) {
  // @ts-ignore
  if (!global.io) {
    console.log('--- Initializing Socket.IO ---')

    // @ts-ignore
    const httpServer: NetServer = req.socket?.server

    if (!httpServer) {
      return new Response('HTTP Server not found', { status: 500 })
    }

    const ioInstance = new IOServer(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? process.env.ALLOWED_ORIGIN?.split(',') || ['https://smart-task.com']
          : ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST'],
        credentials: true,
      },
    })

    // Authentication middleware for Socket.IO
    ioInstance.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization

        if (!token) {
          return next(new Error('Authentication error: No token provided'))
        }

        const { getSession } = await import('@/lib/auth')
        const session = await getSession(token)

        if (!session) {
          return next(new Error('Authentication error: Invalid token'))
        }

        socket.data.user = session.user
        socket.data.userId = session.user.id
        next()
      } catch (err) {
        return next(new Error('Authentication error'))
      }
    })

    ioInstance.on('connection', (socket) => {
      const user = socket.data.user
      const userId = socket.data.userId
      console.log(`Socket connected: ${socket.id} (User: ${user?.email || 'anonymous'})`)

      // Join user-specific notification room
      if (userId) {
        socket.join(`user:${userId}`)
        console.log(`User ${userId} joined notification room`)
      }

      socket.on('board:join', ({ boardId }) => {
        socket.join(`board:${boardId}`)
        console.log(`User joined board: ${boardId}`)
      })

      socket.on('board:leave', ({ boardId }) => {
        socket.leave(`board:${boardId}`)
      })

      socket.on('presence:cursor', ({ boardId, ...data }) => {
        socket.to(`board:${boardId}`).emit('presence:cursor', data)
      })

      socket.on('presence:editing:start', ({ boardId, ...data }) => {
        socket.to(`board:${boardId}`).emit('presence:editing:start', data)
      })

      socket.on('presence:editing:stop', ({ boardId, ...data }) => {
        socket.to(`board:${boardId}`).emit('presence:editing:stop', data)
      })

      socket.on('task:update', ({ boardId, ...data }) => {
        socket.to(`board:${boardId}`).emit('task:updated', data)
      })

      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`)
      })
    })

    // @ts-ignore
    global.io = ioInstance
    io = ioInstance
  } else {
    // @ts-ignore
    io = global.io
  }

  return new Response('Socket server initialized', { status: 200 })
}
