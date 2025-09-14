/**
 * Context Service - Handles business context initialization and management
 * Coordinates between onboarding data, industry templates, and AI optimization
 */

import type { 
  BusinessType, 
  ContextTemplate, 
  INDUSTRY_TEMPLATES 
} from '@/types/onboarding'

export interface BusinessContextData {
  businessType: BusinessType
  departments: string[]
  staffRoles: string[]
  commonIssues: string[]
  fraudIndicators: string[]
  customQuestions: string[]
  businessSpecialty?: string
  commonCompliment?: string
  improvementArea?: string
  uniqueOffering?: string
  targetCustomer?: string
  
  // Derived from onboarding
  storeCount: number
  avgTransactionValue: number
  primaryGoals: string[]
  posSystem: string
  verificationPreference: string
}

export interface ContextInitializationResult {
  contextData: BusinessContextData
  completenessScore: number
  initializedAt: string
  status: 'success' | 'partial' | 'error'
  message?: string
}

export interface BusinessData {
  id: string
  business_type?: string
  store_count?: number
  avg_transaction_value?: number
  primary_goals?: string[]
  pos_system?: string
  verification_preference?: string
  quick_context?: {
    businessSpecialty?: string
    commonCompliment?: string
    improvementArea?: string
    uniqueOffering?: string
    targetCustomer?: string
  }
}

export class ContextService {
  /**
   * Initialize business context from onboarding data
   */
  static async initializeFromOnboarding(businessData: BusinessData): Promise<ContextInitializationResult> {
    try {
      // Extract business type and get industry template
      const businessType = (businessData.business_type as BusinessType) || 'other'
      const template = this.getIndustryTemplate(businessType)
      
      // Build initial context data from template + onboarding data
      const contextData: BusinessContextData = {
        businessType,
        departments: [...template.departments],
        staffRoles: [...template.staffRoles],
        commonIssues: [...template.commonIssues],
        fraudIndicators: [...template.fraudIndicators],
        customQuestions: [...template.customQuestions],
        
        // From onboarding data
        storeCount: businessData.store_count || 1,
        avgTransactionValue: businessData.avg_transaction_value || 0,
        primaryGoals: businessData.primary_goals || [],
        posSystem: businessData.pos_system || 'manual',
        verificationPreference: businessData.verification_preference || 'manual_upload',
        
        // From quick context
        businessSpecialty: businessData.quick_context?.businessSpecialty || '',
        commonCompliment: businessData.quick_context?.commonCompliment || '',
        improvementArea: businessData.quick_context?.improvementArea || '',
        uniqueOffering: businessData.quick_context?.uniqueOffering || '',
        targetCustomer: businessData.quick_context?.targetCustomer || '',
      }
      
      // Calculate initial completeness score
      const completenessScore = this.calculateInitialCompleteness(contextData)
      
      return {
        contextData,
        completenessScore,
        initializedAt: new Date().toISOString(),
        status: completenessScore > 25 ? 'success' : 'partial',
        message: this.getInitializationMessage(completenessScore)
      }
    } catch (error) {
      console.error('Error initializing context:', error)
      return {
        contextData: this.getMinimalContext(businessData.business_type as BusinessType),
        completenessScore: 15,
        initializedAt: new Date().toISOString(),
        status: 'error',
        message: 'Context initialized with minimal data due to an error'
      }
    }
  }
  
