/**
 * Fraud Detection System
 * Machine learning-based fraud pattern detection with industry-specific indicators
 * and adaptive scoring based on historical verification data
 */

import { createClient } from '@/lib/supabase/server'
import { learningEngine } from './learning-engine'
import type { BusinessType } from '@/types/onboarding'

export interface FraudIndicator {
  id: string
  type: 'behavioral' | 'transactional' | 'temporal' | 'contextual'
  pattern: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  examples: string[]
  businessTypes: BusinessType[]
  detection: {
    method: 'rule' | 'ml' | 'statistical'
    threshold?: number
    condition?: string
  }
}

export interface FraudRiskAssessment {
  feedbackId: string
  riskScore: number // 0-100
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical'
  indicators: {
    indicator: FraudIndicator
    triggered: boolean
    score: number
    details: string
  }[]
  recommendation: string
  confidence: number
}

export interface FraudPattern {
  patternId: string
  name: string
  description: string
  businessType: BusinessType
  frequency: number
  lastDetected: Date
  effectiveness: number // 0-1, based on verification accuracy
  rules: FraudRule[]
}

export interface FraudRule {
  field: string
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'pattern'
  value: any
  weight: number
}

export interface IndustryFraudDatabase {
  businessType: BusinessType
  commonPatterns: FraudPattern[]
  recentTrends: string[]
  riskFactors: Map<string, number>
}

class FraudDetectionSystem {
  private fraudIndicators: Map<string, FraudIndicator>
  private industryDatabase: Map<BusinessType, IndustryFraudDatabase>
  private mlModel: any // Placeholder for ML model

  constructor() {
    this.fraudIndicators = this.initializeFraudIndicators()
    this.industryDatabase = this.initializeIndustryDatabase()
    this.mlModel = null // Would be loaded from trained model
  }

  /**
   * Initialize fraud indicators
   */
  private initializeFraudIndicators(): Map<string, FraudIndicator> {
    const indicators = new Map<string, FraudIndicator>()

    // Behavioral indicators
    indicators.set('rapid_succession', {
      id: 'rapid_succession',
      type: 'behavioral',
      pattern: 'Multiple feedbacks from same phone in short time',
      severity: 'high',
      confidence: 0.85,
      examples: ['5+ feedbacks in 1 hour', 'Same phone different stores'],
      businessTypes: ['restaurant', 'retail', 'service', 'other'],
      detection: {
        method: 'rule',
        threshold: 5
      }
    })

    indicators.set('pattern_repetition', {
      id: 'pattern_repetition',
      type: 'behavioral',
      pattern: 'Identical feedback content patterns',
      severity: 'medium',
      confidence: 0.75,
      examples: ['Copy-paste responses', 'Template-like feedback'],
      businessTypes: ['restaurant', 'retail', 'service', 'other'],
      detection: {
        method: 'ml'
      }
    })

    // Transactional indicators
    indicators.set('unusual_amount', {
      id: 'unusual_amount',
      type: 'transactional',
      pattern: 'Transaction amount significantly outside normal range',
      severity: 'medium',
      confidence: 0.7,
      examples: ['Amount 3x average', 'Round numbers only'],
      businessTypes: ['restaurant', 'retail', 'service'],
      detection: {
        method: 'statistical',
        threshold: 3 // Standard deviations
      }
    })

    indicators.set('split_transactions', {
      id: 'split_transactions',
      type: 'transactional',
      pattern: 'Multiple small transactions to maximize rewards',
      severity: 'high',
      confidence: 0.8,
      examples: ['10 x 50 SEK instead of 1 x 500 SEK'],
      businessTypes: ['retail', 'restaurant'],
      detection: {
        method: 'rule',
        condition: 'multiple_same_amount_short_time'
      }
    })

    // Temporal indicators
    indicators.set('after_hours', {
      id: 'after_hours',
      type: 'temporal',
      pattern: 'Transactions outside business hours',
      severity: 'critical',
      confidence: 0.95,
      examples: ['Transaction at 3 AM', 'Sunday when closed'],
      businessTypes: ['restaurant', 'retail', 'service'],
      detection: {
        method: 'rule',
        condition: 'outside_operating_hours'
      }
    })

    indicators.set('unusual_timing', {
      id: 'unusual_timing',
      type: 'temporal',
      pattern: 'Transactions at unlikely times',
      severity: 'low',
      confidence: 0.6,
      examples: ['Breakfast at dinner time', 'Rush hour avoidance'],
      businessTypes: ['restaurant'],
      detection: {
        method: 'statistical'
      }
    })

    // Contextual indicators
    indicators.set('location_mismatch', {
      id: 'location_mismatch',
      type: 'contextual',
      pattern: 'Transaction location inconsistent with context',
      severity: 'high',
      confidence: 0.85,
      examples: ['Wrong department mentioned', 'Non-existent service'],
      businessTypes: ['retail', 'service'],
      detection: {
        method: 'rule',
        condition: 'context_validation_failed'
      }
    })

    indicators.set('staff_impersonation', {
      id: 'staff_impersonation',
      type: 'contextual',
      pattern: 'Feedback mentions non-existent staff',
      severity: 'critical',
      confidence: 0.9,
      examples: ['Wrong staff names', 'Fictional positions'],
      businessTypes: ['restaurant', 'retail', 'service'],
      detection: {
        method: 'rule',
        condition: 'staff_name_not_in_context'
      }
    })

    return indicators
  }

