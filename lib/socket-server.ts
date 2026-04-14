import { Server as IOServer } from 'socket.io'

/**
 * Access the global Socket.IO instance initialized in /api/socket
 */
export function getIO(): IOServer | null {
  // @ts-ignore
  return global.io || null
}

/**
 * Broadcast a task update to all clients in a board room
 */
export function broadcastTaskUpdate(boardId: string, task: any) {
  const io = getIO()
  if (io) {
    io.to(`board:${boardId}`).emit('task:updated', task)
  }
}

/**
 * Broadcast a task deletion
 */
export function broadcastTaskDelete(boardId: string, taskId: string) {
  const io = getIO()
  if (io) {
    io.to(`board:${boardId}`).emit('task:deleted', taskId)
  }
}
