/**
 * Prompt Builder - Creates context-aware prompts for GPT-4o-mini
 * Handles industry-specific prompts, fraud detection patterns, and multilingual responses
 */

import type { BusinessType } from '@/types/onboarding'

export interface PromptContext {
  businessType: BusinessType
  businessName?: string
  language: 'sv' | 'en' | 'auto'
  completenessScore?: number
  currentContext?: any
  conversationStage?: 'initial' | 'building' | 'refining' | 'complete'
}

export interface FraudPattern {
  pattern: string
  severity: 'low' | 'medium' | 'high'
  examples: string[]
}

export class PromptBuilder {
  /**
   * Build the main system prompt for context building
   */
  static buildSystemPrompt(context: PromptContext): string {
    const { businessType, businessName, language, completenessScore = 0 } = context

    const languageInstruction = this.getLanguageInstruction(language)
    const industryContext = this.getIndustryContext(businessType)
    const stageGuidance = this.getStageGuidance(context.conversationStage || 'initial', completenessScore)

    return `You are an expert AI assistant for Vocilia, specializing in helping businesses build comprehensive operational context for fraud detection and customer feedback analysis.

BUSINESS CONTEXT:
- Business: ${businessName || 'the business'}
- Industry: ${industryContext.displayName}
- Context Completeness: ${completenessScore}%
- Target Completeness: 85%

${languageInstruction}

YOUR OBJECTIVES:
1. Help the business reach 85% context completeness
2. Identify industry-specific fraud patterns
3. Suggest relevant custom questions for feedback
4. Learn about their unique operations and challenges
5. Build trust through knowledgeable, relevant questions

INDUSTRY EXPERTISE:
${industryContext.expertise}

FRAUD DETECTION FOCUS:
${industryContext.fraudFocus}

${stageGuidance}

CONVERSATION STYLE:
- Be conversational and professional
- Ask one focused question at a time
- Provide specific examples relevant to their industry
- Acknowledge and build upon their responses
- Keep responses concise (2-3 paragraphs max)
- Use bullet points for clarity when listing multiple items

IMPORTANT:
- Never make assumptions about their business
- Always validate understanding before moving forward
- Focus on practical, actionable information
- Prioritize fraud detection and quality assessment`
  }

  /**
   * Build prompts for specific context areas
   */
  static buildAreaPrompt(area: string, context: PromptContext): string {
    const { businessType, language } = context
    const industryContext = this.getIndustryContext(businessType)

    const areaPrompts: Record<string, string> = {
      physical_layout: `Help me understand the physical layout of your ${industryContext.displayName.toLowerCase()}.
        What are the main areas customers interact with?
        This helps us detect when feedback mentions areas that don't exist.`,

      staff_info: `Let's document your staff structure.
        What departments do you have, and what are the key roles?
        This helps validate when customers mention specific staff or departments.`,

      products_services: `What are your main products or services?
        What price ranges do you typically work with?
        This helps identify suspicious claims about offerings you don't have.`,

      operational_details: `Tell me about your operating hours and peak times.
        When do you see the most customers?
        This helps validate the timing of customer feedback.`,

      customer_patterns: `What are typical customer behaviors in your ${industryContext.displayName.toLowerCase()}?
        What's a normal transaction look like?
        This helps identify unusual or fraudulent patterns.`,

      fraud_indicators: `Based on your experience, what are red flags for fake feedback?
        What claims would immediately seem suspicious to you?
        This helps train our fraud detection specifically for your business.`,
    }

    const prompt = areaPrompts[area] || 'Tell me more about this aspect of your business.'

    return this.applyLanguage(prompt, language)
  }

  /**
   * Build fraud detection prompts
   */
  static buildFraudDetectionPrompt(
    feedback: string,
    businessContext: any,
    businessType: BusinessType
  ): string {
    const fraudPatterns = this.getIndustryFraudPatterns(businessType)

    return `Analyze this customer feedback for potential fraud indicators.

FEEDBACK TO ANALYZE:
"${feedback}"

BUSINESS CONTEXT:
${JSON.stringify(businessContext, null, 2)}

INDUSTRY-SPECIFIC FRAUD PATTERNS TO CHECK:
${fraudPatterns.map(p => `- ${p.pattern} (Severity: ${p.severity})`).join('\n')}

ANALYSIS REQUIRED:
1. Legitimacy Score (0-100): How likely is this genuine feedback?
2. Specific Red Flags: List any suspicious elements
3. Context Matches: What elements align with the business context?
4. Context Mismatches: What doesn't match the known business details?
5. Recommendation: Accept, Review, or Reject

Provide a structured analysis in JSON format.`
  }

