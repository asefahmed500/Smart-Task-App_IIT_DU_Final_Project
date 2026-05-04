'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

interface PresenceUser {
  id: string
  name: string
  image: string | null
}

export function useSocket(boardId?: string, user?: PresenceUser) {
  const [isConnected, setIsConnected] = useState(false)
  const [presence, setPresence] = useState<PresenceUser[]>([])
  const [editingTasks, setEditingTasks] = useState<Record<string, PresenceUser[]>>({})
  const currentBoardRef = useRef<string | undefined>(undefined)

  const stableUser = useMemo(() => {
    if (!user) return undefined
    return { id: user.id, name: user.name, image: user.image }
  }, [user?.id, user?.name, user?.image])

  useEffect(() => {
    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
        transports: ['websocket', 'polling']
      })
    }

    const handleConnect = () => {
      setIsConnected(true)
    }

    const handleDisconnect = () => {
      setIsConnected(false)
    }

    const handlePresence = (users: PresenceUser[]) => {
      setPresence(users)
    }

    const handleEditingUpdate = (data: { taskId: string; editors: PresenceUser[] }) => {
      setEditingTasks((prev) => ({
        ...prev,
        [data.taskId]: data.editors,
      }))
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('presence:update', handlePresence)
    socket.on('editing:update', handleEditingUpdate)

    return () => {
      socket?.off('connect', handleConnect)
      socket?.off('disconnect', handleDisconnect)
      socket?.off('presence:update', handlePresence)
      socket?.off('editing:update', handleEditingUpdate)
      if (currentBoardRef.current) {
        socket?.emit('leave-board', currentBoardRef.current)
        currentBoardRef.current = undefined
      }
    }
  }, [])

  useEffect(() => {
    if (!boardId || !stableUser || !isConnected) return
    if (currentBoardRef.current && currentBoardRef.current !== boardId) {
      socket?.emit('leave-board', currentBoardRef.current)
    }
    socket?.emit('join-board', { boardId, user: stableUser })
    currentBoardRef.current = boardId
  }, [boardId, stableUser, isConnected])

  return { socket, isConnected, presence, editingTasks }
}

export function useBoardEvents(boardId: string, onEvent: (event: string, data: Record<string, unknown>) => void) {
  const { socket, isConnected } = useSocket(boardId)

  useEffect(() => {
    if (!socket || !isConnected) return

    const handlers: Record<string, (data: Record<string, unknown>) => void> = {
      'task:moved': (data) => onEvent('task:moved', data),
      'task:created': (data) => onEvent('task:created', data),
      'task:updated': (data) => onEvent('task:updated', data),
      'task:deleted': (data) => onEvent('task:deleted', data),
      'column:created': (data) => onEvent('column:created', data),
      'column:deleted': (data) => onEvent('column:deleted', data),
      'column:updated': (data) => onEvent('column:updated', data),
    }

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler)
    })

    return () => {
      Object.keys(handlers).forEach((event) => {
        socket.off(event)
      })
    }
  }, [socket, isConnected, boardId, onEvent])
}

/**
 * Hook to listen for real-time notifications via Socket.io
 * @param userId - The current user's ID
 * @param onNotification - Callback when a notification is received
 */
export function useNotificationListener(userId: string | undefined, onNotification: (notification: Record<string, unknown>) => void) {
  const { socket, isConnected } = useSocket()

  useEffect(() => {
    if (!socket || !isConnected || !userId) return

    // Register user for personal notifications
    socket.emit('register-user', userId)

  // Listen for notifications
  const handleNotification = (data: Record<string, unknown>) => {
      onNotification(data)
    }

    socket.on('notification', handleNotification)

    return () => {
      socket.off('notification', handleNotification)
    }
  }, [socket, isConnected, userId, onNotification])
}

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      autoConnect: false
    })
  }
  return socket
}

export function emitTaskMoved(boardId: string, data: {
  taskId: string
  newColumnId: string
  oldColumnId: string
  userId: string
  userName: string
}) {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
  }
  s.emit('task:moved', { boardId, ...data })
}

export function emitTaskCreated(boardId: string, data: {
  taskId: string
  columnId: string
}) {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
  }
  s.emit('task:created', { boardId, ...data })
}

export function emitTaskUpdated(boardId: string, data: {
  taskId: string
}) {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
  }
  s.emit('task:updated', { boardId, ...data })
}

export function emitTaskDeleted(boardId: string, data: {
  taskId: string
}) {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
  }
  s.emit('task:deleted', { boardId, ...data })
}