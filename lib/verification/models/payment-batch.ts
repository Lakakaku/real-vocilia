/**
 * Payment Batch Model and Validation Schema
 *
 * Core model for payment verification batches with comprehensive validation,
 * business rules, and TypeScript type safety.
 */

import { z } from 'zod'
import type { PaymentBatch, PaymentBatchInsert, PaymentBatchUpdate } from '@/lib/supabase/types/verification'

// Database type references  
export type PaymentBatchRow = PaymentBatch
export { PaymentBatchInsert, PaymentBatchUpdate }

// Status enum for type safety
export type VerificationBatchStatus =
  | 'draft'
  | 'pending_verification'
  | 'in_progress'
  | 'completed'
  | 'auto_approved'
  | 'expired'

// Validation schemas
export const PaymentBatchValidation = {
  // Base batch creation schema
  create: z.object({
    business_id: z.string().uuid('Invalid business ID format'),
    week_number: z.number()
      .int('Week number must be an integer')
      .min(1, 'Week number must be at least 1')
      .max(53, 'Week number cannot exceed 53'),
    year: z.number()
      .int('Year must be an integer')
      .min(2024, 'Year must be 2024 or later')
      .max(2030, 'Year cannot exceed 2030'),
    csv_file_path: z.string().optional(),
    total_transactions: z.number()
      .int('Total transactions must be an integer')
      .min(0, 'Total transactions cannot be negative'),
    total_amount: z.number()
      .min(0, 'Total amount cannot be negative')
      .multipleOf(0.01, 'Amount must have at most 2 decimal places'),
    status: z.enum(['draft', 'pending_verification', 'in_progress', 'completed', 'auto_approved', 'expired'])
      .default('draft'),
    deadline: z.string().datetime('Invalid deadline format'),
    created_by: z.string().uuid('Invalid creator ID format').optional(),
  }),

  // Update schema (all fields optional except ID)
  update: z.object({
    id: z.string().uuid('Invalid batch ID format'),
    status: z.enum(['draft', 'pending_verification', 'in_progress', 'completed', 'auto_approved', 'expired']).optional(),
    total_transactions: z.number()
      .int('Total transactions must be an integer')
      .min(0, 'Total transactions cannot be negative')
      .optional(),
    total_amount: z.number()
      .min(0, 'Total amount cannot be negative')
      .multipleOf(0.01, 'Amount must have at most 2 decimal places')
      .optional(),
    csv_file_path: z.string().optional(),
    notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  }),

  // Query/filter schema
  query: z.object({
    business_id: z.string().uuid().optional(),
    week_number: z.number().int().min(1).max(53).optional(),
    year: z.number().int().min(2024).max(2030).optional(),
    status: z.enum(['draft', 'pending_verification', 'in_progress', 'completed', 'auto_approved', 'expired']).optional(),
    deadline_before: z.string().datetime().optional(),
    deadline_after: z.string().datetime().optional(),
    created_after: z.string().datetime().optional(),
    created_before: z.string().datetime().optional(),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
  }),
}

// Extended types for business logic
export interface PaymentBatchWithProgress extends PaymentBatchRow {
  verification_progress: {
    verified_transactions: number
    pending_transactions: number
    approved_count: number
    rejected_count: number
    completion_percentage: number
  }
  deadline_status: {
    hours_remaining: number
    is_overdue: boolean
    urgency_level: 'low' | 'medium' | 'high' | 'critical'
  }
  business_info?: {
    name: string
    contact_email: string
    phone_number: string
  }
}

export interface PaymentBatchSummary {
  id: string
  business_id: string
  week_number: number
  year: number
  status: VerificationBatchStatus
  total_transactions: number
  total_amount: number
  verified_transactions: number
  deadline: string
  created_at: string
  urgency_score: number
}