  /**
   * Build context improvement suggestions prompt
   */
  static buildImprovementPrompt(
    currentContext: any,
    completenessScore: number,
    businessType: BusinessType
  ): string {
    const missing = this.identifyMissingElements(currentContext, businessType)

    return `Based on the current business context (${completenessScore}% complete), suggest the most impactful improvements.

CURRENT CONTEXT:
${JSON.stringify(currentContext, null, 2)}

MISSING ELEMENTS:
${missing.join('\n')}

Provide 3-5 specific, actionable suggestions that would most improve fraud detection accuracy.
Focus on the gaps that would have the biggest impact on reaching the 85% completeness target.`
  }

  /**
   * Get language instruction
   */
  private static getLanguageInstruction(language: 'sv' | 'en' | 'auto'): string {
    switch (language) {
      case 'sv':
        return `LANGUAGE: Always respond in Swedish. Use professional but friendly Swedish business language.`
      case 'en':
        return `LANGUAGE: Always respond in English. Use clear, professional business English.`
      case 'auto':
      default:
        return `LANGUAGE: Match the language of the user's input. If they write in Swedish, respond in Swedish. If they write in English, respond in English. Default to English if unclear.`
    }
  }

  /**
   * Get industry-specific context
   */
  private static getIndustryContext(businessType: BusinessType): {
    displayName: string
    expertise: string
    fraudFocus: string
  } {
    const contexts: Record<BusinessType, any> = {
      restaurant: {
        displayName: 'Restaurant',
        expertise: `You understand restaurant operations including dining areas, kitchen workflows, service standards, and typical customer experiences. You know about menu items, wait times, food quality issues, and service interactions.`,
        fraudFocus: `Focus on: claims about menu items not offered, impossible service timings, staff names that don't exist, complaints about areas not in the restaurant.`,
      },
      retail: {
        displayName: 'Retail Store',
        expertise: `You understand retail operations including inventory management, customer service, checkout processes, and merchandising. You know about product categories, pricing, returns, and staff interactions.`,
        fraudFocus: `Focus on: claims about products not carried, wrong price ranges, non-existent departments, impossible store hours.`,
      },
      grocery: {
        displayName: 'Grocery Store',
        expertise: `You understand grocery operations including perishables management, department layouts, checkout efficiency, and freshness standards. You know about product rotation, peak shopping times, and common complaints.`,
        fraudFocus: `Focus on: seasonal items out of season, departments that don't exist, impossible freshness claims, wrong product locations.`,
      },
      barbershop: {
        displayName: 'Barbershop/Salon',
        expertise: `You understand salon operations including appointment scheduling, service types, stylist assignments, and customer preferences. You know about wait times, service quality, and booking systems.`,
        fraudFocus: `Focus on: services not offered, stylists who don't work there, impossible appointment times, wrong service prices.`,
      },
      pharmacy: {
        displayName: 'Pharmacy',
        expertise: `You understand pharmacy operations including prescription processing, OTC sections, consultation services, and regulatory requirements. You know about wait times, privacy concerns, and medication counseling.`,
        fraudFocus: `Focus on: prescription claims without records, wrong medication names, services not provided, impossible wait times.`,
      },
      electronics: {
        displayName: 'Electronics Store',
        expertise: `You understand electronics retail including product knowledge requirements, technical support, warranty services, and price points. You know about brand availability, service offerings, and common customer needs.`,
        fraudFocus: `Focus on: products not in inventory, impossible technical specifications, wrong brand claims, non-existent services.`,
      },
      clothing: {
        displayName: 'Clothing Store',
        expertise: `You understand fashion retail including sizing, fitting services, seasonal collections, and return policies. You know about brand positioning, customer service, and inventory turnover.`,
        fraudFocus: `Focus on: brands not carried, impossible size combinations, non-existent collections, wrong department claims.`,
      },
      other: {
        displayName: 'Business',
        expertise: `You understand general business operations and customer service principles. You're adaptable and will learn about their specific industry through conversation.`,
        fraudFocus: `Focus on: general inconsistencies, impossible timings, non-existent staff or locations, unrealistic claims.`,
      },
    }

    return contexts[businessType] || contexts.other
  }

  /**
   * Get conversation stage guidance
   */
  private static getStageGuidance(stage: string, completenessScore: number): string {
    if (completenessScore >= 85) {
      return `STAGE: Context is complete! Focus on refinement and maintenance. Ask about recent changes, new offerings, or areas they'd like to improve.`
    }

    switch (stage) {
      case 'initial':
        return `STAGE: Initial setup. Start with the basics - understand their business type, size, and main operations. Be welcoming and explain the value of building context.`

      case 'building':
        return `STAGE: Active building (${completenessScore}% complete). Focus on filling gaps systematically. Prioritize areas that most impact fraud detection.`

      case 'refining':
        return `STAGE: Refinement (${completenessScore}% complete). Add specific details and edge cases. Focus on unique aspects that distinguish them from competitors.`

      default:
        return `STAGE: Continue building context. Current progress: ${completenessScore}%. Focus on reaching 85% completeness.`
    }
  }

