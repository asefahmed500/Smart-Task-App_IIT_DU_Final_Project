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

// Track who is editing which task: taskId -> Map<userId, PresenceUser>
const editingTasks = new Map<string, Map<string, PresenceUser>>()

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

  // Typing indicator: track who is editing which task
  socket.on('task:editing', (data: {
    boardId: string
    taskId: string
    user: PresenceUser
  }) => {
    if (!editingTasks.has(data.taskId)) {
      editingTasks.set(data.taskId, new Map())
    }
    editingTasks.get(data.taskId)!.set(data.user.id, data.user)
    socket.to(`board:${data.boardId}`).emit('editing:update', {
      taskId: data.taskId,
      editors: Array.from(editingTasks.get(data.taskId)!.values()),
    })
  })

  socket.on('task:stop-editing', (data: {
    boardId: string
    taskId: string
    userId: string
  }) => {
    const editors = editingTasks.get(data.taskId)
    if (editors) {
      editors.delete(data.userId)
      if (editors.size === 0) {
        editingTasks.delete(data.taskId)
      }
      socket.to(`board:${data.boardId}`).emit('editing:update', {
        taskId: data.taskId,
        editors: Array.from(editors.values()),
      })
    }
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

    // Clean up editing state
    if (user && boardId) {
      editingTasks.forEach((editors, taskId) => {
        if (editors.has(user.id)) {
          editors.delete(user.id)
          if (editors.size === 0) {
            editingTasks.delete(taskId)
          }
          io.to(`board:${boardId}`).emit('editing:update', {
            taskId,
            editors: Array.from(editors.values()),
          })
        }
      })
    }

    if (boardId) {
      const currentUsers = getUsersInBoard(boardId)
      io.to(`board:${boardId}`).emit('presence:update', currentUsers)
    }
  })
})

// --- Background Notification Worker ---
// This runs every minute to check for due date reminders and overdue tasks
async function runBackgroundChecks() {
  try {
    const { runNotificationChecks } = await import('../../utils/notification-utils')
    console.log('[Worker] Running background notification checks...')
    const results = await runNotificationChecks()
    if (results.dueDateReminders > 0 || results.overdueTasks > 0) {
      console.log(`[Worker] Notifications sent: ${results.dueDateReminders} reminders, ${results.overdueTasks} overdue`)
    }
  } catch (error) {
    console.error('[Worker] Error running background checks:', error)
  }

  // 90-day audit log cleanup (run once per day at midnight)
  try {
    const now = new Date()
    const isMidnight = now.getHours() === 0 && now.getMinutes() === 0
    if (isMidnight) {
      const { PrismaClient } = await import('../../generated/prisma')
      const prisma = new PrismaClient()
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      const { count } = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: ninetyDaysAgo } },
      })
      if (count > 0) {
        console.log(`[Worker] Cleaned up ${count} audit logs older than 90 days`)
      }
      await prisma.$disconnect()
    }
  } catch (error) {
    console.error('[Worker] Error cleaning up audit logs:', error)
  }
}

// Initial run after a short delay to let server stabilize
setTimeout(runBackgroundChecks, 5000)

// Run every 60 seconds
setInterval(runBackgroundChecks, 60000)
// --------------------------------------

const PORT = process.env.SOCKET_PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`)
})

export { io }