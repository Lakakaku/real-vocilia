/**
 * Voice Question Injector Service
 * Integrates custom questions into voice AI conversations
 * Agent: ai-integration
 */

import { CustomQuestionsService } from '@/lib/services/custom-questions-service'
import { QuestionGenerator } from '@/lib/ai/question-generator'
import type {
  CustomQuestion,
  VoiceQuestionInjection,
  QuestionSchedule
} from '@/types/custom-questions'
import type { BusinessContextData } from '@/lib/services/context-service'

export class VoiceQuestionInjector {
  /**
   * Get questions to inject for a customer session
   */
  static async getQuestionsForSession(
    businessId: string,
    customerId: string,
    storeId: string,
    sessionContext: {
      transactionAmount?: number
      timeOfDay: string
      dayOfWeek: number
      isFirstTime?: boolean
    }
  ): Promise<CustomQuestion[]> {
    // Get scheduled questions
    const schedule = await CustomQuestionsService.getScheduledQuestions(
      businessId,
      customerId,
      storeId
    )

    // Get the actual questions
    const allQuestions = await CustomQuestionsService.getQuestions(businessId)

    // Filter to scheduled questions
    const scheduledQuestions = schedule.scheduledQuestions
      .map(sq => allQuestions.find(q => q.id === sq.questionId))
      .filter(Boolean) as CustomQuestion[]

    // Apply contextual filtering
    return this.filterByContext(scheduledQuestions, sessionContext)
  }

  /**
   * Filter questions based on session context
   */
  private static filterByContext(
    questions: CustomQuestion[],
    context: {
      transactionAmount?: number
      timeOfDay: string
      dayOfWeek: number
      isFirstTime?: boolean
    }
  ): CustomQuestion[] {
    return questions.filter(question => {
      // Check time of day
      if (question.targeting.timeOfDay) {
        const currentTime = context.timeOfDay
        const { start, end } = question.targeting.timeOfDay
        if (currentTime < start || currentTime > end) {
          return false
        }
      }

      // Check day of week
      if (question.targeting.daysOfWeek) {
        if (!question.targeting.daysOfWeek.includes(context.dayOfWeek)) {
          return false
        }
      }

      // Check seasonal activation
      if (question.seasonal.enabled) {
        const now = new Date()
        if (question.seasonal.startDate) {
          const start = new Date(question.seasonal.startDate)
          if (now < start) return false
        }
        if (question.seasonal.endDate) {
          const end = new Date(question.seasonal.endDate)
          if (now > end) return false
        }
      }

      return true
    })
  }

  /**
   * Determine optimal injection point for a question
   */
  static determineInjectionPoint(
    question: CustomQuestion,
    conversationPhase: 'greeting' | 'middle' | 'closing'
  ): 'greeting' | 'middle' | 'closing' {
    // High priority questions go early
    if (question.priority >= 8) {
      return 'greeting'
    }

    // Low priority questions go at the end
    if (question.priority <= 3) {
      return 'closing'
    }

    // Special categories have preferred timing
    if (question.metadata?.category) {
      switch (question.metadata.category) {
        case 'general_satisfaction':
        case 'store_experience':
          return 'greeting'
        case 'recommendations':
        case 'special_offers':
          return 'closing'
        default:
          return 'middle'
      }
    }

    return conversationPhase
  }

  /**
   * Inject question into conversation naturally
   */
  static async injectQuestion(
    question: CustomQuestion,
    conversationHistory: string[],
    language: 'en' | 'sv' = 'en'
  ): Promise<{
    success: boolean
    injectedText: string
    naturalTransition?: string
  }> {
    try {
      // Get the question text in the appropriate language
      const questionText = language === 'sv' && question.textSv
        ? question.textSv
        : question.text

      // Generate natural transition if needed
      const naturalTransition = await this.generateNaturalTransition(
        conversationHistory[conversationHistory.length - 1] || '',
        questionText
      )

      const injectedText = naturalTransition
        ? `${naturalTransition} ${questionText}`
        : questionText

      return {
        success: true,
        injectedText,
        naturalTransition: naturalTransition || undefined,
      }
    } catch (error) {
      console.error('Error injecting question:', error)
      return {
        success: false,
        injectedText: question.text,
      }
    }
  }

  /**
   * Generate natural transition to custom question
   */
  private static async generateNaturalTransition(
    previousStatement: string,
    upcomingQuestion: string
  ): Promise<string | null> {
    // Simple transitions based on context
    const transitions = [
      'By the way,',
      'I also wanted to ask,',
      'One more thing -',
      'Quick question for you:',
      'Speaking of that,',
      'On a related note,',
    ]

    // If previous statement is empty (start of conversation)
    if (!previousStatement) {
      return null
    }

    // Random selection for now, could use AI for better transitions
    return transitions[Math.floor(Math.random() * transitions.length)]
  }

