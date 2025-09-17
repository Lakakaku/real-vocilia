/**
 * React hook for verification WebSocket integration
 *
 * Features:
 * - Automatic connection management with authentication
 * - Type-safe event subscriptions
 * - Connection state management
 * - Automatic cleanup on unmount
 * - Error handling and retry logic
 * - Presence management for multi-user scenarios
 * - Activity tracking and user state updates
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  VerificationSocket,
  getVerificationSocket,
  VerificationEventType,
  VerificationEventData,
  ConnectionState
} from '@/lib/verification/websocket/verification-socket'

interface UseVerificationSocketOptions {
  // Connection options
  autoConnect?: boolean
  debug?: boolean

  // Subscription options
  sessionId?: string
  batchId?: string
  businessId?: string
  enableAdminEvents?: boolean

  // Presence options
  enablePresence?: boolean
  activityTimeout?: number // ms before marking user as idle
}

interface SocketHookState {
  socket: VerificationSocket | null
  connectionState: ConnectionState
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  users: Map<string, UserPresence>
  lastActivity: string | null
}

interface UserPresence {
  user_id: string
  user_name: string
  role: string
  activity: 'verifying' | 'reviewing' | 'idle'
  last_seen: string
  current_transaction?: string
}

/**
 * Hook for verification WebSocket connection and event management
 */
