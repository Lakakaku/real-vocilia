/**
 * Fraud Assessment Model and Scoring Types
 *
 * AI-powered fraud detection with OpenAI GPT-4o-mini integration,
 * risk scoring algorithms, and pattern detection capabilities.
 */

import { z } from 'zod'
import type { FraudAssessment, FraudAssessmentInsert, FraudAssessmentUpdate } from '@/lib/supabase/types/verification'

// Database type references  
export type FraudAssessmentRow = FraudAssessment
export { FraudAssessmentInsert, FraudAssessmentUpdate }

// Risk levels for fraud assessment
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

// AI recommendation types
export type AIRecommendation = 'approve' | 'review' | 'reject' | 'investigate'

// Risk factor categories
export interface RiskFactors {
  amount_anomaly: {
    score: number
    description: string
    weight: number
  }
  time_pattern: {
    score: number
    description: string
    weight: number
  }
  frequency_analysis: {
    score: number
    description: string
    weight: number
  }
  reward_consistency: {
    score: number
    description: string
    weight: number
  }
  customer_behavior: {
    score: number
    description: string
    weight: number
  }
  location_pattern: {
    score: number
    description: string
    weight: number
  }
}

// Pattern detection results
export interface PatternDetection {
  pattern_type: string
  confidence: number
  instances: number
  time_span_hours: number
  affected_transactions: string[]
  risk_impact: 'low' | 'medium' | 'high' | 'critical'
}

// AI metadata for audit and debugging
export interface AIMetadata {
  model_version: string
  tokens_used: number
  response_time_ms: number
  prompt_version: string
  assessment_timestamp: string
  api_request_id?: string
  confidence_factors: string[]
}

// Transaction context for fraud assessment
export interface TransactionContext {
  transaction_id: string
  amount_sek: number
  transaction_date: string
  store_code: string
  quality_score: number
  reward_percentage: number
  reward_amount_sek: number
  phone_last4: string
  customer_history?: {
    total_transactions: number
    average_amount: number
    last_transaction_days_ago: number | null
    fraud_history: boolean
  }
  business_context?: {
    average_transaction_amount: number
    peak_hours: string[]
    typical_reward_range: [number, number]
    recent_fraud_incidents: number
  }
  temporal_context?: {
    hour_of_day: number
    day_of_week: number
    is_holiday: boolean
    is_peak_hours: boolean
  }
}

// Validation schemas
export const FraudAssessmentValidation = {
  // Create assessment request
  assess: z.object({
    transaction_id: z.string()
      .min(1, 'Transaction ID is required')
      .max(50, 'Transaction ID too long'),
    business_id: z.string().uuid('Invalid business ID'),
    context: z.object({
      amount_sek: z.number().min(0),
      transaction_date: z.string().datetime(),
      store_code: z.string().length(6),
      quality_score: z.number().int().min(0).max(100),
      reward_percentage: z.number().min(0).max(15),
      reward_amount_sek: z.number().min(0),
      phone_last4: z.string().regex(/^\*\*\d{2}$/),
      customer_history: z.object({
        total_transactions: z.number().int().min(0),
        average_amount: z.number().min(0),
        last_transaction_days_ago: z.number().int().min(0).nullable(),
        fraud_history: z.boolean(),
      }).optional(),
      business_context: z.object({
        average_transaction_amount: z.number().min(0),
        peak_hours: z.array(z.string()),
        typical_reward_range: z.array(z.number().min(0).max(15)).length(2),
        recent_fraud_incidents: z.number().int().min(0),
      }).optional(),
    }),
    assessment_options: z.object({
      enable_pattern_detection: z.boolean().default(true),
      include_customer_history: z.boolean().default(true),
      ai_model_version: z.string().default('gpt-4o-mini'),
      confidence_threshold: z.number().min(0).max(1).default(0.7),
    }).optional(),
  }),

  // Update assessment
  update: z.object({
    id: z.string().uuid('Invalid assessment ID'),
    manual_override: z.object({
      override_risk_level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      override_recommendation: z.enum(['approve', 'review', 'reject', 'investigate']).optional(),
      override_reason: z.string().max(500).optional(),
      reviewer_id: z.string().uuid().optional(),
    }).optional(),
    investigation_notes: z.string().max(2000).optional(),
  }),

  // Query assessments
  query: z.object({
    business_id: z.string().uuid().optional(),
    transaction_id: z.string().optional(),
    risk_level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    recommendation: z.enum(['approve', 'review', 'reject', 'investigate']).optional(),
    risk_score_min: z.number().min(0).max(100).optional(),
    risk_score_max: z.number().min(0).max(100).optional(),
    confidence_min: z.number().min(0).max(1).optional(),
    assessed_after: z.string().datetime().optional(),
    assessed_before: z.string().datetime().optional(),
    pattern_detected: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).default(20),
    offset: z.number().int().min(0).default(0),
    sort_by: z.enum(['risk_score', 'confidence', 'assessed_at']).default('assessed_at'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
  }),

  // Batch pattern analysis
  pattern_analysis: z.object({
    transactions: z.array(z.object({
      transaction_id: z.string(),
      amount_sek: z.number(),
      transaction_date: z.string().datetime(),
      store_code: z.string(),
      quality_score: z.number().int().min(0).max(100),
      reward_percentage: z.number().min(0).max(15),
      phone_last4: z.string().regex(/^\*\*\d{2}$/),
    })).min(2, 'At least 2 transactions required for pattern analysis'),
    analysis_options: z.object({
      time_window_hours: z.number().min(1).max(168).default(24), // 1 week max
      similarity_threshold: z.number().min(0).max(1).default(0.8),
      minimum_pattern_size: z.number().int().min(2).max(10).default(3),
    }).optional(),
  }),
}

