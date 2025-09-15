/**
 * Weekly Suggestions Generator
 * Generates personalized weekly context improvement suggestions
 * based on feedback patterns, verification results, and business performance
 */

import { createClient } from '@/lib/supabase/server'
import { patternRecognitionEngine } from './pattern-recognition'
import { contextDiscoveryService } from './context-discovery'
import { learningEngine } from './learning-engine'
import { contextValidator } from './context-validator'
import type { BusinessType } from '@/types/onboarding'

export interface WeeklySuggestion {
  id: string
  type: 'context_improvement' | 'fraud_pattern' | 'operational' | 'question' | 'validation'
  category: string
  title: string
  description: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  impact: {
    metric: string
    expectedImprovement: string
    confidence: number
  }
  actionItems: string[]
  dataSource: string[]
  weekNumber: number
  yearNumber: number
  status: 'pending' | 'accepted' | 'rejected' | 'implemented'
}

export interface WeeklyInsights {
  weekNumber: number
  yearNumber: number
  performanceMetrics: {
    feedbackQuality: number
    verificationRate: number
    fraudDetectionAccuracy: number
    contextCompleteness: number
  }
  trends: {
    metric: string
    direction: 'up' | 'down' | 'stable'
    change: number
  }[]
  topIssues: string[]
  achievements: string[]
}

export interface SuggestionEffectiveness {
  suggestionId: string
  acceptanceRate: number
  implementationRate: number
  actualImpact: number
  feedbackScore: number
}

class WeeklySuggestionsGenerator {
  /**
   * Generate weekly suggestions for a business
   */
  async generateWeeklySuggestions(
    businessId: string,
    weekNumber: number,
    yearNumber: number
  ): Promise<{
    suggestions: WeeklySuggestion[]
    insights: WeeklyInsights
    previousEffectiveness: SuggestionEffectiveness[]
  }> {
    const supabase = await createClient()

    // Gather data from the past week
    const weekData = await this.gatherWeeklyData(businessId, weekNumber, yearNumber)

    // Analyze patterns and performance
    const analysis = await this.analyzeWeeklyPerformance(weekData)

    // Generate suggestions based on analysis
    const suggestions = await this.createSuggestions(
      businessId,
      weekData,
      analysis,
      weekNumber,
      yearNumber
    )

    // Generate weekly insights
    const insights = this.generateInsights(weekData, analysis, weekNumber, yearNumber)

    // Get effectiveness of previous suggestions
    const previousEffectiveness = await this.analyzePreviousSuggestions(businessId)

    // Store suggestions for tracking
    await this.storeSuggestions(businessId, suggestions)

    return {
      suggestions,
      insights,
      previousEffectiveness
    }
  }

  /**
   * Gather weekly data for analysis
   */
  private async gatherWeeklyData(
    businessId: string,
    weekNumber: number,
    yearNumber: number
  ): Promise<any> {
    const supabase = await createClient()

    // Get business context
    const { data: businessData } = await supabase
      .from('businesses')
      .select(`
        *,
        business_contexts(*),
        stores(*)
      `)
      .eq('id', businessId)
      .single()

    // Get feedback from the week
    const { data: feedbacks } = await supabase
      .from('feedbacks')
      .select(`
        *,
        quality_scores(*),
        stores!inner(business_id)
      `)
      .eq('stores.business_id', businessId)
      .eq('week_number', weekNumber)
      .eq('year_number', yearNumber)

    // Get verification data
    const { data: verifications } = await supabase
      .from('verifications')
      .select(`
        *,
        verification_items(*)
      `)
      .eq('business_id', businessId)
      .eq('week_number', weekNumber)
      .eq('year_number', yearNumber)

    // Get previous week's data for comparison
    const previousWeek = weekNumber > 1 ? weekNumber - 1 : 52
    const previousYear = weekNumber > 1 ? yearNumber : yearNumber - 1

    const { data: previousFeedbacks } = await supabase
      .from('feedbacks')
      .select('*')
      .eq('week_number', previousWeek)
      .eq('year_number', previousYear)

    return {
      business: businessData,
      currentWeek: {
        feedbacks: feedbacks || [],
        verifications: verifications || []
      },
      previousWeek: {
        feedbacks: previousFeedbacks || []
      }
    }
  }

