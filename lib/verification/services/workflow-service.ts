/**
 * Verification Workflow Service
 *
 * Orchestrates the complete verification workflow, coordinates session state
 * transitions, manages business rules, and handles complex verification operations.
 */

import type {
  PaymentBatch,
  PaymentBatchUpdate,
  VerificationSession,
  VerificationSessionUpdate,
  VerificationResult,
  FraudAssessment
} from '@/lib/supabase/types/verification'
import { createClient } from '@/lib/supabase/client'
import { PaymentBatchBusinessRules, type VerificationBatchStatus } from '../models/payment-batch'
import {
  VerificationSessionState,
  VerificationSessionBusinessRules,
  type VerificationSessionStatus
} from '../models/verification-session'
import { FraudAssessmentEngine } from '../models/fraud-assessment'
import { CSVProcessingService } from './csv-service'
import { VerificationStorageService } from './storage-service'
import { AIFraudDetectionService } from '../../ai/fraud-detection-service'
import { DeadlineManagementService } from './deadline-service'
import { VerificationAuditService } from './audit-service'

// Workflow operation types
export interface StartVerificationRequest {
  payment_batch_id: string
  business_id: string
  verifier_id: string
  notes?: string
}

export interface VerifyTransactionRequest {
  session_id: string
  transaction_id: string
  decision: 'approved' | 'rejected'
  reason?: string
  notes?: string
  verifier_id: string
  verification_time_seconds?: number
}

export interface BatchOperationRequest {
  session_id: string
  transaction_ids: string[]
  decision: 'approved' | 'rejected'
  reason?: string
  notes?: string
  verifier_id: string
}

export interface PauseSessionRequest {
  session_id: string
  reason: string
  verifier_id: string
  business_id: string
}

export interface ResumeSessionRequest {
  session_id: string
  verifier_id: string
  business_id: string
}

export interface CompleteSessionRequest {
  session_id: string
  verifier_id: string
  business_id: string
  final_notes?: string
}

// Workflow response types
export interface WorkflowOperationResult {
  success: boolean
  message: string
  data?: any
  errors?: string[]
  warnings?: string[]
}

export interface VerificationProgress {
  session_id: string
  batch_id: string
  business_id: string
  total_transactions: number
  verified_transactions: number
  approved_count: number
  rejected_count: number
  completion_percentage: number
  current_status: VerificationSessionStatus
  next_transaction?: {
    id: string
    index: number
    amount: number
    recipient: string
  }
  estimated_completion_time?: string
}

export interface WorkflowState {
  batch: PaymentBatch
  session: VerificationSession
  progress: VerificationProgress
  deadline_status: {
    hours_remaining: number
    is_overdue: boolean
    urgency_level: string
  }
  can_pause: boolean
  can_resume: boolean
  can_complete: boolean
  requires_fraud_review: boolean
}

export class VerificationWorkflowService {
  private supabase = createClient()
  private csvService = new CSVProcessingService()
  private storageService = new VerificationStorageService()
  private aiService = new AIFraudDetectionService()
  private deadlineService = new DeadlineManagementService()
  private auditService = new VerificationAuditService()

