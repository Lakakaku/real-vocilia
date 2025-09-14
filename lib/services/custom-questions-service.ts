/**
 * Custom Questions Service
 * Handles business logic for custom question management
 * Agent: business-onboarding
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type {
  CustomQuestion,
  QuestionFormData,
  QuestionValidationResult,
  QuestionSchedule,
  QuestionFrequency,
  QUESTION_LIMITS,
  QuestionAnalytics,
} from '@/types/custom-questions'

export class CustomQuestionsService {
  /**
   * Get all custom questions for a business
   */
  static async getQuestions(businessId: string): Promise<CustomQuestion[]> {
    const supabase = createClientComponentClient()

    const { data: context } = await supabase
      .from('business_contexts')
      .select('custom_questions')
      .eq('business_id', businessId)
      .single()

    if (!context?.custom_questions) {
      return []
    }

    // Ensure questions have all required fields
    return (context.custom_questions as any[]).map(q => ({
      ...this.getDefaultQuestion(),
      ...q,
    }))
  }

  /**
   * Add a new custom question
   */
  static async addQuestion(
    businessId: string,
    questionData: QuestionFormData
  ): Promise<{ success: boolean; question?: CustomQuestion; error?: string }> {
    try {
      // Validate question
      const validation = await this.validateQuestion(questionData)
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') }
      }

      // Get existing questions
      const existingQuestions = await this.getQuestions(businessId)

      // Check limits
      if (existingQuestions.length >= 20) {
        return { success: false, error: 'Maximum number of questions reached (20)' }
      }

      const activeQuestions = existingQuestions.filter(q => q.status === 'active')
      if (activeQuestions.length >= 10 && questionData.text) {
        return { success: false, error: 'Maximum number of active questions reached (10)' }
      }

      // Create new question
      const newQuestion: CustomQuestion = {
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: questionData.text,
        textSv: questionData.textSv,
        frequency: {
          type: questionData.frequencyType,
          value: questionData.frequencyValue,
          currentCount: 0,
        },
        targeting: {
          stores: questionData.stores,
        },
        seasonal: {
          enabled: questionData.seasonalEnabled,
          startDate: questionData.seasonalStart?.toISOString(),
          endDate: questionData.seasonalEnd?.toISOString(),
          recurring: questionData.seasonalRecurring,
        },
        priority: questionData.priority,
        status: 'active',
        source: 'manual',
        effectiveness: {
          responseRate: 0,
          avgQualityBoost: 0,
          totalResponses: 0,
          sentiment: { positive: 0, neutral: 0, negative: 0 },
        },
        metadata: {
          category: questionData.category,
          followUpEnabled: questionData.followUpEnabled,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: businessId,
      }

      // Update database
      const updatedQuestions = [...existingQuestions, newQuestion]
      const supabase = createClientComponentClient()

      const { error } = await supabase
        .from('business_contexts')
        .update({
          custom_questions: updatedQuestions,
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', businessId)

      if (error) {
        console.error('Error adding question:', error)
        return { success: false, error: 'Failed to save question' }
      }

      return { success: true, question: newQuestion }
    } catch (error) {
      console.error('Error in addQuestion:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  /**
   * Update an existing question
   */
  static async updateQuestion(
    businessId: string,
    questionId: string,
    updates: Partial<CustomQuestion>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const questions = await this.getQuestions(businessId)
      const questionIndex = questions.findIndex(q => q.id === questionId)

      if (questionIndex === -1) {
        return { success: false, error: 'Question not found' }
      }

      // Update question
      questions[questionIndex] = {
        ...questions[questionIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
        lastModifiedBy: businessId,
      }

      // Save to database
      const supabase = createClientComponentClient()
      const { error } = await supabase
        .from('business_contexts')
        .update({
          custom_questions: questions,
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', businessId)

      if (error) {
        console.error('Error updating question:', error)
        return { success: false, error: 'Failed to update question' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in updateQuestion:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  /**
   * Delete a question
   */
  static async deleteQuestion(
    businessId: string,
    questionId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const questions = await this.getQuestions(businessId)
      const filteredQuestions = questions.filter(q => q.id !== questionId)

      if (filteredQuestions.length === questions.length) {
        return { success: false, error: 'Question not found' }
      }

      // Save to database
      const supabase = createClientComponentClient()
      const { error } = await supabase
        .from('business_contexts')
        .update({
          custom_questions: filteredQuestions,
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', businessId)

      if (error) {
        console.error('Error deleting question:', error)
        return { success: false, error: 'Failed to delete question' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in deleteQuestion:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  /**
   * Reorder questions by priority
   */
  static async reorderQuestions(
    businessId: string,
    questionIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const questions = await this.getQuestions(businessId)

      // Create a map for quick lookup
      const questionMap = new Map(questions.map(q => [q.id, q]))

      // Update priorities based on new order
      const reorderedQuestions = questionIds.map((id, index) => {
        const question = questionMap.get(id)
        if (question) {
          return {
            ...question,
            priority: questionIds.length - index, // Higher index = lower priority
            updatedAt: new Date().toISOString(),
          }
        }
        return null
      }).filter(Boolean) as CustomQuestion[]

      // Add any questions not in the reorder list at the end
      const remainingQuestions = questions.filter(
        q => !questionIds.includes(q.id)
      )

      const allQuestions = [...reorderedQuestions, ...remainingQuestions]

      // Save to database
      const supabase = createClientComponentClient()
      const { error } = await supabase
        .from('business_contexts')
        .update({
          custom_questions: allQuestions,
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', businessId)

      if (error) {
        console.error('Error reordering questions:', error)
        return { success: false, error: 'Failed to reorder questions' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error in reorderQuestions:', error)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  /**
   * Validate a question
   */
  static async validateQuestion(
    questionData: QuestionFormData
  ): Promise<QuestionValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // Text validation
    if (!questionData.text || questionData.text.trim().length < 10) {
      errors.push('Question text must be at least 10 characters')
    }
    if (questionData.text && questionData.text.length > 200) {
      errors.push('Question text must be less than 200 characters')
    }

    // Check for question mark
    if (questionData.text && !questionData.text.includes('?')) {
      warnings.push('Questions should typically end with a question mark')
    }

    // Frequency validation
    if (questionData.frequencyValue < 1 || questionData.frequencyValue > 100) {
      errors.push('Frequency value must be between 1 and 100')
    }

    // Priority validation
    if (questionData.priority < 1 || questionData.priority > 10) {
      errors.push('Priority must be between 1 and 10')
    }

    // Seasonal validation
    if (questionData.seasonalEnabled) {
      if (!questionData.seasonalStart || !questionData.seasonalEnd) {
        errors.push('Seasonal questions require both start and end dates')
      } else if (questionData.seasonalStart >= questionData.seasonalEnd) {
        errors.push('End date must be after start date')
      }
    }

    // Calculate quality score
    let qualityScore = 100
    qualityScore -= errors.length * 20
    qualityScore -= warnings.length * 10
    qualityScore = Math.max(0, qualityScore)

    // Add suggestions
    if (questionData.text && questionData.text.length < 30) {
      suggestions.push('Consider adding more detail to get better responses')
    }
    if (questionData.frequencyType === 'every_nth' && questionData.frequencyValue > 50) {
      suggestions.push('High frequency values may result in fewer responses')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      qualityScore,
    }
  }

  /**
   * Get questions scheduled for a customer
   */
  static async getScheduledQuestions(
    businessId: string,
    customerId: string,
    storeId: string
  ): Promise<QuestionSchedule> {
    const questions = await this.getQuestions(businessId)

    // Filter active questions for this store
    const eligibleQuestions = questions.filter(q => {
      if (q.status !== 'active') return false
      if (q.targeting.stores !== 'all' && !q.targeting.stores.includes(storeId)) return false

      // Check seasonal activation
      if (q.seasonal.enabled) {
        const now = new Date()
        const start = q.seasonal.startDate ? new Date(q.seasonal.startDate) : null
        const end = q.seasonal.endDate ? new Date(q.seasonal.endDate) : null

        if (start && now < start) return false
        if (end && now > end) return false
      }

      return true
    })

    // Sort by priority
    eligibleQuestions.sort((a, b) => b.priority - a.priority)

    // Select questions based on frequency
    const scheduledQuestions = eligibleQuestions
      .filter(q => this.shouldAskQuestion(q))
      .slice(0, 3) // Max 3 questions per session
      .map(q => ({
        questionId: q.id,
        scheduledFor: new Date().toISOString(),
        reason: `Priority: ${q.priority}, Frequency: every ${q.frequency.value}`,
      }))

    return {
      customerId,
      storeId,
      scheduledQuestions,
    }
  }

  /**
   * Check if a question should be asked based on frequency
   */
  private static shouldAskQuestion(question: CustomQuestion): boolean {
    const freq = question.frequency

    switch (freq.type) {
      case 'every_nth':
        // Increment counter and check if it's time
        const currentCount = (freq.currentCount || 0) + 1
        return currentCount >= freq.value

      case 'percentage':
        // Random chance based on percentage
        return Math.random() * 100 < freq.value

      case 'fixed':
        // Check if we've asked enough today
        // This would need to check a daily counter in the database
        return true // Simplified for now

      default:
        return false
    }
  }

  /**
   * Get default question structure
   */
  private static getDefaultQuestion(): Partial<CustomQuestion> {
    return {
      frequency: { type: 'every_nth', value: 10, currentCount: 0 },
      targeting: { stores: 'all' },
      seasonal: { enabled: false },
      priority: 5,
      status: 'active',
      source: 'manual',
      effectiveness: {
        responseRate: 0,
        avgQualityBoost: 0,
        totalResponses: 0,
        sentiment: { positive: 0, neutral: 0, negative: 0 },
      },
      metadata: {},
    }
  }

  /**
   * Update question effectiveness metrics
   */
  static async updateEffectiveness(
    businessId: string,
    questionId: string,
    response: {
      answered: boolean
      sentiment?: 'positive' | 'neutral' | 'negative'
      qualityBoost?: number
    }
  ): Promise<void> {
    const questions = await this.getQuestions(businessId)
    const question = questions.find(q => q.id === questionId)

    if (!question) return

    // Update effectiveness metrics
    const totalResponses = question.effectiveness.totalResponses + 1
    const responseRate = response.answered
      ? ((question.effectiveness.responseRate * question.effectiveness.totalResponses) + 1) / totalResponses
      : (question.effectiveness.responseRate * question.effectiveness.totalResponses) / totalResponses

    if (response.answered && response.sentiment) {
      question.effectiveness.sentiment[response.sentiment]++
    }

    if (response.qualityBoost !== undefined) {
      question.effectiveness.avgQualityBoost =
        ((question.effectiveness.avgQualityBoost * question.effectiveness.totalResponses) + response.qualityBoost) / totalResponses
    }

    question.effectiveness.totalResponses = totalResponses
    question.effectiveness.responseRate = responseRate
    question.effectiveness.lastAskedAt = new Date().toISOString()

    // Update frequency counter if needed
    if (question.frequency.type === 'every_nth') {
      question.frequency.currentCount = response.answered ? 0 : (question.frequency.currentCount || 0) + 1
    }

    await this.updateQuestion(businessId, questionId, question)
  }
}