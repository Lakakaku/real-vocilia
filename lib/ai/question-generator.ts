/**
 * AI-Powered Question Generator
 * Uses GPT-4o-mini to generate custom questions from business goals
 * Agent: ai-integration
 */

import { openAIService } from '@/lib/ai/openai-service'
import type {
  CustomQuestion,
  QuestionGenerationParams,
  QuestionSource,
  GENERATION_PROMPTS,
} from '@/types/custom-questions'
import type { BusinessContextData } from '@/lib/services/context-service'

export class QuestionGenerator {
  /**
   * Generate questions from business goals using AI
   */
  static async generateFromGoals(
    params: QuestionGenerationParams
  ): Promise<{ success: boolean; questions?: Partial<CustomQuestion>[]; error?: string }> {
    try {
      const prompt = this.buildGenerationPrompt(params)

      const response = await openAIService.sendMessage(
        prompt,
        [],
        {
          businessType: params.businessType,
          language: params.language,
          temperature: 0.8, // More creative for question generation
        }
      )

      if (response.error) {
        return { success: false, error: response.error }
      }

      const questions = this.parseGeneratedQuestions(response.content, params)

      if (questions.length === 0) {
        return { success: false, error: 'No valid questions generated' }
      }

      return { success: true, questions }
    } catch (error) {
      console.error('Error generating questions:', error)
      return { success: false, error: 'Failed to generate questions' }
    }
  }

  /**
   * Build prompt for question generation
   */
  private static buildGenerationPrompt(params: QuestionGenerationParams): string {
    const { businessGoals, businessType, existingQuestions, contextData, language, count } = params

    const existingQuestionTexts = existingQuestions.map(q => q.text).join('\n- ')

    let prompt = `You are an expert at creating engaging customer feedback questions for businesses.

Business Context:
- Type: ${businessType}
- Primary Goals: ${businessGoals.join(', ')}
- Language: ${language === 'sv' ? 'Swedish' : language === 'en' ? 'English' : 'Auto-detect based on business location'}

${contextData ? `Additional Context:
- Departments: ${contextData.departments?.join(', ') || 'Not specified'}
- Common Issues: ${contextData.commonIssues?.join(', ') || 'Not specified'}
- Business Specialty: ${contextData.businessSpecialty || 'Not specified'}
` : ''}

Existing Questions (avoid duplicates):
${existingQuestionTexts || 'No existing questions'}

Task: Generate ${count} custom questions that:
1. Directly address the business goals
2. Are specific and actionable
3. Encourage detailed responses
4. Are appropriate for the business type
5. Avoid yes/no questions when possible
6. Focus on gathering insights that can improve the business

For each question, provide:
- The question text (clear and concise, 30-100 characters ideal)
- The specific goal it addresses
- Why this question is valuable
- Suggested frequency (how often to ask: every 5th, 10th, 20th customer, etc.)
- Best timing (greeting, middle, or closing of conversation)

${language === 'sv' ? 'Provide questions in Swedish with English translations.' : ''}

Format your response as a numbered list with each question structured as:
[Question Number]
Text: [Question text]
Goal: [Which business goal this addresses]
Value: [Why this question is valuable]
Frequency: [Suggested frequency]
Timing: [Best point in conversation]
${language === 'sv' ? 'English: [English translation]' : ''}

Focus on quality over quantity. Each question should provide unique value.`

    return prompt
  }

  /**
   * Parse AI-generated questions from response
   */
  private static parseGeneratedQuestions(
    aiResponse: string,
    params: QuestionGenerationParams
  ): Partial<CustomQuestion>[] {
    const questions: Partial<CustomQuestion>[] = []

    // Split response into question blocks
    const questionBlocks = aiResponse.split(/\[\d+\]|\d+\./).filter(block => block.trim())

    for (const block of questionBlocks) {
      const question = this.parseQuestionBlock(block, params)
      if (question) {
        questions.push(question)
      }
    }

    return questions
  }