  /**
   * Get industry template for business type
   */
  private static getIndustryTemplate(businessType: BusinessType): ContextTemplate {
    // Import the templates dynamically to avoid circular imports
    const templates: Record<BusinessType, ContextTemplate> = {
      restaurant: {
        businessType: 'restaurant',
        departments: ['Dining area', 'Bar', 'Kitchen', 'Restroom', 'Outdoor seating'],
        staffRoles: ['Servers', 'Bartenders', 'Hosts', 'Chefs'],
        commonIssues: ['Wait times', 'Food temperature', 'Menu variety'],
        fraudIndicators: ['Claims about dishes not on menu', 'Wrong hours'],
        customQuestions: ['How was the food quality?', 'How was the service?'],
      },
      retail: {
        businessType: 'retail',
        departments: ['Entrance', 'Aisles', 'Checkout', 'Fitting rooms', 'Customer service'],
        staffRoles: ['Cashiers', 'Floor staff', 'Managers'],
        commonIssues: ['Product availability', 'Sizing', 'Pricing clarity'],
        fraudIndicators: ['Products not carried', 'Impossible department claims'],
        customQuestions: ['Did you find what you were looking for?', 'How was the checkout experience?'],
      },
      grocery: {
        businessType: 'grocery',
        departments: ['Produce', 'Meat', 'Dairy', 'Bakery', 'Frozen', 'Checkout'],
        staffRoles: ['Cashiers', 'Department specialists', 'Stockers'],
        commonIssues: ['Freshness', 'Stock levels', 'Queue times'],
        fraudIndicators: ['Seasonal items out of season', 'Wrong price ranges'],
        customQuestions: ['How fresh were the products?', 'Were items in stock?'],
      },
      barbershop: {
        businessType: 'barbershop',
        departments: ['Reception', 'Waiting area', 'Service chairs'],
        staffRoles: ['Receptionists', 'Barbers/Stylists', 'Managers'],
        commonIssues: ['Wait times', 'Service quality', 'Booking system'],
        fraudIndicators: ['Services not offered', 'Impossible time slots'],
        customQuestions: ['How was your stylist?', 'Was the wait time acceptable?'],
      },
      pharmacy: {
        businessType: 'pharmacy',
        departments: ['Prescription counter', 'OTC sections', 'Consultation area'],
        staffRoles: ['Pharmacists', 'Pharmacy technicians', 'Cashiers'],
        commonIssues: ['Wait times', 'Stock availability', 'Staff knowledge'],
        fraudIndicators: ['Prescription claims without pickup', 'Wrong medication names'],
        customQuestions: ['Was the pharmacist helpful?', 'Did you receive proper guidance?'],
      },
      electronics: {
        businessType: 'electronics',
        departments: ['Computer section', 'Mobile section', 'Audio/Video', 'Gaming', 'Service desk'],
        staffRoles: ['Sales associates', 'Tech support', 'Cashiers'],
        commonIssues: ['Product knowledge', 'Pricing', 'Warranty information'],
        fraudIndicators: ['Products not in inventory', 'Impossible tech specs'],
        customQuestions: ['Did staff have good product knowledge?', 'Were prices clearly marked?'],
      },
      clothing: {
        businessType: 'clothing',
        departments: ['Men\'s section', 'Women\'s section', 'Fitting rooms', 'Accessories', 'Checkout'],
        staffRoles: ['Sales associates', 'Fitting room attendants', 'Cashiers'],
        commonIssues: ['Size availability', 'Fitting room wait', 'Return policy'],
        fraudIndicators: ['Brands not carried', 'Impossible size combinations'],
        customQuestions: ['Did you find your size?', 'How was the fitting room experience?'],
      },
      other: {
        businessType: 'other',
        departments: [],
        staffRoles: [],
        commonIssues: [],
        fraudIndicators: [],
        customQuestions: [],
      },
    }
    
    return templates[businessType] || templates.other
  }
  
  /**
   * Calculate initial completeness score based on available data
   */
  private static calculateInitialCompleteness(contextData: BusinessContextData): number {
    let score = 0
    
    // Base template data (20 points)
    if (contextData.departments.length > 0) score += 5
    if (contextData.staffRoles.length > 0) score += 5
    if (contextData.commonIssues.length > 0) score += 5
    if (contextData.customQuestions.length > 0) score += 5
    
    // Onboarding business data (30 points)
    if (contextData.businessType !== 'other') score += 10
    if (contextData.storeCount > 0) score += 5
    if (contextData.avgTransactionValue > 0) score += 5
    if (contextData.primaryGoals.length > 0) score += 10
    
    // Quick context data (30 points)
    if (contextData.businessSpecialty) score += 10
    if (contextData.commonCompliment) score += 10
    if (contextData.improvementArea) score += 10
    
    // POS/Integration setup (20 points)
    if (contextData.posSystem && contextData.posSystem !== 'none') score += 10
    if (contextData.verificationPreference) score += 10
    
    return Math.min(score, 100)
  }
  
  /**
   * Get minimal context for error recovery
   */
  private static getMinimalContext(businessType?: BusinessType): BusinessContextData {
    const type = businessType || 'other'
    const template = this.getIndustryTemplate(type)
    
    return {
      businessType: type,
      departments: template.departments,
      staffRoles: template.staffRoles,
      commonIssues: template.commonIssues,
      fraudIndicators: template.fraudIndicators,
      customQuestions: template.customQuestions,
      storeCount: 1,
      avgTransactionValue: 0,
      primaryGoals: [],
      posSystem: 'manual',
      verificationPreference: 'manual_upload',
    }
  }
  
