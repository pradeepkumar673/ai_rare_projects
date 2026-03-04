import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/authStore'

let globalSocket: Socket | null = null

export function useSocket() {
  const { token } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!token) return

    // Reuse existing connection
    if (!globalSocket || !globalSocket.connected) {
      globalSocket = io('/', {
        auth: { token },
        transports: ['websocket'],
        path: '/ws',
      })
    }

    socketRef.current = globalSocket

    return () => {
      // Don't disconnect on component unmount – reuse across components
    }
  }, [token])

  const on = useCallback(<T>(event: string, handler: (data: T) => void) => {
    socketRef.current?.on(event, handler)
    return () => {
      socketRef.current?.off(event, handler)
    }
  }, [])

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data)
  }, [])

  const disconnect = useCallback(() => {
    globalSocket?.disconnect()
    globalSocket = null
  }, [])

  return { socket: socketRef.current, on, emit, disconnect }
}
