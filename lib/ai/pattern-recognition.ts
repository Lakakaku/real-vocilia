/**
 * Pattern Recognition Engine
 * Analyzes feedback data to identify patterns, trends, and anomalies
 * for improved context building and fraud detection
 */

import { createClient } from '@/lib/supabase/server'
import { openAIService } from './openai-service'

export interface FeedbackPattern {
  type: 'recurring' | 'anomaly' | 'trend' | 'cluster'
  category: string
  description: string
  frequency: number
  confidence: number
  examples: string[]
  timeRange: {
    start: Date
    end: Date
  }
  affectedStores?: string[]
  riskLevel?: 'low' | 'medium' | 'high'
}

export interface PatternCluster {
  clusterId: string
  theme: string
  feedbackIds: string[]
  commonKeywords: string[]
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  businessImpact: string
  suggestedAction?: string
}

export interface TrendAnalysis {
  trendType: 'increasing' | 'decreasing' | 'stable' | 'volatile'
  metric: string
  currentValue: number
  previousValue: number
  changePercentage: number
  prediction: {
    nextPeriodValue: number
    confidence: number
  }
}

export interface AnomalyDetection {
  anomalyId: string
  type: 'transaction' | 'behavior' | 'timing' | 'amount'
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: Date
  relatedFeedbackIds: string[]
  fraudProbability: number
  recommendedAction: string
}

class PatternRecognitionEngine {
  private readonly minPatternFrequency = 3 // Minimum occurrences to be considered a pattern
  private readonly anomalyThreshold = 2.5 // Standard deviations for anomaly detection
  private readonly clusterSimilarityThreshold = 0.7 // Similarity threshold for clustering

