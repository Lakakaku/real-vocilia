/**
 * Context Discovery Service
 * Implements active context discovery with proactive question generation
 * and industry-specific context templates for automated gap detection
 */

import { createClient } from '@/lib/supabase/server'
import { openAIService } from './openai-service'
import type { BusinessType } from '@/types/onboarding'

export interface ContextGap {
  category: string
  field: string
  importance: 'critical' | 'high' | 'medium' | 'low'
  description: string
  suggestedQuestions: string[]
  industryBenchmark?: string
}

export interface DiscoveryResult {
  gaps: ContextGap[]
  completenessScore: number
  nextSteps: string[]
  proactiveQuestions: string[]
  industryComparison: {
    score: number
    averageScore: number
    percentile: number
  }
}

export interface IndustryTemplate {
  businessType: BusinessType
  requiredFields: {
    category: string
    fields: string[]
    importance: 'critical' | 'high' | 'medium' | 'low'
  }[]
  commonPatterns: string[]
  fraudIndicators: string[]
}

class ContextDiscoveryService {
  private industryTemplates: Map<BusinessType, IndustryTemplate>

  constructor() {
    this.industryTemplates = this.initializeIndustryTemplates()
  }

  /**
   * Initialize industry-specific templates
   */
  private initializeIndustryTemplates(): Map<BusinessType, IndustryTemplate> {
    const templates = new Map<BusinessType, IndustryTemplate>()

    // Restaurant template
    templates.set('restaurant', {
      businessType: 'restaurant',
      requiredFields: [
        {
          category: 'physical_layout',
          fields: ['seating_capacity', 'kitchen_layout', 'pos_location', 'entrance_exits'],
          importance: 'critical'
        },
        {
          category: 'staff_info',
          fields: ['chef_count', 'server_count', 'cashier_count', 'shift_patterns'],
          importance: 'high'
        },
        {
          category: 'menu_details',
          fields: ['menu_categories', 'price_ranges', 'popular_items', 'seasonal_items'],
          importance: 'high'
        },
        {
          category: 'operational',
          fields: ['peak_hours', 'table_turnover', 'average_ticket', 'payment_methods'],
          importance: 'critical'
        }
      ],
      commonPatterns: [
        'Lunch rush 11:30-13:30',
        'Dinner peak 18:00-21:00',
        'Weekend higher volume',
        'Table service transactions'
      ],
      fraudIndicators: [
        'Orders without table assignment',
        'Transactions outside operating hours',
        'Unusually high tips',
        'Multiple identical orders in succession'
      ]
    })

    // Retail template
    templates.set('retail', {
      businessType: 'retail',
      requiredFields: [
        {
          category: 'store_layout',
          fields: ['departments', 'checkout_locations', 'storage_areas', 'customer_flow'],
          importance: 'critical'
        },
        {
          category: 'inventory',
          fields: ['product_categories', 'price_points', 'high_value_items', 'seasonal_products'],
          importance: 'high'
        },
        {
          category: 'staff_info',
          fields: ['sales_associates', 'cashiers', 'managers', 'security'],
          importance: 'high'
        },
        {
          category: 'operational',
          fields: ['peak_shopping_times', 'average_basket_size', 'return_policy', 'loyalty_program'],
          importance: 'critical'
        }
      ],
      commonPatterns: [
        'Weekend shopping peaks',
        'End-of-month purchases',
        'Seasonal sales patterns',
        'Multi-item transactions'
      ],
      fraudIndicators: [
        'Returns without receipts',
        'High-value single items',
        'Multiple payment methods',
        'Transactions after closing'
      ]
    })

    // Service template (using 'other' for general service businesses)
    templates.set('other', {
      businessType: 'other',
      requiredFields: [
        {
          category: 'service_offerings',
          fields: ['service_types', 'pricing_structure', 'appointment_duration', 'package_deals'],
          importance: 'critical'
        },
        {
          category: 'staff_info',
          fields: ['service_providers', 'receptionists', 'specializations', 'booking_system'],
          importance: 'high'
        },
        {
          category: 'client_management',
          fields: ['appointment_system', 'walk_ins_policy', 'cancellation_policy', 'payment_timing'],
          importance: 'high'
        },
        {
          category: 'operational',
          fields: ['operating_hours', 'peak_times', 'average_service_value', 'repeat_client_rate'],
          importance: 'critical'
        }
      ],
      commonPatterns: [
        'Appointment-based transactions',
        'Prepayment common',
        'Service packages',
        'Repeat customers'
      ],
      fraudIndicators: [
        'Services without appointments',
        'Unusually short service times',
        'Payment before service completion',
        'Services outside operating hours'
      ]
    })

    // Add more templates for other business types...
    templates.set('other', {
      businessType: 'other',
      requiredFields: [
        {
          category: 'business_basics',
          fields: ['business_model', 'customer_types', 'transaction_types', 'location_details'],
          importance: 'critical'
        },
        {
          category: 'operations',
          fields: ['operating_hours', 'peak_periods', 'average_transaction', 'payment_methods'],
          importance: 'high'
        }
      ],
      commonPatterns: [],
      fraudIndicators: []
    })

    return templates
  }

