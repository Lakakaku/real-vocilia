/**
 * Response Validator - Validates and sanitizes AI responses
 * Ensures quality, safety, and relevance of AI-generated content
 */

export interface ValidationResult {
  isValid: boolean
  sanitizedContent?: string
  issues: string[]
  confidence: number
}

export interface ValidationConfig {
  maxLength?: number
  minLength?: number
  allowHtml?: boolean
  checkProfanity?: boolean
  checkHallucination?: boolean
  businessContext?: any
}

export class ResponseValidator {
  private static readonly PROFANITY_PATTERNS = [
    // Add Swedish and English profanity patterns as needed
    // Keeping this minimal for production code
  ]

  private static readonly HALLUCINATION_INDICATORS = [
    'As an AI language model',
    'I cannot actually',
    'I don\'t have access to',
    'I cannot provide real',
    'This is hypothetical',
    'I\'m just making this up',
  ]

  private static readonly UNSAFE_PATTERNS = [
    /<script/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onerror, etc.
    /<iframe/gi,
    /<embed/gi,
    /<object/gi,
  ]

  /**
   * Validate AI response
   */
  static validate(
    content: string,
    config: ValidationConfig = {}
  ): ValidationResult {
    const issues: string[] = []
    let sanitizedContent = content
    let confidence = 100

    // Check length constraints
    if (config.maxLength && content.length > config.maxLength) {
      issues.push(`Response exceeds maximum length of ${config.maxLength} characters`)
      sanitizedContent = content.substring(0, config.maxLength)
      confidence -= 10
    }

    if (config.minLength && content.length < config.minLength) {
      issues.push(`Response is shorter than minimum length of ${config.minLength} characters`)
      confidence -= 20
    }

    // Remove unsafe HTML if not allowed
    if (!config.allowHtml) {
      const htmlResult = this.sanitizeHtml(sanitizedContent)
      if (htmlResult.modified) {
        sanitizedContent = htmlResult.content
        issues.push('HTML content was removed')
        confidence -= 5
      }
    }

    // Check for profanity
    if (config.checkProfanity && this.containsProfanity(sanitizedContent)) {
      issues.push('Response contains inappropriate language')
      confidence -= 30
    }

    // Check for hallucination indicators
    if (config.checkHallucination) {
      const hallucinationScore = this.checkHallucination(sanitizedContent)
      if (hallucinationScore > 0) {
        issues.push('Response may contain AI hallucination indicators')
        confidence -= hallucinationScore
      }
    }

    // Check business context relevance
    if (config.businessContext) {
      const relevanceScore = this.checkBusinessRelevance(sanitizedContent, config.businessContext)
      if (relevanceScore < 50) {
        issues.push('Response may not be relevant to business context')
        confidence -= (100 - relevanceScore) / 2
      }
    }

    // Check for unsafe patterns
    const safetyResult = this.checkSafety(sanitizedContent)
    if (!safetyResult.isSafe) {
      sanitizedContent = safetyResult.sanitized
      issues.push(...safetyResult.issues)
      confidence -= 25
    }

    // Ensure confidence is between 0 and 100
    confidence = Math.max(0, Math.min(100, confidence))

    return {
      isValid: confidence >= 50 && issues.length === 0,
      sanitizedContent,
      issues,
      confidence,
    }
  }

  /**
   * Sanitize HTML content
   */
  private static sanitizeHtml(content: string): { content: string; modified: boolean } {
    const original = content

    // Remove all HTML tags
    let sanitized = content.replace(/<[^>]*>/g, '')

    // Decode HTML entities
    sanitized = sanitized
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")

    return {
      content: sanitized,
      modified: sanitized !== original,
    }
  }