export function useVerificationSocket(options: UseVerificationSocketOptions = {}) {
  const {
    autoConnect = true,
    debug = false,
    sessionId,
    batchId,
    businessId,
    enableAdminEvents = false,
    enablePresence = true,
    activityTimeout = 60000 // 1 minute
  } = options

  // State
  const [state, setState] = useState<SocketHookState>({
    socket: null,
    connectionState: 'disconnected',
    isConnected: false,
    isConnecting: false,
    error: null,
    users: new Map(),
    lastActivity: null
  })

  // Refs for cleanup and timers
  const eventListenersRef = useRef<Array<() => void>>([])
  const activityTimerRef = useRef<NodeJS.Timeout>()
  const supabase = createClient()

  // Initialize socket connection
  const connect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isConnecting: true, error: null }))

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Authentication required for WebSocket connection')
      }

      // Determine user role
      let userRole = 'verifier'
      try {
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('role')
          .eq('user_id', user.id)
          .single()

        if (adminData) {
          userRole = adminData.role
        }
      } catch {
        // User is not an admin, keep default role
      }

      // Get or create socket instance
      const socket = getVerificationSocket({ debug })

      // Initialize connection
      await socket.init(user.id, userRole)

      setState(prev => ({
        ...prev,
        socket,
        isConnecting: false,
        isConnected: true,
        connectionState: 'connected'
      }))

      return socket

    } catch (error) {
      console.error('Failed to connect to verification socket:', error)
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }))
      throw error
    }
  }, [debug, supabase])

  // Disconnect socket
  const disconnect = useCallback(() => {
    if (state.socket) {
      state.socket.disconnect()
      setState(prev => ({
        ...prev,
        socket: null,
        isConnected: false,
        connectionState: 'disconnected',
        users: new Map()
      }))
    }
  }, [state.socket])

  // Subscribe to events with automatic cleanup
  const subscribe = useCallback(<T extends VerificationEventType>(
    event: T,
    listener: (data: VerificationEventData<T>) => void
  ) => {
    if (!state.socket) return () => {}

    state.socket.on(event, listener)

    const cleanup = () => {
      if (state.socket) {
        state.socket.off(event, listener)
      }
    }

    eventListenersRef.current.push(cleanup)
    return cleanup
  }, [state.socket])

  // Send user activity
  const sendActivity = useCallback(async (
    activity: 'verifying' | 'reviewing' | 'idle',
    transactionId?: string
  ) => {
    if (!state.socket || !sessionId) return

    try {
      await state.socket.sendActivity(sessionId, activity, transactionId)
      setState(prev => ({ ...prev, lastActivity: new Date().toISOString() }))
    } catch (error) {
      console.error('Failed to send activity:', error)
    }
  }, [state.socket, sessionId])

  // Auto-track user activity
  const trackActivity = useCallback(() => {
    if (!enablePresence || !sessionId) return

    const handleActivity = () => {
      sendActivity('verifying')

      // Reset idle timer
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current)
      }

      activityTimerRef.current = setTimeout(() => {
        sendActivity('idle')
      }, activityTimeout)
    }

    // Track mouse and keyboard activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    // Initial activity
    handleActivity()

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current)
      }
    }
  }, [enablePresence, sessionId, sendActivity, activityTimeout])

  // Handle connection state changes
  useEffect(() => {
    if (!state.socket) return

    const handleStateChange = (connectionState: ConnectionState) => {
      setState(prev => ({
        ...prev,
        connectionState,
        isConnected: connectionState === 'connected',
        error: connectionState === 'error' ? 'Connection error' : null
      }))
    }

    state.socket.onStateChange(handleStateChange)

    return () => {
      state.socket?.offStateChange(handleStateChange)
    }
  }, [state.socket])

  // Handle presence events
  useEffect(() => {
    if (!state.socket || !enablePresence) return

    const cleanupListeners: Array<() => void> = []

    // User joined
    cleanupListeners.push(subscribe('user:joined', (data) => {
      setState(prev => {
        const newUsers = new Map(prev.users)
        newUsers.set(data.user_id, {
          user_id: data.user_id,
          user_name: data.user_name,
          role: data.role,
          activity: 'idle',
          last_seen: data.joined_at
        })
        return { ...prev, users: newUsers }
      })
    }))

    // User left
    cleanupListeners.push(subscribe('user:left', (data) => {
      setState(prev => {
        const newUsers = new Map(prev.users)
        newUsers.delete(data.user_id)
        return { ...prev, users: newUsers }
      })
    }))

    // User activity
    cleanupListeners.push(subscribe('user:activity', (data) => {
      setState(prev => {
        const newUsers = new Map(prev.users)
        const existingUser = newUsers.get(data.user_id)
        if (existingUser) {
          newUsers.set(data.user_id, {
            ...existingUser,
            activity: data.activity,
            last_seen: new Date().toISOString(),
            current_transaction: data.transaction_id
          })
        }
        return { ...prev, users: newUsers }
      })
    }))

    return () => {
      cleanupListeners.forEach(cleanup => cleanup())
    }
  }, [state.socket, enablePresence, subscribe])

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && !state.socket && !state.isConnecting) {
      connect().catch(console.error)
    }
  }, [autoConnect, connect, state.socket, state.isConnecting])

  // Subscribe to specific resources
  useEffect(() => {
    if (!state.socket || !state.isConnected) return

    const subscriptions: string[] = []

    // Subscribe to session
    if (sessionId) {
      state.socket.subscribeToSession(sessionId)
      subscriptions.push(`session:${sessionId}`)
    }

    // Subscribe to batch
    if (batchId) {
      state.socket.subscribeToBatch(batchId)
      subscriptions.push(`batch:${batchId}`)
    }

    // Subscribe to business
    if (businessId) {
      state.socket.subscribeToBusiness(businessId)
      subscriptions.push(`business:${businessId}`)
    }

    // Subscribe to admin events
    if (enableAdminEvents) {
      try {
        state.socket.subscribeToAdmin()
        subscriptions.push('admin')
      } catch (error) {
        console.warn('Failed to subscribe to admin events:', error)
      }
    }

    return () => {
      subscriptions.forEach(sub => {
        state.socket?.unsubscribe(sub)
      })
    }
  }, [state.socket, state.isConnected, sessionId, batchId, businessId, enableAdminEvents])

  // Track user activity
  useEffect(() => {
    if (!state.isConnected) return
    return trackActivity()
  }, [state.isConnected, trackActivity])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up event listeners
      eventListenersRef.current.forEach(cleanup => cleanup())
      eventListenersRef.current = []

      // Clear activity timer
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current)
      }

      // Don't disconnect global socket here - let it persist across components
    }
  }, [])

  return {
    // Connection management
    socket: state.socket,
    connectionState: state.connectionState,
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    connect,
    disconnect,

    // Event subscription
    subscribe,

    // User presence
    users: Array.from(state.users.values()),
    sendActivity,
    lastActivity: state.lastActivity,

    // Convenience methods for common events
    onSessionStarted: (listener: (data: VerificationEventData<'session:started'>) => void) =>
      subscribe('session:started', listener),

    onSessionProgress: (listener: (data: VerificationEventData<'session:progress'>) => void) =>
      subscribe('session:progress', listener),

    onSessionCompleted: (listener: (data: VerificationEventData<'session:completed'>) => void) =>
      subscribe('session:completed', listener),

    onTransactionVerified: (listener: (data: VerificationEventData<'transaction:verified'>) => void) =>
      subscribe('transaction:verified', listener),

    onFraudDetected: (listener: (data: VerificationEventData<'fraud:pattern_detected'>) => void) =>
      subscribe('fraud:pattern_detected', listener),

    onBatchReleased: (listener: (data: VerificationEventData<'batch:released'>) => void) =>
      subscribe('batch:released', listener),
  }
}

/**
 * Hook for simple session event subscription
 */
export function useSessionEvents(sessionId: string) {
  const { subscribe, isConnected } = useVerificationSocket({
    sessionId,
    autoConnect: true,
    enablePresence: true
  })

  return {
    subscribe,
    isConnected,

    // Convenience event subscriptions
    useSessionProgress: (callback: (data: VerificationEventData<'session:progress'>) => void) => {
      useEffect(() => {
        if (!isConnected) return
        return subscribe('session:progress', callback)
      }, [isConnected, callback])
    },

    useTransactionUpdates: (callback: (data: VerificationEventData<'transaction:verified'>) => void) => {
      useEffect(() => {
        if (!isConnected) return
        return subscribe('transaction:verified', callback)
      }, [isConnected, callback])
    },

    useFraudAlerts: (callback: (data: VerificationEventData<'fraud:pattern_detected'>) => void) => {
      useEffect(() => {
        if (!isConnected) return
        return subscribe('fraud:pattern_detected', callback)
      }, [isConnected, callback])
    }
  }
}

/**
 * Hook for admin-level event monitoring
 */
export function useAdminEvents() {
  return useVerificationSocket({
    autoConnect: true,
    enableAdminEvents: true,
    enablePresence: false
  })
}