  /**
   * Analyze context and discover gaps
   */
  async analyzeContextGaps(
    businessId: string,
    businessType: BusinessType,
    currentContext: any
  ): Promise<DiscoveryResult> {
    const template = this.industryTemplates.get(businessType) || this.industryTemplates.get('other')!
    const gaps: ContextGap[] = []

    // Check each required field category
    for (const requirement of template.requiredFields) {
      const categoryData = currentContext?.[requirement.category] || {}

      for (const field of requirement.fields) {
        if (!this.isFieldComplete(categoryData, field)) {
          gaps.push({
            category: requirement.category,
            field,
            importance: requirement.importance,
            description: this.getFieldDescription(requirement.category, field, businessType),
            suggestedQuestions: await this.generateQuestionsForField(
              requirement.category,
              field,
              businessType
            ),
            industryBenchmark: this.getIndustryBenchmark(businessType, requirement.category, field)
          })
        }
      }
    }

    // Calculate completeness score
    const completenessScore = this.calculateCompleteness(currentContext, template)

    // Get industry comparison
    const industryComparison = await this.getIndustryComparison(businessId, businessType, completenessScore)

    // Generate proactive questions
    const proactiveQuestions = await this.generateProactiveQuestions(gaps, businessType, currentContext)

    // Determine next steps
    const nextSteps = this.determineNextSteps(gaps, completenessScore)

    return {
      gaps,
      completenessScore,
      nextSteps,
      proactiveQuestions,
      industryComparison
    }
  }

  /**
   * Check if a field is complete
   */
  private isFieldComplete(categoryData: any, field: string): boolean {
    const value = categoryData[field]

    if (!value) return false
    if (typeof value === 'string' && value.trim() === '') return false
    if (Array.isArray(value) && value.length === 0) return false
    if (typeof value === 'object' && Object.keys(value).length === 0) return false

    return true
  }

  /**
   * Get field description for gap
   */
  private getFieldDescription(category: string, field: string, businessType: BusinessType): string {
    const descriptions: Record<string, Record<string, string>> = {
      physical_layout: {
        seating_capacity: 'The total number of seats available for customers',
        kitchen_layout: 'The arrangement and flow of your kitchen operations',
        departments: 'Different sections or departments in your store',
        checkout_locations: 'Where customers complete their purchases'
      },
      staff_info: {
        chef_count: 'Number of chefs and kitchen staff',
        server_count: 'Number of servers and wait staff',
        sales_associates: 'Number of sales team members',
        service_providers: 'Staff who directly provide services to customers'
      },
      menu_details: {
        menu_categories: 'Different categories of items on your menu',
        price_ranges: 'Price ranges for different menu categories',
        popular_items: 'Your best-selling or most popular items'
      },
      operational: {
        peak_hours: 'Your busiest times of day or week',
        average_transaction: 'Typical transaction amount',
        payment_methods: 'Accepted payment methods'
      }
    }

    return descriptions[category]?.[field] || `Information about ${field.replace(/_/g, ' ')}`
  }

