'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import {
  MessageCircle,
  Download,
  Trash2,
  Clock,
  ChevronUp,
  Edit2,
  Save,
  X
} from 'lucide-react'
import { useContextChat } from '../hooks/useContextChat'
import {
  formatChatMessage,
  generateContextPrompts,
  getRelativeTime,
  type ChatMessage
} from '../utils/context-helpers'

interface ContextChatProps {
  businessId: string
  onContextUpdate?: (updates: string[]) => void
  completenessScore?: number
  className?: string
}

export function ContextChat({
  businessId,
  onContextUpdate,
  completenessScore = 0,
  className
}: ContextChatProps) {
  // Local state
  const [currentMessage, setCurrentMessage] = useState('')
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [showLoadMore, setShowLoadMore] = useState(false)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Use chat hook
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    addMessage,
    clearMessages,
    deleteMessage,
    editMessage,
    loadMoreMessages,
    hasMoreMessages,
    exportHistory,
    messageCount,
    conversationStarted
  } = useContextChat({
    businessId,
    onContextUpdate,
    maxMessages: 500,
    persistConversation: true
  })

  // Add initial welcome message if no messages exist
  useEffect(() => {
    if (messages.length === 0) {
      const suggestedStarters = generateContextPrompts({}, completenessScore)

      addMessage({
        message: `👋 Hello! I'm your AI context assistant powered by GPT-4o-mini. I'll help you build a comprehensive business context that will improve fraud detection and help you understand your customer feedback better.

Let's start with the basics - what type of business do you run, and what makes it unique?`,
        role: 'assistant',
        suggestions: suggestedStarters
      })
    }
  }, [messages.length, addMessage, completenessScore])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus()
    }
  }, [isLoading])

  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || currentMessage.trim()
    if (!textToSend || isLoading) return

    setCurrentMessage('')
    await sendMessage(textToSend)
  }

  const handleEditStart = (messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditContent(content)
  }

  const handleEditSave = () => {
    if (editingMessageId && editContent.trim()) {
      editMessage(editingMessageId, editContent.trim())
      setEditingMessageId(null)
      setEditContent('')
    }
  }

  const handleEditCancel = () => {
    setEditingMessageId(null)
    setEditContent('')
  }

  const handleExportConversation = () => {
    const conversationText = exportHistory()
    const blob = new Blob([conversationText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vocilia-context-conversation-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClearConversation = () => {
    if (confirm('Are you sure you want to clear the entire conversation history? This action cannot be undone.')) {
      clearMessages()
    }
  }

  const handleLoadMore = async () => {
    if (hasMoreMessages && !isLoading) {
      await loadMoreMessages()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion)
  }

  return (
    <Card className={`flex flex-col h-full ${className}`}>
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>AI Context Assistant</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant={completenessScore >= 85 ? 'default' : 'secondary'}>
              {completenessScore}% Complete
            </Badge>
            <Badge variant="outline" className="text-xs">
              GPT-4o-mini
            </Badge>
            {messageCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {messageCount} messages
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            I&apos;m here to help build your business context for better fraud detection and customer insights.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1">
            {messageCount > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportConversation}
                  className="text-xs h-8"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearConversation}
                  className="text-xs h-8 text-red-600"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Conversation Stats */}
        {conversationStarted && (
          <div className="text-xs text-gray-500 flex items-center space-x-4">
            <span>Started: {getRelativeTime(conversationStarted)}</span>
            {messageCount > 0 && <span>Messages: {messageCount}</span>}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[400px] max-h-[600px]">
          {/* Load More Button */}
          {hasMoreMessages && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                disabled={isLoading}
                className="text-xs"
              >
                <ChevronUp className="h-3 w-3 mr-1" />
                {isLoading ? 'Loading...' : 'Load previous messages'}
              </Button>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 relative ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {/* Message Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex space-x-1">
                    {message.role === 'user' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditStart(message.id, message.content)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMessage(message.id)}
                      className="h-6 w-6 p-0 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Message Content */}
                {editingMessageId === message.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[80px]"
                      placeholder="Edit your message..."
                    />
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={handleEditSave}>
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleEditCancel}>
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                )}

                {/* Context Updates */}
                {message.contextUpdates && message.contextUpdates.length > 0 && !editingMessageId && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
                    <p className="font-medium">Context Updated:</p>
                    <ul className="list-disc list-inside mt-1">
                      {message.contextUpdates.map((update, index) => (
                        <li key={index}>{update}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && !editingMessageId && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium opacity-75">Suggested responses:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSuggestionClick(suggestion)}
                          disabled={isLoading}
                          className="text-xs bg-white/50 hover:bg-white border-gray-300"
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                {!editingMessageId && (
                  <div className={`text-xs mt-2 opacity-60 flex items-center justify-between ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    <span>{getRelativeTime(message.timestamp)}</span>
                    <span className="text-[10px]">{message.timestamp.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-4 max-w-[80%]">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <span className="text-sm text-gray-600">AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 border-t p-6">
          <div className="flex space-x-2">
            <Input
              ref={inputRef}
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your business, or describe your products and customers..."
              className="flex-1"
              disabled={isLoading || editingMessageId !== null}
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !currentMessage.trim() || editingMessageId !== null}
              className="px-6"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>Sending...</span>
                </div>
              ) : (
                'Send'
              )}
            </Button>
          </div>

          {/* Dynamic Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-3">
            {generateContextPrompts({}, completenessScore)
              .slice(0, 3)
              .map((prompt, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isLoading || editingMessageId !== null}
                  className="text-xs"
                >
                  {prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt}
                </Button>
              ))}
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              {isLoading && (
                <>
                  <Clock className="h-3 w-3 animate-spin" />
                  <span>AI is processing your message...</span>
                </>
              )}
              {editingMessageId && (
                <span className="text-yellow-600">Editing message - finish editing to continue</span>
              )}
            </div>
            <div>
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}