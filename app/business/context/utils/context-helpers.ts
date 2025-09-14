/**
 * Context Helper Functions
 * Utility functions for context data manipulation and validation
 */

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: Date
  suggestions?: string[]
  contextUpdates?: string[]
  metadata?: Record<string, any>
}

export interface SaveStatus {
  status: 'idle' | 'saving' | 'saved' | 'error'
  lastSaved?: Date
  error?: string
}

export interface ContextDraft {
  data: Record<string, any>
  lastModified: Date
  category?: string
  fieldId?: string
}

/**
 * Debounce function for auto-save
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * Deep merge two objects, handling arrays properly
 */
export function deepMerge(target: any, source: any): any {
  if (!source || typeof source !== 'object') return target
  if (!target || typeof target !== 'object') return source

  const result = { ...target }

  Object.keys(source).forEach(key => {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key], source[key])
    } else {
      result[key] = source[key]
    }
  })

  return result
}

/**
 * Check if two objects are deeply equal
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true

  if (a == null || b == null) return false

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((val, i) => deepEqual(val, b[i]))
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)

    if (keysA.length !== keysB.length) return false

    return keysA.every(key => deepEqual(a[key], b[key]))
  }

  return false
}

/**
 * Validate context data structure
 */
export function validateContextData(data: any): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data || typeof data !== 'object') {
    errors.push('Context data must be an object')
    return { isValid: false, errors, warnings }
  }

  // Check for required categories
  const requiredCategories = [
    'business-details_data',
    'products-services_data',
    'customer-demographics_data'
  ]

  requiredCategories.forEach(category => {
    if (!data[category]) {
      warnings.push(`Missing ${category.replace('_data', '').replace('-', ' ')} information`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Calculate category-based completeness score
 */
export function calculateCompletenessScore(contextData: any): number {
  const categories = [
    'business-details',
    'products-services',
    'customer-demographics',
    'transaction-patterns',
    'operations',
    'business-goals'
  ]

  const categoryWeights = {
    'business-details': 0.25,
    'products-services': 0.20,
    'customer-demographics': 0.15,
    'transaction-patterns': 0.15,
    'operations': 0.15,
    'business-goals': 0.10
  }

  let totalScore = 0

  categories.forEach(categoryId => {
    const categoryData = contextData[`${categoryId}_data`]
    const categoryScore = calculateSingleCategoryCompleteness(categoryData)
    const weight = categoryWeights[categoryId as keyof typeof categoryWeights] || 0
    totalScore += categoryScore * weight
  })

  return Math.min(100, Math.round(totalScore * 100))
}

/**
 * Calculate completeness for a single category
 */
export function calculateSingleCategoryCompleteness(categoryData: any): number {
  if (!categoryData || typeof categoryData !== 'object') return 0

  const fields = Object.keys(categoryData)
  if (fields.length === 0) return 0

  const filledFields = fields.filter(key => {
    const value = categoryData[key]
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'string') return value.trim().length > 0
    if (typeof value === 'number') return value >= 0
    return !!value
  })

  return filledFields.length / fields.length
}

/**
 * Format chat message for display
 */
export function formatChatMessage(message: any): ChatMessage {
  return {
    id: message.id || Date.now().toString(),
    content: message.content || '',
    role: message.role || 'user',
    timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
    suggestions: message.suggestions || [],
    contextUpdates: message.contextUpdates || [],
    metadata: message.metadata || {}
  }
}

/**
 * Parse conversation history from database
 */
export function parseConversationHistory(history: any[]): ChatMessage[] {
  if (!Array.isArray(history)) return []

  return history.map(formatChatMessage)
}

/**
 * Create a draft key for storing unsaved changes
 */
export function createDraftKey(businessId: string, category?: string, fieldId?: string): string {
  let key = `draft_${businessId}`
  if (category) key += `_${category}`
  if (fieldId) key += `_${fieldId}`
  return key
}

/**
 * Sanitize data before saving to prevent XSS
 */
export function sanitizeContextData(data: any): any {
  if (typeof data === 'string') {
    return data.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeContextData)
  }

  if (data && typeof data === 'object') {
    const sanitized: any = {}
    Object.keys(data).forEach(key => {
      sanitized[key] = sanitizeContextData(data[key])
    })
    return sanitized
  }

  return data
}

/**
 * Detect conflicts between drafts and published data
 */
export function detectConflicts(
  publishedData: any,
  draftData: any,
  lastSaved: Date,
  lastPublished: Date
): {
  hasConflicts: boolean
  conflicts: Array<{
    field: string
    publishedValue: any
    draftValue: any
    conflictType: 'concurrent_edit' | 'version_mismatch'
  }>
} {
  const conflicts: any[] = []

  if (lastPublished > lastSaved) {
    // Data was updated since our draft was created
    Object.keys(draftData).forEach(key => {
      if (!deepEqual(publishedData[key], draftData[key])) {
        conflicts.push({
          field: key,
          publishedValue: publishedData[key],
          draftValue: draftData[key],
          conflictType: 'concurrent_edit'
        })
      }
    })
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  }
}

/**
 * Generate suggested prompts based on context completeness
 */
export function generateContextPrompts(contextData: any, completenessScore: number): string[] {
  const prompts: string[] = []

  if (completenessScore < 25) {
    prompts.push("Tell me about your business - what type of business is it and what makes it unique?")
    prompts.push("What products or services do you offer?")
    prompts.push("Describe your typical customers")
  } else if (completenessScore < 50) {
    prompts.push("What are your business hours and peak times?")
    prompts.push("How do customers usually pay - cash, card, or mobile payments?")
    prompts.push("What are your main business goals this year?")
  } else if (completenessScore < 75) {
    prompts.push("Tell me about your staff and how they interact with customers")
    prompts.push("What's your store layout like? Where do customers typically go?")
    prompts.push("What challenges do you face with customer feedback?")
  } else {
    prompts.push("What patterns have you noticed in customer behavior?")
    prompts.push("How do you handle difficult customers or complaints?")
    prompts.push("What would you like to improve about your business operations?")
  }

  return prompts
}

/**
 * Export conversation to text format
 */
export function exportConversation(messages: ChatMessage[]): string {
  const header = `Vocilia Context Assistant Conversation
Generated: ${new Date().toLocaleString()}
Total Messages: ${messages.length}

========================================

`

  const conversation = messages.map(message => {
    const timestamp = message.timestamp.toLocaleString()
    const role = message.role.toUpperCase()
    let content = `[${timestamp}] ${role}:\n${message.content}\n`

    if (message.contextUpdates && message.contextUpdates.length > 0) {
      content += `\nContext Updates:\n${message.contextUpdates.map(update => `- ${update}`).join('\n')}\n`
    }

    return content
  }).join('\n---\n\n')

  return header + conversation
}

/**
 * Get relative time string for timestamps
 */
export function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days === 1 ? '' : 's'} ago`
  }
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Validate message content
 */
export function validateMessage(content: string): {
  isValid: boolean
  error?: string
} {
  if (!content || typeof content !== 'string') {
    return { isValid: false, error: 'Message content is required' }
  }

  const trimmed = content.trim()
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Message cannot be empty' }
  }

  if (trimmed.length > 5000) {
    return { isValid: false, error: 'Message is too long (max 5000 characters)' }
  }

  return { isValid: true }
}