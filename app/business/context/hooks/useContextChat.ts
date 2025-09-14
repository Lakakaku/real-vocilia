/**
 * useContextChat Hook
 * Manages chat conversation history, message persistence, and AI interactions
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  type ChatMessage,
  formatChatMessage,
  parseConversationHistory,
  validateMessage,
  generateMessageId,
  exportConversation
} from '../utils/context-helpers'

interface ChatOptions {
  businessId: string
  onContextUpdate?: (updates: string[]) => void
  maxMessages?: number
  persistConversation?: boolean
}

interface SendMessageOptions {
  message: string
  role?: 'user' | 'assistant' | 'system'
  suggestions?: string[]
  contextUpdates?: string[]
  metadata?: Record<string, any>
}

interface UseContextChatReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null

  // Message operations
  sendMessage: (content: string) => Promise<void>
  addMessage: (options: SendMessageOptions) => void
  clearMessages: () => void
  deleteMessage: (messageId: string) => void
  editMessage: (messageId: string, newContent: string) => void

  // History operations
  loadHistory: () => Promise<void>
  saveHistory: () => Promise<void>
  exportHistory: () => string

  // Pagination
  loadMoreMessages: () => Promise<void>
  hasMoreMessages: boolean

  // Statistics
  messageCount: number
  conversationStarted: Date | null
}

export function useContextChat(options: ChatOptions): UseContextChatReturn {
  const {
    businessId,
    onContextUpdate,
    maxMessages = 100,
    persistConversation = true
  } = options

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [conversationStarted, setConversationStarted] = useState<Date | null>(null)

  // Refs
  const loadedHistoryRef = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // AI Service function (to be implemented)
  const callAIService = useCallback(async (message: string, conversationHistory: ChatMessage[]): Promise<{
    response: string
    suggestions?: string[]
    contextUpdates?: string[]
  }> => {
    // This would integrate with your AI service
    // For now, returning a mock response
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API delay

    return {
      response: `I understand you're asking about: "${message}". Let me help you build better context for your business.`,
      suggestions: [
        "Tell me more about that",
        "What else should I know?",
        "How does this affect customer experience?"
      ],
      contextUpdates: [`Updated based on: ${message.substring(0, 50)}...`]
    }
  }, [])

  // Load conversation history from database
  const loadHistory = useCallback(async () => {
    if (!persistConversation || loadedHistoryRef.current) return

    try {
      setIsLoading(true)
      setError(null)

      // Call server action to get conversation history
      const response = await fetch(`/api/context/conversation/${businessId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load conversation history')
      }

      const data = await response.json()

      if (data.success && data.history) {
        const parsedMessages = parseConversationHistory(data.history)
        setMessages(parsedMessages)

        if (parsedMessages.length > 0) {
          setConversationStarted(parsedMessages[0].timestamp)
        }

        setHasMoreMessages(data.hasMore || false)
      }

      loadedHistoryRef.current = true
    } catch (err) {
      console.error('Error loading conversation history:', err)
      setError(err instanceof Error ? err.message : 'Failed to load conversation history')
    } finally {
      setIsLoading(false)
    }
  }, [businessId, persistConversation])

  // Save conversation history to database (debounced)
  const saveHistory = useCallback(async () => {
    if (!persistConversation || messages.length === 0) return

    try {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Debounced save
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch(`/api/context/conversation/${businessId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messages: messages.slice(-maxMessages) // Only save recent messages
            })
          })

          if (!response.ok) {
            throw new Error('Failed to save conversation history')
          }
        } catch (err) {
          console.error('Error saving conversation history:', err)
        }
      }, 2000) // 2 second debounce
    } catch (err) {
      console.error('Error in saveHistory:', err)
    }
  }, [businessId, messages, maxMessages, persistConversation])

  // Send message to AI and get response
  const sendMessage = useCallback(async (content: string) => {
    const validation = validateMessage(content)
    if (!validation.isValid) {
      setError(validation.error!)
      return
    }

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date()
    }

    // Add user message immediately
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    // Start conversation timer if this is the first message
    if (messages.length === 0) {
      setConversationStarted(new Date())
    }

    try {
      // Call AI service
      const aiResponse = await callAIService(content, messages)

      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        content: aiResponse.response,
        role: 'assistant',
        timestamp: new Date(),
        suggestions: aiResponse.suggestions,
        contextUpdates: aiResponse.contextUpdates
      }

      setMessages(prev => [...prev, assistantMessage])

      // Trigger context updates callback
      if (aiResponse.contextUpdates && onContextUpdate) {
        onContextUpdate(aiResponse.contextUpdates)
      }

      // Auto-save after successful AI response
      if (persistConversation) {
        saveHistory()
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')

      // Add error message
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        content: 'I apologize, but I encountered an error processing your message. Please try again.',
        role: 'assistant',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [messages, callAIService, onContextUpdate, persistConversation, saveHistory])

  // Add message manually
  const addMessage = useCallback((options: SendMessageOptions) => {
    const message: ChatMessage = {
      id: generateMessageId(),
      content: options.message,
      role: options.role || 'user',
      timestamp: new Date(),
      suggestions: options.suggestions,
      contextUpdates: options.contextUpdates,
      metadata: options.metadata
    }

    setMessages(prev => [...prev, message])

    if (persistConversation) {
      saveHistory()
    }
  }, [persistConversation, saveHistory])

  // Clear all messages
  const clearMessages = useCallback(() => {
    setMessages([])
    setConversationStarted(null)
    setError(null)

    // Clear from database if persisting
    if (persistConversation) {
      fetch(`/api/context/conversation/${businessId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      }).catch(err => console.error('Error clearing conversation:', err))
    }
  }, [businessId, persistConversation])

  // Delete specific message
  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId))

    if (persistConversation) {
      saveHistory()
    }
  }, [persistConversation, saveHistory])

  // Edit message
  const editMessage = useCallback((messageId: string, newContent: string) => {
    const validation = validateMessage(newContent)
    if (!validation.isValid) {
      setError(validation.error!)
      return
    }

    setMessages(prev => prev.map(msg =>
      msg.id === messageId
        ? { ...msg, content: newContent.trim(), timestamp: new Date() }
        : msg
    ))

    if (persistConversation) {
      saveHistory()
    }
  }, [persistConversation, saveHistory])

  // Load more messages (pagination)
  const loadMoreMessages = useCallback(async () => {
    if (!hasMoreMessages || isLoading) return

    try {
      setIsLoading(true)

      const oldestMessage = messages[0]
      const before = oldestMessage ? oldestMessage.timestamp.toISOString() : undefined

      const response = await fetch(`/api/context/conversation/${businessId}?before=${before}&limit=20`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load more messages')
      }

      const data = await response.json()

      if (data.success && data.history) {
        const parsedMessages = parseConversationHistory(data.history)
        setMessages(prev => [...parsedMessages, ...prev])
        setHasMoreMessages(data.hasMore || false)
      }
    } catch (err) {
      console.error('Error loading more messages:', err)
      setError(err instanceof Error ? err.message : 'Failed to load more messages')
    } finally {
      setIsLoading(false)
    }
  }, [businessId, messages, hasMoreMessages, isLoading])

  // Export conversation
  const exportHistory = useCallback((): string => {
    return exportConversation(messages)
  }, [messages])

  // Load history on mount
  useEffect(() => {
    if (persistConversation) {
      loadHistory()
    }
  }, [loadHistory, persistConversation])

  // Save history when messages change
  useEffect(() => {
    if (messages.length > 0 && persistConversation) {
      saveHistory()
    }
  }, [messages, saveHistory, persistConversation])

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    messages,
    isLoading,
    error,

    // Message operations
    sendMessage,
    addMessage,
    clearMessages,
    deleteMessage,
    editMessage,

    // History operations
    loadHistory,
    saveHistory,
    exportHistory,

    // Pagination
    loadMoreMessages,
    hasMoreMessages,

    // Statistics
    messageCount: messages.length,
    conversationStarted
  }
}