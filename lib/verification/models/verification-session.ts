/**
 * Verification Session Model and State Management
 *
 * Manages verification session state, progress tracking, and business workflow
 * coordination for payment batch verification processes.
 */

import { z } from 'zod'
import type { VerificationSession, VerificationSessionInsert, VerificationSessionUpdate } from '@/lib/supabase/types/verification'

// Database type references  
export type VerificationSessionRow = VerificationSession
export { VerificationSessionInsert, VerificationSessionUpdate }

// Session status enum for type safety
export type VerificationSessionStatus =
  | 'not_started'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'expired'
  | 'cancelled'

// Progress tracking interface
export interface VerificationProgress {
  total_transactions: number
  verified_transactions: number
  pending_transactions: number
  approved_count: number
  rejected_count: number
  completion_percentage: number
  estimated_time_remaining_minutes: number
  average_verification_time_seconds: number
}

// Session metrics for analytics
export interface VerificationMetrics {
  session_duration_minutes: number
  total_verification_time_minutes: number
  average_time_per_transaction_seconds: number
  approval_rate_percentage: number
  rejection_rate_percentage: number
  pause_count: number
  total_pause_duration_minutes: number
}

// Validation schemas
export const VerificationSessionValidation = {
  // Session creation schema
  create: z.object({
    payment_batch_id: z.string().uuid('Invalid payment batch ID'),
    business_id: z.string().uuid('Invalid business ID'),
    deadline: z.string().datetime('Invalid deadline format'),
    total_transactions: z.number()
      .int('Total transactions must be an integer')
      .min(1, 'Must have at least 1 transaction'),
    priority_level: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    auto_approval_threshold: z.number()
      .min(0, 'Threshold cannot be negative')
      .max(100, 'Threshold cannot exceed 100')
      .default(30),
  }),

  // Session update schema
  update: z.object({
    id: z.string().uuid('Invalid session ID'),
    status: z.enum(['not_started', 'in_progress', 'paused', 'completed', 'expired', 'cancelled']).optional(),
    verified_transactions: z.number().int().min(0).optional(),
    approved_count: z.number().int().min(0).optional(),
    rejected_count: z.number().int().min(0).optional(),
    current_transaction_index: z.number().int().min(0).optional(),
    notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional(),
    pause_reason: z.string().max(500, 'Pause reason cannot exceed 500 characters').optional(),
  }),

  // Progress update schema
  progress: z.object({
    session_id: z.string().uuid('Invalid session ID'),
    transaction_verified: z.boolean(),
    verification_decision: z.enum(['approved', 'rejected']).optional(),
    verification_time_seconds: z.number().min(0).optional(),
    notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  }),

  // Query schema
  query: z.object({
    business_id: z.string().uuid().optional(),
    payment_batch_id: z.string().uuid().optional(),
    status: z.enum(['not_started', 'in_progress', 'paused', 'completed', 'expired', 'cancelled']).optional(),
    deadline_before: z.string().datetime().optional(),
    deadline_after: z.string().datetime().optional(),
    priority_level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    completion_rate_min: z.number().min(0).max(100).optional(),
    completion_rate_max: z.number().min(0).max(100).optional(),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
    sort_by: z.enum(['deadline', 'priority', 'progress', 'created_at']).default('deadline'),
    sort_order: z.enum(['asc', 'desc']).default('asc'),
  }),
}

// Extended session with calculated fields
export interface VerificationSessionWithProgress extends VerificationSessionRow {
  progress: VerificationProgress
  metrics: VerificationMetrics
  deadline_info: {
    hours_remaining: number
    is_overdue: boolean
    urgency_level: 'low' | 'medium' | 'high' | 'critical'
  }
  batch_info?: {
    week_number: number
    year: number
    total_amount: number
  }
}

// Session state management
export class VerificationSessionState {
  /**
   * Validates session status transitions
   */
  static validateStatusTransition(
    currentStatus: VerificationSessionStatus,
    newStatus: VerificationSessionStatus,
    context?: { isExpired?: boolean; isCompleted?: boolean }
  ): { valid: boolean; error?: string } {
    const allowedTransitions: Record<VerificationSessionStatus, VerificationSessionStatus[]> = {
      not_started: ['in_progress', 'cancelled', 'expired'],
      in_progress: ['paused', 'completed', 'expired', 'cancelled'],
      paused: ['in_progress', 'completed', 'expired', 'cancelled'],
      completed: [], // Terminal state
      expired: [], // Terminal state
      cancelled: [], // Terminal state
    }

    // Special case: auto-expiry from any active state
    if (newStatus === 'expired' && context?.isExpired) {
      return { valid: true }
    }

    // Special case: auto-completion when all transactions verified
    if (newStatus === 'completed' && context?.isCompleted) {
      return { valid: true }
    }

    const allowed = allowedTransitions[currentStatus]?.includes(newStatus)

    return {
      valid: allowed || false,
      error: allowed ? undefined : `Invalid status transition from ${currentStatus} to ${newStatus}`
    }
  }

