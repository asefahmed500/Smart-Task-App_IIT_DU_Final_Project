import dotenv from 'dotenv'

if (process.env.NODE_ENV === 'production') {
  dotenv.config()
} else {
  dotenv.config()
  dotenv.config({ path: '.env.local' })
}

import { Server, Socket } from 'socket.io'
import { createServer } from 'http'
import { PrismaClient } from '../../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { jwtVerify } from 'jose'

const connectionString = process.env.DATABASE_URL!
const isSupabase = connectionString.includes('supabase.com')
const pgPool = new pg.Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ...(isSupabase ? { ssl: { rejectUnauthorized: false } as any } : {}),
})
const pgAdapter = new PrismaPg(pgPool)
const prisma = new PrismaClient({ adapter: pgAdapter })

const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map(s => s.trim())
  : ['*']

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }))
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('Socket.IO server running')
  }
})
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
})

interface PresenceUser {
  id: string
  name: string
  image: string | null
}

// JWT auth middleware
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is required for Socket.IO server')
}
const jwtKey = new TextEncoder().encode(jwtSecret)
// Internal token allowing the Next.js server-side socket emitter to authenticate
// without a user JWT (which is only available in the browser via localStorage).
const socketInternalToken = process.env.SOCKET_INTERNAL_TOKEN

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token
    if (!token) {
      return next(new Error('Authentication required'))
    }
    // Allow the internal server-side emitter to connect without a user JWT
    if (socketInternalToken && token === socketInternalToken) {
      socket.data.user = { id: 'system', name: 'Server', image: null }
      socket.data.role = 'SYSTEM'
      socket.data.isInternal = true
      return next()
    }
    const { payload } = await jwtVerify(token, jwtKey, { algorithms: ['HS256'] })
    const payloadData = payload as unknown as {
      id: string
      email: string
      name: string | null
      role: string
    }
    socket.data.user = {
      id: payloadData.id,
      name: payloadData.name || payloadData.email,
      image: null,
    }
    socket.data.role = payloadData.role
    next()
  } catch {
    next(new Error('Invalid or expired token'))
  }
})

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

  socket.on('column:updated', (data: {
    boardId: string
    columnId: string
  }) => {
    socket.to(`board:${data.boardId}`).emit('column:updated', data)
  })

  socket.on('column:deleted', (data: {
    boardId: string
    columnId: string
  }) => {
    socket.to(`board:${data.boardId}`).emit('column:deleted', data)
  })

  socket.on('columns:reordered', (data: {
    boardId: string
    columnIds: string[]
  }) => {
    socket.to(`board:${data.boardId}`).emit('columns:reordered', data)
  })

  socket.on('board:updated', (data: {
    boardId: string
  }) => {
    socket.to(`board:${data.boardId}`).emit('board:updated', data)
  })

  socket.on('board:deleted', (data: {
    boardId: string
  }) => {
    socket.to(`board:${data.boardId}`).emit('board:deleted', data)
  })

  socket.on('board:member_added', (data: {
    boardId: string
    userId: string
  }) => {
    socket.to(`board:${data.boardId}`).emit('board:member_added', data)
  })

  socket.on('board:member_removed', (data: {
    boardId: string
    userId: string
  }) => {
    socket.to(`board:${data.boardId}`).emit('board:member_removed', data)
  })

  socket.on('tag:created', (data: {
    boardId: string
    tagId: string
  }) => {
    socket.to(`board:${data.boardId}`).emit('tag:created', data)
  })

  socket.on('tag:deleted', (data: {
    boardId: string
    tagId: string
  }) => {
    socket.to(`board:${data.boardId}`).emit('tag:deleted', data)
  })

  // Sprint event relay
  socket.on('sprint:created', (data: { boardId: string; sprint: any }) => {
    socket.to(`board:${data.boardId}`).emit('sprint:created', data)
  })
  socket.on('sprint:updated', (data: { boardId: string; sprint: any }) => {
    socket.to(`board:${data.boardId}`).emit('sprint:updated', data)
  })
  socket.on('sprint:deleted', (data: { boardId: string; sprintId: string }) => {
    socket.to(`board:${data.boardId}`).emit('sprint:deleted', data)
  })
  socket.on('sprint:statusChanged', (data: { boardId: string; sprintId: string; status: string }) => {
    socket.to(`board:${data.boardId}`).emit('sprint:statusChanged', data)
  })
  socket.on('task:sprintAssigned', (data: { boardId: string; taskId: string; sprintId: string }) => {
    socket.to(`board:${data.boardId}`).emit('task:sprintAssigned', data)
  })
  socket.on('task:sprintRemoved', (data: { boardId: string; taskId: string }) => {
    socket.to(`board:${data.boardId}`).emit('task:sprintRemoved', data)
  })
  socket.on('task:issueFieldsUpdated', (data: { boardId: string; taskId: string }) => {
    socket.to(`board:${data.boardId}`).emit('task:issueFieldsUpdated', data)
  })
  socket.on('task:blockerToggled', (data: { boardId: string; taskId: string; isBlocked: boolean }) => {
    socket.to(`board:${data.boardId}`).emit('task:blockerToggled', data)
  })

  // Epic event relay
  socket.on('epic:created', (data: { boardId: string; epic: any }) => {
    socket.to(`board:${data.boardId}`).emit('epic:created', data)
  })
  socket.on('epic:updated', (data: { boardId: string; epic: any }) => {
    socket.to(`board:${data.boardId}`).emit('epic:updated', data)
  })
  socket.on('epic:deleted', (data: { boardId: string; epicId: string }) => {
    socket.to(`board:${data.boardId}`).emit('epic:deleted', data)
  })

  // Issue link event relay
  socket.on('issueLink:created', (data: { boardId: string; link: any }) => {
    socket.to(`board:${data.boardId}`).emit('issueLink:created', data)
  })
  socket.on('issueLink:deleted', (data: { boardId: string; linkId: string }) => {
    socket.to(`board:${data.boardId}`).emit('issueLink:deleted', data)
  })

  // Register user for personal notifications
  socket.on('register-user', (userId: string) => {
    if (userId !== socket.data.user?.id) {
      console.warn(`Socket ${socket.id} tried to register as user ${userId} but JWT is ${socket.data.user?.id}`)
      return
    }
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set())
    }
    userSockets.get(userId)!.add(socket.id)
    socket.join(`user:${userId}`)
    console.log(`Socket ${socket.id} registered for user ${userId}`)
  })

  // Notification relay — only the trusted internal server-side emitter may
  // target arbitrary users. Browser clients may only relay their own
  // notifications (prevents any logged-in user from pushing fake toasts into
  // another user's browser).
  socket.on('notification', (data: {
    userId: string
    type: string
    message: string
    link?: string
    notificationId?: string
  }) => {
    const senderId = socket.data.user?.id
    const isInternal = socket.data.isInternal === true
    if (!isInternal && data.userId !== senderId) {
      console.warn(`Socket ${socket.id} (user ${senderId}) attempted to notify user ${data.userId} — blocked`)
      return
    }
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
// Column names that count as "done/finished" — must stay in sync with
// utils/column-utils.ts (the server cannot import @/ aliased modules).
const DONE_COLUMN_TOKENS = ['done', 'completed', 'resolved', 'launch', 'closed', 'shipped']

function isDoneColumnName(name: string): boolean {
  const n = (name || '').trim().toLowerCase()
  return DONE_COLUMN_TOKENS.some((t) => n === t || n.includes(t))
}

// Prisma `name` filter matching any column whose name is NOT a done synonym.
// Uses a client-side filter after fetch because the token set is dynamic.
const notDoneColumnFilter = {
  // broad server-side exclusion of the most common literal names; refined
  // client-side below for case-insensitive substring variants.
  NOT: [{ name: 'Done' }, { name: 'Completed' }, { name: 'Resolved' }],
}

async function runBackgroundChecks() {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // ---------- Overdue checks ----------
  try {
    console.log('[Worker] Running background notification checks...')
    const overdueTasks = await prisma.task.findMany({
      where: {
        dueDate: { lt: now },
        column: notDoneColumnFilter,
      },
      include: { assignee: true, column: true },
    })

    let overdueCount = 0
    for (const task of overdueTasks) {
      // per-task isolation: one failure must not abort the rest
      try {
        if (!task.assignee) continue
        if (isDoneColumnName(task.column.name)) continue

        const prefs = await prisma.notificationPreference.findUnique({
          where: { userId: task.assignee.id },
        })
        if (prefs?.overdueReminder === false) continue

        // Dedup by dedupKey (not embedded in the user-facing message)
        const existing = await prisma.notification.findFirst({
          where: {
            userId: task.assignee.id,
            type: 'OVERDUE',
            dedupKey: `overdue:${task.id}`,
            createdAt: { gte: oneDayAgo },
          },
        })
        if (existing) continue

        const message = `Task "${task.title}" is overdue`
        const link = `/dashboard/board/${task.column.boardId}`
        const notification = await prisma.notification.create({
          data: { userId: task.assignee.id, type: 'OVERDUE', message, link, dedupKey: `overdue:${task.id}` },
        })
        io.to(`user:${task.assignee.id}`).emit('notification', {
          userId: task.assignee.id,
          type: 'OVERDUE',
          message,
          link,
          notificationId: notification.id,
        })
        overdueCount++
      } catch (taskError) {
        console.error(`[Worker] Overdue check failed for task ${task.id}:`, taskError)
      }
    }

    // ---------- Due-soon checks (next 24h) ----------
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const upcomingTasks = await prisma.task.findMany({
      where: {
        dueDate: { gte: now, lt: tomorrow },
        column: notDoneColumnFilter,
      },
      include: { assignee: true, column: true },
    })

    let reminderCount = 0
    for (const task of upcomingTasks) {
      try {
        if (!task.assignee) continue
        if (isDoneColumnName(task.column.name)) continue

        const prefs = await prisma.notificationPreference.findUnique({
          where: { userId: task.assignee.id },
        })
        if (prefs?.dueDateReminder === false) continue

        const existing = await prisma.notification.findFirst({
          where: {
            userId: task.assignee.id,
            type: 'DUE_DATE_REMINDER',
            dedupKey: `due:${task.id}`,
            createdAt: { gte: oneDayAgo },
          },
        })
        if (existing) continue

        const message = `Task "${task.title}" is due soon`
        const link = `/dashboard/board/${task.column.boardId}`
        const notification = await prisma.notification.create({
          data: { userId: task.assignee.id, type: 'DUE_DATE_REMINDER', message, link, dedupKey: `due:${task.id}` },
        })
        io.to(`user:${task.assignee.id}`).emit('notification', {
          userId: task.assignee.id,
          type: 'DUE_DATE_REMINDER',
          message,
          link,
          notificationId: notification.id,
        })
        reminderCount++
      } catch (taskError) {
        console.error(`[Worker] Due-soon check failed for task ${task.id}:`, taskError)
      }
    }

    if (reminderCount > 0 || overdueCount > 0) {
      console.log(`[Worker] Notifications: ${reminderCount} reminders, ${overdueCount} overdue`)
    }
  } catch (error) {
    console.error('[Worker] Error running background checks:', error)
  }

  // ---------- Midnight audit-log cleanup (90-day retention) ----------
  try {
    const cleanupNow = new Date()
    // Run within a 2-minute window around midnight to avoid missing the exact tick
    const nearMidnight = cleanupNow.getHours() === 0 && cleanupNow.getMinutes() <= 1
    if (nearMidnight) {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      const { count } = await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: ninetyDaysAgo } },
      })
      if (count > 0) {
        console.log(`[Worker] Cleaned up ${count} audit logs older than 90 days`)
      }
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

const PORT = parseInt(process.env.SOCKET_PORT || process.env.PORT || '3001', 10)

httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`)
})

export { io }