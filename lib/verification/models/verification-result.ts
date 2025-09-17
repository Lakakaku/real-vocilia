/**
 * Verification Result Model and Decision Types
 *
 * Manages individual transaction verification results, business decisions,
 * and integration with fraud detection systems.
 */

import { z } from 'zod'
import type { VerificationResult, VerificationResultInsert, VerificationResultUpdate } from '@/lib/supabase/types/verification'

// Database type references  
export type VerificationResultRow = VerificationResult
export { VerificationResultInsert, VerificationResultUpdate }

// Decision types for business verification
export type VerificationDecision = 'approved' | 'rejected' | 'pending'

// Rejection reason categories
export type RejectionReason =
  | 'amount_mismatch'
  | 'customer_dispute'
  | 'invalid_transaction'
  | 'duplicate_transaction'
  | 'missing_documentation'
  | 'quality_threshold_not_met'
  | 'fraud_suspected'
  | 'technical_error'
  | 'policy_violation'
  | 'other'

// Quality thresholds for automatic decisions
export interface QualityThresholds {
  auto_approve_min_score: number // e.g., 90+
  auto_reject_max_score: number  // e.g., 30-
  manual_review_range: [number, number] // e.g., [31, 89]
}

// Verification result with calculated fields
export interface VerificationResultWithAnalysis extends VerificationResultRow {
  decision_analysis: {
    is_auto_decision: boolean
    confidence_score: number
    risk_factors: string[]
    recommendation_source: 'business' | 'ai' | 'policy' | 'manual'
  }
  fraud_indicators?: {
    risk_score: number
    risk_level: string
    ai_recommendation: string
    pattern_matches: string[]
  }
  payment_impact: {
    reward_payable: boolean
    reward_amount: number
    commission_applicable: boolean
    commission_amount: number
  }
}

