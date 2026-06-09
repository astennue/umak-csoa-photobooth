'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const REALTIME_PORT = 3003

interface UseRealtimeOptions {
  onSessionActivated?: (data: { sessionId: string; eventId: string; guestName: string }) => void
  onSessionDeactivated?: (data: { sessionId: string; eventId: string; guestName: string; status: string }) => void
  onSessionUpdated?: (data: { sessionId: string; eventId: string; [key: string]: any }) => void
  onQueueUpdated?: (data: { eventId: string; [key: string]: any }) => void
  onSessionUpdate?: (data: { sessionId: string; eventId: string; guestName: string; status: string }) => void
  eventId?: string // Subscribe to a specific event's room
  joinLive?: boolean // Join the live-display room
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const optionsRef = useRef(options)
  useEffect(() => { optionsRef.current = options })

  useEffect(() => {
    // Connect via gateway with XTransformPort - only on client side
    const socket = io(`/?XTransformPort=${REALTIME_PORT}`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[Realtime] Connected:', socket.id)
      setConnected(true)

      // Join rooms
      if (optionsRef.current.eventId) {
        socket.emit('join-event', optionsRef.current.eventId)
      }
      if (optionsRef.current.joinLive) {
        socket.emit('join-live')
      }
    })

    socket.on('disconnect', () => {
      console.log('[Realtime] Disconnected')
      setConnected(false)
    })

    socket.on('session:activated', (data) => {
      optionsRef.current.onSessionActivated?.(data)
    })

    socket.on('session:deactivated', (data) => {
      optionsRef.current.onSessionDeactivated?.(data)
    })

    socket.on('session:updated', (data) => {
      optionsRef.current.onSessionUpdated?.(data)
    })

    socket.on('session:update', (data) => {
      optionsRef.current.onSessionUpdate?.(data)
    })

    socket.on('queue:updated', (data) => {
      optionsRef.current.onQueueUpdated?.(data)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [])

  // Join/leave event room when eventId changes
  useEffect(() => {
    const socket = socketRef.current
    if (!socket || !socket.connected) return

    if (options.eventId) {
      socket.emit('join-event', options.eventId)
    }

    return () => {
      if (options.eventId) {
        socket.emit('leave-event', options.eventId)
      }
    }
  }, [options.eventId])

  const joinEvent = useCallback((eventId: string) => {
    socketRef.current?.emit('join-event', eventId)
  }, [])

  const leaveEvent = useCallback((eventId: string) => {
    socketRef.current?.emit('leave-event', eventId)
  }, [])

  const joinLive = useCallback(() => {
    socketRef.current?.emit('join-live')
  }, [])

  return { connected, joinEvent, leaveEvent, joinLive }
}