// Business rule validation
export class PaymentBatchBusinessRules {
  /**
   * Validates if a new batch can be created for given business/week/year
   */
  static validateBatchCreation(params: {
    business_id: string
    week_number: number
    year: number
    existing_batches?: PaymentBatchRow[]
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check for duplicate batch
    const duplicateBatch = params.existing_batches?.find(
      batch =>
        batch.business_id === params.business_id &&
        batch.week_number === params.week_number &&
        batch.year_number === params.year
    )

    if (duplicateBatch) {
      errors.push(`Batch already exists for business ${params.business_id}, week ${params.week_number}, year ${params.year}`)
    }

    // Validate week/year combination
    const maxWeekForYear = PaymentBatchBusinessRules.getMaxWeekForYear(params.year)
    if (params.week_number > maxWeekForYear) {
      errors.push(`Week ${params.week_number} does not exist in year ${params.year}`)
    }

    // Don't allow creating batches for future weeks (more than 1 week ahead)
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentWeek = PaymentBatchBusinessRules.getWeekNumber(currentDate)

    if (params.year > currentYear ||
        (params.year === currentYear && params.week_number > currentWeek + 1)) {
      errors.push('Cannot create batches more than 1 week in advance')
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Calculates deadline for a batch (7 days from creation)
   */
  static calculateDeadline(createdAt: Date = new Date()): Date {
    const deadline = new Date(createdAt)
    deadline.setDate(deadline.getDate() + 7)
    deadline.setHours(23, 59, 59, 999) // End of day
    return deadline
  }

  /**
   * Determines urgency level based on time remaining
   */
  static getUrgencyLevel(deadline: Date): 'low' | 'medium' | 'high' | 'critical' {
    const now = new Date()
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursRemaining < 0) return 'critical' // Overdue
    if (hoursRemaining < 24) return 'critical' // Less than 1 day
    if (hoursRemaining < 48) return 'high' // Less than 2 days
    if (hoursRemaining < 72) return 'medium' // Less than 3 days
    return 'low' // More than 3 days
  }

  /**
   * Validates if batch status transition is allowed
   */
  static validateStatusTransition(
    currentStatus: VerificationBatchStatus,
    newStatus: VerificationBatchStatus
  ): { valid: boolean; error?: string } {
    const allowedTransitions: Record<VerificationBatchStatus, VerificationBatchStatus[]> = {
      draft: ['pending_verification'],
      pending_verification: ['in_progress', 'expired'],
      in_progress: ['completed', 'expired'],
      completed: [], // Terminal state
      auto_approved: [], // Terminal state
      expired: ['auto_approved'], // Can be auto-approved after expiry
    }

    const allowed = allowedTransitions[currentStatus]?.includes(newStatus)

    return {
      valid: allowed || false,
      error: allowed ? undefined : `Invalid status transition from ${currentStatus} to ${newStatus}`
    }
  }

  /**
   * Gets the maximum week number for a given year
   */
  static getMaxWeekForYear(year: number): number {
    // January 4th is always in week 1 of the year
    const jan4 = new Date(year, 0, 4)
    const dec31 = new Date(year, 11, 31)

    // Get week number for December 31st
    const weekNum = PaymentBatchBusinessRules.getWeekNumber(dec31)
    return weekNum === 1 ? 52 : weekNum // If Dec 31 is week 1 of next year, max is 52
  }

  /**
   * Gets ISO week number for a date
   */
  static getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  /**
   * Calculates urgency score (0-100) for sorting
   */
  static calculateUrgencyScore(batch: PaymentBatchRow): number {
    const deadline = new Date(batch.deadline)
    const now = new Date()
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)

    // Base score from deadline proximity
    let score = 0
    if (hoursRemaining < 0) score = 100 // Overdue
    else if (hoursRemaining < 24) score = 90
    else if (hoursRemaining < 48) score = 70
    else if (hoursRemaining < 72) score = 50
    else score = Math.max(0, 40 - (hoursRemaining / 24) * 2)

    // Boost score for larger batches
    const sizeMultiplier = Math.min(1.2, 1 + (batch.total_transactions || 0) / 1000)
    score *= sizeMultiplier

    // Boost score for higher amounts
    const amountMultiplier = Math.min(1.15, 1 + ((batch.total_amount || 0) / 100000))
    score *= amountMultiplier

    return Math.min(100, Math.round(score))
  }
}

// Utility functions for batch operations
export class PaymentBatchUtils {
  /**
   * Formats batch identifier for display
   */
  static formatBatchId(batch: PaymentBatchRow): string {
    return `${batch.year_number}-W${batch.week_number.toString().padStart(2, '0')}-${batch.business_id.slice(0, 8)}`
  }

