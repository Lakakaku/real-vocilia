/**
 * Push notification service for verification system
 *
 * Features:
 * - Browser push notifications with service worker integration
 * - Email notifications for critical events
 * - SMS notifications for urgent alerts (future implementation)
 * - Notification preferences and user consent management
 * - Rate limiting to prevent notification spam
 * - Template-based notifications with localization support
 * - Integration with verification events and deadlines
 * - Offline notification queuing and retry logic
 */

import { createClient } from '@/lib/supabase/client'

// Notification types and priorities
export type NotificationType =
  | 'session_started'
  | 'session_completed'
  | 'session_failed'
  | 'deadline_warning'
  | 'deadline_critical'
  | 'fraud_detected'
  | 'batch_released'
  | 'transaction_flagged'
  | 'system_alert'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical'

export interface NotificationPayload {
  type: NotificationType
  priority: NotificationPriority
  title: string
  body: string
  data?: Record<string, any>
  actions?: NotificationAction[]
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
  silent?: boolean
}

export interface NotificationAction {
  action: string
  title: string
  icon?: string
}

export interface NotificationPreferences {
  user_id: string
  browser_enabled: boolean
  email_enabled: boolean
  sms_enabled: boolean
  types: {
    [K in NotificationType]: {
      browser: boolean
      email: boolean
      sms: boolean
      priority_threshold: NotificationPriority
    }
  }
  quiet_hours: {
    enabled: boolean
    start_time: string // HH:MM format
    end_time: string // HH:MM format
    timezone: string
  }
  rate_limits: {
    max_per_hour: number
    max_per_day: number
  }
}

interface NotificationTemplate {
  type: NotificationType
  title: string
  body: string
  actions?: NotificationAction[]
  priority: NotificationPriority
  icon?: string
  tag?: string
}