  /**
   * Get initialization message based on completeness score
   */
  private static getInitializationMessage(score: number): string {
    if (score >= 70) {
      return 'Your business context has been initialized with excellent detail! You\'re ready to start collecting high-quality feedback.'
    } else if (score >= 50) {
      return 'Your business context has been initialized successfully. Consider adding more details to improve feedback quality.'
    } else if (score >= 30) {
      return 'Your business context has been initialized with basic information. We recommend completing more details soon.'
    } else {
      return 'Your business context has been initialized with minimal data. Please complete your profile to improve feedback accuracy.'
    }
  }
  
  /**
   * Enhance context data with AI suggestions
   * Uses GPT-4o-mini to analyze and improve context
   */
  static async enhanceWithAI(contextData: BusinessContextData): Promise<BusinessContextData> {
    try {
      // Import AI services dynamically to avoid circular dependencies
      const { openAIService } = await import('@/lib/ai/openai-service')
      const { default: PromptBuilder } = await import('@/lib/ai/prompt-builder')

      // Build improvement prompt
      const prompt = PromptBuilder.buildImprovementPrompt(
        contextData,
        this.calculateInitialCompleteness(contextData),
        contextData.businessType
      )

      // Get AI suggestions
      const response = await openAIService.sendMessage(
        prompt,
        [],
        {
          businessType: contextData.businessType,
          language: 'auto',
          contextData
        }
      )

      if (response.error) {
        console.error('AI enhancement failed:', response.error)
        return contextData
      }

      // Parse AI suggestions and apply improvements
      const enhancedData = { ...contextData }

      // Extract specific improvements from AI response
      const suggestions = this.parseAISuggestions(response.content)

      // Apply suggestions to context data
      if (suggestions.fraudIndicators && suggestions.fraudIndicators.length > 0) {
        enhancedData.fraudIndicators = Array.from(
          new Set([...contextData.fraudIndicators, ...suggestions.fraudIndicators])
        )
      }

      if (suggestions.customQuestions && suggestions.customQuestions.length > 0) {
        enhancedData.customQuestions = Array.from(
          new Set([...contextData.customQuestions, ...suggestions.customQuestions])
        )
      }

      if (suggestions.commonIssues && suggestions.commonIssues.length > 0) {
        enhancedData.commonIssues = Array.from(
          new Set([...contextData.commonIssues, ...suggestions.commonIssues])
        )
      }

      return enhancedData
    } catch (error) {
      console.error('Error enhancing context with AI:', error)
      return contextData
    }
  }

  /**
   * Parse AI suggestions from response
   */
  private static parseAISuggestions(aiResponse: string): {
    fraudIndicators?: string[]
    customQuestions?: string[]
    commonIssues?: string[]
  } {
    const suggestions: any = {}

    // Look for fraud indicators
    const fraudMatch = aiResponse.match(/fraud[^:]*:([^]*?)(?:\n\n|$)/i)
    if (fraudMatch) {
      suggestions.fraudIndicators = fraudMatch[1]
        .split(/[,\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
    }

    // Look for custom questions
    const questionsMatch = aiResponse.match(/questions?[^:]*:([^]*?)(?:\n\n|$)/i)
    if (questionsMatch) {
      suggestions.customQuestions = questionsMatch[1]
        .split(/[?\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => s.endsWith('?') ? s : `${s}?`)
    }

    // Look for common issues
    const issuesMatch = aiResponse.match(/issues?[^:]*:([^]*?)(?:\n\n|$)/i)
    if (issuesMatch) {
      suggestions.commonIssues = issuesMatch[1]
        .split(/[,\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
    }

    return suggestions
  }
  
  /**
   * Validate context data completeness for quality assurance
   */
  static validateContextData(contextData: BusinessContextData): {
    isValid: boolean
    missingFields: string[]
    score: number
  } {
    const missingFields: string[] = []
    
    // Check required fields
    if (!contextData.businessType || contextData.businessType === 'other') {
      missingFields.push('Business Type')
    }
    
    if (contextData.departments.length === 0) {
      missingFields.push('Business Departments')
    }
    
    if (contextData.staffRoles.length === 0) {
      missingFields.push('Staff Roles')
    }
    
    if (!contextData.businessSpecialty) {
      missingFields.push('Business Specialty')
    }
    
    if (contextData.customQuestions.length === 0) {
      missingFields.push('Custom Questions')
    }
    
    const score = this.calculateInitialCompleteness(contextData)
    
    return {
      isValid: missingFields.length === 0 && score >= 30,
      missingFields,
      score
    }
  }
}