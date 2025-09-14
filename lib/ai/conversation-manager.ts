/**
 * Conversation Manager - Handles AI conversation sessions and memory
 * Manages conversation history, context windows, and database persistence
 */

import { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ConversationSession {
  id: string
  businessId: string
  messages: ChatCompletionMessage[]
  startedAt: Date
  lastMessageAt: Date
  tokenCount: number
  context?: any
}

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp?: Date
  tokenCount?: number
}

export interface ConversationSummary {
  sessionId: string
  summary: string
  keyPoints: string[]
  contextUpdates: any[]
  createdAt: Date
}

class ConversationManager {
  private readonly MAX_CONTEXT_TOKENS = 4000 // GPT-4o-mini context limit
  private readonly MAX_MESSAGES_IN_MEMORY = 20
  private readonly SUMMARIZATION_THRESHOLD = 15 // Messages before summarization

  /**
   * Create a new conversation session
   */
  async createSession(businessId: string, initialContext?: any): Promise<ConversationSession> {
    const supabase = await createClient()

    const session: ConversationSession = {
      id: this.generateSessionId(),
      businessId,
      messages: [],
      startedAt: new Date(),
      lastMessageAt: new Date(),
      tokenCount: 0,
      context: initialContext,
    }

    // Store in database
    const { error } = await supabase
      .from('business_contexts')
      .update({
        ai_conversation_history: {
          currentSession: session.id,
          lastActive: new Date().toISOString(),
        },
      })
      .eq('business_id', businessId)

    if (error) {
      console.error('Failed to create conversation session:', error)
    }

    return session
  }

  /**
   * Load existing conversation session
   */
  async loadSession(businessId: string, sessionId?: string): Promise<ConversationSession | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('business_contexts')
      .select('ai_conversation_history')
      .eq('business_id', businessId)
      .single()

    if (error || !data?.ai_conversation_history) {
      console.error('Failed to load conversation session:', error)
      return null
    }

    const history = data.ai_conversation_history as any

    // If no specific session requested, get the current one
    if (!sessionId && history.currentSession) {
      sessionId = history.currentSession
    }

    if (!sessionId || !history.sessions?.[sessionId]) {
      return null
    }