  /**
   * Analyze weekly performance
   */
  private async analyzeWeeklyPerformance(weekData: any): Promise<any> {
    const { business, currentWeek, previousWeek } = weekData

    // Get pattern analysis
    const patterns = await patternRecognitionEngine.analyzeFeedbackPatterns(
      business.id,
      {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      }
    )

    // Get context gaps
    const contextGaps = await contextDiscoveryService.analyzeContextGaps(
      business.id,
      business.business_type,
      business.business_contexts?.context_data
    )

    // Validate current context
    const validation = await contextValidator.validateContext(
      business.id,
      business.business_type,
      business.business_contexts?.context_data
    )

    // Calculate metrics
    const metrics = this.calculateWeeklyMetrics(currentWeek, previousWeek)

    return {
      patterns,
      contextGaps,
      validation,
      metrics
    }
  }

  /**
   * Create suggestions based on analysis
   */
  private async createSuggestions(
    businessId: string,
    weekData: any,
    analysis: any,
    weekNumber: number,
    yearNumber: number
  ): Promise<WeeklySuggestion[]> {
    const suggestions: WeeklySuggestion[] = []

    // Context improvement suggestions
    if (analysis.contextGaps.completenessScore < 85) {
      suggestions.push(...this.createContextSuggestions(
        analysis.contextGaps,
        weekNumber,
        yearNumber
      ))
    }

    // Pattern-based suggestions
    if (analysis.patterns.patterns.length > 0) {
      suggestions.push(...this.createPatternSuggestions(
        analysis.patterns,
        weekNumber,
        yearNumber
      ))
    }

    // Validation-based suggestions
    if (!analysis.validation.isValid || analysis.validation.score < 80) {
      suggestions.push(...this.createValidationSuggestions(
        analysis.validation,
        weekNumber,
        yearNumber
      ))
    }

    // Fraud detection suggestions
    if (analysis.patterns.anomalies.length > 0) {
      suggestions.push(...this.createFraudSuggestions(
        analysis.patterns.anomalies,
        weekNumber,
        yearNumber
      ))
    }

    // Operational suggestions
    if (analysis.metrics.trends.length > 0) {
      suggestions.push(...this.createOperationalSuggestions(
        analysis.metrics,
        weekNumber,
        yearNumber
      ))
    }

    // Custom question suggestions
    suggestions.push(...await this.createQuestionSuggestions(
      weekData,
      analysis,
      weekNumber,
      yearNumber
    ))

    // Prioritize and rank suggestions
    return this.prioritizeSuggestions(suggestions).slice(0, 10) // Top 10 suggestions
  }

  /**
   * Create context improvement suggestions
   */
  private createContextSuggestions(
    contextGaps: any,
    weekNumber: number,
    yearNumber: number
  ): WeeklySuggestion[] {
    const suggestions: WeeklySuggestion[] = []

    // Critical gaps first
    const criticalGaps = contextGaps.gaps.filter((g: any) => g.importance === 'critical')

    for (const gap of criticalGaps.slice(0, 2)) {
      suggestions.push({
        id: `ctx_${Date.now()}_${gap.field}`,
        type: 'context_improvement',
        category: gap.category,
        title: `Add ${gap.field.replace(/_/g, ' ')} to your context`,
        description: gap.description,
        priority: 'urgent',
        impact: {
          metric: 'Context Completeness',
          expectedImprovement: '+10-15% accuracy',
          confidence: 0.85
        },
        actionItems: gap.suggestedQuestions,
        dataSource: ['Context Analysis', 'Industry Benchmarks'],
        weekNumber,
        yearNumber,
        status: 'pending'
      })
    }

    // Next steps suggestions
    for (const step of contextGaps.nextSteps.slice(0, 2)) {
      suggestions.push({
        id: `step_${Date.now()}_${Math.random()}`,
        type: 'context_improvement',
        category: 'general',
        title: step,
        description: 'Recommended next step for context improvement',
        priority: 'medium',
        impact: {
          metric: 'Overall Context Quality',
          expectedImprovement: 'Progressive improvement',
          confidence: 0.7
        },
        actionItems: [step],
        dataSource: ['Context Discovery'],
        weekNumber,
        yearNumber,
        status: 'pending'
      })
    }

    return suggestions
  }