  /**
   * Initialize industry-specific fraud database
   */
  private initializeIndustryDatabase(): Map<BusinessType, IndustryFraudDatabase> {
    const database = new Map<BusinessType, IndustryFraudDatabase>()

    // Restaurant fraud patterns
    database.set('restaurant', {
      businessType: 'restaurant',
      commonPatterns: [
        {
          patternId: 'fake_group_dining',
          name: 'Fake Group Dining',
          description: 'Claims of large group dining without reservation',
          businessType: 'restaurant',
          frequency: 15,
          lastDetected: new Date(),
          effectiveness: 0.82,
          rules: [
            {
              field: 'transaction_amount',
              operator: 'greater',
              value: 1000,
              weight: 0.3
            },
            {
              field: 'party_size',
              operator: 'greater',
              value: 6,
              weight: 0.3
            },
            {
              field: 'reservation_exists',
              operator: 'equals',
              value: false,
              weight: 0.4
            }
          ]
        }
      ],
      recentTrends: [
        'Increased takeaway fraud during peak hours',
        'Multiple small orders to maximize percentage rewards'
      ],
      riskFactors: new Map([
        ['no_table_number', 0.3],
        ['takeaway_high_value', 0.25],
        ['new_customer_high_amount', 0.2]
      ])
    })

    // Retail fraud patterns
    database.set('retail', {
      businessType: 'retail',
      commonPatterns: [
        {
          patternId: 'return_fraud',
          name: 'Return Fraud',
          description: 'Feedback for items likely to be returned',
          businessType: 'retail',
          frequency: 8,
          lastDetected: new Date(),
          effectiveness: 0.75,
          rules: [
            {
              field: 'product_category',
              operator: 'equals',
              value: 'electronics',
              weight: 0.4
            },
            {
              field: 'transaction_amount',
              operator: 'greater',
              value: 2000,
              weight: 0.6
            }
          ]
        }
      ],
      recentTrends: [
        'Gift card purchase fraud',
        'Self-checkout manipulation'
      ],
      riskFactors: new Map([
        ['high_value_electronics', 0.35],
        ['multiple_payment_methods', 0.25],
        ['gift_card_only', 0.3]
      ])
    })

    // Service fraud patterns
    database.set('service', {
      businessType: 'service',
      commonPatterns: [
        {
          patternId: 'phantom_appointment',
          name: 'Phantom Appointment',
          description: 'Claims service without appointment record',
          businessType: 'service',
          frequency: 5,
          lastDetected: new Date(),
          effectiveness: 0.88,
          rules: [
            {
              field: 'appointment_exists',
              operator: 'equals',
              value: false,
              weight: 0.7
            },
            {
              field: 'service_duration',
              operator: 'less',
              value: 15,
              weight: 0.3
            }
          ]
        }
      ],
      recentTrends: [
        'Walk-in service fraud',
        'Package service manipulation'
      ],
      riskFactors: new Map([
        ['no_appointment_record', 0.4],
        ['unusually_short_service', 0.3],
        ['first_time_high_value', 0.25]
      ])
    })

    database.set('other', {
      businessType: 'other',
      commonPatterns: [],
      recentTrends: [],
      riskFactors: new Map()
    })

    return database
  }

