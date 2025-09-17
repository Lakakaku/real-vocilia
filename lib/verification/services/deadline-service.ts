/**
 * Deadline Management Service
 *
 * Manages verification deadlines, countdown timers, auto-expiration,
 * and auto-approval workflows for payment verification batches.
 */

import type {
  PaymentBatch,
  VerificationSession,
  VerificationSessionUpdate
} from '@/lib/supabase/types/verification'
import { createClient } from '@/lib/supabase/client'
import { PaymentBatchBusinessRules } from '../models/payment-batch'
import { VerificationSessionState, VerificationSessionBusinessRules } from '../models/verification-session'
import { VerificationAuditService } from './audit-service'

// Types for deadline management
export interface DeadlineStatus {
  deadline: string
  hours_remaining: number
  minutes_remaining: number
  is_overdue: boolean
  is_critical: boolean // < 24 hours remaining
  is_urgent: boolean // < 6 hours remaining
  urgency_level: 'low' | 'medium' | 'high' | 'critical'
  formatted_time_remaining: string
}

export interface CountdownData {
  session_id: string
  batch_id: string
  business_id: string
  deadline: string
  status: DeadlineStatus
  auto_approval_eligible: boolean
  requires_immediate_attention: boolean
}

export interface AutoProcessingResult {
  processed_sessions: number
  expired_sessions: string[]
  auto_approved_sessions: string[]
  errors: Array<{
    session_id: string
    error: string
  }>
}

export interface AutoApprovalConfig {
  enabled: boolean
  threshold_percentage: number // Minimum completion percentage required
  risk_threshold: number // Maximum risk score allowed
  grace_period_hours: number // Additional time before auto-approval
  require_manual_review_for_high_risk: boolean
}

// Configuration for auto-processing
const DEFAULT_AUTO_APPROVAL_CONFIG: AutoApprovalConfig = {
  enabled: true,
  threshold_percentage: 30,
  risk_threshold: 70,
  grace_period_hours: 2,
  require_manual_review_for_high_risk: true,
}

export class DeadlineManagementService {
  private supabase = createClient()
  private auditService = new VerificationAuditService()

  /**
   * Gets current deadline status for a verification session
   */
  async getDeadlineStatus(sessionId: string): Promise<DeadlineStatus> {
    const { data: session, error } = await this.supabase
      .from('verification_sessions')
      .select('deadline, status')
      .eq('id', sessionId)
      .single()

    if (error || !session) {
      throw new Error(`Failed to fetch session deadline: ${error?.message}`)
    }

    return this.calculateDeadlineStatus(session.deadline)
  }

  /**
   * Gets countdown data for active verification sessions
   */
  async getActiveCountdowns(businessId?: string): Promise<CountdownData[]> {
    let query = this.supabase
      .from('verification_sessions')
      .select(`
        id,
        payment_batch_id,
        business_id,
        deadline,
        status,
        verified_transactions,
        total_transactions,
        auto_approval_threshold
      `)
      .in('status', ['not_started', 'in_progress', 'paused'])
      .order('deadline', { ascending: true })

    if (businessId) {
      query = query.eq('business_id', businessId)
    }

    const { data: sessions, error } = await query

    if (error) {
      throw new Error(`Failed to fetch active sessions: ${error.message}`)
    }

    return sessions.map(session => ({
      session_id: session.id,
      batch_id: session.payment_batch_id,
      business_id: session.business_id,
      deadline: session.deadline,
      status: this.calculateDeadlineStatus(session.deadline),
      auto_approval_eligible: this.isAutoApprovalEligible(session),
      requires_immediate_attention: this.requiresImmediateAttention(session),
    }))
  }