// Risk scoring algorithms
export class FraudRiskScoring {
  /**
   * Calculates base risk score from transaction data
   */
  static calculateBaseRiskScore(context: TransactionContext): {
    base_score: number
    risk_factors: Partial<RiskFactors>
  } {
    let totalScore = 0
    const factors: Partial<RiskFactors> = {}

    // Amount anomaly analysis
    const avgAmount = context.business_context?.average_transaction_amount || 200
    const amountRatio = context.amount_sek / avgAmount
    let amountScore = 0

    if (amountRatio > 5) amountScore = 40 // 5x higher than average
    else if (amountRatio > 3) amountScore = 25 // 3x higher
    else if (amountRatio > 2) amountScore = 15 // 2x higher
    else if (amountRatio < 0.1) amountScore = 20 // Unusually low

    factors.amount_anomaly = {
      score: amountScore,
      description: `Transaction amount ${amountRatio.toFixed(1)}x average`,
      weight: 0.25
    }
    totalScore += amountScore * 0.25

    // Time pattern analysis
    const transactionHour = new Date(context.transaction_date).getHours()
    const peakHours = context.business_context?.peak_hours || ['14:00-16:00', '18:00-20:00']
    const isPeakTime = FraudRiskScoring.isInPeakHours(transactionHour, peakHours)

    let timeScore = 0
    if (!isPeakTime && (transactionHour < 6 || transactionHour > 22)) {
      timeScore = 25 // Unusual hours
    } else if (!isPeakTime) {
      timeScore = 10 // Off-peak but reasonable
    }

    factors.time_pattern = {
      score: timeScore,
      description: isPeakTime ? 'Peak hours transaction' : 'Off-peak hours transaction',
      weight: 0.15
    }
    totalScore += timeScore * 0.15

    // Reward consistency analysis
    const typicalRange = context.business_context?.typical_reward_range || [3, 7]
    const isRewardAnomalous = context.reward_percentage < typicalRange[0] ||
                              context.reward_percentage > typicalRange[1]

    let rewardScore = 0
    if (context.reward_percentage >= 10) rewardScore = 30 // Very high reward
    else if (isRewardAnomalous) rewardScore = 15 // Outside typical range

    factors.reward_consistency = {
      score: rewardScore,
      description: isRewardAnomalous ? 'Reward outside typical range' : 'Reward within normal range',
      weight: 0.20
    }
    totalScore += rewardScore * 0.20

    // Quality score analysis
    let qualityScore = 0
    if (context.quality_score === 100) qualityScore = 25 // Perfect score suspicious
    else if (context.quality_score > 95) qualityScore = 15 // Very high
    else if (context.quality_score < 30) qualityScore = 20 // Very low

    factors.customer_behavior = {
      score: qualityScore,
      description: `Quality score: ${context.quality_score}`,
      weight: 0.20
    }
    totalScore += qualityScore * 0.20

    // Customer history analysis
    if (context.customer_history) {
      let historyScore = 0

      if (context.customer_history.fraud_history) historyScore = 40
      else if (context.customer_history.total_transactions === 0) historyScore = 20 // New customer
      else if (context.customer_history.total_transactions === 1) historyScore = 10 // Second transaction

      factors.frequency_analysis = {
        score: historyScore,
        description: `Customer has ${context.customer_history.total_transactions} previous transactions`,
        weight: 0.20
      }
      totalScore += historyScore * 0.20
    }

    return {
      base_score: Math.min(100, Math.round(totalScore)),
      risk_factors: factors
    }
  }