  /**
   * Assess fraud risk for feedback
   */
  async assessFraudRisk(
    feedbackId: string,
    feedbackData: any,
    businessContext: any
  ): Promise<FraudRiskAssessment> {
    const triggeredIndicators: any[] = []
    let totalRiskScore = 0
    let maxSeverityScore = 0

    // Check each fraud indicator
    for (const [id, indicator] of this.fraudIndicators.entries()) {
      const result = await this.checkIndicator(indicator, feedbackData, businessContext)

      if (result.triggered) {
        const severityScores = {
          low: 10,
          medium: 25,
          high: 50,
          critical: 80
        }

        const score = severityScores[indicator.severity] * result.confidence

        triggeredIndicators.push({
          indicator,
          triggered: true,
          score,
          details: result.details
        })

        totalRiskScore += score
        maxSeverityScore = Math.max(maxSeverityScore, severityScores[indicator.severity])
      }
    }

    // Apply ML model if available
    const mlScore = await this.applyMLModel(feedbackData, businessContext)
    if (mlScore > 0) {
      totalRiskScore = (totalRiskScore * 0.7) + (mlScore * 0.3)
    }

    // Normalize score to 0-100
    const normalizedScore = Math.min(100, totalRiskScore)

    // Determine risk level
    const riskLevel = this.determineRiskLevel(normalizedScore, maxSeverityScore)

    // Generate recommendation
    const recommendation = this.generateRecommendation(riskLevel, triggeredIndicators)

    // Calculate confidence
    const confidence = this.calculateConfidence(triggeredIndicators, feedbackData)

    return {
      feedbackId,
      riskScore: normalizedScore,
      riskLevel,
      indicators: triggeredIndicators,
      recommendation,
      confidence
    }
  }

  /**
   * Check if an indicator is triggered
   */
  private async checkIndicator(
    indicator: FraudIndicator,
    feedbackData: any,
    businessContext: any
  ): Promise<{
    triggered: boolean
    confidence: number
    details: string
  }> {
    switch (indicator.detection.method) {
      case 'rule':
        return this.checkRuleBasedIndicator(indicator, feedbackData, businessContext)

      case 'statistical':
        return this.checkStatisticalIndicator(indicator, feedbackData, businessContext)

      case 'ml':
        return this.checkMLIndicator(indicator, feedbackData)

      default:
        return { triggered: false, confidence: 0, details: '' }
    }
  }

  /**
   * Check rule-based indicator
   */
  private async checkRuleBasedIndicator(
    indicator: FraudIndicator,
    feedbackData: any,
    businessContext: any
  ): Promise<any> {
    let triggered = false
    let details = ''

    switch (indicator.id) {
      case 'rapid_succession':
        // Check for multiple feedbacks from same phone
        const supabase = await createClient()
        const { data: recentFeedbacks } = await supabase
          .from('feedbacks')
          .select('*')
          .eq('phone_number', feedbackData.phone_number)
          .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

        if (recentFeedbacks && recentFeedbacks.length >= (indicator.detection.threshold || 5)) {
          triggered = true
          details = `${recentFeedbacks.length} feedbacks in last hour`
        }
        break

      case 'after_hours':
        // Check if transaction is outside operating hours
        const transactionHour = new Date(feedbackData.transaction_time).getHours()
        const dayOfWeek = new Date(feedbackData.transaction_time).getDay()
        const operatingHours = businessContext?.operational_details?.operating_hours

        if (operatingHours) {
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          const todayHours = operatingHours[dayNames[dayOfWeek]]

          if (todayHours && todayHours.closed) {
            triggered = true
            details = 'Transaction on closed day'
          } else if (todayHours) {
            const [openHour] = todayHours.open?.split(':').map(Number) || [0]
            const [closeHour] = todayHours.close?.split(':').map(Number) || [23]

            if (transactionHour < openHour || transactionHour > closeHour) {
              triggered = true
              details = `Transaction at ${transactionHour}:00, outside ${openHour}:00-${closeHour}:00`
            }
          }
        }
        break

      case 'location_mismatch':
        // Check if mentioned location exists in context
        if (feedbackData.voice_transcript) {
          const transcript = feedbackData.voice_transcript.toLowerCase()
          const departments = businessContext?.store_layout?.departments || []

          for (const dept of departments) {
            if (transcript.includes(dept.toLowerCase())) {
              // Valid department mentioned
              break
            }
          }

          // Check for non-existent locations
          const fakeLocations = ['basement', 'rooftop', 'vip section']
          for (const fake of fakeLocations) {
            if (transcript.includes(fake) && !departments.includes(fake)) {
              triggered = true
              details = `Mentioned non-existent location: ${fake}`
              break
            }
          }
        }
        break
    }

    return {
      triggered,
      confidence: triggered ? indicator.confidence : 0,
      details
    }
  }

