/**
 * Continuous Learning Engine
 * Implements adaptive learning from feedback and verification data
 * to continuously improve context accuracy and fraud detection
 */

import { createClient } from '@/lib/supabase/server'
import { patternRecognitionEngine } from './pattern-recognition'
import { contextDiscoveryService } from './context-discovery'

export interface LearningEvent {
  eventId: string
  type: 'verification' | 'feedback' | 'correction' | 'pattern'
  timestamp: Date
  data: any
  impact: 'positive' | 'negative' | 'neutral'
  confidenceChange: number
}

export interface ContextEvolution {
  contextId: string
  version: number
  timestamp: Date
  changes: {
    field: string
    oldValue: any
    newValue: any
    reason: string
    confidence: number
  }[]
  source: 'manual' | 'ai_suggestion' | 'pattern_learning' | 'verification_feedback'
}

export interface ConfidenceScore {
  category: string
  field: string
  score: number // 0-100
  lastUpdated: Date
  validationCount: number
  successRate: number
}

export interface AdaptivePrompt {
  promptId: string
  context: string
  originalPrompt: string
  adaptedPrompt: string
  effectiveness: number
  usageCount: number
}

class LearningEngine {
  private learningHistory: LearningEvent[] = []
  private confidenceScores: Map<string, ConfidenceScore> = new Map()
  private adaptivePrompts: Map<string, AdaptivePrompt> = new Map()

  /**
   * Process verification results to learn from business confirmations
   */
  async learnFromVerification(
    businessId: string,
    verificationId: string
  ): Promise<{
    contextUpdates: any[]
    confidenceChanges: ConfidenceScore[]
    learningInsights: string[]
  }> {
    const supabase = await createClient()

    // Fetch verification data
    const { data: verification, error: verificationError } = await supabase
      .from('verifications')
      .select(`
        *,
        verification_items(*)
      `)
      .eq('id', verificationId)
      .single()

    if (verificationError || !verification) {
      console.error('Error fetching verification:', verificationError)
      return {
        contextUpdates: [],
        confidenceChanges: [],
        learningInsights: []
      }
    }

    // Analyze verification patterns
    const verificationPatterns = this.analyzeVerificationPatterns(verification.verification_items)

    // Update confidence scores based on verification results
    const confidenceChanges = await this.updateConfidenceScores(
      businessId,
      verificationPatterns
    )

    // Generate context updates based on learning
    const contextUpdates = await this.generateContextUpdates(
      businessId,
      verificationPatterns
    )

    // Generate learning insights
    const learningInsights = this.generateLearningInsights(
      verificationPatterns,
      confidenceChanges
    )

    // Record learning event
    this.recordLearningEvent({
      eventId: `learn_verification_${verificationId}`,
      type: 'verification',
      timestamp: new Date(),
      data: {
        verificationId,
        approvalRate: verification.approved_items / verification.total_items,
        patterns: verificationPatterns
      },
      impact: verification.approved_items / verification.total_items > 0.9 ? 'positive' : 'negative',
      confidenceChange: this.calculateAverageConfidenceChange(confidenceChanges)
    })

    // Store learning history
    await this.storeLearningHistory(businessId)

    return {
      contextUpdates,
      confidenceChanges,
      learningInsights
    }
  }

