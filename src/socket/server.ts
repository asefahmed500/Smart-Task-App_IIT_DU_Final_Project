import { Server } from 'socket.io'
import { createServer } from 'http'

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
})

const boardRooms = new Map<string, Set<string>>()

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('join-board', (boardId: string) => {
    socket.join(`board:${boardId}`)
    if (!boardRooms.has(boardId)) {
      boardRooms.set(boardId, new Set())
    }
    boardRooms.get(boardId)!.add(socket.id)
    console.log(`Socket ${socket.id} joined board ${boardId}`)
  })

  socket.on('leave-board', (boardId: string) => {
    socket.leave(`board:${boardId}`)
    boardRooms.get(boardId)?.delete(socket.id)
    console.log(`Socket ${socket.id} left board ${boardId}`)
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

  socket.on('notification', (data: {
    userId: string
    type: string
    message: string
    link?: string
  }) => {
    io.emit(`notification:${data.userId}`, data)
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
    boardRooms.forEach((sockets) => sockets.delete(socket.id))
  })
})

const PORT = process.env.SOCKET_PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`)
})

export { io }