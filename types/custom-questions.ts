/**
 * Custom Questions Type Definitions
 * Comprehensive type system for business custom question management
 * Agent: business-onboarding
 */

export type QuestionFrequency = {
  type: 'every_nth' | 'percentage' | 'fixed'
  value: number // Every Nth customer, percentage (0-100), or fixed count per day
  currentCount?: number // Track current count for frequency calculation
}

export type SeasonalActivation = {
  enabled: boolean
  startDate?: string // ISO date string
  endDate?: string // ISO date string
  recurring?: boolean // Repeat annually
  timezone?: string // Business timezone for activation
}

export type QuestionTargeting = {
  stores: string[] | 'all' // Store IDs or 'all' for all stores
  customerSegments?: string[] // Future: customer segments
  timeOfDay?: {
    start: string // HH:MM format
    end: string // HH:MM format
  }
  daysOfWeek?: number[] // 0-6, Sunday to Saturday
}

export type QuestionEffectiveness = {
  responseRate: number // Percentage of customers who answered
  avgQualityBoost: number // Average quality score boost when answered
  totalResponses: number
  lastAskedAt?: string // ISO date string
  sentiment: {
    positive: number
    neutral: number
    negative: number
  }
}

export type QuestionStatus = 'active' | 'paused' | 'draft' | 'archived'

export type QuestionSource = 'manual' | 'ai_generated' | 'template' | 'goal_based'

export interface CustomQuestion {
  id: string
  text: string
  textSv?: string // Swedish translation
  frequency: QuestionFrequency
  targeting: QuestionTargeting
  seasonal: SeasonalActivation
  priority: number // 1-10, higher = more important
  status: QuestionStatus
  source: QuestionSource
  generatedFromGoal?: string // Goal ID if generated from business goal
  effectiveness: QuestionEffectiveness
  metadata: {
    category?: string // Question category
    expectedResponseType?: 'rating' | 'text' | 'yes_no' | 'multiple_choice'
    followUpEnabled?: boolean // Allow AI to ask follow-up
    maxLength?: number // Max response length in characters
  }
  createdAt: string
  updatedAt: string
  createdBy: string // User ID who created the question
  lastModifiedBy?: string
}

export interface CustomQuestionTemplate {
  id: string
  businessType: string
  questions: Omit<CustomQuestion, 'id' | 'effectiveness' | 'createdAt' | 'updatedAt' | 'createdBy'>[]
  name: string
  description: string
}

export interface QuestionGenerationParams {
  businessGoals: string[]
  businessType: string
  existingQuestions: CustomQuestion[]
  contextData: any // Business context data
  language: 'en' | 'sv' | 'auto'
  count: number // Number of questions to generate
}

export interface QuestionAnalytics {
  questionId: string
  period: {
    start: string
    end: string
  }
  metrics: {
    timesAsked: number
    timesAnswered: number
    avgResponseLength: number
    avgResponseTime: number // Seconds to answer
    qualityImpact: number // Impact on overall feedback quality
    insightsGenerated: number // Number of actionable insights
  }
  trends: {
    responseRateTrend: 'improving' | 'stable' | 'declining'
    qualityTrend: 'improving' | 'stable' | 'declining'
  }
  recommendations: {
    action: 'keep' | 'modify' | 'remove' | 'increase_frequency' | 'decrease_frequency'
    reason: string
    suggestedChanges?: Partial<CustomQuestion>
  }
}

export interface QuestionSchedule {
  customerId: string
  storeId: string
  scheduledQuestions: {
    questionId: string
    scheduledFor: string // ISO date string
    reason: string // Why this question was selected
  }[]
  lastQuestionAsked?: {
    questionId: string
    askedAt: string
    answered: boolean
  }
}

export interface QuestionValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
  qualityScore: number // 0-100
}

export interface BulkQuestionOperation {
  operation: 'activate' | 'deactivate' | 'delete' | 'update_frequency' | 'update_targeting'
  questionIds: string[]
  updates?: Partial<CustomQuestion>
  reason?: string
}

// Helper type for question creation form
export interface QuestionFormData {
  text: string
  textSv?: string
  frequencyType: 'every_nth' | 'percentage' | 'fixed'
  frequencyValue: number
  stores: string[] | 'all'
  seasonalEnabled: boolean
  seasonalStart?: Date
  seasonalEnd?: Date
  seasonalRecurring?: boolean
  priority: number
  followUpEnabled: boolean
  category?: string
}

// Integration with voice AI
export interface VoiceQuestionInjection {
  sessionId: string
  customerId: string
  storeId: string
  question: CustomQuestion
  injectionPoint: 'greeting' | 'middle' | 'closing'
  injectedAt: string
  response?: {
    text: string
    sentiment: 'positive' | 'neutral' | 'negative'
    answeredAt: string
    quality: number // 0-100
  }
}

// Export validation constants
export const QUESTION_LIMITS = {
  MIN_TEXT_LENGTH: 10,
  MAX_TEXT_LENGTH: 200,
  MAX_QUESTIONS_PER_BUSINESS: 20,
  MAX_ACTIVE_QUESTIONS: 10,
  MIN_FREQUENCY: 1,
  MAX_FREQUENCY: 100,
  MIN_PRIORITY: 1,
  MAX_PRIORITY: 10,
} as const

export const QUESTION_CATEGORIES = [
  'service_quality',
  'product_feedback',
  'staff_performance',
  'store_experience',
  'pricing_value',
  'cleanliness_hygiene',
  'wait_times',
  'recommendations',
  'special_offers',
  'general_satisfaction',
] as const

export type QuestionCategory = typeof QUESTION_CATEGORIES[number]

// AI Generation prompt templates
export const GENERATION_PROMPTS = {
  FROM_GOALS: 'Generate custom questions that directly address these business goals',
  SEASONAL: 'Create seasonal questions appropriate for this time period',
  IMPROVEMENT: 'Suggest questions to gather feedback on areas needing improvement',
  ENGAGEMENT: 'Create engaging questions that encourage detailed responses',
  SPECIFIC: 'Generate questions about specific aspects of the business',
} as const