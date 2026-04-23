/**
 * Standalone Socket.IO Server for SmartTask
 * Run with: node server/socket-server.js
 */

const { Server } = require('socket.io')
const { createServer } = require('http')
const { parse } = require('cookie')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3001

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Create HTTP server
const httpServer = createServer(async (req, res) => {
  // Handle Socket.IO requests
  if (req.url === '/socket.io/') {
    // Let Socket.IO handle it
    return false
  }

  // Handle Next.js requests
  await handle(req, res)
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

// Better Auth session validation
async function validateSession(token) {
  try {
    const { getSession } = require('./lib/auth.ts')
    const session = await getSession(token)
    return session
  } catch (err) {
    console.error('Session validation error:', err)
    return null
  }
}

// Socket.IO authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization

    if (!token) {
      return next(new Error('Authentication error: No token provided'))
    }

    const session = await validateSession(token)

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

io.on('connection', (socket) => {
  const user = socket.data.user
  const userId = socket.data.userId
  console.log(`✅ Socket connected: ${socket.id} (User: ${user?.email || 'anonymous'})`)

  // Join user-specific notification room
  if (userId) {
    socket.join(`user:${userId}`)
    console.log(`🔔 User ${userId} joined notification room`)
  }

  socket.on('board:join', ({ boardId }) => {
    socket.join(`board:${boardId}`)
    console.log(`📋 User joined board: ${boardId}`)
  })

  socket.on('board:leave', ({ boardId }) => {
    socket.leave(`board:${boardId}`)
    console.log(`🚪 User left board: ${boardId}`)
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