  /**
   * Calculates session progress metrics
   */
  static calculateProgress(session: VerificationSessionRow): VerificationProgress {
    const total = session.total_transactions || 0
    const verified = session.verified_transactions || 0
    const approved = session.approved_count || 0
    const rejected = session.rejected_count || 0
    const pending = total - verified

    const completionPercentage = total > 0 ? Math.round((verified / total) * 100) : 0

    // Estimate remaining time based on average verification time
    const avgTimePerTransaction = 120 // 2 minutes default - field not available in schema
    const estimatedRemainingMinutes = Math.round((pending * avgTimePerTransaction) / 60)

    return {
      total_transactions: total,
      verified_transactions: verified,
      pending_transactions: pending,
      approved_count: approved,
      rejected_count: rejected,
      completion_percentage: completionPercentage,
      estimated_time_remaining_minutes: estimatedRemainingMinutes,
      average_verification_time_seconds: avgTimePerTransaction,
    }
  }

  /**
   * Calculates session metrics for analytics
   */
  static calculateMetrics(session: VerificationSessionRow): VerificationMetrics {
    const startTime = new Date(session.started_at || session.created_at)
    const endTime = session.completed_at ? new Date(session.completed_at) : new Date()
    const sessionDuration = (endTime.getTime() - startTime.getTime()) / (1000 * 60) // minutes

    const totalTransactions = session.verified_transactions || 0
    const approved = session.approved_count || 0
    const rejected = session.rejected_count || 0

    const approvalRate = totalTransactions > 0 ? (approved / totalTransactions) * 100 : 0
    const rejectionRate = totalTransactions > 0 ? (rejected / totalTransactions) * 100 : 0

    const avgTimePerTransaction = 0 // Field not available in schema
    const totalVerificationTime = (totalTransactions * avgTimePerTransaction) / 60 // minutes

    return {
      session_duration_minutes: Math.round(sessionDuration),
      total_verification_time_minutes: Math.round(totalVerificationTime),
      average_time_per_transaction_seconds: avgTimePerTransaction,
      approval_rate_percentage: Math.round(approvalRate),
      rejection_rate_percentage: Math.round(rejectionRate),
      pause_count: 0, // Field not available in current schema
      total_pause_duration_minutes: 0, // Field not available in current schema
    }
  }

  /**
   * Determines if session should auto-expire
   */
  static shouldAutoExpire(session: VerificationSessionRow): boolean {
    if (session.status === 'completed' || session.status === 'auto_approved') {
      return false
    }

    const deadline = new Date(session.deadline)
    const now = new Date()

    return now > deadline
  }

  /**
   * Determines if session should auto-complete
   */
  static shouldAutoComplete(session: VerificationSessionRow): boolean {
    const total = session.total_transactions || 0
    const verified = session.verified_transactions || 0

    return total > 0 && verified >= total && session.status !== 'completed'
  }

  /**
   * Updates session progress after transaction verification
   */
  static updateProgress(
    currentSession: VerificationSessionRow,
    verificationResult: {
      approved: boolean
      verificationTimeSeconds: number
    }
  ): Partial<VerificationSessionUpdate> {
    const newVerifiedCount = (currentSession.verified_transactions || 0) + 1
    const newApprovedCount = verificationResult.approved
      ? (currentSession.approved_count || 0) + 1
      : currentSession.approved_count || 0
    const newRejectedCount = !verificationResult.approved
      ? (currentSession.rejected_count || 0) + 1
      : currentSession.rejected_count || 0

    // Update average verification time (rolling average)
    const currentAvg = 0 // Field not available in current schema
    const currentCount = currentSession.verified_transactions || 0
    const newAvg = currentCount > 0
      ? ((currentAvg * currentCount) + verificationResult.verificationTimeSeconds) / newVerifiedCount
      : verificationResult.verificationTimeSeconds

    // Determine if session should auto-complete
    const shouldComplete = newVerifiedCount >= (currentSession.total_transactions || 0)

    return {
      verified_transactions: newVerifiedCount,
      approved_count: newApprovedCount,
      rejected_count: newRejectedCount,
      // average_verification_time_seconds not available in current schema
      status: shouldComplete ? 'completed' : currentSession.status,
      completed_at: shouldComplete ? new Date().toISOString() : undefined,
      updated_at: new Date().toISOString(),
    }
  }
}