  /**
   * Starts a new verification session for a payment batch
   */
  async startVerification(request: StartVerificationRequest): Promise<WorkflowOperationResult> {
    try {
      // Validate batch exists and is in correct state
      const { data: batch, error: batchError } = await this.supabase
        .from('payment_batches')
        .select('*')
        .eq('id', request.payment_batch_id)
        .eq('business_id', request.business_id)
        .single()

      if (batchError || !batch) {
        return {
          success: false,
          message: 'Payment batch not found or access denied',
          errors: [batchError?.message || 'Batch not found']
        }
      }

      if (batch.status !== 'pending_verification') {
        return {
          success: false,
          message: `Batch is not ready for verification (status: ${batch.status})`,
          errors: [`Invalid batch status: ${batch.status}`]
        }
      }

      // Check for existing active session
      const { data: existingSessions } = await this.supabase
        .from('verification_sessions')
        .select('id, status')
        .eq('payment_batch_id', request.payment_batch_id)
        .in('status', ['not_started', 'in_progress', 'paused'])

      if (existingSessions && existingSessions.length > 0) {
        return {
          success: false,
          message: 'Active verification session already exists for this batch',
          errors: ['Duplicate session detected']
        }
      }

      // Calculate deadline (7 days from now)
      const deadline = new Date()
      deadline.setDate(deadline.getDate() + 7)
      deadline.setHours(23, 59, 59, 999)

      // Create verification session
      const { data: session, error: sessionError } = await this.supabase
        .from('verification_sessions')
        .insert({
          payment_batch_id: request.payment_batch_id,
          business_id: request.business_id,
          status: 'in_progress',
          total_transactions: batch.total_transactions,
          verified_transactions: 0,
          approved_count: 0,
          rejected_count: 0,
          current_transaction_index: 0,
          deadline: deadline.toISOString(),
          started_at: new Date().toISOString(),
          notes: request.notes,
        })
        .select()
        .single()

      if (sessionError) {
        return {
          success: false,
          message: 'Failed to create verification session',
          errors: [sessionError.message]
        }
      }

      // Update batch status to in_progress
      await this.supabase
        .from('payment_batches')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', request.payment_batch_id)

      // Log audit event
      await this.auditService.logActivity({
        event_type: 'verification_started',
        actor_id: request.verifier_id,
        actor_type: 'user',
        business_id: request.business_id,
        category: 'verification',
        severity: 'info',
        description: 'Verification session started',
        details: {
          session_id: session.id,
          batch_id: request.payment_batch_id,
          total_transactions: batch.total_transactions,
          deadline: deadline.toISOString(),
        }
      })

      return {
        success: true,
        message: 'Verification session started successfully',
        data: {
          session_id: session.id,
          deadline: deadline.toISOString(),
          total_transactions: batch.total_transactions,
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to start verification session',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Verifies a single transaction
   */
  async verifyTransaction(request: VerifyTransactionRequest): Promise<WorkflowOperationResult> {
    try {
      // Get current session state
      const sessionState = await this.getWorkflowState(request.session_id)
      if (!sessionState) {
        return {
          success: false,
          message: 'Verification session not found',
          errors: ['Session not found']
        }
      }

      if (sessionState.session.status !== 'in_progress') {
        return {
          success: false,
          message: `Session is not active (status: ${sessionState.session.status})`,
          errors: ['Invalid session status']
        }
      }

      // Record verification result
      const { error: resultError } = await this.supabase
        .from('verification_results')
        .insert({
          verification_session_id: request.session_id,
          transaction_id: request.transaction_id,
          decision: request.decision,
          reason: request.reason,
          notes: request.notes,
          verified_by: request.verifier_id,
          verified_at: new Date().toISOString(),
          verification_time_seconds: request.verification_time_seconds || 60,
          is_flagged: request.decision === 'rejected',
        })

      if (resultError) {
        return {
          success: false,
          message: 'Failed to record verification result',
          errors: [resultError.message]
        }
      }

      // Update session progress
      const progressUpdate = VerificationSessionState.updateProgress(
        sessionState.session,
        {
          approved: request.decision === 'approved',
          verificationTimeSeconds: request.verification_time_seconds || 60,
        }
      )

      const { error: updateError } = await this.supabase
        .from('verification_sessions')
        .update(progressUpdate)
        .eq('id', request.session_id)

      if (updateError) {
        return {
          success: false,
          message: 'Failed to update session progress',
          errors: [updateError.message]
        }
      }

      // Check if session should auto-complete
      const shouldComplete = progressUpdate.status === 'completed'
      if (shouldComplete) {
        await this.completeSessionInternal(request.session_id, request.verifier_id, sessionState.business_id)
      }

      // Log audit event
      await this.auditService.logActivity({
        event_type: 'transaction_verified',
        actor_id: request.verifier_id,
        actor_type: 'user',
        business_id: sessionState.business_id,
        category: 'verification',
        severity: 'info',
        description: `Transaction ${request.decision}`,
        details: {
          session_id: request.session_id,
          transaction_id: request.transaction_id,
          decision: request.decision,
          reason: request.reason,
          verification_time_seconds: request.verification_time_seconds,
        }
      })

      return {
        success: true,
        message: `Transaction ${request.decision} successfully`,
        data: {
          session_completed: shouldComplete,
          next_transaction_index: (progressUpdate.verified_transactions || 0),
          completion_percentage: Math.round(((progressUpdate.verified_transactions || 0) / sessionState.session.total_transactions) * 100),
        }
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to verify transaction',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Batch operation for multiple transactions
   */
  async batchVerifyTransactions(request: BatchOperationRequest): Promise<WorkflowOperationResult> {
    const results: string[] = []
    const errors: string[] = []

    for (const transactionId of request.transaction_ids) {
      const result = await this.verifyTransaction({
        session_id: request.session_id,
        transaction_id: transactionId,
        decision: request.decision,
        reason: request.reason,
        notes: request.notes,
        verifier_id: request.verifier_id,
      })

      if (result.success) {
        results.push(`Transaction ${transactionId}: ${request.decision}`)
      } else {
        errors.push(`Transaction ${transactionId}: ${result.errors?.join(', ') || 'Unknown error'}`)
      }
    }

    return {
      success: errors.length === 0,
      message: `Processed ${results.length} transactions successfully, ${errors.length} failed`,
      data: { processed: results.length, failed: errors.length },
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  /**
   * Pauses an active verification session
   */
  async pauseSession(request: PauseSessionRequest): Promise<WorkflowOperationResult> {
    try {
      const sessionState = await this.getWorkflowState(request.session_id)
      if (!sessionState) {
        return {
          success: false,
          message: 'Verification session not found',
          errors: ['Session not found']
        }
      }

      const canPause = VerificationSessionBusinessRules.canPause(sessionState.session)
      if (!canPause.can) {
        return {
          success: false,
          message: canPause.reason || 'Cannot pause session',
          errors: [canPause.reason || 'Cannot pause']
        }
      }

      const { error } = await this.supabase
        .from('verification_sessions')
        .update({
          status: 'paused',
          pause_reason: request.reason,
          paused_at: new Date().toISOString(),
          pause_count: (sessionState.session.pause_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.session_id)

      if (error) {
        return {
          success: false,
          message: 'Failed to pause session',
          errors: [error.message]
        }
      }

      await this.auditService.logActivity({
        event_type: 'session_paused',
        actor_id: request.verifier_id,
        actor_type: 'user',
        business_id: request.business_id,
        category: 'verification',
        severity: 'info',
        description: 'Verification session paused',
        details: {
          session_id: request.session_id,
          reason: request.reason,
        }
      })

      return {
        success: true,
        message: 'Verification session paused successfully',
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to pause session',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Resumes a paused verification session
   */
  async resumeSession(request: ResumeSessionRequest): Promise<WorkflowOperationResult> {
    try {
      const sessionState = await this.getWorkflowState(request.session_id)
      if (!sessionState) {
        return {
          success: false,
          message: 'Verification session not found',
          errors: ['Session not found']
        }
      }

      const canResume = VerificationSessionBusinessRules.canResume(sessionState.session)
      if (!canResume.can) {
        return {
          success: false,
          message: canResume.reason || 'Cannot resume session',
          errors: [canResume.reason || 'Cannot resume']
        }
      }

      const { error } = await this.supabase
        .from('verification_sessions')
        .update({
          status: 'in_progress',
          resumed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.session_id)

      if (error) {
        return {
          success: false,
          message: 'Failed to resume session',
          errors: [error.message]
        }
      }

      await this.auditService.logActivity({
        event_type: 'session_resumed',
        actor_id: request.verifier_id,
        actor_type: 'user',
        business_id: request.business_id,
        category: 'verification',
        severity: 'info',
        description: 'Verification session resumed',
        details: {
          session_id: request.session_id,
        }
      })

      return {
        success: true,
        message: 'Verification session resumed successfully',
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to resume session',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Manually completes a verification session
   */
  async completeSession(request: CompleteSessionRequest): Promise<WorkflowOperationResult> {
    try {
      return await this.completeSessionInternal(
        request.session_id,
        request.verifier_id,
        request.business_id,
        request.final_notes
      )
    } catch (error) {
      return {
        success: false,
        message: 'Failed to complete session',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Gets current workflow state for a session
   */
  async getWorkflowState(sessionId: string): Promise<WorkflowState | null> {
    try {
      // Get session with batch data
      const { data: sessionData, error: sessionError } = await this.supabase
        .from('verification_sessions')
        .select(`
          *,
          payment_batches (*)
        `)
        .eq('id', sessionId)
        .single()

      if (sessionError || !sessionData) {
        return null
      }

      const session = sessionData as VerificationSession
      const batch = sessionData.payment_batches as PaymentBatch

      // Calculate progress
      const progress: VerificationProgress = {
        session_id: session.id,
        batch_id: session.payment_batch_id,
        business_id: session.business_id,
        total_transactions: session.total_transactions || 0,
        verified_transactions: session.verified_transactions || 0,
        approved_count: session.approved_count || 0,
        rejected_count: session.rejected_count || 0,
        completion_percentage: Math.round(((session.verified_transactions || 0) / (session.total_transactions || 1)) * 100),
        current_status: session.status as VerificationSessionStatus,
      }

      // Get deadline status
      const deadlineStatus = await this.deadlineService.getDeadlineStatus(sessionId)

      // Check business rules
      const canPause = VerificationSessionBusinessRules.canPause(session)
      const canResume = VerificationSessionBusinessRules.canResume(session)
      const canComplete = session.status === 'in_progress'

      return {
        batch,
        session,
        progress,
        deadline_status: {
          hours_remaining: deadlineStatus.hours_remaining,
          is_overdue: deadlineStatus.is_overdue,
          urgency_level: deadlineStatus.urgency_level,
        },
        can_pause: canPause.can,
        can_resume: canResume.can,
        can_complete: canComplete,
        requires_fraud_review: (session.average_risk_score || 0) > 70,
      }
    } catch (error) {
      console.error('Failed to get workflow state:', error)
      return null
    }
  }

  /**
   * Gets verification progress for multiple sessions
   */
  async getProgressSummary(businessId: string): Promise<VerificationProgress[]> {
    const { data: sessions, error } = await this.supabase
      .from('verification_sessions')
      .select('*')
      .eq('business_id', businessId)
      .in('status', ['not_started', 'in_progress', 'paused'])
      .order('deadline', { ascending: true })

    if (error || !sessions) {
      return []
    }

    return sessions.map(session => ({
      session_id: session.id,
      batch_id: session.payment_batch_id,
      business_id: session.business_id,
      total_transactions: session.total_transactions || 0,
      verified_transactions: session.verified_transactions || 0,
      approved_count: session.approved_count || 0,
      rejected_count: session.rejected_count || 0,
      completion_percentage: Math.round(((session.verified_transactions || 0) / (session.total_transactions || 1)) * 100),
      current_status: session.status as VerificationSessionStatus,
    }))
  }

  /**
   * Internal method to complete a session
   */
  private async completeSessionInternal(
    sessionId: string,
    verifierId: string,
    businessId: string,
    finalNotes?: string
  ): Promise<WorkflowOperationResult> {
    const { error: sessionError } = await this.supabase
      .from('verification_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: finalNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (sessionError) {
      throw new Error(`Failed to complete session: ${sessionError.message}`)
    }

    // Update batch status
    const { data: session } = await this.supabase
      .from('verification_sessions')
      .select('payment_batch_id')
      .eq('id', sessionId)
      .single()

    if (session) {
      await this.supabase
        .from('payment_batches')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.payment_batch_id)
    }

    await this.auditService.logActivity({
      event_type: 'session_completed',
      actor_id: verifierId,
      actor_type: 'user',
      business_id: businessId,
      category: 'verification',
      severity: 'info',
      description: 'Verification session completed',
      details: {
        session_id: sessionId,
        final_notes: finalNotes,
      }
    })

    return {
      success: true,
      message: 'Verification session completed successfully',
    }
  }
}

// Export singleton instance
export const workflowService = new VerificationWorkflowService()

// Export utility types and functions
export const WorkflowUtils = {
  /**
   * Determines if a session is nearing deadline
   */
  isNearingDeadline(deadlineStatus: { hours_remaining: number }): boolean {
    return deadlineStatus.hours_remaining < 24
  },

  /**
   * Gets appropriate status color for UI
   */
  getStatusColor(status: VerificationSessionStatus): string {
    const colors = {
      not_started: 'text-gray-600',
      in_progress: 'text-blue-600',
      paused: 'text-yellow-600',
      completed: 'text-green-600',
      expired: 'text-red-600',
      cancelled: 'text-red-600',
    }
    return colors[status] || 'text-gray-600'
  },

  /**
   * Calculates estimated completion time
   */
  calculateEstimatedCompletion(
    remainingTransactions: number,
    averageTimePerTransaction: number
  ): Date {
    const remainingMinutes = (remainingTransactions * averageTimePerTransaction) / 60
    return new Date(Date.now() + remainingMinutes * 60 * 1000)
  },

  /**
   * Validates if operation is allowed in current state
   */
  validateOperation(
    operation: 'start' | 'verify' | 'pause' | 'resume' | 'complete',
    status: VerificationSessionStatus
  ): { allowed: boolean; reason?: string } {
    const allowedOperations: Record<VerificationSessionStatus, string[]> = {
      not_started: ['start'],
      in_progress: ['verify', 'pause', 'complete'],
      paused: ['resume', 'complete'],
      completed: [],
      expired: [],
      cancelled: [],
    }

    const allowed = allowedOperations[status]?.includes(operation) || false
    return {
      allowed,
      reason: allowed ? undefined : `Operation '${operation}' not allowed in status '${status}'`,
    }
  },
}