  /**
   * Check statistical indicator
   */
  private async checkStatisticalIndicator(
    indicator: FraudIndicator,
    feedbackData: any,
    businessContext: any
  ): Promise<any> {
    let triggered = false
    let details = ''

    switch (indicator.id) {
      case 'unusual_amount':
        // Check if amount is statistical outlier
        const avgTransaction = businessContext?.operational_details?.average_transaction || 200
        const stdDev = avgTransaction * 0.3 // Approximate std dev as 30% of mean

        const zScore = Math.abs((feedbackData.transaction_amount - avgTransaction) / stdDev)

        if (zScore > (indicator.detection.threshold || 3)) {
          triggered = true
          details = `Amount ${feedbackData.transaction_amount} is ${zScore.toFixed(1)} std devs from average`
        }
        break

      case 'unusual_timing':
        // Check if timing is unusual for business type
        const hour = new Date(feedbackData.transaction_time).getHours()

        if (businessContext?.business_type === 'restaurant') {
          // Breakfast at dinner time or vice versa
          const mealType = feedbackData.categories?.includes('breakfast') ? 'breakfast' :
                          feedbackData.categories?.includes('lunch') ? 'lunch' :
                          feedbackData.categories?.includes('dinner') ? 'dinner' : null

          if (mealType === 'breakfast' && hour > 14) {
            triggered = true
            details = 'Breakfast order in evening'
          } else if (mealType === 'dinner' && hour < 11) {
            triggered = true
            details = 'Dinner order in morning'
          }
        }
        break
    }

    return {
      triggered,
      confidence: triggered ? indicator.confidence : 0,
      details
    }
  }

  /**
   * Check ML-based indicator
   */
  private async checkMLIndicator(
    indicator: FraudIndicator,
    feedbackData: any
  ): Promise<any> {
    // Placeholder for ML model prediction
    // In production, this would use a trained model

    let triggered = false
    let details = ''

    if (indicator.id === 'pattern_repetition') {
      // Simple pattern detection
      const transcript = feedbackData.voice_transcript?.toLowerCase() || ''

      // Check for template-like patterns
      const templates = [
        'everything was perfect',
        'great service great food',
        'will come back again'
      ]

      for (const template of templates) {
        if (transcript.includes(template)) {
          triggered = true
          details = 'Template-like feedback detected'
          break
        }
      }
    }

    return {
      triggered,
      confidence: triggered ? 0.6 : 0, // Lower confidence for simple detection
      details
    }
  }

  /**
   * Apply ML model for fraud detection
   */
  private async applyMLModel(
    feedbackData: any,
    businessContext: any
  ): Promise<number> {
    // Placeholder for ML model
    // In production, this would use a trained neural network or ensemble model

    // Simple heuristic scoring for now
    let score = 0

    // Feature extraction
    const features = {
      hasTranscript: !!feedbackData.voice_transcript,
      transcriptLength: feedbackData.voice_transcript?.length || 0,
      qualityScore: feedbackData.quality_score || 0,
      amount: feedbackData.transaction_amount,
      hour: new Date(feedbackData.transaction_time).getHours(),
      dayOfWeek: new Date(feedbackData.transaction_time).getDay()
    }

    // Simple scoring based on features
    if (!features.hasTranscript) score += 20
    if (features.transcriptLength < 50) score += 15
    if (features.qualityScore < 30) score += 10
    if (features.hour < 6 || features.hour > 22) score += 15

    return Math.min(100, score)
  }