  /**
   * Generate questions for a specific field
   */
  private async generateQuestionsForField(
    category: string,
    field: string,
    businessType: BusinessType
  ): Promise<string[]> {
    // Generate contextual questions using AI
    const prompt = `Generate 3 specific questions to help a ${businessType} business provide information about ${field} in the ${category} category. Questions should be clear, specific, and help with fraud detection.`

    try {
      const response = await openAIService.sendMessage(prompt, [], {
        businessType,
        language: 'en'
      })

      // Parse questions from response
      const questions = response.content
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        .map(line => line.replace(/^[-\d.]\s*/, '').trim())
        .slice(0, 3)

      return questions.length > 0 ? questions : this.getDefaultQuestions(category, field)
    } catch (error) {
      console.error('Error generating questions:', error)
      return this.getDefaultQuestions(category, field)
    }
  }

  /**
   * Get default questions for a field
   */
  private getDefaultQuestions(category: string, field: string): string[] {
    const defaultQuestions: Record<string, Record<string, string[]>> = {
      physical_layout: {
        seating_capacity: [
          'How many total seats do you have?',
          'What is your maximum occupancy?',
          'How are seats distributed across different areas?'
        ]
      },
      staff_info: {
        chef_count: [
          'How many chefs work in your kitchen?',
          'Do you have different chef roles (head chef, sous chef, etc.)?',
          'How many kitchen staff work during peak hours?'
        ]
      }
    }

    return defaultQuestions[category]?.[field] || [
      `Can you describe your ${field.replace(/_/g, ' ')}?`,
      `What details can you provide about ${field.replace(/_/g, ' ')}?`,
      `How would you characterize your ${field.replace(/_/g, ' ')}?`
    ]
  }

  /**
   * Calculate completeness score
   */
  private calculateCompleteness(context: any, template: IndustryTemplate): number {
    let totalFields = 0
    let completedFields = 0
    let weightedScore = 0
    let totalWeight = 0

    const weights = {
      critical: 40,
      high: 30,
      medium: 20,
      low: 10
    }

    for (const requirement of template.requiredFields) {
      const categoryData = context?.[requirement.category] || {}
      const weight = weights[requirement.importance]

      for (const field of requirement.fields) {
        totalFields++
        totalWeight += weight

        if (this.isFieldComplete(categoryData, field)) {
          completedFields++
          weightedScore += weight
        }
      }
    }

    // Calculate weighted score
    const score = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0

    return Math.min(100, score)
  }

  /**
   * Get industry comparison
   */
  private async getIndustryComparison(
    businessId: string,
    businessType: BusinessType,
    currentScore: number
  ): Promise<{ score: number; averageScore: number; percentile: number }> {
    const supabase = await createClient()

    // Get average score for similar businesses
    const { data: scores } = await supabase
      .from('business_contexts')
      .select('completeness_score')
      .eq('business_type', businessType)
      .not('business_id', 'eq', businessId)

    if (!scores || scores.length === 0) {
      return {
        score: currentScore,
        averageScore: 70, // Default industry average
        percentile: currentScore > 70 ? 75 : 25
      }
    }

    const validScores = scores
      .map(s => s.completeness_score)
      .filter(s => s != null && s > 0)

    const averageScore = Math.round(
      validScores.reduce((a, b) => a + b, 0) / validScores.length
    )

    const belowCurrent = validScores.filter(s => s < currentScore).length
    const percentile = Math.round((belowCurrent / validScores.length) * 100)

    return {
      score: currentScore,
      averageScore,
      percentile
    }
  }