// Business rules for verification sessions
export class VerificationSessionBusinessRules {
  /**
   * Validates session creation requirements
   */
  static validateSessionCreation(params: {
    business_id: string
    payment_batch_id: string
    total_transactions: number
    deadline: string
    existing_sessions?: VerificationSessionRow[]
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check for existing active session for the same batch
    const activeSession = params.existing_sessions?.find(
      session =>
        session.payment_batch_id === params.payment_batch_id &&
        ['not_started', 'in_progress', 'paused'].includes(session.status as string)
    )

    if (activeSession) {
      errors.push(`Active verification session already exists for batch ${params.payment_batch_id}`)
    }

    // Validate deadline is in the future
    const deadline = new Date(params.deadline)
    const now = new Date()
    if (deadline <= now) {
      errors.push('Deadline must be in the future')
    }

    // Validate transaction count
    if (params.total_transactions <= 0) {
      errors.push('Total transactions must be greater than 0')
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Calculates priority level based on deadline and batch size
   */
  static calculatePriorityLevel(params: {
    deadline: string
    total_transactions: number
    total_amount: number
  }): 'low' | 'medium' | 'high' | 'critical' {
    const deadline = new Date(params.deadline)
    const now = new Date()
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Base priority on time remaining
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'low'

    if (hoursRemaining < 0) priority = 'critical' // Overdue
    else if (hoursRemaining < 24) priority = 'critical' // Less than 1 day
    else if (hoursRemaining < 48) priority = 'high' // Less than 2 days
    else if (hoursRemaining < 72) priority = 'medium' // Less than 3 days

    // Escalate priority for large batches
    if (params.total_transactions > 100 || params.total_amount > 50000) {
      const priorities = ['low', 'medium', 'high', 'critical']
      const currentIndex = priorities.indexOf(priority)
      if (currentIndex < priorities.length - 1) {
        priority = priorities[currentIndex + 1] as typeof priority
      }
    }

    return priority
  }

  /**
   * Validates if session can be paused
   */
  static canPause(session: VerificationSessionRow): { can: boolean; reason?: string } {
    if (session.status !== 'in_progress') {
      return { can: false, reason: 'Session must be in progress to pause' }
    }

    // Check if too close to deadline (less than 6 hours)
    const deadline = new Date(session.deadline)
    const now = new Date()
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursRemaining < 6) {
      return { can: false, reason: 'Cannot pause session within 6 hours of deadline' }
    }

    return { can: true }
  }

  /**
   * Validates if session can be resumed
   */
  static canResume(session: VerificationSessionRow): { can: boolean; reason?: string } {
    if (session.status !== 'in_progress') {
      return { can: false, reason: 'Session must be in progress to resume' }
    }

    // Check if deadline has passed
    const deadline = new Date(session.deadline)
    const now = new Date()

    if (now > deadline) {
      return { can: false, reason: 'Cannot resume session after deadline has passed' }
    }

    return { can: true }
  }
}

// Utility functions
export class VerificationSessionUtils {
  /**
   * Formats session identifier for display
   */
  static formatSessionId(session: VerificationSessionRow): string {
    return `VS-${session.id.slice(0, 8).toUpperCase()}`
  }

  /**
   * Generates session title for UI
   */
  static generateSessionTitle(session: VerificationSessionRow, batchInfo?: {
    week_number: number
    year: number
  }): string {
    if (batchInfo) {
      return `Week ${batchInfo.week_number}, ${batchInfo.year} Verification (${session.total_transactions} transactions)`
    }
    return `Verification Session (${session.total_transactions} transactions)`
  }

  /**
   * Calculates estimated completion time
   */
  static estimateCompletionTime(session: VerificationSessionRow): Date | null {
    const progress = VerificationSessionState.calculateProgress(session)
    if (progress.estimated_time_remaining_minutes <= 0) {
      return null
    }

    const now = new Date()
    const completionTime = new Date(now.getTime() + progress.estimated_time_remaining_minutes * 60 * 1000)
    return completionTime
  }

  /**
   * Formats time remaining for display
   */
  static formatTimeRemaining(deadline: string): string {
    const deadlineDate = new Date(deadline)
    const now = new Date()
    const diff = deadlineDate.getTime() - now.getTime()

    if (diff < 0) {
      const hoursOverdue = Math.floor(Math.abs(diff) / (1000 * 60 * 60))
      return `${hoursOverdue}h overdue`
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }
}

// Export validation functions
export const validateVerificationSessionCreate = (data: unknown) =>
  VerificationSessionValidation.create.safeParse(data)

export const validateVerificationSessionUpdate = (data: unknown) =>
  VerificationSessionValidation.update.safeParse(data)

export const validateVerificationSessionProgress = (data: unknown) =>
  VerificationSessionValidation.progress.safeParse(data)

export const validateVerificationSessionQuery = (data: unknown) =>
  VerificationSessionValidation.query.safeParse(data)