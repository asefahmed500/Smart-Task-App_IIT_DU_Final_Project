/**
 * Custom Next.js server with Socket.IO integration
 * Run with: node server.js
 *
 * This replaces the default Next.js dev server to enable Socket.IO real-time features
 */
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'
import type { Server as HTTPServer } from 'http'
import type { Socket } from 'socket.io'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

interface SocketWithData extends Socket {
  data: {
    user?: {
      id: string
      email: string
      name: string | null
      role: string
      avatar: string | null
    }
    userId?: string
  }
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      // Parse URL for Next.js
      const parsedUrl = parse(req.url || '/', true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize Socket.IO with the HTTP server
  const io = new Server(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? (process.env.ALLOWED_ORIGIN?.split(',') || [])
        : ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  // Socket.IO authentication middleware
  io.use(async (socket: SocketWithData, next) => {
    try {
      // Better Auth uses session cookies that are automatically sent by the browser
      const cookieHeader = socket.handshake.headers.cookie

      if (!cookieHeader) {
        return next(new Error('Authentication error: No session cookie'))
      }

      // Import auth dynamically (requires transpiled JS)
      const { auth } = await import('./lib/auth.js')

      // Create a Headers object from the cookie header
      const headers = new Headers()
      headers.set('cookie', cookieHeader)

      // Get session using Better Auth
      const session = await auth.api.getSession({ headers })

      if (!session) {
        return next(new Error('Authentication error: Invalid session'))
      }

      // Attach user data to socket
      const user = session.user as any
      socket.data.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: user?.role || 'MEMBER',
        avatar: user?.avatar || user?.image || null,
      }
      socket.data.userId = session.user.id
      next()
    } catch (err) {
      console.error('Socket authentication error:', err)
      return next(new Error('Authentication error'))
    }
  })

  // Socket.IO connection handler
  io.on('connection', (socket: SocketWithData) => {
    const user = socket.data.user
    const userId = socket.data.userId
    console.log(`✅ Socket connected: ${socket.id} (User: ${user?.email || 'anonymous'})`)

    // Join user-specific notification room
    if (userId) {
      socket.join(`user:${userId}`)
      console.log(`🔔 User ${userId} joined notification room`)
    }

    // Board room management
    socket.on('board:join', ({ boardId }: { boardId: string }) => {
      socket.join(`board:${boardId}`)
      console.log(`📋 User joined board: ${boardId}`)
    })

    socket.on('board:leave', ({ boardId }: { boardId: string }) => {
      socket.leave(`board:${boardId}`)
      console.log(`🚪 User left board: ${boardId}`)
    })

    // Real-time presence
    socket.on('presence:cursor', ({ boardId, ...data }: { boardId: string; [key: string]: unknown }) => {
      socket.to(`board:${boardId}`).emit('presence:cursor', data)
    })

    socket.on('presence:editing:start', ({ boardId, ...data }: { boardId: string; [key: string]: unknown }) => {
      socket.to(`board:${boardId}`).emit('presence:editing:start', data)
    })

    socket.on('presence:editing:stop', ({ boardId, ...data }: { boardId: string; [key: string]: unknown }) => {
      socket.to(`board:${boardId}`).emit('presence:editing:stop', data)
    })

    // Task updates
    socket.on('task:update', ({ boardId, ...data }: { boardId: string; [key: string]: unknown }) => {
      socket.to(`board:${boardId}`).emit('task:updated', data)
    })

    socket.on('task:move', ({ boardId, ...data }: { boardId: string; [key: string]: unknown }) => {
      socket.to(`board:${boardId}`).emit('task:moved', data)
    })

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`)
    })
  })

  // Start the server with port retry logic
  const startServer = (currentPort: number) => {
    const server = httpServer.listen(currentPort, () => {
      console.log(`\n🚀 SmartTask server running on http://${hostname}:${currentPort}`)
      console.log(`📡 Socket.IO path: /api/socket`)
      console.log(`🔧 Environment: ${dev ? 'development' : 'production'}\n`)
    })

    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`⚠️  Port ${currentPort} is busy, trying ${currentPort + 1}...`)
        startServer(currentPort + 1)
      } else {
        console.error('HTTP server error:', err)
        process.exit(1)
      }
    })
  }

  startServer(port)
})
