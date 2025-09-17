/**
 * Real-time WebSocket integration for verification system
 *
 * Features:
 * - Real-time session status updates
 * - Live transaction verification events
 * - Multi-user collaboration with presence indicators
 * - Automatic reconnection with exponential backoff
 * - Event-driven architecture with type safety
 * - Room-based subscriptions for scalability
 * - Integration with Supabase Realtime
 * - Comprehensive error handling and logging
 */

import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

// Event types for verification system
export interface VerificationEvents {
  // Session events
  'session:started': {
    session_id: string
    batch_id: string
    business_id: string
    started_by: string
    started_at: string
  }

  'session:progress': {
    session_id: string
    progress_percentage: number
    verified_transactions: number
    approved_transactions: number
    rejected_transactions: number
    current_verifier?: string
  }

  'session:completed': {
    session_id: string
    completed_at: string
    total_verification_time: number
    final_stats: {
      total_transactions: number
      approved_transactions: number
      rejected_transactions: number
      compliance_score: number
    }
  }

  'session:failed': {
    session_id: string
    failed_at: string
    error_reason: string
    failed_by?: string
  }

  // Transaction events
  'transaction:verified': {
    session_id: string
    transaction_id: string
    transaction_index: number
    decision: 'approved' | 'rejected'
    verified_by: string
    verified_at: string
    verification_time_seconds: number
    reason?: string
  }

  'transaction:flagged': {
    session_id: string
    transaction_id: string
    fraud_indicators: string[]
    risk_score: number
    flagged_by: 'system' | 'verifier'
    flagged_at: string
  }

  // Batch events
  'batch:released': {
    batch_id: string
    business_id: string
    released_by: string
    deadline: string
    auto_start: boolean
  }

  'batch:deadline_warning': {
    batch_id: string
    session_id: string
    hours_remaining: number
    urgency_level: 'medium' | 'high' | 'critical'
  }

  // Fraud detection events
  'fraud:pattern_detected': {
    session_id: string
    pattern_type: string
    confidence_score: number
    affected_transactions: number
    recommended_action: string
  }

  // User presence events
  'user:joined': {
    session_id: string
    user_id: string
    user_name: string
    role: string
    joined_at: string
  }

  'user:left': {
    session_id: string
    user_id: string
    left_at: string
  }

  'user:activity': {
    session_id: string
    user_id: string
    activity: 'verifying' | 'reviewing' | 'idle'
    transaction_id?: string
  }
}

export type VerificationEventType = keyof VerificationEvents
export type VerificationEventData<T extends VerificationEventType> = VerificationEvents[T]

// WebSocket client configuration
interface SocketConfig {
  autoReconnect: boolean
  maxReconnectAttempts: number
  reconnectInterval: number
  heartbeatInterval: number
  debug: boolean
}

// Default configuration
const DEFAULT_CONFIG: SocketConfig = {
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectInterval: 1000, // Start with 1 second
  heartbeatInterval: 30000, // 30 seconds
  debug: false
}

// Connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

// Event listener type
type EventListener<T extends VerificationEventType> = (data: VerificationEventData<T>) => void

// Generic event listener for any event type
type AnyEventListener = <T extends VerificationEventType>(
  event: T,
  data: VerificationEventData<T>
) => void

/**
 * VerificationSocket - Real-time WebSocket client for verification system
 */
export class VerificationSocket {
  private supabase = createClient()
  private channels: Map<string, RealtimeChannel> = new Map()
  private config: SocketConfig
  private listeners: Map<string, Set<Function>> = new Map()
  private connectionState: ConnectionState = 'disconnected'
  private reconnectAttempts = 0
  private reconnectTimer?: NodeJS.Timeout
  private heartbeatTimer?: NodeJS.Timeout
  private userId?: string
  private userRole?: string

  // State change listeners
  private stateListeners: Set<(state: ConnectionState) => void> = new Set()

  constructor(config: Partial<SocketConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.setupConnectionHandlers()
  }

  /**
   * Initialize the socket connection
   */
  async init(userId: string, userRole: string = 'verifier'): Promise<void> {
    this.userId = userId
    this.userRole = userRole

    try {
      this.setState('connecting')

      // Verify authentication with Supabase
      const { data: { user }, error } = await this.supabase.auth.getUser()
      if (error || !user) {
        throw new Error('Authentication required for WebSocket connection')
      }

      this.setState('connected')
      this.reconnectAttempts = 0
      this.startHeartbeat()

      this.log('WebSocket initialized successfully')

    } catch (error) {
      this.log('Failed to initialize WebSocket:', error)
      this.setState('error')

      if (this.config.autoReconnect) {
        this.scheduleReconnect()
      }

      throw error
    }
  }