  /**
   * Generates batch title for UI display
   */
  static generateBatchTitle(batch: PaymentBatchRow): string {
    return `Week ${batch.week_number}, ${batch.year_number} - ${batch.total_transactions} transactions`
  }

  /**
   * Creates a summary object for list display
   */
  static createBatchSummary(batch: PaymentBatchRow, verificationProgress?: {
    verified_transactions: number
  }): PaymentBatchSummary {
    return {
      id: batch.id,
      business_id: batch.business_id,
      week_number: batch.week_number,
      year: batch.year_number,
      status: batch.status as VerificationBatchStatus,
      total_transactions: batch.total_transactions || 0,
      total_amount: batch.total_amount || 0,
      verified_transactions: verificationProgress?.verified_transactions || 0,
      deadline: batch.deadline,
      created_at: batch.created_at,
      urgency_score: PaymentBatchBusinessRules.calculateUrgencyScore(batch),
    }
  }

  /**
   * Validates CSV file metadata matches batch data
   */
  static validateCsvMetadata(params: {
    expectedTransactions: number
    expectedAmount: number
    csvTransactionCount: number
    csvTotalAmount: number
    tolerance?: number
  }): { valid: boolean; errors: string[] } {
    const tolerance = params.tolerance || 0.01
    const errors: string[] = []

    if (params.expectedTransactions !== params.csvTransactionCount) {
      errors.push(
        `Transaction count mismatch: expected ${params.expectedTransactions}, got ${params.csvTransactionCount}`
      )
    }

    const amountDiff = Math.abs(params.expectedAmount - params.csvTotalAmount)
    if (amountDiff > tolerance) {
      errors.push(
        `Amount mismatch: expected ${params.expectedAmount}, got ${params.csvTotalAmount} (diff: ${amountDiff})`
      )
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Validates if a batch can be released for verification
   */
  static validateBatchRelease(
    batch: PaymentBatchRow,
    requestData: any,
    adminRole: string
  ): {
    isValid: boolean
    violations: string[]
    warnings: string[]
    requirements: string[]
  } {
    const violations: string[] = []
    const warnings: string[] = []
    const requirements: string[] = []

    // Check batch status
    if (batch.status !== 'draft') {
      violations.push(`Batch status must be 'draft' to release (current: ${batch.status})`)
    }

    // Check if batch has transactions
    if (batch.total_transactions <= 0) {
      violations.push('Batch must have at least one transaction to release')
    }

    // Check if CSV file is present
    if (!batch.csv_file_path) {
      violations.push('Batch must have a CSV file attached to release')
    }

    // Check admin permissions
    if (adminRole !== 'admin' && adminRole !== 'super_admin') {
      violations.push('Insufficient permissions to release batch')
    }

    // Warnings for potential issues
    if (batch.total_amount <= 0) {
      warnings.push('Batch has zero or negative total amount')
    }

    const now = new Date()
    const createdAt = new Date(batch.created_at)
    const timeSinceCreation = now.getTime() - createdAt.getTime()
    const hoursOld = timeSinceCreation / (1000 * 60 * 60)

    if (hoursOld < 1) {
      warnings.push('Batch was created less than 1 hour ago - consider additional review')
    }

    // Requirements for successful release
    requirements.push('Business will have 7 days to complete verification')
    requirements.push('Auto-approval will trigger if deadline is missed')
    requirements.push('Verification session will be created immediately')

    return {
      isValid: violations.length === 0,
      violations,
      warnings,
      requirements
    }
  }
}

// Export validation functions for use in API routes
export const validatePaymentBatchCreate = (data: unknown) =>
  PaymentBatchValidation.create.safeParse(data)

export const validatePaymentBatchUpdate = (data: unknown) =>
  PaymentBatchValidation.update.safeParse(data)

export const validatePaymentBatchQuery = (data: unknown) =>
  PaymentBatchValidation.query.safeParse(data)