  /**
   * Learn from feedback patterns
   */
  async learnFromFeedback(
    businessId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<{
    contextEnhancements: any[]
    fraudIndicatorUpdates: string[]
    adaptedQuestions: string[]
  }> {
    // Get pattern analysis
    const patterns = await patternRecognitionEngine.analyzeFeedbackPatterns(
      businessId,
      timeRange
    )

    // Extract context enhancements from patterns
    const contextEnhancements = this.extractContextEnhancements(patterns)

    // Update fraud indicators based on anomalies
    const fraudIndicatorUpdates = this.updateFraudIndicators(patterns.anomalies)

    // Adapt questions based on feedback themes
    const adaptedQuestions = await this.adaptQuestionsFromFeedback(
      patterns.clusters,
      businessId
    )

    // Record learning event
    this.recordLearningEvent({
      eventId: `learn_feedback_${Date.now()}`,
      type: 'feedback',
      timestamp: new Date(),
      data: {
        patternCount: patterns.patterns.length,
        clusterCount: patterns.clusters.length,
        anomalyCount: patterns.anomalies.length
      },
      impact: 'neutral',
      confidenceChange: 0
    })

    return {
      contextEnhancements,
      fraudIndicatorUpdates,
      adaptedQuestions
    }
  }

  /**
   * Learn from manual corrections
   */
  async learnFromCorrection(
    businessId: string,
    correction: {
      field: string
      originalValue: any
      correctedValue: any
      reason?: string
    }
  ): Promise<void> {
    // Adjust confidence for the corrected field
    const confidenceKey = `${businessId}_${correction.field}`
    const currentConfidence = this.confidenceScores.get(confidenceKey)

    if (currentConfidence) {
      // Reduce confidence when corrected
      currentConfidence.score = Math.max(0, currentConfidence.score - 10)
      currentConfidence.lastUpdated = new Date()
    } else {
      // Create new confidence score
      this.confidenceScores.set(confidenceKey, {
        category: this.extractCategory(correction.field),
        field: correction.field,
        score: 50, // Start at medium confidence after correction
        lastUpdated: new Date(),
        validationCount: 1,
        successRate: 0
      })
    }

    // Record learning event
    this.recordLearningEvent({
      eventId: `learn_correction_${Date.now()}`,
      type: 'correction',
      timestamp: new Date(),
      data: correction,
      impact: 'negative',
      confidenceChange: -10
    })

    // Adapt prompts based on correction
    await this.adaptPromptsFromCorrection(businessId, correction)
  }

  /**
   * Evolve context based on learning
   */
  async evolveContext(
    businessId: string
  ): Promise<ContextEvolution> {
    const supabase = await createClient()

    // Get current context
    const { data: currentContext } = await supabase
      .from('business_contexts')
      .select('*')
      .eq('business_id', businessId)
      .single()

    // Get learning insights
    const insights = await this.gatherLearningInsights(businessId)

    // Generate evolution changes
    const changes = await this.generateEvolutionChanges(
      currentContext?.context_data || {},
      insights
    )

    // Create evolution record
    const evolution: ContextEvolution = {
      contextId: currentContext?.id || '',
      version: (currentContext?.version || 0) + 1,
      timestamp: new Date(),
      changes,
      source: 'pattern_learning'
    }

    // Apply evolution if changes exist
    if (changes.length > 0) {
      const updatedContext = this.applyEvolutionChanges(
        currentContext?.context_data || {},
        changes
      )

      await supabase
        .from('business_contexts')
        .update({
          context_data: updatedContext,
          last_evolution: evolution,
          version: evolution.version
        })
        .eq('business_id', businessId)
    }

    return evolution
  }

  /**
   * Analyze verification patterns
   */
  private analyzeVerificationPatterns(verificationItems: any[]): {
    approvalRate: number
    rejectionReasons: Map<string, number>
    suspiciousPatterns: string[]
  } {
    const approved = verificationItems.filter(item => item.is_verified).length
    const total = verificationItems.length
    const approvalRate = total > 0 ? approved / total : 0

    const rejectionReasons = new Map<string, number>()
    const suspiciousPatterns: string[] = []

    for (const item of verificationItems) {
      if (!item.is_verified && item.verification_status) {
        const reason = item.verification_status
        rejectionReasons.set(reason, (rejectionReasons.get(reason) || 0) + 1)

        if (reason.includes('FRAUD') || reason.includes('SUSPICIOUS')) {
          suspiciousPatterns.push(`Transaction ${item.transaction_id}: ${reason}`)
        }
      }
    }

    return {
      approvalRate,
      rejectionReasons,
      suspiciousPatterns
    }
  }

  /**
   * Update confidence scores based on verification
   */
  private async updateConfidenceScores(
    businessId: string,
    verificationPatterns: any
  ): Promise<ConfidenceScore[]> {
    const changes: ConfidenceScore[] = []
    const { approvalRate } = verificationPatterns

    // Update fraud detection confidence
    const fraudConfidenceKey = `${businessId}_fraud_detection`
    let fraudConfidence = this.confidenceScores.get(fraudConfidenceKey)

    if (!fraudConfidence) {
      fraudConfidence = {
        category: 'fraud_detection',
        field: 'overall',
        score: 50,
        lastUpdated: new Date(),
        validationCount: 0,
        successRate: 0
      }
      this.confidenceScores.set(fraudConfidenceKey, fraudConfidence)
    }

    // Adjust confidence based on approval rate
    const adjustment = approvalRate > 0.95 ? 5 : approvalRate > 0.9 ? 2 : approvalRate > 0.8 ? 0 : -5
    fraudConfidence.score = Math.min(100, Math.max(0, fraudConfidence.score + adjustment))
    fraudConfidence.validationCount++
    fraudConfidence.successRate = (fraudConfidence.successRate * (fraudConfidence.validationCount - 1) + approvalRate) / fraudConfidence.validationCount
    fraudConfidence.lastUpdated = new Date()

    changes.push({ ...fraudConfidence })

    return changes
  }

  /**
   * Generate context updates from learning
   */
  private async generateContextUpdates(
    businessId: string,
    verificationPatterns: any
  ): Promise<any[]> {
    const updates: any[] = []

    // If suspicious patterns found, suggest adding them to fraud indicators
    if (verificationPatterns.suspiciousPatterns.length > 0) {
      updates.push({
        type: 'add_fraud_indicators',
        values: verificationPatterns.suspiciousPatterns,
        reason: 'Identified from verification rejections',
        confidence: 0.8
      })
    }

    // If high rejection rate for specific reason, suggest context enhancement
    for (const [reason, count] of verificationPatterns.rejectionReasons.entries()) {
      if (count > 3) {
        updates.push({
          type: 'enhance_context',
          area: this.mapRejectionReasonToContextArea(reason),
          suggestion: `Add more detail about ${reason.toLowerCase().replace(/_/g, ' ')}`,
          confidence: 0.7
        })
      }
    }

    return updates
  }

  /**
   * Generate learning insights
   */
  private generateLearningInsights(
    verificationPatterns: any,
    confidenceChanges: ConfidenceScore[]
  ): string[] {
    const insights: string[] = []

    // Insight about approval rate
    if (verificationPatterns.approvalRate < 0.8) {
      insights.push(`Low verification approval rate (${(verificationPatterns.approvalRate * 100).toFixed(1)}%) suggests context improvements needed`)
    } else if (verificationPatterns.approvalRate > 0.95) {
      insights.push(`Excellent verification rate (${(verificationPatterns.approvalRate * 100).toFixed(1)}%) indicates strong fraud detection`)
    }

    // Insights about confidence changes
    for (const change of confidenceChanges) {
      if (change.score > 80) {
        insights.push(`High confidence in ${change.field} fraud detection (${change.score}%)`)
      } else if (change.score < 50) {
        insights.push(`${change.field} needs improvement (confidence: ${change.score}%)`)
      }
    }

    // Insights about patterns
    if (verificationPatterns.suspiciousPatterns.length > 0) {
      insights.push(`Identified ${verificationPatterns.suspiciousPatterns.length} new suspicious patterns`)
    }

    return insights
  }

  /**
   * Extract context enhancements from patterns
   */
  private extractContextEnhancements(patterns: any): any[] {
    const enhancements: any[] = []

    // Extract enhancements from recurring patterns
    for (const pattern of patterns.patterns) {
      if (pattern.type === 'recurring' && pattern.frequency > 5) {
        enhancements.push({
          type: 'pattern',
          category: pattern.category,
          description: pattern.description,
          examples: pattern.examples,
          suggestion: `Add "${pattern.description}" to your ${pattern.category} context`
        })
      }
    }

    // Extract enhancements from clusters
    for (const cluster of patterns.clusters) {
      if (cluster.feedbackIds.length > 3) {
        enhancements.push({
          type: 'cluster',
          theme: cluster.theme,
          keywords: cluster.commonKeywords,
          suggestion: `Consider adding context about: ${cluster.theme}`
        })
      }
    }

    return enhancements
  }

  /**
   * Update fraud indicators from anomalies
   */
  private updateFraudIndicators(anomalies: any[]): string[] {
    const indicators: string[] = []

    for (const anomaly of anomalies) {
      if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
        indicators.push(anomaly.description)
      }
    }

    return indicators
  }