  /**
   * Analyze feedback data to identify patterns
   */
  async analyzeFeedbackPatterns(
    businessId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<{
    patterns: FeedbackPattern[]
    clusters: PatternCluster[]
    trends: TrendAnalysis[]
    anomalies: AnomalyDetection[]
  }> {
    const supabase = await createClient()

    // Fetch feedback data
    const { data: feedbacks, error } = await supabase
      .from('feedbacks')
      .select(`
        *,
        stores!inner(business_id, name, store_code),
        quality_scores(*)
      `)
      .eq('stores.business_id', businessId)
      .gte('created_at', timeRange.start.toISOString())
      .lte('created_at', timeRange.end.toISOString())
      .order('created_at', { ascending: false })

    if (error || !feedbacks) {
      console.error('Error fetching feedbacks:', error)
      return {
        patterns: [],
        clusters: [],
        trends: [],
        anomalies: []
      }
    }

    // Run pattern analysis in parallel
    const [patterns, clusters, trends, anomalies] = await Promise.all([
      this.identifyRecurringPatterns(feedbacks),
      this.clusterSimilarFeedback(feedbacks),
      this.analyzeTrends(feedbacks, businessId),
      this.detectAnomalies(feedbacks)
    ])

    // Store patterns for future reference
    await this.storePatterns(businessId, patterns, clusters, anomalies)

    return {
      patterns,
      clusters,
      trends,
      anomalies
    }
  }

  /**
   * Identify recurring patterns in feedback
   */
  private async identifyRecurringPatterns(feedbacks: any[]): Promise<FeedbackPattern[]> {
    const patterns: FeedbackPattern[] = []
    const transcriptPatterns = new Map<string, number>()
    const categoryPatterns = new Map<string, string[]>()

    // Analyze transcripts for common themes
    for (const feedback of feedbacks) {
      if (!feedback.voice_transcript) continue

      // Extract key phrases using simple NLP
      const keyPhrases = this.extractKeyPhrases(feedback.voice_transcript)

      for (const phrase of keyPhrases) {
        const count = transcriptPatterns.get(phrase) || 0
        transcriptPatterns.set(phrase, count + 1)

        // Track examples
        if (!categoryPatterns.has(phrase)) {
          categoryPatterns.set(phrase, [])
        }
        categoryPatterns.get(phrase)!.push(feedback.voice_transcript.substring(0, 100))
      }
    }

    // Identify patterns that meet frequency threshold
    for (const [phrase, count] of Array.from(transcriptPatterns.entries())) {
      if (count >= this.minPatternFrequency) {
        const examples = categoryPatterns.get(phrase) || []

        patterns.push({
          type: 'recurring',
          category: this.categorizePhrase(phrase),
          description: `"${phrase}" mentioned ${count} times`,
          frequency: count,
          confidence: Math.min(0.5 + (count / feedbacks.length), 0.95),
          examples: examples.slice(0, 3),
          timeRange: {
            start: new Date(Math.min(...feedbacks.map(f => new Date(f.created_at).getTime()))),
            end: new Date(Math.max(...feedbacks.map(f => new Date(f.created_at).getTime())))
          }
        })
      }
    }

    // Analyze time-based patterns
    const timePatterns = this.analyzeTimePatterns(feedbacks)
    patterns.push(...timePatterns)

    // Analyze transaction patterns
    const transactionPatterns = this.analyzeTransactionPatterns(feedbacks)
    patterns.push(...transactionPatterns)

    return patterns
  }

  /**
   * Cluster similar feedback using similarity analysis
   */
  private async clusterSimilarFeedback(feedbacks: any[]): Promise<PatternCluster[]> {
    const clusters: PatternCluster[] = []
    const processedIds = new Set<string>()

    for (const feedback of feedbacks) {
      if (processedIds.has(feedback.id) || !feedback.voice_transcript) continue

      const cluster: PatternCluster = {
        clusterId: `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        theme: '',
        feedbackIds: [feedback.id],
        commonKeywords: [],
        sentiment: this.analyzeSentiment(feedback.voice_transcript),
        businessImpact: '',
        suggestedAction: ''
      }

      processedIds.add(feedback.id)

      // Find similar feedback
      for (const otherFeedback of feedbacks) {
        if (processedIds.has(otherFeedback.id) || !otherFeedback.voice_transcript) continue

        const similarity = this.calculateSimilarity(
          feedback.voice_transcript,
          otherFeedback.voice_transcript
        )

        if (similarity >= this.clusterSimilarityThreshold) {
          cluster.feedbackIds.push(otherFeedback.id)
          processedIds.add(otherFeedback.id)
        }
      }

      // Only keep clusters with multiple feedbacks
      if (cluster.feedbackIds.length >= 2) {
        // Extract common keywords
        const transcripts = feedbacks
          .filter(f => cluster.feedbackIds.includes(f.id))
          .map(f => f.voice_transcript)

        cluster.commonKeywords = this.extractCommonKeywords(transcripts)
        cluster.theme = await this.generateClusterTheme(cluster.commonKeywords, transcripts)
        cluster.businessImpact = this.assessBusinessImpact(cluster)
        cluster.suggestedAction = this.suggestAction(cluster)

        clusters.push(cluster)
      }
    }

    return clusters
  }

  /**
   * Analyze trends in feedback metrics
   */
  private async analyzeTrends(feedbacks: any[], businessId: string): Promise<TrendAnalysis[]> {
    const trends: TrendAnalysis[] = []

    // Group feedbacks by week
    const weeklyGroups = this.groupByWeek(feedbacks)

    // Analyze quality score trends
    const qualityTrend = this.analyzeMetricTrend(
      weeklyGroups,
      'quality_score',
      f => f.quality_score || 0
    )
    if (qualityTrend) trends.push(qualityTrend)

    // Analyze transaction amount trends
    const amountTrend = this.analyzeMetricTrend(
      weeklyGroups,
      'transaction_amount',
      f => parseFloat(f.transaction_amount) || 0
    )
    if (amountTrend) trends.push(amountTrend)

    // Analyze sentiment trends
    const sentimentTrend = this.analyzeSentimentTrend(weeklyGroups)
    if (sentimentTrend) trends.push(sentimentTrend)

    // Analyze fraud risk trends
    const fraudTrend = this.analyzeMetricTrend(
      weeklyGroups,
      'fraud_risk',
      f => f.fraud_risk_score || 0
    )
    if (fraudTrend) trends.push(fraudTrend)

    return trends
  }

  /**
   * Detect anomalies in feedback data
   */
  private async detectAnomalies(feedbacks: any[]): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = []

    // Calculate statistical baselines
    const amounts = feedbacks.map(f => parseFloat(f.transaction_amount) || 0)
    const amountMean = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const amountStdDev = Math.sqrt(
      amounts.reduce((sq, n) => sq + Math.pow(n - amountMean, 2), 0) / amounts.length
    )

    // Detect amount anomalies
    for (const feedback of feedbacks) {
      const amount = parseFloat(feedback.transaction_amount) || 0
      const zScore = Math.abs((amount - amountMean) / amountStdDev)

      if (zScore > this.anomalyThreshold) {
        anomalies.push({
          anomalyId: `anomaly_${feedback.id}`,
          type: 'amount',
          description: `Transaction amount ${amount} SEK is ${zScore.toFixed(1)} standard deviations from mean`,
          severity: zScore > 4 ? 'critical' : zScore > 3 ? 'high' : 'medium',
          timestamp: new Date(feedback.created_at),
          relatedFeedbackIds: [feedback.id],
          fraudProbability: Math.min(0.2 + (zScore - this.anomalyThreshold) * 0.2, 0.95),
          recommendedAction: 'Review transaction for potential fraud'
        })
      }
    }

    // Detect timing anomalies
    const timingAnomalies = this.detectTimingAnomalies(feedbacks)
    anomalies.push(...timingAnomalies)

    // Detect behavioral anomalies
    const behavioralAnomalies = this.detectBehavioralAnomalies(feedbacks)
    anomalies.push(...behavioralAnomalies)

    return anomalies
  }

  /**
   * Extract key phrases from text
   */
  private extractKeyPhrases(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/)
    const phrases: string[] = []

    // Extract single important words
    const importantWords = words.filter(word =>
      word.length > 4 &&
      !this.isStopWord(word)
    )

    // Extract two-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      if (!this.isStopWord(words[i]) && !this.isStopWord(words[i + 1])) {
        phrases.push(`${words[i]} ${words[i + 1]}`)
      }
    }

    return Array.from(new Set([...importantWords, ...phrases]))
  }

  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'been',
      'och', 'i', 'på', 'för', 'med', 'av', 'till', 'en', 'ett', 'den', 'det',
      'är', 'var', 'har', 'hade', 'som'
    ])
    return stopWords.has(word.toLowerCase())
  }

  /**
   * Categorize a phrase
   */
  private categorizePhrase(phrase: string): string {
    const categories = {
      service: ['service', 'staff', 'employee', 'waiter', 'cashier'],
      quality: ['quality', 'good', 'bad', 'excellent', 'poor', 'fresh'],
      speed: ['fast', 'slow', 'quick', 'wait', 'time', 'long'],
      price: ['price', 'expensive', 'cheap', 'value', 'cost', 'money'],
      cleanliness: ['clean', 'dirty', 'hygiene', 'messy', 'spotless']
    }

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => phrase.includes(keyword))) {
        return category
      }
    }

    return 'general'
  }

  /**
   * Analyze sentiment of text
   */
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' | 'mixed' {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'perfect', 'bra', 'utmärkt', 'fantastisk']
    const negativeWords = ['bad', 'poor', 'terrible', 'worst', 'hate', 'awful', 'disgusting', 'dålig', 'hemsk', 'värdelös']

    const positiveCount = positiveWords.filter(word => text.toLowerCase().includes(word)).length
    const negativeCount = negativeWords.filter(word => text.toLowerCase().includes(word)).length

    if (positiveCount > 0 && negativeCount > 0) return 'mixed'
    if (positiveCount > negativeCount) return 'positive'
    if (negativeCount > positiveCount) return 'negative'
    return 'neutral'
  }

  /**
   * Calculate text similarity
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/))
    const words2 = new Set(text2.toLowerCase().split(/\s+/))

    const intersection = new Set(Array.from(words1).filter(x => words2.has(x)))
    const union = new Set([...Array.from(words1), ...Array.from(words2)])

    return intersection.size / union.size
  }

  /**
   * Extract common keywords from multiple texts
   */
  private extractCommonKeywords(texts: string[]): string[] {
    const wordFrequency = new Map<string, number>()

    for (const text of texts) {
      const words = text.toLowerCase().split(/\s+/)
      for (const word of words) {
        if (!this.isStopWord(word) && word.length > 3) {
          wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1)
        }
      }
    }

    // Return words that appear in at least half of the texts
    return Array.from(wordFrequency.entries())
      .filter(([_, freq]) => freq >= texts.length / 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word)
  }

  /**
   * Generate theme for a cluster
   */
  private async generateClusterTheme(keywords: string[], transcripts: string[]): Promise<string> {
    if (keywords.length === 0) return 'General feedback'

    // Use AI to generate a concise theme
    const prompt = `Based on these keywords: ${keywords.join(', ')}, generate a short theme (3-5 words) that describes the common topic.`

    try {
      const response = await openAIService.sendMessage(prompt, [])
      return response.content.trim()
    } catch {
      // Fallback to keyword-based theme
      return keywords.slice(0, 3).join(' and ')
    }
  }

  /**
   * Assess business impact of a cluster
   */
  private assessBusinessImpact(cluster: PatternCluster): string {
    const size = cluster.feedbackIds.length

    if (cluster.sentiment === 'negative' && size > 5) {
      return 'High negative impact - requires immediate attention'
    } else if (cluster.sentiment === 'positive' && size > 5) {
      return 'Positive impact - leverage for marketing'
    } else if (size > 10) {
      return 'Significant pattern - monitor closely'
    }

    return 'Minor impact - track for trends'
  }

  /**
   * Suggest action for a cluster
   */
  private suggestAction(cluster: PatternCluster): string {
    if (cluster.sentiment === 'negative') {
      if (cluster.commonKeywords.includes('service') || cluster.commonKeywords.includes('staff')) {
        return 'Review staff training and service procedures'
      } else if (cluster.commonKeywords.includes('quality')) {
        return 'Inspect product quality control processes'
      } else if (cluster.commonKeywords.includes('wait') || cluster.commonKeywords.includes('slow')) {
        return 'Optimize operational efficiency'
      }
    } else if (cluster.sentiment === 'positive') {
      return 'Share positive feedback with team and use for marketing'
    }

    return 'Monitor trend and gather more data'
  }

  /**
   * Analyze time-based patterns
   */
  private analyzeTimePatterns(feedbacks: any[]): FeedbackPattern[] {
    const patterns: FeedbackPattern[] = []
    const hourlyDistribution = new Map<number, number>()

    for (const feedback of feedbacks) {
      const hour = new Date(feedback.transaction_time).getHours()
      hourlyDistribution.set(hour, (hourlyDistribution.get(hour) || 0) + 1)
    }

    // Find peak hours
    const peakHours = Array.from(hourlyDistribution.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    if (peakHours.length > 0) {
      patterns.push({
        type: 'trend',
        category: 'temporal',
        description: `Peak feedback hours: ${peakHours.map(([h]) => `${h}:00`).join(', ')}`,
        frequency: peakHours[0][1],
        confidence: 0.8,
        examples: [],
        timeRange: {
          start: new Date(Math.min(...feedbacks.map(f => new Date(f.created_at).getTime()))),
          end: new Date(Math.max(...feedbacks.map(f => new Date(f.created_at).getTime())))
        }
      })
    }

    return patterns
  }

  /**
   * Analyze transaction patterns
   */
  private analyzeTransactionPatterns(feedbacks: any[]): FeedbackPattern[] {
    const patterns: FeedbackPattern[] = []
    const amounts = feedbacks.map(f => parseFloat(f.transaction_amount) || 0)

    // Find common transaction amounts
    const amountFrequency = new Map<number, number>()
    for (const amount of amounts) {
      const rounded = Math.round(amount / 10) * 10 // Round to nearest 10
      amountFrequency.set(rounded, (amountFrequency.get(rounded) || 0) + 1)
    }

    const commonAmounts = Array.from(amountFrequency.entries())
      .filter(([_, freq]) => freq >= this.minPatternFrequency)
      .sort((a, b) => b[1] - a[1])

    if (commonAmounts.length > 0) {
      patterns.push({
        type: 'recurring',
        category: 'transaction',
        description: `Common transaction amounts: ${commonAmounts.slice(0, 3).map(([amt]) => `${amt} SEK`).join(', ')}`,
        frequency: commonAmounts[0][1],
        confidence: 0.7,
        examples: [],
        timeRange: {
          start: new Date(Math.min(...feedbacks.map(f => new Date(f.created_at).getTime()))),
          end: new Date(Math.max(...feedbacks.map(f => new Date(f.created_at).getTime())))
        }
      })
    }

    return patterns
  }

  /**
   * Group feedbacks by week
   */
  private groupByWeek(feedbacks: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>()

    for (const feedback of feedbacks) {
      const week = `${feedback.year_number}-W${feedback.week_number}`
      if (!groups.has(week)) {
        groups.set(week, [])
      }
      groups.get(week)!.push(feedback)
    }

    return groups
  }

  /**
   * Analyze metric trend
   */
  private analyzeMetricTrend(
    weeklyGroups: Map<string, any[]>,
    metric: string,
    extractor: (feedback: any) => number
  ): TrendAnalysis | null {
    if (weeklyGroups.size < 2) return null

    const weeks = Array.from(weeklyGroups.keys()).sort()
    const values = weeks.map(week => {
      const feedbacks = weeklyGroups.get(week)!
      const sum = feedbacks.reduce((acc, f) => acc + extractor(f), 0)
      return sum / feedbacks.length
    })

    const currentValue = values[values.length - 1]
    const previousValue = values[values.length - 2]
    const changePercentage = ((currentValue - previousValue) / previousValue) * 100

    // Simple linear prediction
    const trend = (currentValue - previousValue) / previousValue
    const nextPeriodValue = currentValue * (1 + trend)

    return {
      trendType: changePercentage > 5 ? 'increasing' : changePercentage < -5 ? 'decreasing' : 'stable',
      metric,
      currentValue,
      previousValue,
      changePercentage,
      prediction: {
        nextPeriodValue,
        confidence: 0.6 // Simple prediction, low confidence
      }
    }
  }

  /**
   * Analyze sentiment trend
   */
  private analyzeSentimentTrend(weeklyGroups: Map<string, any[]>): TrendAnalysis | null {
    if (weeklyGroups.size < 2) return null

    const weeks = Array.from(weeklyGroups.keys()).sort()
    const sentimentScores = weeks.map(week => {
      const feedbacks = weeklyGroups.get(week)!
      const positiveCount = feedbacks.filter(f =>
        f.sentiment_score && f.sentiment_score > 60
      ).length
      return (positiveCount / feedbacks.length) * 100
    })

    const currentValue = sentimentScores[sentimentScores.length - 1]
    const previousValue = sentimentScores[sentimentScores.length - 2]

    return {
      trendType: currentValue > previousValue ? 'increasing' : 'decreasing',
      metric: 'positive_sentiment_percentage',
      currentValue,
      previousValue,
      changePercentage: ((currentValue - previousValue) / previousValue) * 100,
      prediction: {
        nextPeriodValue: currentValue,
        confidence: 0.5
      }
    }
  }

  /**
   * Detect timing anomalies
   */
  private detectTimingAnomalies(feedbacks: any[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = []

    // Check for after-hours transactions
    for (const feedback of feedbacks) {
      const hour = new Date(feedback.transaction_time).getHours()

      // Assuming most businesses operate 6 AM - 11 PM
      if (hour < 6 || hour > 23) {
        anomalies.push({
          anomalyId: `timing_${feedback.id}`,
          type: 'timing',
          description: `Transaction at unusual hour: ${hour}:00`,
          severity: 'medium',
          timestamp: new Date(feedback.transaction_time),
          relatedFeedbackIds: [feedback.id],
          fraudProbability: 0.4,
          recommendedAction: 'Verify if business operates at this hour'
        })
      }
    }

    return anomalies
  }

  /**
   * Detect behavioral anomalies
   */
  private detectBehavioralAnomalies(feedbacks: any[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = []
    const phoneFrequency = new Map<string, number>()

    // Count feedback frequency per phone number
    for (const feedback of feedbacks) {
      const phone = feedback.phone_last_four
      phoneFrequency.set(phone, (phoneFrequency.get(phone) || 0) + 1)
    }

    // Detect unusually high frequency
    for (const [phone, count] of Array.from(phoneFrequency.entries())) {
      if (count > 5) { // More than 5 feedbacks in the period
        anomalies.push({
          anomalyId: `behavior_${phone}_${Date.now()}`,
          type: 'behavior',
          description: `Phone ending in ${phone} submitted ${count} feedbacks`,
          severity: count > 10 ? 'high' : 'medium',
          timestamp: new Date(),
          relatedFeedbackIds: feedbacks
            .filter(f => f.phone_last_four === phone)
            .map(f => f.id),
          fraudProbability: Math.min(0.3 + (count - 5) * 0.1, 0.9),
          recommendedAction: 'Review for potential feedback manipulation'
        })
      }
    }

    return anomalies
  }

  /**
   * Store patterns for future reference
   */
  private async storePatterns(
    businessId: string,
    patterns: FeedbackPattern[],
    clusters: PatternCluster[],
    anomalies: AnomalyDetection[]
  ): Promise<void> {
    const supabase = await createClient()

    try {
      // Store in business_contexts as part of the learning history
      await supabase
        .from('business_contexts')
        .update({
          last_pattern_analysis: new Date().toISOString(),
          pattern_history: {
            timestamp: new Date().toISOString(),
            patterns: patterns.slice(0, 10), // Store top 10 patterns
            clusters: clusters.slice(0, 5), // Store top 5 clusters
            anomalies: anomalies.slice(0, 10) // Store top 10 anomalies
          }
        })
        .eq('business_id', businessId)
    } catch (error) {
      console.error('Error storing patterns:', error)
    }
  }
}

// Export singleton instance
export const patternRecognitionEngine = new PatternRecognitionEngine()

// Export types and class
export default PatternRecognitionEngine