  /**
   * Check for profanity
   */
  private static containsProfanity(content: string): boolean {
    const lowercaseContent = content.toLowerCase()

    // Basic check - extend with actual profanity list
    const basicProfanity = ['damn', 'hell'] // Minimal for production

    return basicProfanity.some(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i')
      return regex.test(lowercaseContent)
    })
  }

  /**
   * Check for AI hallucination indicators
   */
  private static checkHallucination(content: string): number {
    let score = 0
    const lowercaseContent = content.toLowerCase()

    for (const indicator of this.HALLUCINATION_INDICATORS) {
      if (lowercaseContent.includes(indicator.toLowerCase())) {
        score += 20
      }
    }

    // Check for overly confident false claims
    if (content.includes('definitely') || content.includes('absolutely')) {
      // Check if making claims about specific facts
      if (content.match(/definitely .* (is|was|will|has|have)/i)) {
        score += 10
      }
    }

    // Check for made-up statistics
    const statsPattern = /\d+(\.\d+)?%/g
    const percentages = content.match(statsPattern)
    if (percentages && percentages.length > 3) {
      score += 15 // Too many specific percentages might indicate hallucination
    }

    return Math.min(score, 50) // Cap at 50
  }

  /**
   * Check business context relevance
   */
  private static checkBusinessRelevance(content: string, businessContext: any): number {
    let relevanceScore = 50 // Start neutral
    const lowercaseContent = content.toLowerCase()

    // Check for business type mentions
    if (businessContext.businessType && lowercaseContent.includes(businessContext.businessType)) {
      relevanceScore += 10
    }

    // Check for relevant keywords
    const contextKeywords = [
      'context', 'fraud', 'feedback', 'customer', 'business',
      'staff', 'product', 'service', 'operation', 'pattern',
    ]

    const keywordMatches = contextKeywords.filter(keyword =>
      lowercaseContent.includes(keyword)
    ).length

    relevanceScore += keywordMatches * 5

    // Check for Swedish business terms if applicable
    if (businessContext.language === 'sv') {
      const swedishBusinessTerms = ['företag', 'kund', 'personal', 'tjänst', 'produkt']
      const swedishMatches = swedishBusinessTerms.filter(term =>
        lowercaseContent.includes(term)
      ).length
      relevanceScore += swedishMatches * 5
    }

    // Check if response addresses the conversation topic
    if (content.includes('?')) {
      relevanceScore += 10 // Asking questions is good for context building
    }

    return Math.min(relevanceScore, 100)
  }

  /**
   * Check for safety issues
   */
  private static checkSafety(content: string): {
    isSafe: boolean
    sanitized: string
    issues: string[]
  } {
    let sanitized = content
    const issues: string[] = []
    let isSafe = true

    // Check for unsafe patterns
    for (const pattern of this.UNSAFE_PATTERNS) {
      if (pattern.test(content)) {
        sanitized = sanitized.replace(pattern, '')
        issues.push('Unsafe content pattern detected and removed')
        isSafe = false
      }
    }

    // Check for suspicious URLs
    const urlPattern = /https?:\/\/[^\s]+/gi
    const urls = content.match(urlPattern)
    if (urls && urls.length > 2) {
      issues.push('Multiple URLs detected - potential spam')
      isSafe = false
    }

    // Check for repeated content (spam indicator)
    const lines = content.split('\n')
    const uniqueLines = new Set(lines)
    if (lines.length > 5 && uniqueLines.size < lines.length / 2) {
      issues.push('Repeated content detected - potential spam')
      isSafe = false
    }

    // Check for excessive capitalization (shouting)
    const uppercaseRatio = (content.match(/[A-Z]/g) || []).length / content.length
    if (uppercaseRatio > 0.3 && content.length > 50) {
      sanitized = sanitized.toLowerCase()
      sanitized = sanitized.charAt(0).toUpperCase() + sanitized.slice(1)
      issues.push('Excessive capitalization normalized')
    }

    return { isSafe, sanitized, issues }
  }

  /**
   * Validate context update suggestions
   */
  static validateContextUpdate(
    suggestion: any,
    currentContext: any
  ): ValidationResult {
    const issues: string[] = []
    let confidence = 100

    // Check if suggestion is an object
    if (typeof suggestion !== 'object' || suggestion === null) {
      return {
        isValid: false,
        issues: ['Invalid suggestion format'],
        confidence: 0,
      }
    }

    // Check for required fields
    const requiredFields = ['type', 'data']
    for (const field of requiredFields) {
      if (!(field in suggestion)) {
        issues.push(`Missing required field: ${field}`)
        confidence -= 30
      }
    }

    // Validate suggestion type
    const validTypes = [
      'physical_layout',
      'staff_info',
      'products_services',
      'operational_details',
      'fraud_indicators',
      'custom_questions',
    ]

    if (suggestion.type && !validTypes.includes(suggestion.type)) {
      issues.push(`Invalid suggestion type: ${suggestion.type}`)
      confidence -= 40
    }

    // Check for data validity
    if (suggestion.data) {
      if (typeof suggestion.data !== 'object') {
        issues.push('Suggestion data must be an object')
        confidence -= 30
      }

      // Check for empty data
      if (Object.keys(suggestion.data).length === 0) {
        issues.push('Suggestion data is empty')
        confidence -= 20
      }
    }

    // Check for conflicts with current context
    if (currentContext && suggestion.type && suggestion.data) {
      const existingData = currentContext[suggestion.type]
      if (existingData && JSON.stringify(existingData) === JSON.stringify(suggestion.data)) {
        issues.push('Suggestion duplicates existing data')
        confidence -= 50
      }
    }

    confidence = Math.max(0, Math.min(100, confidence))

    return {
      isValid: confidence >= 50 && issues.length === 0,
      issues,
      confidence,
    }
  }

  /**
   * Filter inappropriate content from feedback
   */
  static filterFeedbackContent(content: string): string {
    let filtered = content

    // Remove personal information patterns
    const personalInfoPatterns = [
      /\b\d{10,}\b/g, // Phone numbers
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\b\d{6}-\d{4}\b/g, // Swedish personal numbers
    ]

    for (const pattern of personalInfoPatterns) {
      filtered = filtered.replace(pattern, '[REDACTED]')
    }

    return filtered
  }
}

export default ResponseValidator