  /**
   * Determines risk level from score
   */
  static getRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 70) return 'critical'
    if (riskScore >= 50) return 'high'
    if (riskScore >= 30) return 'medium'
    return 'low'
  }

  /**
   * Generates AI recommendation based on risk level and confidence
   */
  static getAIRecommendation(riskLevel: RiskLevel, confidence: number): AIRecommendation {
    if (confidence < 0.7) return 'review' // Low confidence always requires review

    switch (riskLevel) {
      case 'critical':
        return confidence > 0.9 ? 'reject' : 'investigate'
      case 'high':
        return confidence > 0.8 ? 'investigate' : 'review'
      case 'medium':
        return 'review'
      case 'low':
        return confidence > 0.8 ? 'approve' : 'review'
      default:
        return 'review'
    }
  }

  /**
   * Checks if time is within peak hours
   */
  private static isInPeakHours(hour: number, peakHours: string[]): boolean {
    return peakHours.some(range => {
      const [start, end] = range.split('-').map(time => parseInt(time.split(':')[0]))
      return hour >= start && hour <= end
    })
  }
}

// Pattern detection algorithms
export class FraudPatternDetection {
  /**
   * Detects suspicious patterns in transaction sequences
   */
  static detectPatterns(transactions: Array<{
    transaction_id: string
    amount_sek: number
    transaction_date: string
    store_code: string
    quality_score: number
    phone_last4: string
  }>): PatternDetection[] {
    const patterns: PatternDetection[] = []

    // Rapid identical transactions
    const rapidIdentical = this.detectRapidIdenticalTransactions(transactions)
    if (rapidIdentical) patterns.push(rapidIdentical)

    // Amount limit testing
    const limitTesting = this.detectAmountLimitTesting(transactions)
    if (limitTesting) patterns.push(limitTesting)

    // Perfect score clustering
    const perfectScores = this.detectPerfectScoreClustering(transactions)
    if (perfectScores) patterns.push(perfectScores)

    // Same customer rapid transactions
    const rapidCustomer = this.detectSameCustomerRapidTransactions(transactions)
    if (rapidCustomer) patterns.push(rapidCustomer)

    return patterns
  }