    const sessionData = history.sessions[sessionId]
    return {
      id: sessionId,
      businessId,
      messages: sessionData.messages || [],
      startedAt: new Date(sessionData.startedAt),
      lastMessageAt: new Date(sessionData.lastMessageAt),
      tokenCount: sessionData.tokenCount || 0,
      context: sessionData.context,
    }
  }

  /**
   * Add a message to the conversation
   */
  async addMessage(
    session: ConversationSession,
    message: ChatCompletionMessage
  ): Promise<ConversationSession> {
    const supabase = await createClient()

    // Estimate token count (rough approximation)
    const estimatedTokens = this.estimateTokens(message.content)
    message.tokenCount = estimatedTokens
    message.timestamp = new Date()

    // Add message to session
    session.messages.push(message)
    session.tokenCount += estimatedTokens
    session.lastMessageAt = new Date()

    // Check if we need to summarize older messages
    if (session.messages.length > this.SUMMARIZATION_THRESHOLD) {
      await this.summarizeAndTruncate(session)
    }

    // Check token limit and truncate if necessary
    if (session.tokenCount > this.MAX_CONTEXT_TOKENS) {
      await this.truncateContext(session)
    }

    // Save to database
    await this.saveSession(session, supabase)

    return session
  }

  /**
   * Get messages for OpenAI API
   */
  getMessagesForAPI(session: ConversationSession): ChatCompletionMessageParam[] {
    return session.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }))
  }

  /**
   * Summarize and truncate old messages
   */
  private async summarizeAndTruncate(session: ConversationSession): Promise<void> {
    if (session.messages.length <= this.MAX_MESSAGES_IN_MEMORY) {
      return
    }

    // Keep recent messages, summarize older ones
    const messagesToSummarize = session.messages.slice(0, -10)
    const recentMessages = session.messages.slice(-10)

    // Create summary of older messages
    const summary = this.createSummary(messagesToSummarize)

    // Replace old messages with summary
    session.messages = [
      {
        role: 'system',
        content: `Previous conversation summary: ${summary}`,
        timestamp: new Date(),
      },
      ...recentMessages,
    ]

    // Recalculate token count
    session.tokenCount = session.messages.reduce(
      (total, msg) => total + this.estimateTokens(msg.content),
      0
    )
  }

  /**
   * Truncate context when token limit is exceeded
   */
  private async truncateContext(session: ConversationSession): Promise<void> {
    // Keep system message and most recent messages
    const systemMessage = session.messages.find(msg => msg.role === 'system')
    let recentMessages = session.messages.filter(msg => msg.role !== 'system')

    let currentTokens = systemMessage ? this.estimateTokens(systemMessage.content) : 0
    const keptMessages: ChatCompletionMessage[] = []

    // Add messages from most recent, staying under token limit
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const msg = recentMessages[i]
      const msgTokens = this.estimateTokens(msg.content)

      if (currentTokens + msgTokens < this.MAX_CONTEXT_TOKENS - 500) {
        keptMessages.unshift(msg)
        currentTokens += msgTokens
      } else {
        break
      }
    }

    // Rebuild messages array
    session.messages = systemMessage ? [systemMessage, ...keptMessages] : keptMessages
    session.tokenCount = currentTokens
  }

  /**
   * Save session to database
   */
  private async saveSession(
    session: ConversationSession,
    supabase?: SupabaseClient
  ): Promise<void> {
    if (!supabase) {
      supabase = await createClient()
    }

    const { data: current, error: fetchError } = await supabase
      .from('business_contexts')
      .select('ai_conversation_history')
      .eq('business_id', session.businessId)
      .single()

    if (fetchError) {
      console.error('Failed to fetch current conversation history:', fetchError)
      return
    }

    const history = (current?.ai_conversation_history as any) || {
      sessions: {},
      currentSession: null,
    }

    // Update session data
    history.sessions = history.sessions || {}
    history.sessions[session.id] = {
      messages: session.messages,
      startedAt: session.startedAt.toISOString(),
      lastMessageAt: session.lastMessageAt.toISOString(),
      tokenCount: session.tokenCount,
      context: session.context,
    }
    history.currentSession = session.id
    history.lastActive = new Date().toISOString()

    // Save back to database
    const { error: updateError } = await supabase
      .from('business_contexts')
      .update({
        ai_conversation_history: history,
        last_ai_update: new Date().toISOString(),
      })
      .eq('business_id', session.businessId)

    if (updateError) {
      console.error('Failed to save conversation session:', updateError)
    }
  }

  /**
   * Create a text summary of messages
   */
  private createSummary(messages: ChatCompletionMessage[]): string {
    const keyPoints: string[] = []

    for (const msg of messages) {
      if (msg.role === 'user') {
        // Extract key user inputs
        const sentences = msg.content.split(/[.!?]+/).filter(s => s.trim().length > 10)
        if (sentences.length > 0) {
          keyPoints.push(`User mentioned: ${sentences[0].trim()}`)
        }
      } else if (msg.role === 'assistant') {
        // Extract key AI suggestions
        if (msg.content.includes('fraud')) {
          keyPoints.push('Discussed fraud detection patterns')
        }
        if (msg.content.includes('context') || msg.content.includes('completeness')) {
          keyPoints.push('Worked on context improvement')
        }
      }
    }

    return keyPoints.slice(0, 5).join('; ')
  }

  /**
   * Estimate token count for a string
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English/Swedish
    return Math.ceil(text.length / 4)
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get conversation statistics
   */
  async getSessionStats(businessId: string): Promise<{
    totalSessions: number
    totalMessages: number
    averageSessionLength: number
    lastActiveDate: Date | null
  }> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('business_contexts')
      .select('ai_conversation_history')
      .eq('business_id', businessId)
      .single()

    if (error || !data?.ai_conversation_history) {
      return {
        totalSessions: 0,
        totalMessages: 0,
        averageSessionLength: 0,
        lastActiveDate: null,
      }
    }

    const history = data.ai_conversation_history as any
    const sessions = history.sessions || {}
    const sessionIds = Object.keys(sessions)

    let totalMessages = 0
    for (const sessionId of sessionIds) {
      totalMessages += sessions[sessionId].messages?.length || 0
    }

    return {
      totalSessions: sessionIds.length,
      totalMessages,
      averageSessionLength: sessionIds.length > 0 ? totalMessages / sessionIds.length : 0,
      lastActiveDate: history.lastActive ? new Date(history.lastActive) : null,
    }
  }

  /**
   * Clear old sessions (cleanup)
   */
  async clearOldSessions(businessId: string, daysToKeep: number = 30): Promise<void> {
    const supabase = await createClient()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const { data, error: fetchError } = await supabase
      .from('business_contexts')
      .select('ai_conversation_history')
      .eq('business_id', businessId)
      .single()

    if (fetchError || !data?.ai_conversation_history) {
      return
    }

    const history = data.ai_conversation_history as any
    const sessions = history.sessions || {}

    // Filter out old sessions
    const filteredSessions: any = {}
    for (const [sessionId, sessionData] of Object.entries(sessions)) {
      const lastActive = new Date((sessionData as any).lastMessageAt)
      if (lastActive > cutoffDate) {
        filteredSessions[sessionId] = sessionData
      }
    }

    history.sessions = filteredSessions

    // Update database
    await supabase
      .from('business_contexts')
      .update({
        ai_conversation_history: history,
      })
      .eq('business_id', businessId)
  }
}

// Export singleton instance
export const conversationManager = new ConversationManager()

// Export class for testing
export default ConversationManager