  /**
   * Create pattern-based suggestions
   */
  private createPatternSuggestions(
    patterns: any,
    weekNumber: number,
    yearNumber: number
  ): WeeklySuggestion[] {
    const suggestions: WeeklySuggestion[] = []

    // Suggestions from recurring patterns
    for (const pattern of patterns.patterns.filter((p: any) => p.type === 'recurring')) {
      if (pattern.frequency > 5) {
        suggestions.push({
          id: `pattern_${Date.now()}_${pattern.category}`,
          type: 'operational',
          category: pattern.category,
          title: `Address recurring pattern: ${pattern.description}`,
          description: `This pattern appeared ${pattern.frequency} times this week`,
          priority: pattern.frequency > 10 ? 'high' : 'medium',
          impact: {
            metric: 'Customer Satisfaction',
            expectedImprovement: 'Reduce negative feedback',
            confidence: 0.75
          },
          actionItems: [
            `Review ${pattern.category} processes`,
            'Identify root cause',
            'Implement corrective measures'
          ],
          dataSource: ['Feedback Pattern Analysis'],
          weekNumber,
          yearNumber,
          status: 'pending'
        })
      }
    }

    // Suggestions from clusters
    for (const cluster of patterns.clusters) {
      if (cluster.sentiment === 'negative' && cluster.feedbackIds.length > 3) {
        suggestions.push({
          id: `cluster_${cluster.clusterId}`,
          type: 'operational',
          category: 'feedback_cluster',
          title: `Address customer concern: ${cluster.theme}`,
          description: cluster.businessImpact,
          priority: 'high',
          impact: {
            metric: 'Customer Experience',
            expectedImprovement: 'Improve satisfaction',
            confidence: 0.8
          },
          actionItems: [cluster.suggestedAction || 'Review and address the issue'],
          dataSource: ['Feedback Clustering'],
          weekNumber,
          yearNumber,
          status: 'pending'
        })
      }
    }

    return suggestions
  }

  /**
   * Create validation-based suggestions
   */
  private createValidationSuggestions(
    validation: any,
    weekNumber: number,
    yearNumber: number
  ): WeeklySuggestion[] {
    const suggestions: WeeklySuggestion[] = []

    // Error fixes
    for (const error of validation.errors.slice(0, 3)) {
      suggestions.push({
        id: `val_error_${Date.now()}_${error.field}`,
        type: 'validation',
        category: error.category,
        title: `Fix validation error: ${error.field}`,
        description: error.message,
        priority: 'urgent',
        impact: {
          metric: 'Context Validity',
          expectedImprovement: 'Required for proper operation',
          confidence: 1.0
        },
        actionItems: [`Update ${error.field} with valid data`],
        dataSource: ['Context Validation'],
        weekNumber,
        yearNumber,
        status: 'pending'
      })
    }

    // High-impact warnings
    const highWarnings = validation.warnings.filter((w: any) => w.impact === 'high')
    for (const warning of highWarnings.slice(0, 2)) {
      suggestions.push({
        id: `val_warn_${Date.now()}_${warning.field}`,
        type: 'validation',
        category: warning.category,
        title: `Address validation warning: ${warning.field}`,
        description: warning.message,
        priority: 'high',
        impact: {
          metric: 'Data Quality',
          expectedImprovement: 'Improve accuracy',
          confidence: 0.7
        },
        actionItems: [`Review and update ${warning.field}`],
        dataSource: ['Context Validation'],
        weekNumber,
        yearNumber,
        status: 'pending'
      })
    }

    return suggestions
  }

  /**
   * Create fraud detection suggestions
   */
  private createFraudSuggestions(
    anomalies: any[],
    weekNumber: number,
    yearNumber: number
  ): WeeklySuggestion[] {
    const suggestions: WeeklySuggestion[] = []

    // Group anomalies by type
    const anomalyGroups = new Map<string, any[]>()
    for (const anomaly of anomalies) {
      const group = anomalyGroups.get(anomaly.type) || []
      group.push(anomaly)
      anomalyGroups.set(anomaly.type, group)
    }

    for (const [type, group] of Array.from(anomalyGroups.entries())) {
      if (group.length > 2) {
        suggestions.push({
          id: `fraud_${Date.now()}_${type}`,
          type: 'fraud_pattern',
          category: 'fraud_detection',
          title: `New fraud pattern detected: ${type} anomalies`,
          description: `${group.length} suspicious ${type} patterns detected this week`,
          priority: group.some(a => a.severity === 'critical') ? 'urgent' : 'high',
          impact: {
            metric: 'Fraud Prevention',
            expectedImprovement: 'Prevent false transactions',
            confidence: 0.85
          },
          actionItems: [
            `Add ${type} pattern to fraud indicators`,
            'Review affected transactions',
            'Update verification procedures'
          ],
          dataSource: ['Anomaly Detection'],
          weekNumber,
          yearNumber,
          status: 'pending'
        })
      }
    }

    return suggestions
  }