// Validation schemas
export const VerificationResultValidation = {
  // Create verification result
  create: z.object({
    verification_session_id: z.string().uuid('Invalid session ID'),
    transaction_id: z.string()
      .min(1, 'Transaction ID is required')
      .max(50, 'Transaction ID too long'),
    transaction_date: z.string().datetime('Invalid transaction date'),
    amount_sek: z.number()
      .min(0, 'Amount cannot be negative')
      .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
    phone_last4: z.string()
      .regex(/^\*\*\d{2}$/, 'Phone last 4 must be in format **XX'),
    store_code: z.string()
      .length(6, 'Store code must be exactly 6 characters')
      .regex(/^[A-Z0-9]+$/, 'Store code must contain only uppercase letters and numbers'),
    quality_score: z.number()
      .int('Quality score must be an integer')
      .min(0, 'Quality score cannot be negative')
      .max(100, 'Quality score cannot exceed 100'),
    reward_percentage: z.number()
      .min(0, 'Reward percentage cannot be negative')
      .max(15, 'Reward percentage cannot exceed 15%')
      .multipleOf(0.01, 'Reward percentage must have at most 2 decimal places'),
    reward_amount_sek: z.number()
      .min(0, 'Reward amount cannot be negative')
      .multipleOf(0.01, 'Reward amount must have at most 2 decimal places'),
    customer_feedback_id: z.string().optional(),
  }),

  // Update verification decision
  decision: z.object({
    id: z.string().uuid('Invalid result ID'),
    verified: z.boolean({ required_error: 'Verification status is required' }),
    verification_decision: z.enum(['approved', 'rejected', 'pending']),
    rejection_reason: z.enum([
      'amount_mismatch',
      'customer_dispute',
      'invalid_transaction',
      'duplicate_transaction',
      'missing_documentation',
      'quality_threshold_not_met',
      'fraud_suspected',
      'technical_error',
      'policy_violation',
      'other'
    ]).optional(),
    business_notes: z.string()
      .max(1000, 'Business notes cannot exceed 1000 characters')
      .optional(),
    verification_time_seconds: z.number()
      .int('Verification time must be an integer')
      .min(1, 'Verification time must be at least 1 second')
      .optional(),
    reviewer_id: z.string().uuid('Invalid reviewer ID').optional(),
  }),

  // Bulk decision update
  bulk_decision: z.object({
    verification_session_id: z.string().uuid('Invalid session ID'),
    decisions: z.array(z.object({
      transaction_id: z.string(),
      verified: z.boolean(),
      verification_decision: z.enum(['approved', 'rejected', 'pending']),
      rejection_reason: z.enum([
        'amount_mismatch',
        'customer_dispute',
        'invalid_transaction',
        'duplicate_transaction',
        'missing_documentation',
        'quality_threshold_not_met',
        'fraud_suspected',
        'technical_error',
        'policy_violation',
        'other'
      ]).optional(),
      business_notes: z.string().max(1000).optional(),
    })).min(1, 'At least one decision is required'),
    reviewer_id: z.string().uuid('Invalid reviewer ID').optional(),
  }),

  // Query/filter schema
  query: z.object({
    verification_session_id: z.string().uuid().optional(),
    business_id: z.string().uuid().optional(),
    transaction_id: z.string().optional(),
    verified: z.boolean().optional(),
    verification_decision: z.enum(['approved', 'rejected', 'pending']).optional(),
    rejection_reason: z.enum([
      'amount_mismatch',
      'customer_dispute',
      'invalid_transaction',
      'duplicate_transaction',
      'missing_documentation',
      'quality_threshold_not_met',
      'fraud_suspected',
      'technical_error',
      'policy_violation',
      'other'
    ]).optional(),
    quality_score_min: z.number().int().min(0).max(100).optional(),
    quality_score_max: z.number().int().min(0).max(100).optional(),
    amount_min: z.number().min(0).optional(),
    amount_max: z.number().min(0).optional(),
    created_after: z.string().datetime().optional(),
    created_before: z.string().datetime().optional(),
    limit: z.number().int().min(1).max(500).default(50),
    offset: z.number().int().min(0).default(0),
    sort_by: z.enum(['created_at', 'amount_sek', 'quality_score', 'transaction_date']).default('created_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
  }),

  // Auto-decision validation
  auto_decision: z.object({
    quality_score: z.number().int().min(0).max(100),
    fraud_risk_score: z.number().min(0).max(100).optional(),
    business_rules: z.object({
      auto_approve_threshold: z.number().min(0).max(100),
      auto_reject_threshold: z.number().min(0).max(100),
      fraud_risk_threshold: z.number().min(0).max(100),
    }),
  }),
}

// Business rules for verification decisions
export class VerificationResultBusinessRules {
  /**
   * Determines if transaction should be auto-approved based on quality score
   */
  static shouldAutoApprove(params: {
    quality_score: number
    fraud_risk_score?: number
    thresholds: QualityThresholds
    fraud_threshold?: number
  }): { auto_approve: boolean; reason: string } {
    const { quality_score, fraud_risk_score, thresholds, fraud_threshold = 30 } = params

    // Check fraud risk first
    if (fraud_risk_score !== undefined && fraud_risk_score > fraud_threshold) {
      return {
        auto_approve: false,
        reason: `High fraud risk score: ${fraud_risk_score} > ${fraud_threshold}`
      }
    }

    // Check quality threshold
    if (quality_score >= thresholds.auto_approve_min_score) {
      return {
        auto_approve: true,
        reason: `Quality score ${quality_score} meets auto-approval threshold ${thresholds.auto_approve_min_score}`
      }
    }

    return {
      auto_approve: false,
      reason: `Quality score ${quality_score} below auto-approval threshold ${thresholds.auto_approve_min_score}`
    }
  }

  /**
   * Determines if transaction should be auto-rejected
   */
  static shouldAutoReject(params: {
    quality_score: number
    fraud_risk_score?: number
    thresholds: QualityThresholds
    fraud_threshold?: number
  }): { auto_reject: boolean; reason: string } {
    const { quality_score, fraud_risk_score, thresholds, fraud_threshold = 70 } = params

    // Check critical fraud risk
    if (fraud_risk_score !== undefined && fraud_risk_score > fraud_threshold) {
      return {
        auto_reject: true,
        reason: `Critical fraud risk score: ${fraud_risk_score} > ${fraud_threshold}`
      }
    }

    // Check quality threshold
    if (quality_score <= thresholds.auto_reject_max_score) {
      return {
        auto_reject: true,
        reason: `Quality score ${quality_score} below auto-rejection threshold ${thresholds.auto_reject_max_score}`
      }
    }

    return {
      auto_reject: false,
      reason: `Quality score ${quality_score} above auto-rejection threshold ${thresholds.auto_reject_max_score}`
    }
  }

  /**
   * Validates verification decision consistency
   */
  static validateDecisionConsistency(result: {
    verified: boolean
    verification_decision: VerificationDecision
    rejection_reason?: RejectionReason
    business_notes?: string
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Verified must match decision
    if (result.verified && result.verification_decision === 'rejected') {
      errors.push('Cannot mark as verified with rejected decision')
    }

    if (!result.verified && result.verification_decision === 'approved') {
      errors.push('Cannot approve unverified transaction')
    }

    // Rejection reason required for rejected decisions
    if (result.verification_decision === 'rejected' && !result.rejection_reason) {
      errors.push('Rejection reason is required for rejected transactions')
    }

    // Business notes recommended for manual decisions
    if (result.verification_decision === 'rejected' && !result.business_notes) {
      errors.push('Business notes recommended for rejected transactions')
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Calculates payment amounts based on verification decision
   */
  static calculatePaymentImpact(result: {
    verification_decision: VerificationDecision
    reward_amount_sek: number
    reward_percentage: number
    amount_sek: number
    business_commission_rate?: number
  }): {
    reward_payable: boolean
    reward_amount: number
    commission_applicable: boolean
    commission_amount: number
    net_business_cost: number
  } {
    const { verification_decision, reward_amount_sek, amount_sek, business_commission_rate = 0.03 } = result

    const isPayable = verification_decision === 'approved'
    const rewardAmount = isPayable ? reward_amount_sek : 0
    const commissionAmount = isPayable ? amount_sek * business_commission_rate : 0
    const netCost = rewardAmount + commissionAmount

    return {
      reward_payable: isPayable,
      reward_amount: rewardAmount,
      commission_applicable: isPayable,
      commission_amount: commissionAmount,
      net_business_cost: netCost,
    }
  }

  /**
   * Validates transaction data integrity
   */
  static validateTransactionData(result: {
    amount_sek: number
    reward_amount_sek: number
    reward_percentage: number
    quality_score: number
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Reward amount should match percentage calculation (with tolerance)
    const expectedReward = (result.amount_sek * result.reward_percentage) / 100
    const tolerance = 0.01
    if (Math.abs(result.reward_amount_sek - expectedReward) > tolerance) {
      errors.push(
        `Reward amount ${result.reward_amount_sek} doesn't match calculated amount ${expectedReward.toFixed(2)}`
      )
    }

    // Quality score validation
    if (result.quality_score < 0 || result.quality_score > 100) {
      errors.push(`Quality score ${result.quality_score} must be between 0 and 100`)
    }

    // Reward percentage validation
    if (result.reward_percentage < 0 || result.reward_percentage > 15) {
      errors.push(`Reward percentage ${result.reward_percentage} must be between 0 and 15`)
    }

    return { valid: errors.length === 0, errors }
  }
}

// Analytics and reporting utilities
export class VerificationResultAnalytics {
  /**
   * Calculates verification session statistics
   */
  static calculateSessionStats(results: VerificationResultRow[]): {
    total_transactions: number
    verified_transactions: number
    approval_rate: number
    rejection_rate: number
    average_quality_score: number
    total_reward_amount: number
    total_commission_amount: number
    common_rejection_reasons: Array<{ reason: RejectionReason; count: number }>
  } {
    const total = results.length
    const verified = results.filter(r => r.verified).length
    const approved = results.filter(r => r.verification_decision === 'approved').length
    const rejected = results.filter(r => r.verification_decision === 'rejected').length

    const approvalRate = verified > 0 ? (approved / verified) * 100 : 0
    const rejectionRate = verified > 0 ? (rejected / verified) * 100 : 0

    const avgQuality = total > 0
      ? results.reduce((sum, r) => sum + (r.quality_score || 0), 0) / total
      : 0

    const totalReward = results
      .filter(r => r.verification_decision === 'approved')
      .reduce((sum, r) => sum + (r.reward_amount_sek || 0), 0)

    const totalCommission = results
      .filter(r => r.verification_decision === 'approved')
      .reduce((sum, r) => sum + ((r.amount_sek || 0) * 0.03), 0)

    // Count rejection reasons
    const rejectionCounts = new Map<RejectionReason, number>()
    results
      .filter(r => r.rejection_reason)
      .forEach(r => {
        const reason = r.rejection_reason as RejectionReason
        rejectionCounts.set(reason, (rejectionCounts.get(reason) || 0) + 1)
      })

    const commonReasons = Array.from(rejectionCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)

    return {
      total_transactions: total,
      verified_transactions: verified,
      approval_rate: Math.round(approvalRate * 100) / 100,
      rejection_rate: Math.round(rejectionRate * 100) / 100,
      average_quality_score: Math.round(avgQuality * 100) / 100,
      total_reward_amount: Math.round(totalReward * 100) / 100,
      total_commission_amount: Math.round(totalCommission * 100) / 100,
      common_rejection_reasons: commonReasons,
    }
  }

  /**
   * Generates decision timeline for audit
   */
  static generateDecisionTimeline(results: VerificationResultRow[]): Array<{
    transaction_id: string
    decision_timestamp: string
    decision: VerificationDecision
    reviewer_id?: string
    automated: boolean
  }> {
    return results
      .filter(r => r.verification_decision && r.verification_decision !== 'pending_review')
      .map(r => ({
        transaction_id: r.transaction_id,
        decision_timestamp: r.updated_at || r.created_at,
        decision: r.verification_decision as VerificationDecision,
        reviewer_id: r.verified_by || undefined,
        automated: !r.verified_by, // Assume automated if no reviewer
      }))
      .sort((a, b) => new Date(a.decision_timestamp).getTime() - new Date(b.decision_timestamp).getTime())
  }
}

// Utility functions
export class VerificationResultUtils {
  /**
   * Formats transaction display ID
   */
  static formatTransactionId(transactionId: string): string {
    return transactionId.toUpperCase()
  }

  /**
   * Gets rejection reason display text
   */
  static getRejectionReasonText(reason: RejectionReason): string {
    const reasonTexts: Record<RejectionReason, string> = {
      amount_mismatch: 'Amount mismatch with POS system',
      customer_dispute: 'Customer disputed transaction',
      invalid_transaction: 'Invalid or corrupted transaction data',
      duplicate_transaction: 'Duplicate transaction detected',
      missing_documentation: 'Required documentation missing',
      quality_threshold_not_met: 'Quality score below minimum threshold',
      fraud_suspected: 'Fraudulent activity suspected',
      technical_error: 'Technical processing error',
      policy_violation: 'Business policy violation',
      other: 'Other reason (see notes)',
    }

    return reasonTexts[reason] || 'Unknown reason'
  }

  /**
   * Determines verification urgency
   */
  static getVerificationUrgency(result: VerificationResultRow): 'low' | 'medium' | 'high' {
    const amount = result.amount_sek || 0
    const qualityScore = result.quality_score || 0

    if (amount > 1000 || qualityScore < 40) return 'high'
    if (amount > 500 || qualityScore < 70) return 'medium'
    return 'low'
  }
}

// Export validation functions
export const validateVerificationResultCreate = (data: unknown) =>
  VerificationResultValidation.create.safeParse(data)

export const validateVerificationResultDecision = (data: unknown) =>
  VerificationResultValidation.decision.safeParse(data)

export const validateVerificationResultBulkDecision = (data: unknown) =>
  VerificationResultValidation.bulk_decision.safeParse(data)

export const validateVerificationResultQuery = (data: unknown) =>
  VerificationResultValidation.query.safeParse(data)

export const validateAutoDecision = (data: unknown) =>
  VerificationResultValidation.auto_decision.safeParse(data)