  /**
   * Detects rapid identical transactions (potential bot activity)
   */
  private static detectRapidIdenticalTransactions(transactions: any[]): PatternDetection | null {
    const groups = new Map<string, any[]>()

    // Group by amount and quality score
    transactions.forEach(tx => {
      const key = `${tx.amount_sek}-${tx.quality_score}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(tx)
    })

    for (const [key, group] of Array.from(groups)) {
      if (group.length >= 3) {
        // Check if transactions are within short time window
        const times = group.map(tx => new Date(tx.transaction_date).getTime()).sort()
        const timeSpan = (times[times.length - 1] - times[0]) / (1000 * 60) // minutes

        if (timeSpan <= 60) { // Within 1 hour
          return {
            pattern_type: 'rapid_identical_transactions',
            confidence: 0.95,
            instances: group.length,
            time_span_hours: timeSpan / 60,
            affected_transactions: group.map(tx => tx.transaction_id),
            risk_impact: 'critical',
          }
        }
      }
    }

    return null
  }

  /**
   * Detects amount limit testing (amounts just under thresholds)
   */
  private static detectAmountLimitTesting(transactions: any[]): PatternDetection | null {
    const suspiciousAmounts = [999.99, 499.99, 999.90, 1999.99] // Common limit test amounts
    const limitTestTransactions = transactions.filter(tx =>
      suspiciousAmounts.some(amount => Math.abs(tx.amount_sek - amount) < 0.1)
    )

    if (limitTestTransactions.length >= 2) {
      return {
        pattern_type: 'amount_limit_testing',
        confidence: 0.85,
        instances: limitTestTransactions.length,
        time_span_hours: this.calculateTimeSpan(limitTestTransactions),
        affected_transactions: limitTestTransactions.map(tx => tx.transaction_id),
        risk_impact: 'high',
      }
    }

    return null
  }

  /**
   * Detects clustering of perfect quality scores
   */
  private static detectPerfectScoreClustering(transactions: any[]): PatternDetection | null {
    const perfectScoreTransactions = transactions.filter(tx => tx.quality_score === 100)

    if (perfectScoreTransactions.length >= 5) {
      return {
        pattern_type: 'perfect_score_clustering',
        confidence: 0.75,
        instances: perfectScoreTransactions.length,
        time_span_hours: this.calculateTimeSpan(perfectScoreTransactions),
        affected_transactions: perfectScoreTransactions.map(tx => tx.transaction_id),
        risk_impact: 'medium',
      }
    }

    return null
  }

  /**
   * Detects same customer making rapid transactions
   */
  private static detectSameCustomerRapidTransactions(transactions: any[]): PatternDetection | null {
    const customerGroups = new Map<string, any[]>()

    transactions.forEach(tx => {
      if (!customerGroups.has(tx.phone_last4)) customerGroups.set(tx.phone_last4, [])
      customerGroups.get(tx.phone_last4)!.push(tx)
    })

    for (const [phone, group] of Array.from(customerGroups)) {
      if (group.length >= 3) {
        const timeSpan = this.calculateTimeSpan(group)
        if (timeSpan <= 1) { // Within 1 hour
          return {
            pattern_type: 'same_customer_rapid_transactions',
            confidence: 0.90,
            instances: group.length,
            time_span_hours: timeSpan,
            affected_transactions: group.map(tx => tx.transaction_id),
            risk_impact: 'high',
          }
        }
      }
    }

    return null
  }

  /**
   * Calculates time span for transaction group
   */
  private static calculateTimeSpan(transactions: any[]): number {
    const times = transactions.map(tx => new Date(tx.transaction_date).getTime()).sort()
    return (times[times.length - 1] - times[0]) / (1000 * 60 * 60) // hours
  }
}

// Assessment utilities
export class FraudAssessmentUtils {
  /**
   * Formats assessment for display
   */
  static formatAssessmentSummary(assessment: FraudAssessmentRow): string {
    return `${assessment.risk_level.toUpperCase()} risk (${assessment.risk_score}/100) - ${assessment.recommendation}`
  }

  /**
   * Determines if assessment requires immediate action
   */
  static requiresImmediateAction(assessment: FraudAssessmentRow): boolean {
    return assessment.risk_level === 'high' && (assessment.confidence || 0) > 0.8
  }

  /**
   * Calculates assessment age in hours
   */
  static getAssessmentAge(assessment: FraudAssessmentRow): number {
    const now = new Date()
    const assessedAt = new Date(assessment.assessed_at)
    return (now.getTime() - assessedAt.getTime()) / (1000 * 60 * 60)
  }

  /**
   * Generates risk factor summary for display
   */
  static generateRiskFactorSummary(riskFactors: RiskFactors): string[] {
    const summaries: string[] = []

    Object.entries(riskFactors).forEach(([category, factor]) => {
      if (factor.score > 10) {
        summaries.push(`${category.replace('_', ' ')}: ${factor.description} (${factor.score}pts)`)
      }
    })

    return summaries
  }

  /**
   * Validates assessment freshness (not older than 1 hour for high-risk)
   */
  static isAssessmentFresh(assessment: FraudAssessmentRow): boolean {
    const ageHours = this.getAssessmentAge(assessment)

    // Removed critical check as it's not in the RiskLevelType enum
    if (assessment.risk_level === 'high') return ageHours < 1 // 1 hour
    return ageHours < 24 // 24 hours for medium/low
  }
}

// Export validation functions
export const validateFraudAssess = (data: unknown) =>
  FraudAssessmentValidation.assess.safeParse(data)

export const validateFraudAssessmentUpdate = (data: unknown) =>
  FraudAssessmentValidation.update.safeParse(data)

export const validateFraudAssessmentQuery = (data: unknown) =>
  FraudAssessmentValidation.query.safeParse(data)

export const validatePatternAnalysis = (data: unknown) =>
  FraudAssessmentValidation.pattern_analysis.safeParse(data)