  /**
   * Create operational suggestions
   */
  private createOperationalSuggestions(
    metrics: any,
    weekNumber: number,
    yearNumber: number
  ): WeeklySuggestion[] {
    const suggestions: WeeklySuggestion[] = []

    // Suggestions based on trends
    for (const trend of metrics.trends) {
      if (trend.direction === 'down' && trend.metric.includes('quality')) {
        suggestions.push({
          id: `ops_${Date.now()}_quality`,
          type: 'operational',
          category: 'performance',
          title: 'Declining feedback quality trend',
          description: `Feedback quality decreased by ${Math.abs(trend.change)}% this week`,
          priority: 'high',
          impact: {
            metric: 'Feedback Quality',
            expectedImprovement: 'Restore quality levels',
            confidence: 0.7
          },
          actionItems: [
            'Review recent context changes',
            'Check for system issues',
            'Enhance customer engagement'
          ],
          dataSource: ['Performance Metrics'],
          weekNumber,
          yearNumber,
          status: 'pending'
        })
      }
    }

    return suggestions
  }

  /**
   * Create custom question suggestions
   */
  private async createQuestionSuggestions(
    weekData: any,
    analysis: any,
    weekNumber: number,
    yearNumber: number
  ): Promise<WeeklySuggestion[]> {
    const suggestions: WeeklySuggestion[] = []

    // Suggest questions based on feedback themes
    if (analysis.patterns.clusters.length > 0) {
      const topCluster = analysis.patterns.clusters[0]

      suggestions.push({
        id: `question_${Date.now()}`,
        type: 'question',
        category: 'custom_questions',
        title: 'Add targeted question for customer insights',
        description: `Based on feedback theme: ${topCluster.theme}`,
        priority: 'medium',
        impact: {
          metric: 'Insight Depth',
          expectedImprovement: 'Better understanding',
          confidence: 0.65
        },
        actionItems: [
          `Add question: "How can we improve ${topCluster.theme}?"`,
          'Set frequency to every 5th customer',
          'Monitor responses for 2 weeks'
        ],
        dataSource: ['Feedback Analysis'],
        weekNumber,
        yearNumber,
        status: 'pending'
      })
    }

    return suggestions
  }

  /**
   * Calculate weekly metrics
   */
  private calculateWeeklyMetrics(currentWeek: any, previousWeek: any): any {
    const metrics = {
      feedbackCount: currentWeek.feedbacks.length,
      previousFeedbackCount: previousWeek.feedbacks.length,
      averageQuality: this.calculateAverageQuality(currentWeek.feedbacks),
      verificationRate: this.calculateVerificationRate(currentWeek.verifications),
      trends: [] as any[]
    }

    // Calculate trends
    if (metrics.previousFeedbackCount > 0) {
      const feedbackChange = ((metrics.feedbackCount - metrics.previousFeedbackCount) / metrics.previousFeedbackCount) * 100

      metrics.trends.push({
        metric: 'feedback_volume',
        direction: feedbackChange > 5 ? 'up' : feedbackChange < -5 ? 'down' : 'stable',
        change: feedbackChange
      })
    }

    return metrics
  }

  /**
   * Calculate average quality score
   */
  private calculateAverageQuality(feedbacks: any[]): number {
    if (feedbacks.length === 0) return 0

    const sum = feedbacks.reduce((acc, f) => acc + (f.quality_score || 0), 0)
    return sum / feedbacks.length
  }

  /**
   * Calculate verification rate
   */
  private calculateVerificationRate(verifications: any[]): number {
    if (verifications.length === 0) return 0

    const totalItems = verifications.reduce((acc, v) => acc + (v.total_items || 0), 0)
    const approvedItems = verifications.reduce((acc, v) => acc + (v.approved_items || 0), 0)

    return totalItems > 0 ? (approvedItems / totalItems) * 100 : 0
  }

