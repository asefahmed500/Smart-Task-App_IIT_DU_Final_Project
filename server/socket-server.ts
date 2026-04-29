/**
 * Standalone Socket.IO Server for SmartTask
 * Run with: npx tsx server/socket-server.ts
 */
import { Server } from 'socket.io'
import { createServer } from 'http'
import next from 'next'
import { auth } from '../lib/auth'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3001

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Create HTTP server
const httpServer = createServer(async (req, res) => {
  try {
    // Handle Socket.IO requests
    if (req.url?.startsWith('/socket.io/')) {
      // Let Socket.IO handle it
      return
    }

    // Handle Next.js requests
    await handle(req, res)
  } catch (err) {
    console.error('Server error:', err)
    res.statusCode = 500
    res.end('Internal Server Error')
  }
})

// Initialize Socket.IO
const io = new Server(httpServer, {
  path: '/socket.io/',
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.ALLOWED_ORIGIN?.split(',') || ['https://smart-task.com']
      : ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie

    if (!cookieHeader) {
      return next(new Error('Authentication error: No session cookie'))
    }

    // Create a Headers object from the cookie header
    const headers = new Headers()
    headers.set('cookie', cookieHeader)

    // Get session using Better Auth
    const session = await auth.api.getSession({ headers })

    if (!session) {
      return next(new Error('Authentication error: Invalid session'))
    }

    socket.data.user = session.user
    socket.data.userId = session.user.id
    next()
  } catch (err) {
    console.error('Socket auth error:', err)
    return next(new Error('Authentication error'))
  }
})

io.on('connection', (socket) => {
  const user = socket.data.user
  const userId = socket.data.userId
  console.log(`✅ Socket connected: ${socket.id} (User: ${user?.email || 'anonymous'})`)

  // Join user-specific notification room
  if (userId) {
    socket.join(`user:${userId}`)
    console.log(`🔔 User ${userId} joined notification room`)
  }

  socket.on('board:join', ({ boardId }: { boardId: string }) => {
    socket.join(`board:${boardId}`)
    console.log(`📋 User joined board: ${boardId}`)
  })

  socket.on('board:leave', ({ boardId }: { boardId: string }) => {
    socket.leave(`board:${boardId}`)
    console.log(`🚪 User left board: ${boardId}`)
  })

  socket.on('presence:cursor', ({ boardId, ...data }: { boardId: string; [key: string]: unknown }) => {
    socket.to(`board:${boardId}`).emit('presence:cursor', data)
  })

  socket.on('presence:editing:start', ({ boardId, ...data }: { boardId: string; [key: string]: unknown }) => {
    socket.to(`board:${boardId}`).emit('presence:editing:start', data)
  })

  socket.on('presence:editing:stop', ({ boardId, ...data }: { boardId: string; [key: string]: unknown }) => {
    socket.to(`board:${boardId}`).emit('presence:editing:stop', data)
  })

  socket.on('task:update', ({ boardId, ...data }: { boardId: string; [key: string]: unknown }) => {
    socket.to(`board:${boardId}`).emit('task:updated', data)
  })

  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`)
  })
})

httpServer
  .once('error', (err) => {
    console.error('HTTP server error:', err)
    process.exit(1)
  })
  .listen(port, () => {
    console.log(`\n🚀 Socket.IO Server running on http://${hostname}:${port}`)
    console.log(`📡 Socket.IO path: /socket.io/\n`)
  })