  /**
   * Determine risk level based on score
   */
  private determineRiskLevel(
    score: number,
    maxSeverity: number
  ): 'safe' | 'low' | 'medium' | 'high' | 'critical' {
    // Factor in both total score and max severity
    if (maxSeverity >= 80 || score >= 80) return 'critical'
    if (maxSeverity >= 50 || score >= 60) return 'high'
    if (maxSeverity >= 25 || score >= 40) return 'medium'
    if (score >= 20) return 'low'
    return 'safe'
  }

  /**
   * Generate recommendation based on risk assessment
   */
  private generateRecommendation(
    riskLevel: string,
    indicators: any[]
  ): string {
    switch (riskLevel) {
      case 'critical':
        return 'Flag for manual review immediately. Multiple critical fraud indicators detected.'

      case 'high':
        return 'Requires verification before payment. High fraud risk detected.'

      case 'medium':
        return 'Monitor closely. Consider additional verification if pattern continues.'

      case 'low':
        return 'Low risk. Standard verification process sufficient.'

      case 'safe':
        return 'No fraud indicators detected. Proceed with normal processing.'

      default:
        return 'Continue with standard verification process.'
    }
  }

  /**
   * Calculate confidence in fraud assessment
   */
  private calculateConfidence(
    indicators: any[],
    feedbackData: any
  ): number {
    if (indicators.length === 0) return 0.9 // High confidence in no fraud

    // Average confidence of triggered indicators
    const avgConfidence = indicators.reduce((sum, ind) =>
      sum + (ind.indicator.confidence || 0), 0
    ) / indicators.length

    // Adjust based on data quality
    let qualityMultiplier = 1.0
    if (!feedbackData.voice_transcript) qualityMultiplier *= 0.8
    if (!feedbackData.quality_score) qualityMultiplier *= 0.9

    return Math.min(0.95, avgConfidence * qualityMultiplier)
  }

  /**
   * Learn from verification results
   */
  async learnFromVerification(
    feedbackId: string,
    wasVerified: boolean,
    fraudAssessment: FraudRiskAssessment
  ): Promise<void> {
    // Update indicator effectiveness based on verification result
    const wasCorrect = (fraudAssessment.riskLevel === 'high' || fraudAssessment.riskLevel === 'critical') === !wasVerified

    for (const triggered of fraudAssessment.indicators) {
      const indicator = triggered.indicator

      // Update confidence based on correctness
      if (wasCorrect) {
        indicator.confidence = Math.min(1.0, indicator.confidence + 0.02)
      } else {
        indicator.confidence = Math.max(0.3, indicator.confidence - 0.05)
      }

      // Update in map
      this.fraudIndicators.set(indicator.id, indicator)
    }

    // Learn pattern for future detection
    await learningEngine.learnFromVerification(feedbackId, feedbackId)
  }

  /**
   * Get industry-specific fraud patterns
   */
  getIndustryPatterns(businessType: BusinessType): FraudPattern[] {
    const database = this.industryDatabase.get(businessType) ||
                    this.industryDatabase.get('other')!

    return database.commonPatterns
  }

  /**
   * Add custom fraud pattern
   */
  async addCustomPattern(
    businessId: string,
    pattern: Omit<FraudPattern, 'patternId' | 'lastDetected' | 'frequency' | 'effectiveness'>
  ): Promise<void> {
    const supabase = await createClient()

    const newPattern: FraudPattern = {
      ...pattern,
      patternId: `custom_${Date.now()}`,
      lastDetected: new Date(),
      frequency: 0,
      effectiveness: 0.5 // Start with medium effectiveness
    }

    // Store custom pattern
    await supabase
      .from('business_contexts')
      .update({
        custom_fraud_patterns: newPattern
      })
      .eq('business_id', businessId)
  }

  /**
   * Sync with industry fraud database
   */
  async syncWithIndustryDatabase(): Promise<void> {
    // In production, this would sync with an external fraud database
    // For now, just log the sync
    console.log('Syncing with industry fraud database...')

    // Simulate getting new patterns
    const newTrends = [
      'Increased AI-generated feedback',
      'Coordinated fraud rings detected',
      'New payment splitting techniques'
    ]

    // Update trends for all business types
    for (const [type, database] of this.industryDatabase.entries()) {
      database.recentTrends = [...database.recentTrends, ...newTrends].slice(-10)
    }
  }
}

// Export singleton instance
export const fraudDetectionSystem = new FraudDetectionSystem()

// Export types and class
export default FraudDetectionSystem