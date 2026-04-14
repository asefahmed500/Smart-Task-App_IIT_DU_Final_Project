import { Server as NetServer } from 'http'
import { NextRequest } from 'next/server'
import { Server as IOServer } from 'socket.io'

export const dynamic = 'force-dynamic'

let io: IOServer

/**
 * Next.js 15+ App Router Socket.IO initialization "hack"
 * This attaches the IO server to the underlying HTTP server.
 */
export async function GET(req: NextRequest) {
  // @ts-ignore
  if (!global.io) {
    console.log('--- Initializing Socket.IO ---')
    
    // @ts-ignore
    const httpServer: NetServer = req.socket?.server
    
    if (!httpServer) {
      return new Response('HTTP Server not found', { status: 500 })
    }

    const ioInstance = new IOServer(httpServer, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    })

    ioInstance.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`)

      socket.on('board:join', ({ boardId }) => {
        socket.join(`board:${boardId}`)
        console.log(`User joined board: ${boardId}`)
      })

      socket.on('board:leave', ({ boardId }) => {
        socket.leave(`board:${boardId}`)
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
        console.log(`Socket disconnected: ${socket.id}`)
      })
    })

    // @ts-ignore
    global.io = ioInstance
    io = ioInstance
  } else {
    // @ts-ignore
    io = global.io
  }

  return new Response('Socket server initialized', { status: 200 })
}