  /**
   * Subscribe to verification session events
   */
  subscribeToSession(sessionId: string): void {
    if (this.channels.has(`session:${sessionId}`)) {
      return // Already subscribed
    }

    const channel = this.supabase
      .channel(`verification_session:${sessionId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'verification_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => this.handleSessionChange(sessionId, payload)
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transaction_verifications',
          filter: `verification_session_id=eq.${sessionId}`
        },
        (payload) => this.handleTransactionChange(sessionId, payload)
      )
      .on('broadcast',
        { event: 'user_presence' },
        (payload) => this.handleUserPresence(sessionId, payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.log(`Subscribed to session: ${sessionId}`)

          // Announce user presence
          this.announcePresence(sessionId)
        }
      })

    this.channels.set(`session:${sessionId}`, channel)
  }

  /**
   * Subscribe to batch events
   */
  subscribeToBatch(batchId: string): void {
    if (this.channels.has(`batch:${batchId}`)) {
      return
    }

    const channel = this.supabase
      .channel(`payment_batch:${batchId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_batches',
          filter: `id=eq.${batchId}`
        },
        (payload) => this.handleBatchChange(batchId, payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.log(`Subscribed to batch: ${batchId}`)
        }
      })

    this.channels.set(`batch:${batchId}`, channel)
  }

  /**
   * Subscribe to business-wide events
   */
  subscribeToBusiness(businessId: string): void {
    if (this.channels.has(`business:${businessId}`)) {
      return
    }

    const channel = this.supabase
      .channel(`business:${businessId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_batches',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => this.handleBusinessBatchChange(businessId, payload)
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'verification_sessions'
        },
        (payload) => this.handleBusinessSessionChange(businessId, payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.log(`Subscribed to business: ${businessId}`)
        }
      })

    this.channels.set(`business:${businessId}`, channel)
  }

  /**
   * Subscribe to system-wide admin events
   */
  subscribeToAdmin(): void {
    if (this.userRole !== 'admin' && this.userRole !== 'manager') {
      throw new Error('Admin subscription requires admin or manager role')
    }

    if (this.channels.has('admin')) {
      return
    }

    const channel = this.supabase
      .channel('admin_events')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'verification_sessions'
        },
        (payload) => this.handleAdminSessionChange(payload)
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_batches'
        },
        (payload) => this.handleAdminBatchChange(payload)
      )
      .on('broadcast',
        { event: 'fraud_alert' },
        (payload) => this.handleFraudAlert(payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.log('Subscribed to admin events')
        }
      })

    this.channels.set('admin', channel)
  }

  /**
   * Event listener management
   */
  on<T extends VerificationEventType>(
    event: T,
    listener: EventListener<T>
  ): void {
    const eventKey = event
    if (!this.listeners.has(eventKey)) {
      this.listeners.set(eventKey, new Set())
    }
    this.listeners.get(eventKey)!.add(listener)
  }

  off<T extends VerificationEventType>(
    event: T,
    listener: EventListener<T>
  ): void {
    const eventKey = event
    const listeners = this.listeners.get(eventKey)
    if (listeners) {
      listeners.delete(listener)
      if (listeners.size === 0) {
        this.listeners.delete(eventKey)
      }
    }
  }

  /**
   * Generic event listener for any event type
   */
  onAny(listener: AnyEventListener): void {
    this.on('*' as any, listener as any)
  }

  offAny(listener: AnyEventListener): void {
    this.off('*' as any, listener as any)
  }

  /**
   * Connection state management
   */
  onStateChange(listener: (state: ConnectionState) => void): void {
    this.stateListeners.add(listener)
  }

  offStateChange(listener: (state: ConnectionState) => void): void {
    this.stateListeners.delete(listener)
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * Send user activity update
   */
  async sendActivity(
    sessionId: string,
    activity: 'verifying' | 'reviewing' | 'idle',
    transactionId?: string
  ): Promise<void> {
    const channel = this.channels.get(`session:${sessionId}`)
    if (!channel) {
      throw new Error(`Not subscribed to session: ${sessionId}`)
    }

    await channel.send({
      type: 'broadcast',
      event: 'user_activity',
      payload: {
        user_id: this.userId,
        activity,
        transaction_id: transactionId,
        timestamp: new Date().toISOString()
      }
    })
  }

  /**
   * Send transaction verification event
   */
  async sendTransactionVerified(
    sessionId: string,
    transactionId: string,
    decision: 'approved' | 'rejected',
    reason?: string
  ): Promise<void> {
    this.emit('transaction:verified', {
      session_id: sessionId,
      transaction_id: transactionId,
      transaction_index: 0, // Will be set by backend
      decision,
      verified_by: this.userId!,
      verified_at: new Date().toISOString(),
      verification_time_seconds: 0, // Will be calculated by backend
      reason
    })
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionKey: string): void {
    const channel = this.channels.get(subscriptionKey)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.channels.delete(subscriptionKey)
      this.log(`Unsubscribed from: ${subscriptionKey}`)
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    // Unsubscribe from all channels
    for (const [key, channel] of this.channels) {
      this.supabase.removeChannel(channel)
    }
    this.channels.clear()

    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
    }

    // Clear listeners
    this.listeners.clear()
    this.stateListeners.clear()

    this.setState('disconnected')
    this.log('WebSocket disconnected')
  }

  // Private methods

  private setupConnectionHandlers(): void {
    // Handle Supabase connection state changes
    this.supabase.realtime.onOpen(() => {
      this.log('Supabase realtime connection opened')
    })

    this.supabase.realtime.onClose(() => {
      this.log('Supabase realtime connection closed')
      if (this.config.autoReconnect) {
        this.scheduleReconnect()
      }
    })

    this.supabase.realtime.onError((error) => {
      this.log('Supabase realtime error:', error)
      this.setState('error')
    })
  }

  private handleSessionChange(sessionId: string, payload: RealtimePostgresChangesPayload<any>): void {
    const { eventType, new: newRecord, old: oldRecord } = payload

    switch (eventType) {
      case 'UPDATE':
        if (oldRecord.status !== newRecord.status) {
          if (newRecord.status === 'in_progress') {
            this.emit('session:started', {
              session_id: sessionId,
              batch_id: newRecord.batch_id,
              business_id: newRecord.business_id,
              started_by: newRecord.started_by || 'system',
              started_at: newRecord.started_at
            })
          } else if (newRecord.status === 'completed') {
            this.emit('session:completed', {
              session_id: sessionId,
              completed_at: newRecord.completed_at,
              total_verification_time: newRecord.total_verification_time_seconds || 0,
              final_stats: {
                total_transactions: newRecord.total_transactions,
                approved_transactions: newRecord.approved_transactions,
                rejected_transactions: newRecord.rejected_transactions,
                compliance_score: newRecord.compliance_score || 0
              }
            })
          } else if (newRecord.status === 'failed') {
            this.emit('session:failed', {
              session_id: sessionId,
              failed_at: newRecord.updated_at,
              error_reason: newRecord.error_message || 'Unknown error'
            })
          }
        }

        // Progress updates
        if (oldRecord.progress_percentage !== newRecord.progress_percentage) {
          this.emit('session:progress', {
            session_id: sessionId,
            progress_percentage: newRecord.progress_percentage,
            verified_transactions: newRecord.verified_transactions,
            approved_transactions: newRecord.approved_transactions,
            rejected_transactions: newRecord.rejected_transactions,
            current_verifier: newRecord.current_verifier
          })
        }
        break
    }
  }

  private handleTransactionChange(sessionId: string, payload: RealtimePostgresChangesPayload<any>): void {
    const { eventType, new: newRecord } = payload

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      this.emit('transaction:verified', {
        session_id: sessionId,
        transaction_id: newRecord.transaction_id,
        transaction_index: newRecord.transaction_index,
        decision: newRecord.decision,
        verified_by: newRecord.verified_by,
        verified_at: newRecord.verified_at,
        verification_time_seconds: newRecord.verification_time_seconds,
        reason: newRecord.reason
      })

      // Check for fraud flags
      if (newRecord.is_flagged) {
        this.emit('transaction:flagged', {
          session_id: sessionId,
          transaction_id: newRecord.transaction_id,
          fraud_indicators: newRecord.fraud_indicators || [],
          risk_score: newRecord.risk_score,
          flagged_by: 'system',
          flagged_at: newRecord.verified_at
        })
      }
    }
  }

  private handleBatchChange(batchId: string, payload: RealtimePostgresChangesPayload<any>): void {
    const { eventType, new: newRecord, old: oldRecord } = payload

    if (eventType === 'UPDATE') {
      // Batch released for verification
      if (oldRecord.status === 'draft' && newRecord.status === 'pending_verification') {
        this.emit('batch:released', {
          batch_id: batchId,
          business_id: newRecord.business_id,
          released_by: newRecord.updated_by || 'system',
          deadline: newRecord.deadline,
          auto_start: newRecord.auto_start_verification || false
        })
      }
    }
  }

  private handleBusinessBatchChange(businessId: string, payload: RealtimePostgresChangesPayload<any>): void {
    // Handle business-specific batch events
    this.handleBatchChange(payload.new?.id, payload)
  }

  private handleBusinessSessionChange(businessId: string, payload: RealtimePostgresChangesPayload<any>): void {
    // Handle business-specific session events
    if (payload.new?.business_id === businessId) {
      this.handleSessionChange(payload.new?.id, payload)
    }
  }

  private handleAdminSessionChange(payload: RealtimePostgresChangesPayload<any>): void {
    // Handle admin-level session events
    this.handleSessionChange(payload.new?.id, payload)
  }

  private handleAdminBatchChange(payload: RealtimePostgresChangesPayload<any>): void {
    // Handle admin-level batch events
    this.handleBatchChange(payload.new?.id, payload)
  }

  private handleUserPresence(sessionId: string, payload: any): void {
    const { event, payload: data } = payload

    switch (event) {
      case 'user_joined':
        this.emit('user:joined', {
          session_id: sessionId,
          user_id: data.user_id,
          user_name: data.user_name,
          role: data.role,
          joined_at: data.joined_at
        })
        break

      case 'user_left':
        this.emit('user:left', {
          session_id: sessionId,
          user_id: data.user_id,
          left_at: data.left_at
        })
        break

      case 'user_activity':
        this.emit('user:activity', {
          session_id: sessionId,
          user_id: data.user_id,
          activity: data.activity,
          transaction_id: data.transaction_id
        })
        break
    }
  }

  private handleFraudAlert(payload: any): void {
    this.emit('fraud:pattern_detected', payload.payload)
  }

  private async announcePresence(sessionId: string): Promise<void> {
    const channel = this.channels.get(`session:${sessionId}`)
    if (!channel || !this.userId) return

    await channel.send({
      type: 'broadcast',
      event: 'user_joined',
      payload: {
        user_id: this.userId,
        user_name: await this.getUserName(),
        role: this.userRole,
        joined_at: new Date().toISOString()
      }
    })
  }

  private async getUserName(): Promise<string> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      return user?.user_metadata?.full_name || user?.email || 'Unknown User'
    } catch {
      return 'Unknown User'
    }
  }

  private emit<T extends VerificationEventType>(
    event: T,
    data: VerificationEventData<T>
  ): void {
    // Emit to specific event listeners
    const listeners = this.listeners.get(event)
    if (listeners) {
      for (const listener of listeners) {
        try {
          (listener as EventListener<T>)(data)
        } catch (error) {
          this.log(`Error in event listener for ${event}:`, error)
        }
      }
    }

    // Emit to generic listeners
    const anyListeners = this.listeners.get('*')
    if (anyListeners) {
      for (const listener of anyListeners) {
        try {
          (listener as AnyEventListener)(event, data)
        } catch (error) {
          this.log(`Error in any event listener for ${event}:`, error)
        }
      }
    }

    this.log(`Event emitted: ${event}`, data)
  }

  private setState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state
      for (const listener of this.stateListeners) {
        try {
          listener(state)
        } catch (error) {
          this.log('Error in state change listener:', error)
        }
      }
      this.log(`Connection state changed: ${state}`)
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('Max reconnection attempts reached')
      this.setState('error')
      return
    }

    this.setState('reconnecting')
    this.reconnectAttempts++

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    )

    this.log(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`)

    this.reconnectTimer = setTimeout(async () => {
      try {
        if (this.userId) {
          await this.init(this.userId, this.userRole)
        }
      } catch (error) {
        this.log('Reconnection failed:', error)
        this.scheduleReconnect()
      }
    }, delay)
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      // Send heartbeat to maintain connection
      if (this.connectionState === 'connected') {
        this.log('Heartbeat')
      }
    }, this.config.heartbeatInterval)
  }

  private log(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(`[VerificationSocket] ${message}`, ...args)
    }
  }
}

// Singleton instance for global use
let globalSocket: VerificationSocket | null = null

/**
 * Get the global verification socket instance
 */
export function getVerificationSocket(config?: Partial<SocketConfig>): VerificationSocket {
  if (!globalSocket) {
    globalSocket = new VerificationSocket(config)
  }
  return globalSocket
}

/**
 * Reset the global socket instance (useful for testing)
 */
export function resetVerificationSocket(): void {
  if (globalSocket) {
    globalSocket.disconnect()
    globalSocket = null
  }
}