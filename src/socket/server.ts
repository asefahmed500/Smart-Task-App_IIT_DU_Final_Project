import { Server, Socket } from 'socket.io'
import { createServer } from 'http'

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

interface PresenceUser {
  id: string
  name: string
  image: string | null
}

const userSockets = new Map<string, Set<string>>() // userId -> Set of socket ids

function getUsersInBoard(boardId: string) {
  const roomName = `board:${boardId}`
  const sockets = io.sockets.adapter.rooms.get(roomName)
  const users = new Map<string, PresenceUser>()
  
  if (sockets) {
    for (const socketId of sockets) {
      const s = io.sockets.sockets.get(socketId)
      if (s?.data.user) {
        users.set(s.data.user.id, s.data.user)
      }
    }
  }
  return Array.from(users.values())
}

io.on('connection', (socket: Socket) => {
  console.log('Client connected:', socket.id)

  socket.on('join-board', (data: { boardId: string, user: PresenceUser }) => {
    const { boardId, user } = data
    socket.join(`board:${boardId}`)
    socket.data.user = user
    socket.data.boardId = boardId
    
    console.log(`User ${user.name} joined board ${boardId}`)
    
    // Notify others and send current list to the new user
    const currentUsers = getUsersInBoard(boardId)
    io.to(`board:${boardId}`).emit('presence:update', currentUsers)
  })

  socket.on('leave-board', (boardId: string) => {
    socket.leave(`board:${boardId}`)
    const user = socket.data.user
    socket.data.boardId = null
    
    if (user) {
      console.log(`User ${user.name} left board ${boardId}`)
    }
    
    const currentUsers = getUsersInBoard(boardId)
    io.to(`board:${boardId}`).emit('presence:update', currentUsers)
  })

  socket.on('task:moved', (data: {
    boardId: string
    taskId: string
    newColumnId: string
    oldColumnId: string
    userId: string
    userName: string
  }) => {
    socket.to(`board:${data.boardId}`).emit('task:moved', data)
  })

  socket.on('task:created', (data: {
    boardId: string
    taskId: string
    columnId: string
  }) => {
    socket.to(`board:${data.boardId}`).emit('task:created', data)
  })

  socket.on('task:updated', (data: {
    boardId: string
    taskId: string
  }) => {
    socket.to(`board:${data.boardId}`).emit('task:updated', data)
  })

  socket.on('task:deleted', (data: {
    boardId: string
    taskId: string
  }) => {
    socket.to(`board:${data.boardId}`).emit('task:deleted', data)
  })

  socket.on('column:created', (data: {
    boardId: string
    columnId: string
  }) => {
    socket.to(`board:${data.boardId}`).emit('column:created', data)
  })

  // Register user for personal notifications
  socket.on('register-user', (userId: string) => {
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set())
    }
    userSockets.get(userId)!.add(socket.id)
    socket.join(`user:${userId}`)
    console.log(`Socket ${socket.id} registered for user ${userId}`)
  })

  socket.on('notification', (data: {
    userId: string
    type: string
    message: string
    link?: string
    notificationId?: string
  }) => {
    console.log(`Emitting notification to user:${data.userId}`, data.type)
    io.to(`user:${data.userId}`).emit('notification', data)
  })

  socket.on('disconnect', () => {
    const boardId = socket.data.boardId
    const user = socket.data.user
    
    console.log('Client disconnected:', socket.id)
    
    // Clean up user socket mapping
    userSockets.forEach((sockets, userId) => {
      sockets.delete(socket.id)
      if (sockets.size === 0) {
        userSockets.delete(userId)
      }
    })

    if (boardId) {
      const currentUsers = getUsersInBoard(boardId)
      io.to(`board:${boardId}`).emit('presence:update', currentUsers)
    }
  })
})

const PORT = process.env.SOCKET_PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`)
})

export { io }