  /**
   * Parse individual question block
   */
  private static parseQuestionBlock(
    block: string,
    params: QuestionGenerationParams
  ): Partial<CustomQuestion> | null {
    try {
      const lines = block.split('\n').map(line => line.trim()).filter(line => line)

      let text = ''
      let textSv = ''
      let goal = ''
      let frequency = 10
      let timing = 'middle'

      for (const line of lines) {
        if (line.toLowerCase().startsWith('text:')) {
          text = line.substring(5).trim()
        } else if (line.toLowerCase().startsWith('goal:')) {
          goal = line.substring(5).trim()
        } else if (line.toLowerCase().startsWith('frequency:')) {
          const freqMatch = line.match(/\d+/)
          if (freqMatch) {
            frequency = parseInt(freqMatch[0])
          }
        } else if (line.toLowerCase().startsWith('timing:')) {
          const timingText = line.substring(7).trim().toLowerCase()
          if (timingText.includes('greeting') || timingText.includes('start')) {
            timing = 'greeting'
          } else if (timingText.includes('closing') || timingText.includes('end')) {
            timing = 'closing'
          } else {
            timing = 'middle'
          }
        } else if (line.toLowerCase().startsWith('english:') && params.language === 'sv') {
          textSv = text // The main text is in Swedish
          text = line.substring(8).trim() // English translation
        }
      }

      if (!text) return null

      // Ensure question ends with question mark
      if (!text.endsWith('?')) {
        text += '?'
      }
      if (textSv && !textSv.endsWith('?')) {
        textSv += '?'
      }

      // Map goal to actual business goal if possible
      const matchedGoal = params.businessGoals.find(g =>
        goal.toLowerCase().includes(g.toLowerCase())
      )

      return {
        text: params.language === 'sv' && textSv ? textSv : text,
        textSv: params.language === 'sv' ? text : undefined, // Store English as translation
        frequency: {
          type: 'every_nth',
          value: Math.min(Math.max(frequency, 5), 50), // Clamp between 5 and 50
        },
        targeting: {
          stores: 'all',
        },
        seasonal: {
          enabled: false,
        },
        priority: timing === 'greeting' ? 8 : timing === 'closing' ? 6 : 7,
        status: 'draft', // Start as draft for review
        source: 'ai_generated' as QuestionSource,
        generatedFromGoal: matchedGoal || goal,
        metadata: {
          category: this.inferCategory(text),
          followUpEnabled: true,
          expectedResponseType: 'text',
        },
      }
    } catch (error) {
      console.error('Error parsing question block:', error)
      return null
    }
  }

  /**
   * Infer question category from text
   */
  private static inferCategory(questionText: string): string {
    const text = questionText.toLowerCase()

    if (text.includes('service') || text.includes('staff') || text.includes('help')) {
      return 'service_quality'
    }
    if (text.includes('product') || text.includes('item') || text.includes('quality')) {
      return 'product_feedback'
    }
    if (text.includes('wait') || text.includes('time') || text.includes('quick')) {
      return 'wait_times'
    }
    if (text.includes('clean') || text.includes('hygiene') || text.includes('tidy')) {
      return 'cleanliness_hygiene'
    }
    if (text.includes('price') || text.includes('value') || text.includes('cost')) {
      return 'pricing_value'
    }
    if (text.includes('recommend') || text.includes('suggest')) {
      return 'recommendations'
    }
    if (text.includes('offer') || text.includes('deal') || text.includes('promotion')) {
      return 'special_offers'
    }

    return 'general_satisfaction'
  }

  /**
   * Generate seasonal questions
   */
  static async generateSeasonalQuestions(
    businessType: string,
    season: 'summer' | 'winter' | 'spring' | 'fall' | 'holiday',
    existingQuestions: CustomQuestion[]
  ): Promise<{ success: boolean; questions?: Partial<CustomQuestion>[]; error?: string }> {
    const seasonalPrompt = `Generate 3 seasonal questions for a ${businessType} business during ${season}.

Focus on:
- Seasonal products or services
- Weather-related customer needs
- Holiday shopping patterns (if applicable)
- Seasonal staffing or hours
- Special events or promotions

Existing questions to avoid duplicating:
${existingQuestions.map(q => q.text).join('\n')}

Format each question with:
- Text: [Question]
- Reason: [Why this is relevant for the season]
- Duration: [How long this question should be active]`

    const response = await openAIService.sendMessage(
      seasonalPrompt,
      [],
      { temperature: 0.8 }
    )

    if (response.error) {
      return { success: false, error: response.error }
    }

    const questions = this.parseSeasonalQuestions(response.content, season)
    return { success: true, questions }
  }