  /**
   * Adapt questions based on feedback
   */
  private async adaptQuestionsFromFeedback(
    clusters: any[],
    businessId: string
  ): Promise<string[]> {
    const questions: string[] = []

    // Generate questions for major clusters
    for (const cluster of clusters.slice(0, 3)) {
      if (cluster.sentiment === 'negative') {
        questions.push(`How do you usually handle issues related to ${cluster.theme}?`)
      } else if (cluster.sentiment === 'positive') {
        questions.push(`What makes your ${cluster.theme} particularly good?`)
      }
    }

    return questions
  }

  /**
   * Record learning event
   */
  private recordLearningEvent(event: LearningEvent): void {
    this.learningHistory.push(event)

    // Keep only recent history (last 100 events)
    if (this.learningHistory.length > 100) {
      this.learningHistory = this.learningHistory.slice(-100)
    }
  }

  /**
   * Calculate average confidence change
   */
  private calculateAverageConfidenceChange(changes: ConfidenceScore[]): number {
    if (changes.length === 0) return 0

    const sum = changes.reduce((acc, change) => acc + change.score, 0)
    return sum / changes.length
  }

  /**
   * Extract category from field name
   */
  private extractCategory(field: string): string {
    const parts = field.split('_')
    return parts[0] || 'general'
  }