  /**
   * Generate weekly insights
   */
  private generateInsights(
    weekData: any,
    analysis: any,
    weekNumber: number,
    yearNumber: number
  ): WeeklyInsights {
    const metrics = analysis.metrics

    const performanceMetrics = {
      feedbackQuality: metrics.averageQuality,
      verificationRate: metrics.verificationRate,
      fraudDetectionAccuracy: analysis.validation.score,
      contextCompleteness: analysis.contextGaps.completenessScore
    }

    const topIssues: string[] = []
    const achievements: string[] = []

    // Identify top issues
    if (analysis.validation.errors.length > 0) {
      topIssues.push('Context validation errors need fixing')
    }

    if (analysis.patterns.anomalies.length > 5) {
      topIssues.push('High number of anomalies detected')
    }

    if (performanceMetrics.contextCompleteness < 60) {
      topIssues.push('Context completeness below target')
    }

    // Identify achievements
    if (performanceMetrics.verificationRate > 95) {
      achievements.push('Excellent verification rate')
    }

    if (performanceMetrics.feedbackQuality > 80) {
      achievements.push('High feedback quality maintained')
    }

    if (analysis.patterns.clusters.filter((c: any) => c.sentiment === 'positive').length > 3) {
      achievements.push('Multiple positive feedback clusters')
    }

    return {
      weekNumber,
      yearNumber,
      performanceMetrics,
      trends: metrics.trends,
      topIssues,
      achievements
    }
  }

  /**
   * Prioritize suggestions
   */
  private prioritizeSuggestions(suggestions: WeeklySuggestion[]): WeeklySuggestion[] {
    const priorityScores = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1
    }

    return suggestions.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityScores[b.priority] - priorityScores[a.priority]
      if (priorityDiff !== 0) return priorityDiff

      // Then by impact confidence
      return b.impact.confidence - a.impact.confidence
    })
  }

  /**
   * Analyze effectiveness of previous suggestions
   */
  private async analyzePreviousSuggestions(
    businessId: string
  ): Promise<SuggestionEffectiveness[]> {
    const supabase = await createClient()

    // Get previous suggestions (last 4 weeks)
    const { data: previousSuggestions } = await supabase
      .from('weekly_suggestions')
      .select('*')
      .eq('business_id', businessId)
      .gte('created_at', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString())

    if (!previousSuggestions || previousSuggestions.length === 0) {
      return []
    }

    const effectiveness: SuggestionEffectiveness[] = []

    for (const suggestion of previousSuggestions) {
      const accepted = suggestion.status === 'accepted' || suggestion.status === 'implemented'
      const implemented = suggestion.status === 'implemented'

      effectiveness.push({
        suggestionId: suggestion.id,
        acceptanceRate: accepted ? 1 : 0,
        implementationRate: implemented ? 1 : 0,
        actualImpact: suggestion.actual_impact || 0,
        feedbackScore: suggestion.feedback_score || 0
      })
    }

    return effectiveness
  }

  /**
   * Store suggestions for tracking
   */
  private async storeSuggestions(
    businessId: string,
    suggestions: WeeklySuggestion[]
  ): Promise<void> {
    const supabase = await createClient()

    try {
      // Store in a suggestions tracking table (would need to be created)
      await supabase
        .from('weekly_suggestions')
        .insert(
          suggestions.map(s => ({
            business_id: businessId,
            suggestion_id: s.id,
            type: s.type,
            title: s.title,
            description: s.description,
            priority: s.priority,
            impact: s.impact,
            action_items: s.actionItems,
            week_number: s.weekNumber,
            year_number: s.yearNumber,
            status: s.status,
            created_at: new Date().toISOString()
          }))
        )
    } catch (error) {
      console.error('Error storing suggestions:', error)
    }
  }

  /**
   * Mark suggestion as accepted/rejected
   */
  async updateSuggestionStatus(
    suggestionId: string,
    status: 'accepted' | 'rejected' | 'implemented',
    feedback?: string
  ): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('weekly_suggestions')
      .update({
        status,
        feedback,
        updated_at: new Date().toISOString()
      })
      .eq('suggestion_id', suggestionId)
  }

  /**
   * Track suggestion implementation
   */
  async trackImplementation(
    suggestionId: string,
    actualImpact: number,
    notes?: string
  ): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('weekly_suggestions')
      .update({
        status: 'implemented',
        actual_impact: actualImpact,
        implementation_notes: notes,
        implemented_at: new Date().toISOString()
      })
      .eq('suggestion_id', suggestionId)

    // Learn from the implementation
    await learningEngine.learnFromCorrection('system', {
      field: 'suggestion_effectiveness',
      originalValue: 'predicted',
      correctedValue: actualImpact,
      reason: notes
    })
  }
}

// Export singleton instance
export const weeklySuggestionsGenerator = new WeeklySuggestionsGenerator()

// Export types and class
export default WeeklySuggestionsGenerator