  /**
   * Parse seasonal questions from AI response
   */
  private static parseSeasonalQuestions(
    aiResponse: string,
    season: string
  ): Partial<CustomQuestion>[] {
    const questions: Partial<CustomQuestion>[] = []
    const blocks = aiResponse.split(/\n\n/).filter(block => block.trim())

    for (const block of blocks) {
      const lines = block.split('\n').map(line => line.trim())
      let text = ''
      let duration = 30 // Default 30 days

      for (const line of lines) {
        if (line.toLowerCase().startsWith('text:')) {
          text = line.substring(5).trim()
        } else if (line.toLowerCase().startsWith('duration:')) {
          const durationMatch = line.match(/\d+/)
          if (durationMatch) {
            duration = parseInt(durationMatch[0])
          }
        }
      }

      if (text) {
        const now = new Date()
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + duration)

        questions.push({
          text,
          frequency: {
            type: 'every_nth',
            value: 10,
          },
          targeting: {
            stores: 'all',
          },
          seasonal: {
            enabled: true,
            startDate: now.toISOString(),
            endDate: endDate.toISOString(),
            recurring: false,
          },
          priority: 7,
          status: 'draft',
          source: 'ai_generated' as QuestionSource,
          metadata: {
            category: 'special_offers',
            followUpEnabled: true,
          },
        })
      }
    }

    return questions
  }

  /**
   * Suggest improvements to existing questions
   */
  static async improveQuestion(
    question: CustomQuestion,
    analytics: QuestionAnalytics
  ): Promise<{ success: boolean; suggestion?: string; improvedText?: string; error?: string }> {
    const prompt = `Analyze this customer feedback question and suggest improvements:

Current Question: "${question.text}"

Performance Metrics:
- Response Rate: ${analytics.metrics.timesAnswered}/${analytics.metrics.timesAsked} (${(analytics.metrics.timesAnswered / analytics.metrics.timesAsked * 100).toFixed(1)}%)
- Average Response Length: ${analytics.metrics.avgResponseLength} characters
- Quality Impact: ${analytics.metrics.qualityImpact > 0 ? '+' : ''}${analytics.metrics.qualityImpact}%
- Insights Generated: ${analytics.metrics.insightsGenerated}

Current Issues:
${analytics.recommendations.reason}

Task:
1. Explain why the current question might be underperforming
2. Suggest a revised version that would get better responses
3. Provide 2-3 alternative phrasings
4. Recommend optimal frequency and timing

Keep the improved question concise (30-100 characters ideal) and action-oriented.`

    const response = await openAIService.sendMessage(prompt, [], { temperature: 0.7 })

    if (response.error) {
      return { success: false, error: response.error }
    }

    // Extract improved question from response
    const improvedMatch = response.content.match(/["""]([^"""]+)["""]/g)
    const improvedText = improvedMatch && improvedMatch[0]
      ? improvedMatch[0].replace(/["""]/g, '')
      : null

    return {
      success: true,
      suggestion: response.content,
      improvedText: improvedText || undefined,
    }
  }

  /**
   * Generate follow-up questions based on initial response
   */
  static async generateFollowUp(
    initialQuestion: string,
    initialResponse: string,
    businessContext: BusinessContextData
  ): Promise<{ success: boolean; followUp?: string; error?: string }> {
    const prompt = `Generate a natural follow-up question based on this customer feedback:

Initial Question: "${initialQuestion}"
Customer Response: "${initialResponse}"

Business Context:
- Type: ${businessContext.businessType}
- Key Areas: ${businessContext.departments?.join(', ') || 'General'}

Generate ONE follow-up question that:
1. Naturally flows from their response
2. Digs deeper into specifics
3. Is conversational and friendly
4. Helps gather actionable insights
5. Is short and focused (max 100 characters)

Respond with just the follow-up question, nothing else.`

    const response = await openAIService.sendMessage(
      prompt,
      [],
      { temperature: 0.7, maxTokens: 50 }
    )

    if (response.error) {
      return { success: false, error: response.error }
    }

    return { success: true, followUp: response.content.trim() }
  }
}