  /**
   * Adapt prompts from correction
   */
  private async adaptPromptsFromCorrection(
    businessId: string,
    correction: any
  ): Promise<void> {
    const promptKey = `${businessId}_${correction.field}`
    let adaptivePrompt = this.adaptivePrompts.get(promptKey)

    if (!adaptivePrompt) {
      adaptivePrompt = {
        promptId: promptKey,
        context: correction.field,
        originalPrompt: `Tell me about your ${correction.field}`,
        adaptedPrompt: `Tell me about your ${correction.field}`,
        effectiveness: 0.5,
        usageCount: 0
      }
    }

    // Adapt the prompt based on the correction
    adaptivePrompt.adaptedPrompt = `Please provide specific details about your ${correction.field}. Previous answer needed correction: ${correction.reason || 'incomplete information'}`
    adaptivePrompt.effectiveness = Math.max(0, adaptivePrompt.effectiveness - 0.1)
    adaptivePrompt.usageCount++

    this.adaptivePrompts.set(promptKey, adaptivePrompt)
  }

  /**
   * Gather learning insights
   */
  private async gatherLearningInsights(businessId: string): Promise<any> {
    const supabase = await createClient()

    // Get recent feedback
    const { data: recentFeedback } = await supabase
      .from('feedbacks')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(100)

    // Get recent verifications
    const { data: recentVerifications } = await supabase
      .from('verifications')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    return {
      feedbackInsights: this.analyzeFeedbackInsights(recentFeedback || []),
      verificationInsights: this.analyzeVerificationInsights(recentVerifications || []),
      confidenceScores: Array.from(this.confidenceScores.values())
        .filter(score => score.category.includes(businessId))
    }
  }

  /**
   * Generate evolution changes
   */
  private async generateEvolutionChanges(
    currentContext: any,
    insights: any
  ): Promise<any[]> {
    const changes: any[] = []

    // Check for high-confidence improvements
    for (const insight of insights.feedbackInsights) {
      if (insight.confidence > 0.7) {
        changes.push({
          field: insight.field,
          oldValue: currentContext[insight.field],
          newValue: insight.suggestedValue,
          reason: insight.reason,
          confidence: insight.confidence
        })
      }
    }

    return changes
  }