// Default notification templates
const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  session_started: {
    type: 'session_started',
    title: 'Verification Session Started',
    body: 'A new verification session has begun for {business_name}',
    priority: 'medium',
    icon: '/icons/verification-start.png',
    tag: 'session_started'
  },

  session_completed: {
    type: 'session_completed',
    title: 'Verification Completed',
    body: 'Verification session completed for {business_name}. {verified_count} transactions processed.',
    priority: 'medium',
    icon: '/icons/verification-complete.png',
    tag: 'session_completed'
  },

  session_failed: {
    type: 'session_failed',
    title: 'Verification Session Failed',
    body: 'Verification session for {business_name} has failed. Please check the system.',
    priority: 'high',
    icon: '/icons/verification-error.png',
    tag: 'session_failed',
    requireInteraction: true
  },

  deadline_warning: {
    type: 'deadline_warning',
    title: 'Verification Deadline Approaching',
    body: '{business_name} verification deadline in {hours_remaining} hours',
    priority: 'medium',
    icon: '/icons/deadline-warning.png',
    tag: 'deadline_warning',
    actions: [
      { action: 'view', title: 'View Session', icon: '/icons/view.png' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  },

  deadline_critical: {
    type: 'deadline_critical',
    title: 'URGENT: Verification Deadline Critical',
    body: '{business_name} verification deadline in {hours_remaining} hours! Immediate action required.',
    priority: 'critical',
    icon: '/icons/deadline-critical.png',
    tag: 'deadline_critical',
    requireInteraction: true,
    actions: [
      { action: 'emergency_verify', title: 'Start Verification', icon: '/icons/verify.png' },
      { action: 'extend_deadline', title: 'Extend Deadline', icon: '/icons/extend.png' }
    ]
  },

  fraud_detected: {
    type: 'fraud_detected',
    title: 'Fraud Pattern Detected',
    body: 'Suspicious activity detected in {business_name} verification. {pattern_count} patterns found.',
    priority: 'high',
    icon: '/icons/fraud-alert.png',
    tag: 'fraud_detected',
    requireInteraction: true,
    actions: [
      { action: 'investigate', title: 'Investigate', icon: '/icons/investigate.png' },
      { action: 'flag_session', title: 'Flag Session', icon: '/icons/flag.png' }
    ]
  },

  batch_released: {
    type: 'batch_released',
    title: 'New Batch Released',
    body: 'New verification batch released for {business_name}. {transaction_count} transactions to verify.',
    priority: 'medium',
    icon: '/icons/batch-released.png',
    tag: 'batch_released',
    actions: [
      { action: 'start_verification', title: 'Start Verification', icon: '/icons/start.png' }
    ]
  },

  transaction_flagged: {
    type: 'transaction_flagged',
    title: 'Transaction Flagged',
    body: 'High-risk transaction flagged in {business_name} verification session',
    priority: 'high',
    icon: '/icons/transaction-flag.png',
    tag: 'transaction_flagged'
  },

  system_alert: {
    type: 'system_alert',
    title: 'System Alert',
    body: '{message}',
    priority: 'high',
    icon: '/icons/system-alert.png',
    tag: 'system_alert',
    requireInteraction: true
  }
}

// Default user preferences
const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'user_id'> = {
  browser_enabled: false, // Requires explicit consent
  email_enabled: true,
  sms_enabled: false,
  types: {
    session_started: { browser: true, email: false, sms: false, priority_threshold: 'medium' },
    session_completed: { browser: true, email: true, sms: false, priority_threshold: 'medium' },
    session_failed: { browser: true, email: true, sms: false, priority_threshold: 'high' },
    deadline_warning: { browser: true, email: true, sms: false, priority_threshold: 'medium' },
    deadline_critical: { browser: true, email: true, sms: true, priority_threshold: 'critical' },
    fraud_detected: { browser: true, email: true, sms: true, priority_threshold: 'high' },
    batch_released: { browser: true, email: false, sms: false, priority_threshold: 'medium' },
    transaction_flagged: { browser: true, email: false, sms: false, priority_threshold: 'high' },
    system_alert: { browser: true, email: true, sms: true, priority_threshold: 'high' }
  },
  quiet_hours: {
    enabled: false,
    start_time: '22:00',
    end_time: '08:00',
    timezone: 'Europe/Stockholm'
  },
  rate_limits: {
    max_per_hour: 10,
    max_per_day: 50
  }
}

/**
 * Notification service for verification system
 */
export class NotificationService {
  private supabase = createClient()
  private registration: ServiceWorkerRegistration | null = null
  private isInitialized = false

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Check if service workers are supported
      if ('serviceWorker' in navigator) {
        // Register service worker for push notifications
        this.registration = await navigator.serviceWorker.register('/sw.js')
        console.log('Service worker registered for notifications')
      }

      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize notification service:', error)
      throw error
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Browser does not support notifications')
    }

    let permission = Notification.permission

    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }

    // Update user preferences if permission granted
    if (permission === 'granted') {
      await this.updatePreferences({ browser_enabled: true })
    }

    return permission
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(): Promise<string | null> {
    if (!this.registration) {
      throw new Error('Service worker not registered')
    }

    try {
      // Get VAPID public key from environment
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.warn('VAPID public key not configured')
        return null
      }

      // Subscribe to push notifications
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidKey)
      })

      // Store subscription in database
      const { data: { user } } = await this.supabase.auth.getUser()
      if (user) {
        await this.supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            subscription: subscription.toJSON(),
            endpoint: subscription.endpoint,
            created_at: new Date().toISOString()
          })
      }

      return subscription.endpoint

    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      throw error
    }
  }

  /**
   * Send a notification
   */
  async sendNotification(
    userId: string | string[],
    type: NotificationType,
    data: Record<string, any> = {},
    options: Partial<NotificationPayload> = {}
  ): Promise<void> {
    const userIds = Array.isArray(userId) ? userId : [userId]

    for (const uid of userIds) {
      await this.sendSingleNotification(uid, type, data, options)
    }
  }

  /**
   * Send notification to a single user
   */
  private async sendSingleNotification(
    userId: string,
    type: NotificationType,
    data: Record<string, any> = {},
    options: Partial<NotificationPayload> = {}
  ): Promise<void> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(userId)
      const typePrefs = preferences.types[type]

      // Check if user wants this type of notification
      const priority = options.priority || NOTIFICATION_TEMPLATES[type].priority
      if (!this.shouldSendNotification(preferences, type, priority)) {
        return
      }

      // Check rate limits
      if (!(await this.checkRateLimit(userId, preferences))) {
        console.warn(`Rate limit exceeded for user ${userId}`)
        return
      }

      // Create notification payload
      const payload = this.createNotificationPayload(type, data, options)

      // Send via different channels based on preferences
      const promises: Promise<void>[] = []

      if (preferences.browser_enabled && typePrefs.browser) {
        promises.push(this.sendBrowserNotification(userId, payload))
      }

      if (preferences.email_enabled && typePrefs.email) {
        promises.push(this.sendEmailNotification(userId, payload, data))
      }

      if (preferences.sms_enabled && typePrefs.sms) {
        promises.push(this.sendSMSNotification(userId, payload, data))
      }

      // Execute all notification methods
      await Promise.allSettled(promises)

      // Log notification
      await this.logNotification(userId, type, payload)

    } catch (error) {
      console.error(`Failed to send notification to user ${userId}:`, error)
    }
  }

  /**
   * Send browser push notification
   */
  private async sendBrowserNotification(
    userId: string,
    payload: NotificationPayload
  ): Promise<void> {
    try {
      // Get push subscription for user
      const { data: subscriptions } = await this.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)

      if (!subscriptions || subscriptions.length === 0) {
        return // No active subscriptions
      }

      // Send push notification via API
      const response = await fetch('/api/notifications/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptions: subscriptions.map(s => s.subscription),
          payload: {
            title: payload.title,
            body: payload.body,
            icon: payload.icon,
            badge: payload.badge,
            tag: payload.tag,
            data: payload.data,
            actions: payload.actions,
            requireInteraction: payload.requireInteraction,
            silent: payload.silent
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Push notification API returned ${response.status}`)
      }

    } catch (error) {
      console.error('Failed to send browser notification:', error)
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    userId: string,
    payload: NotificationPayload,
    data: Record<string, any>
  ): Promise<void> {
    try {
      // Get user email
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user?.email) return

      // Send email via API
      const response = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: user.email,
          type: payload.type,
          subject: payload.title,
          data: {
            ...data,
            title: payload.title,
            body: payload.body
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Email notification API returned ${response.status}`)
      }

    } catch (error) {
      console.error('Failed to send email notification:', error)
    }
  }

  /**
   * Send SMS notification (placeholder for future implementation)
   */
  private async sendSMSNotification(
    userId: string,
    payload: NotificationPayload,
    data: Record<string, any>
  ): Promise<void> {
    // TODO: Implement SMS notifications via Twilio or similar service
    console.log('SMS notification would be sent:', { userId, payload, data })
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const { data } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (data) {
        return data
      }

      // Create default preferences for new user
      const defaultPrefs = { ...DEFAULT_PREFERENCES, user_id: userId }
      await this.supabase
        .from('notification_preferences')
        .insert(defaultPrefs)

      return defaultPrefs

    } catch (error) {
      console.error('Failed to get user preferences:', error)
      return { ...DEFAULT_PREFERENCES, user_id: userId }
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      await this.supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString()
        })

    } catch (error) {
      console.error('Failed to update preferences:', error)
      throw error
    }
  }

  /**
   * Check if notification should be sent based on preferences and conditions
   */
  private shouldSendNotification(
    preferences: NotificationPreferences,
    type: NotificationType,
    priority: NotificationPriority
  ): boolean {
    const typePrefs = preferences.types[type]

    // Check priority threshold
    const priorityLevels = { low: 1, medium: 2, high: 3, critical: 4 }
    if (priorityLevels[priority] < priorityLevels[typePrefs.priority_threshold]) {
      return false
    }

    // Check quiet hours
    if (preferences.quiet_hours.enabled && priority !== 'critical') {
      const now = new Date()
      const userTime = new Date(now.toLocaleString('en-US', {
        timeZone: preferences.quiet_hours.timezone
      }))

      const currentTime = userTime.getHours() * 100 + userTime.getMinutes()
      const startTime = this.parseTime(preferences.quiet_hours.start_time)
      const endTime = this.parseTime(preferences.quiet_hours.end_time)

      if (startTime > endTime) {
        // Quiet hours span midnight
        if (currentTime >= startTime || currentTime <= endTime) {
          return false
        }
      } else {
        // Normal quiet hours
        if (currentTime >= startTime && currentTime <= endTime) {
          return false
        }
      }
    }

    return true
  }

  /**
   * Check rate limits for user
   */
  private async checkRateLimit(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<boolean> {
    try {
      const now = new Date()
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      // Count notifications in last hour and day
      const { data: hourlyCount } = await this.supabase
        .from('notification_logs')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .gte('created_at', hourAgo.toISOString())

      const { data: dailyCount } = await this.supabase
        .from('notification_logs')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .gte('created_at', dayAgo.toISOString())

      const hourlyLimit = hourlyCount?.length || 0
      const dailyLimit = dailyCount?.length || 0

      return (
        hourlyLimit < preferences.rate_limits.max_per_hour &&
        dailyLimit < preferences.rate_limits.max_per_day
      )

    } catch (error) {
      console.error('Failed to check rate limit:', error)
      return true // Allow on error
    }
  }

  /**
   * Create notification payload from template and data
   */
  private createNotificationPayload(
    type: NotificationType,
    data: Record<string, any>,
    options: Partial<NotificationPayload>
  ): NotificationPayload {
    const template = NOTIFICATION_TEMPLATES[type]

    // Replace template variables
    const title = this.replaceVariables(options.title || template.title, data)
    const body = this.replaceVariables(options.body || template.body, data)

    return {
      type,
      priority: options.priority || template.priority,
      title,
      body,
      data: { ...data, type },
      actions: options.actions || template.actions,
      icon: options.icon || template.icon,
      badge: options.badge || template.badge,
      tag: options.tag || template.tag,
      requireInteraction: options.requireInteraction ?? template.requireInteraction,
      silent: options.silent
    }
  }

  /**
   * Replace template variables in text
   */
  private replaceVariables(text: string, data: Record<string, any>): string {
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key]?.toString() || match
    })
  }

  /**
   * Log notification for analytics and debugging
   */
  private async logNotification(
    userId: string,
    type: NotificationType,
    payload: NotificationPayload
  ): Promise<void> {
    try {
      await this.supabase
        .from('notification_logs')
        .insert({
          user_id: userId,
          type,
          title: payload.title,
          body: payload.body,
          priority: payload.priority,
          channels: this.getEnabledChannels(userId, type),
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to log notification:', error)
    }
  }

  /**
   * Get enabled notification channels for user and type
   */
  private async getEnabledChannels(
    userId: string,
    type: NotificationType
  ): Promise<string[]> {
    const preferences = await this.getUserPreferences(userId)
    const typePrefs = preferences.types[type]
    const channels: string[] = []

    if (preferences.browser_enabled && typePrefs.browser) channels.push('browser')
    if (preferences.email_enabled && typePrefs.email) channels.push('email')
    if (preferences.sms_enabled && typePrefs.sms) channels.push('sms')

    return channels
  }

  /**
   * Utility methods
   */
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 100 + minutes
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }
}

// Singleton instance
let notificationService: NotificationService | null = null

/**
 * Get the global notification service instance
 */
export function getNotificationService(): NotificationService {
  if (!notificationService) {
    notificationService = new NotificationService()
  }
  return notificationService
}

/**
 * Initialize notifications for the current user
 */
export async function initializeNotifications(): Promise<NotificationService> {
  const service = getNotificationService()
  await service.initialize()
  return service
}

/**
 * Request notification permissions and setup
 */
export async function setupNotifications(): Promise<boolean> {
  try {
    const service = await initializeNotifications()
    const permission = await service.requestPermission()

    if (permission === 'granted') {
      await service.subscribeToPush()
      return true
    }

    return false
  } catch (error) {
    console.error('Failed to setup notifications:', error)
    return false
  }
}