  /**
   * Get industry-specific fraud patterns
   */
  private static getIndustryFraudPatterns(businessType: BusinessType): FraudPattern[] {
    const patterns: Record<BusinessType, FraudPattern[]> = {
      restaurant: [
        {
          pattern: 'Claims about menu items not on current menu',
          severity: 'high',
          examples: ['Ordered pasta in a burger restaurant', 'Complained about sushi in a pizza place'],
        },
        {
          pattern: 'Impossible service timing claims',
          severity: 'medium',
          examples: ['Claimed 2-hour wait for fast food', '5-minute service in fine dining'],
        },
      ],
      retail: [
        {
          pattern: 'Products outside store category',
          severity: 'high',
          examples: ['Electronics in clothing store', 'Groceries in furniture store'],
        },
        {
          pattern: 'Price ranges far outside normal',
          severity: 'medium',
          examples: ['$1000 t-shirt in budget store', '$5 electronics in premium store'],
        },
      ],
      grocery: [
        {
          pattern: 'Seasonal items out of season',
          severity: 'high',
          examples: ['Fresh strawberries in winter', 'Christmas items in July'],
        },
        {
          pattern: 'Departments that don\'t exist',
          severity: 'high',
          examples: ['Hot food counter in store without one', 'Pharmacy in basic grocery'],
        },
      ],
      barbershop: [
        {
          pattern: 'Services not offered',
          severity: 'high',
          examples: ['Spa treatments in basic barbershop', 'Medical procedures in salon'],
        },
        {
          pattern: 'Wrong stylist names',
          severity: 'medium',
          examples: ['Named stylist who doesn\'t work there', 'Wrong schedule claims'],
        },
      ],
      pharmacy: [
        {
          pattern: 'Prescription without record',
          severity: 'high',
          examples: ['Claims about prescription not in system', 'Wrong medication names'],
        },
        {
          pattern: 'Services not provided',
          severity: 'medium',
          examples: ['Vaccination in pharmacy without service', 'Consultations not offered'],
        },
      ],
      electronics: [
        {
          pattern: 'Products not in inventory',
          severity: 'high',
          examples: ['Brands not carried', 'Products discontinued years ago'],
        },
        {
          pattern: 'Impossible specifications',
          severity: 'medium',
          examples: ['Wrong technical details', 'Features that don\'t exist'],
        },
      ],
      clothing: [
        {
          pattern: 'Brands not carried',
          severity: 'high',
          examples: ['Luxury brands in budget store', 'Wrong brand claims'],
        },
        {
          pattern: 'Non-existent departments',
          severity: 'medium',
          examples: ['Kids section in adult-only store', 'Wrong floor claims'],
        },
      ],
      other: [
        {
          pattern: 'Generic inconsistencies',
          severity: 'medium',
          examples: ['Time outside business hours', 'Locations that don\'t exist'],
        },
      ],
    }

    return patterns[businessType] || patterns.other
  }

  /**
   * Identify missing context elements
   */
  private static identifyMissingElements(currentContext: any, businessType: BusinessType): string[] {
    const missing: string[] = []

    // Check universal elements
    if (!currentContext?.physical_layout?.departments?.length) {
      missing.push('- Physical layout and departments')
    }
    if (!currentContext?.staff_info?.employees?.length) {
      missing.push('- Staff names and roles')
    }
    if (!currentContext?.operational_details?.hours) {
      missing.push('- Operating hours and peak times')
    }
    if (!currentContext?.products_services?.categories?.length) {
      missing.push('- Product/service categories')
    }
    if (!currentContext?.fraud_indicators?.length) {
      missing.push('- Industry-specific fraud indicators')
    }
    if (!currentContext?.custom_questions?.length) {
      missing.push('- Custom feedback questions')
    }

    // Industry-specific checks
    if (businessType === 'restaurant' && !currentContext?.menu_categories) {
      missing.push('- Menu categories and popular items')
    }
    if (businessType === 'retail' && !currentContext?.price_ranges) {
      missing.push('- Typical price ranges')
    }
    if (businessType === 'grocery' && !currentContext?.departments?.includes('produce')) {
      missing.push('- Department-specific details')
    }

    return missing
  }

  /**
   * Apply language translation (basic)
   */
  private static applyLanguage(text: string, language: 'sv' | 'en' | 'auto'): string {
    if (language !== 'sv') {
      return text
    }

    // Basic Swedish translations for common phrases
    const translations: Record<string, string> = {
      'Help me understand': 'Hjälp mig förstå',
      'Tell me about': 'Berätta om',
      'What are': 'Vilka är',
      'This helps': 'Detta hjälper',
      'customers': 'kunder',
      'staff': 'personal',
      'products': 'produkter',
      'services': 'tjänster',
    }

    let swedishText = text
    for (const [eng, swe] of Object.entries(translations)) {
      swedishText = swedishText.replace(new RegExp(eng, 'gi'), swe)
    }

    return swedishText
  }
}

export default PromptBuilder