  /**
   * Apply evolution changes to context
   */
  private applyEvolutionChanges(context: any, changes: any[]): any {
    const updatedContext = { ...context }

    for (const change of changes) {
      const fieldParts = change.field.split('.')
      let target = updatedContext

      // Navigate to nested field
      for (let i = 0; i < fieldParts.length - 1; i++) {
        if (!target[fieldParts[i]]) {
          target[fieldParts[i]] = {}
        }
        target = target[fieldParts[i]]
      }

      // Apply change
      target[fieldParts[fieldParts.length - 1]] = change.newValue
    }

    return updatedContext
  }

  /**
   * Map rejection reason to context area
   */
  private mapRejectionReasonToContextArea(reason: string): string {
    const mappings: Record<string, string> = {
      'NOT_FOUND': 'transaction_patterns',
      'FRAUD': 'fraud_indicators',
      'TIMING': 'operational_hours',
      'AMOUNT': 'pricing_structure',
      'LOCATION': 'physical_layout'
    }

    for (const [key, area] of Object.entries(mappings)) {
      if (reason.includes(key)) {
        return area
      }
    }

    return 'general'
  }

  /**
   * Analyze feedback insights
   */
  private analyzeFeedbackInsights(feedbacks: any[]): any[] {
    const insights: any[] = []

    // Analyze common themes
    const themes = new Map<string, number>()
    for (const feedback of feedbacks) {
      if (feedback.categories) {
        for (const category of feedback.categories) {
          themes.set(category, (themes.get(category) || 0) + 1)
        }
      }
    }

    // Generate insights from themes
    for (const [theme, count] of themes.entries()) {
      if (count > feedbacks.length * 0.2) { // Theme appears in >20% of feedback
        insights.push({
          field: `common_themes.${theme}`,
          suggestedValue: true,
          reason: `${theme} mentioned in ${count} feedbacks`,
          confidence: count / feedbacks.length
        })
      }
    }

    return insights
  }

  /**
   * Analyze verification insights
   */
  private analyzeVerificationInsights(verifications: any[]): any[] {
    const insights: any[] = []

    // Calculate overall approval trend
    const approvalRates = verifications.map(v =>
      v.total_items > 0 ? v.approved_items / v.total_items : 0
    )

    if (approvalRates.length > 0) {
      const avgApproval = approvalRates.reduce((a, b) => a + b, 0) / approvalRates.length

      if (avgApproval < 0.8) {
        insights.push({
          type: 'low_approval',
          value: avgApproval,
          suggestion: 'Context needs improvement for better fraud detection'
        })
      }
    }

    return insights
  }

  /**
   * Store learning history
   */
  private async storeLearningHistory(businessId: string): Promise<void> {
    const supabase = await createClient()

    try {
      await supabase
        .from('business_contexts')
        .update({
          learning_history: {
            events: this.learningHistory.slice(-20), // Store last 20 events
            lastUpdated: new Date().toISOString()
          }
        })
        .eq('business_id', businessId)
    } catch (error) {
      console.error('Error storing learning history:', error)
    }
  }

  /**
   * Get adaptive prompt for a context
   */
  getAdaptivePrompt(businessId: string, context: string): string {
    const promptKey = `${businessId}_${context}`
    const adaptivePrompt = this.adaptivePrompts.get(promptKey)

    if (adaptivePrompt && adaptivePrompt.effectiveness > 0.3) {
      return adaptivePrompt.adaptedPrompt
    }

    // Return default prompt
    return `Please provide information about your ${context.replace(/_/g, ' ')}`
  }

  /**
   * Get confidence score for a field
   */
  getConfidenceScore(businessId: string, field: string): number {
    const key = `${businessId}_${field}`
    const score = this.confidenceScores.get(key)
    return score?.score || 50 // Default to 50% confidence
  }
}

// Export singleton instance
export const learningEngine = new LearningEngine()

// Export types and class
export default LearningEngine