  /**
   * Generate proactive questions based on gaps
   */
  private async generateProactiveQuestions(
    gaps: ContextGap[],
    businessType: BusinessType,
    currentContext: any
  ): Promise<string[]> {
    // Prioritize critical and high importance gaps
    const prioritizedGaps = gaps
      .filter(g => g.importance === 'critical' || g.importance === 'high')
      .slice(0, 5)

    const questions: string[] = []

    for (const gap of prioritizedGaps) {
      // Pick the most relevant question from suggested questions
      if (gap.suggestedQuestions.length > 0) {
        questions.push(gap.suggestedQuestions[0])
      }
    }

    // Add some discovery questions based on what's already filled
    if (currentContext?.operational?.peak_hours && !currentContext?.fraud_indicators) {
      questions.push('What unusual patterns should we watch for during your peak hours?')
    }

    if (currentContext?.staff_info && !currentContext?.operational?.shift_patterns) {
      questions.push('How do you schedule staff shifts throughout the week?')
    }

    return questions.slice(0, 5) // Return top 5 questions
  }

  /**
   * Determine next steps based on gaps
   */
  private determineNextSteps(gaps: ContextGap[], completenessScore: number): string[] {
    const steps: string[] = []

    // Group gaps by category
    const gapsByCategory = gaps.reduce((acc, gap) => {
      if (!acc[gap.category]) acc[gap.category] = []
      acc[gap.category].push(gap)
      return acc
    }, {} as Record<string, ContextGap[]>)

    // Generate steps based on gaps
    if (gapsByCategory.physical_layout) {
      steps.push('Complete your physical layout description to help identify unusual transaction locations')
    }

    if (gapsByCategory.staff_info) {
      steps.push('Add staff information to detect unauthorized transactions')
    }

    if (gapsByCategory.operational) {
      steps.push('Define operational patterns to identify after-hours fraud')
    }

    // Add score-based recommendations
    if (completenessScore < 30) {
      steps.unshift('Start with basic business information to establish a foundation')
    } else if (completenessScore < 60) {
      steps.push('Focus on critical fields to reach 60% completeness')
    } else if (completenessScore < 85) {
      steps.push('Add detailed patterns and indicators to reach the 85% target')
    } else {
      steps.push('Excellent progress! Fine-tune your context with specific fraud patterns')
    }

    return steps.slice(0, 4)
  }

  /**
   * Get industry benchmark for a field
   */
  private getIndustryBenchmark(
    businessType: BusinessType,
    category: string,
    field: string
  ): string {
    const benchmarks: Record<string, Record<string, Record<string, string>>> = {
      restaurant: {
        operational: {
          average_transaction: '150-250 SEK per person',
          peak_hours: '12:00-14:00 and 18:00-21:00'
        }
      },
      retail: {
        operational: {
          average_transaction: '300-500 SEK',
          peak_hours: 'Weekends and evenings'
        }
      }
    }

    return benchmarks[businessType]?.[category]?.[field] || ''
  }

  /**
   * Get suggestions for improving context
   */
  async getSuggestionsForImprovement(
    businessId: string,
    businessType: BusinessType,
    currentContext: any
  ): Promise<string[]> {
    const discovery = await this.analyzeContextGaps(businessId, businessType, currentContext)

    const suggestions: string[] = []

    // Add critical gap suggestions
    const criticalGaps = discovery.gaps.filter(g => g.importance === 'critical')
    for (const gap of criticalGaps.slice(0, 3)) {
      suggestions.push(`Add ${gap.field.replace(/_/g, ' ')} to improve fraud detection accuracy`)
    }

    // Add pattern-based suggestions
    const template = this.industryTemplates.get(businessType)
    if (template && !currentContext.fraud_indicators) {
      suggestions.push('Define fraud indicators specific to your business')
    }

    return suggestions
  }
}

// Export singleton instance
export const contextDiscoveryService = new ContextDiscoveryService()

// Export types and class
export default ContextDiscoveryService