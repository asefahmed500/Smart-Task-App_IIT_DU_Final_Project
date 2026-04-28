import { Server as IOServer } from 'socket.io'
import type { Task, Board, BoardMember } from './slices/boardsApi'
import type { AutomationRule } from './automation/engine'

declare global {
  // eslint-disable-next-line no-var
  var io: IOServer | undefined
}

/**
 * Access the global Socket.IO instance initialized in /api/socket
 */
export function getIO(): IOServer | null {
  return global.io ?? null
}

/**
 * Broadcast a task update to all clients in a board room
 */
export function broadcastTaskUpdate(boardId: string, task: Task) {
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

/**
 * Broadcast board settings update to all clients in a board room
 */
export function broadcastBoardUpdate(boardId: string, board: Board) {
  const io = getIO()
  if (io) {
    io.to(`board:${boardId}`).emit('board:updated', board)
  }
}

/**
 * Broadcast member changes to all clients in a board room
 */
export function broadcastMemberUpdate(boardId: string, members: BoardMember[]) {
  const io = getIO()
  if (io) {
    io.to(`board:${boardId}`).emit('members:updated', members)
  }
}

/**
 * Broadcast automation changes to all clients in a board room
 */
export function broadcastAutomationUpdate(boardId: string, automations: AutomationRule[]) {
  const io = getIO()
  if (io) {
    io.to(`board:${boardId}`).emit('automations:updated', automations)
  }
}
/**
 * Broadcast a comment update (new/edited/deleted)
 */
export function broadcastCommentUpdate(boardId: string, taskId: string) {
  const io = getIO()
  if (io) {
    io.to(`board:${boardId}`).emit('comment:updated', { taskId })
  }
}

/**
 * Broadcast an attachment update
 */
export function broadcastAttachmentUpdate(boardId: string, taskId: string) {
  const io = getIO()
  if (io) {
    io.to(`board:${boardId}`).emit('attachment:updated', { taskId })
  }
}

/**
 * Broadcast a dependency update
 */
export function broadcastDependencyUpdate(boardId: string, taskId: string) {
  const io = getIO()
  if (io) {
    io.to(`board:${boardId}`).emit('dependency:updated', { taskId })
  }
}
/**
 * Broadcast a time log update
 */
export function broadcastTimeLogUpdate(boardId: string, taskId: string) {
  const io = getIO()
  if (io) {
    io.to(`board:${boardId}`).emit('timelog:updated', { taskId })
  }
}
