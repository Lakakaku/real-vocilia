/**
 * OpenAI Service - GPT-4o-mini integration for AI Context Assistant
 * Handles all OpenAI API interactions with error handling and retry logic
 */

import OpenAI from 'openai'
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

export interface AIServiceConfig {
  apiKey?: string
  model?: string
  temperature?: number
  maxTokens?: number
  retryAttempts?: number
  retryDelay?: number
}

export interface AIResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    estimatedCost: number
  }
  error?: string
}

export interface ConversationContext {
  businessType?: string
  language?: 'sv' | 'en' | 'auto'
  businessName?: string
  contextData?: any
}

class OpenAIService {
  private client: OpenAI | null = null
  private config: AIServiceConfig
  private initialized = false

  constructor(config: AIServiceConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      model: config.model || 'gpt-4o-mini',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens || 1000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
    }
  }

  /**
   * Initialize the OpenAI client
   */
  private initialize(): void {
    if (this.initialized) return

    if (!this.config.apiKey || this.config.apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
      console.error('OpenAI API key not configured')
      this.client = null
      return
    }

    try {
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
      })
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize OpenAI client:', error)
      this.client = null
    }
  }

  /**
   * Send a message to GPT-4o-mini with context
   */
  async sendMessage(
    message: string,
    conversationHistory: ChatCompletionMessageParam[] = [],
    context?: ConversationContext
  ): Promise<AIResponse> {
    this.initialize()

    if (!this.client) {
      return {
        content: this.getFallbackResponse(message, context?.language),
        error: 'AI service is temporarily unavailable. Please try again later.',
      }
    }

    const systemPrompt = this.buildSystemPrompt(context)
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message },
    ]

    let lastError: Error | null = null

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt < this.config.retryAttempts!; attempt++) {
      try {
        const completion = await this.client.chat.completions.create({
          model: this.config.model!,
          messages,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        })

        const responseContent = completion.choices[0]?.message?.content || ''
        const usage = completion.usage

        return {
          content: responseContent,
          usage: usage ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
            estimatedCost: this.calculateCost(usage.prompt_tokens, usage.completion_tokens),
          } : undefined,
        }
      } catch (error: any) {
        lastError = error
        console.error(`OpenAI API attempt ${attempt + 1} failed:`, error.message)

        // Handle rate limiting
        if (error.status === 429) {
          const retryAfter = error.headers?.['retry-after']
            ? parseInt(error.headers['retry-after']) * 1000
            : this.config.retryDelay! * Math.pow(2, attempt)

          await this.delay(retryAfter)
          continue
        }

        // Handle other errors
        if (attempt < this.config.retryAttempts! - 1) {
          await this.delay(this.config.retryDelay! * Math.pow(2, attempt))
        }
      }
    }

    // All retries failed
    return {
      content: this.getFallbackResponse(message, context?.language),
      error: `AI service error: ${lastError?.message || 'Unknown error'}`,
    }
  }

  /**
   * Build system prompt based on context
   */
  private buildSystemPrompt(context?: ConversationContext): string {
    const language = context?.language || 'auto'
    const businessType = context?.businessType || 'general business'
    const businessName = context?.businessName || 'the business'

    let prompt = `You are an AI assistant for Vocilia, helping ${businessName} build comprehensive business context for improved fraud detection and feedback analysis.

Key responsibilities:
1. Help businesses describe their operations, products, and services
2. Identify potential fraud patterns specific to their industry
3. Suggest relevant custom questions for customer feedback
4. Guide them to reach 85% context completeness

Business type: ${businessType}
Language preference: ${language === 'auto' ? 'Respond in the same language as the user input (Swedish or English)' : language === 'sv' ? 'Respond in Swedish' : 'Respond in English'}

Guidelines:
- Be conversational and helpful
- Ask specific, relevant questions about their business
- Suggest concrete improvements to their context
- Focus on fraud detection patterns for their industry
- Provide examples when helpful
- Keep responses concise but informative`

    if (context?.contextData) {
      prompt += `\n\nCurrent context data:\n${JSON.stringify(context.contextData, null, 2)}`
    }

    return prompt
  }

  /**
   * Get fallback response when AI is unavailable
   */
  private getFallbackResponse(message: string, language?: 'sv' | 'en' | 'auto'): string {
    const isSwedish = language === 'sv' || (language === 'auto' && this.detectSwedish(message))

    if (isSwedish) {
      return 'AI-assistenten är tillfälligt otillgänglig. Vänligen försök igen om några minuter eller fortsätt att bygga din kontext manuellt.'
    } else {
      return 'The AI assistant is temporarily unavailable. Please try again in a few minutes or continue building your context manually.'
    }
  }

  /**
   * Simple Swedish language detection
   */
  private detectSwedish(text: string): boolean {
    const swedishIndicators = ['är', 'och', 'att', 'det', 'jag', 'för', 'på', 'med', 'har', 'kan', 'vill', 'ska']
    const lowercaseText = text.toLowerCase()
    return swedishIndicators.some(word => lowercaseText.includes(word))
  }

  /**
   * Calculate estimated cost for API usage
   */
  private calculateCost(promptTokens: number, completionTokens: number): number {
    // GPT-4o-mini pricing (as of 2024)
    const promptCostPer1k = 0.00015 // $0.15 per 1M tokens
    const completionCostPer1k = 0.0006 // $0.60 per 1M tokens

    const promptCost = (promptTokens / 1000) * promptCostPer1k
    const completionCost = (completionTokens / 1000) * completionCostPer1k

    return promptCost + completionCost
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Stream a response (for future real-time chat implementation)
   */
  async streamMessage(
    message: string,
    conversationHistory: ChatCompletionMessageParam[] = [],
    context?: ConversationContext,
    onChunk?: (chunk: string) => void
  ): Promise<AIResponse> {
    this.initialize()

    if (!this.client) {
      return {
        content: this.getFallbackResponse(message, context?.language),
        error: 'AI service is temporarily unavailable',
      }
    }

    const systemPrompt = this.buildSystemPrompt(context)
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message },
    ]

    try {
      const stream = await this.client.chat.completions.create({
        model: this.config.model!,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true,
      })

      let fullContent = ''
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        fullContent += content
        if (onChunk) {
          onChunk(content)
        }
      }

      return { content: fullContent }
    } catch (error: any) {
      console.error('OpenAI streaming error:', error)
      return {
        content: this.getFallbackResponse(message, context?.language),
        error: error.message,
      }
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    this.initialize()

    if (!this.client) {
      return false
    }

    try {
      await this.client.models.list()
      return true
    } catch (error) {
      console.error('API key validation failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const openAIService = new OpenAIService()

// Export class for testing
export default OpenAIService