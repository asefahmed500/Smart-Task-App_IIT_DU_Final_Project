'use client'

import { useEffect } from 'react'

/**
 * SocketInitializer - Ensures Socket.IO server is initialized on app start
 *
 * This component makes a request to /api/socket to initialize the Socket.IO server
 * before any client tries to connect. This prevents connection errors on first load.
 */
export default function SocketInitializer() {
  useEffect(() => {
    // Initialize Socket.IO server on app start
    const initSocketServer = async () => {
      try {
        await fetch('/api/socket', { method: 'GET' })
      } catch (error) {
        // Silently fail - socket server may already be initialized
      }
    }

    initSocketServer()
  }, [])

  return null
}