  /**
   * Process response to custom question
   */
  static async processQuestionResponse(
    businessId: string,
    injection: VoiceQuestionInjection,
    responseText: string,
    sentiment: 'positive' | 'neutral' | 'negative',
    businessContext?: BusinessContextData
  ): Promise<{
    success: boolean
    followUp?: string
    qualityBoost?: number
  }> {
    try {
      // Calculate quality boost based on response
      const qualityBoost = this.calculateQualityBoost(responseText, sentiment)

      // Update question effectiveness
      await CustomQuestionsService.updateEffectiveness(
        businessId,
        injection.question.id,
        {
          answered: true,
          sentiment,
          qualityBoost,
        }
      )

      // Generate follow-up if enabled
      let followUp: string | undefined

      if (injection.question.metadata?.followUpEnabled && responseText.length > 20) {
        const followUpResult = await QuestionGenerator.generateFollowUp(
          injection.question.text,
          responseText,
          businessContext || {} as BusinessContextData
        )

        if (followUpResult.success) {
          followUp = followUpResult.followUp
        }
      }

      return {
        success: true,
        followUp,
        qualityBoost,
      }
    } catch (error) {
      console.error('Error processing question response:', error)
      return { success: false }
    }
  }

  /**
   * Calculate quality boost from response
   */
  private static calculateQualityBoost(
    responseText: string,
    sentiment: 'positive' | 'neutral' | 'negative'
  ): number {
    let boost = 0

    // Length factor (longer responses = more detail)
    if (responseText.length > 100) boost += 5
    else if (responseText.length > 50) boost += 3
    else if (responseText.length > 20) boost += 1

    // Sentiment factor
    if (sentiment === 'positive') boost += 3
    else if (sentiment === 'negative') boost += 2 // Negative feedback is valuable

    // Specificity indicators
    const specificityMarkers = [
      'specifically',
      'exactly',
      'particularly',
      'for example',
      'such as',
      'because',
    ]

    const hasSpecificity = specificityMarkers.some(marker =>
      responseText.toLowerCase().includes(marker)
    )

    if (hasSpecificity) boost += 3

    // Cap at reasonable maximum
    return Math.min(boost, 15)
  }

  /**
   * Track injection for analytics
   */
  static async trackInjection(
    injection: VoiceQuestionInjection
  ): Promise<void> {
    // In production, this would send to analytics service
    console.log('Question injected:', {
      questionId: injection.question.id,
      sessionId: injection.sessionId,
      injectionPoint: injection.injectionPoint,
      timestamp: injection.injectedAt,
    })
  }

  /**
   * Get injection statistics for reporting
   */
  static async getInjectionStats(
    businessId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<{
    totalInjections: number
    successfulResponses: number
    averageQualityBoost: number
    topPerformingQuestions: CustomQuestion[]
  }> {
    // This would query actual analytics data in production
    const questions = await CustomQuestionsService.getQuestions(businessId)

    // Sort by effectiveness
    const topPerformingQuestions = questions
      .filter(q => q.effectiveness.totalResponses > 0)
      .sort((a, b) => b.effectiveness.responseRate - a.effectiveness.responseRate)
      .slice(0, 5)

    const totalInjections = questions.reduce(
      (sum, q) => sum + q.effectiveness.totalResponses,
      0
    )

    const successfulResponses = questions.reduce(
      (sum, q) => sum + Math.floor(q.effectiveness.totalResponses * q.effectiveness.responseRate),
      0
    )

    const averageQualityBoost = questions.reduce(
      (sum, q) => sum + q.effectiveness.avgQualityBoost,
      0
    ) / (questions.length || 1)

    return {
      totalInjections,
      successfulResponses,
      averageQualityBoost,
      topPerformingQuestions,
    }
  }

  /**
   * Optimize question scheduling based on performance
   */
  static async optimizeScheduling(
    businessId: string
  ): Promise<{
    recommendations: Array<{
      questionId: string
      currentFrequency: number
      recommendedFrequency: number
      reason: string
    }>
  }> {
    const questions = await CustomQuestionsService.getQuestions(businessId)
    const recommendations: any[] = []

    for (const question of questions) {
      if (question.effectiveness.totalResponses < 10) {
        continue // Not enough data
      }

      const responseRate = question.effectiveness.responseRate

      if (responseRate < 0.3 && question.frequency.type === 'every_nth') {
        recommendations.push({
          questionId: question.id,
          currentFrequency: question.frequency.value,
          recommendedFrequency: Math.min(question.frequency.value * 2, 50),
          reason: 'Low response rate - reduce frequency to improve quality',
        })
      } else if (responseRate > 0.8 && question.frequency.type === 'every_nth') {
        recommendations.push({
          questionId: question.id,
          currentFrequency: question.frequency.value,
          recommendedFrequency: Math.max(question.frequency.value / 2, 5),
          reason: 'High response rate - can increase frequency for more data',
        })
      }
    }

    return { recommendations }
  }
}