  /**
   * Processes expired and auto-approval eligible sessions
   */
  async processExpiredSessions(config: AutoApprovalConfig = DEFAULT_AUTO_APPROVAL_CONFIG): Promise<AutoProcessingResult> {
    const result: AutoProcessingResult = {
      processed_sessions: 0,
      expired_sessions: [],
      auto_approved_sessions: [],
      errors: [],
    }

    try {
      // Get all sessions that need processing
      const { data: sessions, error } = await this.supabase
        .from('verification_sessions')
        .select(`
          id,
          payment_batch_id,
          business_id,
          deadline,
          status,
          verified_transactions,
          total_transactions,
          auto_approval_threshold,
          average_risk_score
        `)
        .in('status', ['not_started', 'in_progress', 'paused'])

      if (error) {
        throw new Error(`Failed to fetch sessions for processing: ${error.message}`)
      }

      const now = new Date()

      for (const session of sessions) {
        try {
          const deadline = new Date(session.deadline)
          const graceDeadline = new Date(deadline.getTime() + config.grace_period_hours * 60 * 60 * 1000)
          const isExpired = now > graceDeadline

          if (isExpired) {
            // Check if eligible for auto-approval
            if (config.enabled && this.isAutoApprovalEligible(session, config)) {
              await this.autoApproveSession(session.id, session.business_id)
              result.auto_approved_sessions.push(session.id)

              await this.auditService.logActivity({
                event_type: 'session_auto_approved',
                actor_id: 'system',
                actor_type: 'system',
                business_id: session.business_id,
                category: 'business_process',
                severity: 'info',
                description: `Session auto-approved after deadline due to meeting approval criteria`,
                details: {
                  session_id: session.id,
                  batch_id: session.payment_batch_id,
                  completion_percentage: Math.round((session.verified_transactions / session.total_transactions) * 100),
                  auto_approval_threshold: session.auto_approval_threshold,
                  average_risk_score: session.average_risk_score,
                },
              })
            } else {
              // Mark as expired
              await this.expireSession(session.id, session.business_id)
              result.expired_sessions.push(session.id)

              await this.auditService.logActivity({
                event_type: 'session_expired',
                actor_id: 'system',
                actor_type: 'system',
                business_id: session.business_id,
                category: 'business_process',
                severity: 'warning',
                description: `Session expired due to deadline without meeting auto-approval criteria`,
                details: {
                  session_id: session.id,
                  batch_id: session.payment_batch_id,
                  hours_overdue: Math.round((now.getTime() - deadline.getTime()) / (1000 * 60 * 60)),
                },
              })
            }

            result.processed_sessions++
          }
        } catch (sessionError) {
          result.errors.push({
            session_id: session.id,
            error: sessionError instanceof Error ? sessionError.message : 'Unknown error',
          })
        }
      }

      return result
    } catch (error) {
      throw new Error(`Failed to process expired sessions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Sets up real-time countdown for a session
   */
  async startCountdown(sessionId: string): Promise<{
    deadline: string
    interval_ms: number
    should_poll: boolean
  }> {
    const status = await this.getDeadlineStatus(sessionId)

    // Determine polling frequency based on time remaining
    let intervalMs = 60000 // 1 minute default

    if (status.hours_remaining < 1) {
      intervalMs = 10000 // 10 seconds if < 1 hour
    } else if (status.hours_remaining < 6) {
      intervalMs = 30000 // 30 seconds if < 6 hours
    } else if (status.hours_remaining < 24) {
      intervalMs = 60000 // 1 minute if < 24 hours
    } else {
      intervalMs = 300000 // 5 minutes otherwise
    }

    return {
      deadline: status.deadline,
      interval_ms: intervalMs,
      should_poll: !status.is_overdue,
    }
  }

  /**
   * Calculates deadline status from deadline string
   */
  private calculateDeadlineStatus(deadline: string): DeadlineStatus {
    const deadlineDate = new Date(deadline)
    const now = new Date()
    const diffMs = deadlineDate.getTime() - now.getTime()

    const hoursRemaining = Math.max(0, diffMs / (1000 * 60 * 60))
    const minutesRemaining = Math.max(0, (diffMs % (1000 * 60 * 60)) / (1000 * 60))
    const isOverdue = diffMs < 0

    // Determine urgency level
    let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (isOverdue) urgencyLevel = 'critical'
    else if (hoursRemaining < 6) urgencyLevel = 'critical'
    else if (hoursRemaining < 24) urgencyLevel = 'high'
    else if (hoursRemaining < 72) urgencyLevel = 'medium'

    // Format time remaining
    let formattedTime: string
    if (isOverdue) {
      const hoursOverdue = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60))
      formattedTime = `${hoursOverdue}h overdue`
    } else if (hoursRemaining >= 24) {
      const days = Math.floor(hoursRemaining / 24)
      const remainingHours = Math.floor(hoursRemaining % 24)
      formattedTime = `${days}d ${remainingHours}h`
    } else if (hoursRemaining >= 1) {
      const minutes = Math.floor(minutesRemaining)
      formattedTime = `${Math.floor(hoursRemaining)}h ${minutes}m`
    } else {
      formattedTime = `${Math.floor(minutesRemaining)}m`
    }

    return {
      deadline,
      hours_remaining: Math.floor(hoursRemaining),
      minutes_remaining: Math.floor(minutesRemaining),
      is_overdue: isOverdue,
      is_critical: hoursRemaining < 24,
      is_urgent: hoursRemaining < 6,
      urgency_level: urgencyLevel,
      formatted_time_remaining: formattedTime,
    }
  }

  /**
   * Checks if session is eligible for auto-approval
   */
  private isAutoApprovalEligible(
    session: any,
    config: AutoApprovalConfig = DEFAULT_AUTO_APPROVAL_CONFIG
  ): boolean {
    if (!config.enabled) return false

    const completionPercentage = (session.verified_transactions / session.total_transactions) * 100
    const meetsThreshold = completionPercentage >= (session.auto_approval_threshold || config.threshold_percentage)
    const lowRisk = (session.average_risk_score || 0) <= config.risk_threshold

    return meetsThreshold && lowRisk
  }

  /**
   * Checks if session requires immediate attention
   */
  private requiresImmediateAttention(session: any): boolean {
    const deadlineStatus = this.calculateDeadlineStatus(session.deadline)
    const completionPercentage = (session.verified_transactions / session.total_transactions) * 100
    const isLowCompletion = completionPercentage < 30

    return (deadlineStatus.is_urgent || deadlineStatus.is_overdue) && isLowCompletion
  }

  /**
   * Auto-approves a session that meets criteria
   */
  private async autoApproveSession(sessionId: string, businessId: string): Promise<void> {
    const update: VerificationSessionUpdate = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { error } = await this.supabase
      .from('verification_sessions')
      .update(update)
      .eq('id', sessionId)

    if (error) {
      throw new Error(`Failed to auto-approve session: ${error.message}`)
    }

    // Update batch status if needed
    await this.updateBatchStatusAfterSessionCompletion(sessionId, businessId)
  }

  /**
   * Expires a session that has passed deadline
   */
  private async expireSession(sessionId: string, businessId: string): Promise<void> {
    const update: VerificationSessionUpdate = {
      status: 'expired',
      updated_at: new Date().toISOString(),
    }

    const { error } = await this.supabase
      .from('verification_sessions')
      .update(update)
      .eq('id', sessionId)

    if (error) {
      throw new Error(`Failed to expire session: ${error.message}`)
    }

    // Update batch status
    await this.updateBatchStatusAfterSessionCompletion(sessionId, businessId)
  }

  /**
   * Updates batch status after session completion/expiry
   */
  private async updateBatchStatusAfterSessionCompletion(sessionId: string, businessId: string): Promise<void> {
    // Get the session to find the batch
    const { data: session, error: sessionError } = await this.supabase
      .from('verification_sessions')
      .select('payment_batch_id, status')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      console.error('Failed to fetch session for batch update:', sessionError?.message)
      return
    }

    // Determine new batch status based on session status
    let newBatchStatus: string
    if (session.status === 'completed') {
      newBatchStatus = 'completed'
    } else if (session.status === 'expired') {
      newBatchStatus = 'expired'
    } else {
      return // No status change needed
    }

    const { error: batchError } = await this.supabase
      .from('payment_batches')
      .update({
        status: newBatchStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.payment_batch_id)

    if (batchError) {
      console.error('Failed to update batch status:', batchError.message)
    }
  }

  /**
   * Gets urgency statistics for dashboard
   */
  async getUrgencyStatistics(businessId?: string): Promise<{
    total_active: number
    critical: number
    urgent: number
    overdue: number
    auto_approval_eligible: number
  }> {
    const countdowns = await this.getActiveCountdowns(businessId)

    return {
      total_active: countdowns.length,
      critical: countdowns.filter(c => c.status.urgency_level === 'critical' && !c.status.is_overdue).length,
      urgent: countdowns.filter(c => c.status.is_urgent && !c.status.is_overdue).length,
      overdue: countdowns.filter(c => c.status.is_overdue).length,
      auto_approval_eligible: countdowns.filter(c => c.auto_approval_eligible).length,
    }
  }

  /**
   * Extends deadline for a session (admin function)
   */
  async extendDeadline(
    sessionId: string,
    additionalHours: number,
    reason: string,
    actorId: string,
    businessId: string
  ): Promise<void> {
    const { data: session, error: fetchError } = await this.supabase
      .from('verification_sessions')
      .select('deadline, status')
      .eq('id', sessionId)
      .single()

    if (fetchError || !session) {
      throw new Error(`Failed to fetch session: ${fetchError?.message}`)
    }

    if (!['not_started', 'in_progress', 'paused'].includes(session.status)) {
      throw new Error(`Cannot extend deadline for session in status: ${session.status}`)
    }

    const currentDeadline = new Date(session.deadline)
    const newDeadline = new Date(currentDeadline.getTime() + additionalHours * 60 * 60 * 1000)

    const { error: updateError } = await this.supabase
      .from('verification_sessions')
      .update({
        deadline: newDeadline.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (updateError) {
      throw new Error(`Failed to extend deadline: ${updateError.message}`)
    }

    await this.auditService.logActivity({
      event_type: 'deadline_extended',
      actor_id: actorId,
      actor_type: 'admin',
      business_id: businessId,
      category: 'business_process',
      severity: 'info',
      description: `Verification deadline extended by ${additionalHours} hours`,
      details: {
        session_id: sessionId,
        previous_deadline: session.deadline,
        new_deadline: newDeadline.toISOString(),
        additional_hours: additionalHours,
        reason,
      },
    })
  }
}

// Export singleton instance
export const deadlineService = new DeadlineManagementService()

// Export utility functions
export const DeadlineUtils = {
  /**
   * Formats duration in a human-readable way
   */
  formatDuration(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`
    } else if (hours < 24) {
      const h = Math.floor(hours)
      const m = Math.round((hours - h) * 60)
      return m > 0 ? `${h}h ${m}m` : `${h}h`
    } else {
      const d = Math.floor(hours / 24)
      const h = Math.round(hours % 24)
      return h > 0 ? `${d}d ${h}h` : `${d}d`
    }
  },

  /**
   * Gets color class for urgency level
   */
  getUrgencyColor(level: 'low' | 'medium' | 'high' | 'critical'): string {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600',
    }
    return colors[level]
  },

  /**
   * Checks if time remaining warrants a notification
   */
  shouldNotify(status: DeadlineStatus): boolean {
    return status.is_urgent || status.is_overdue ||
           (status.urgency_level === 'high' && status.hours_remaining <= 12)
  },
}