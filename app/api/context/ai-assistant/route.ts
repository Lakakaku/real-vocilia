/**
 * AI Assistant API Route - Handles chat interactions with GPT-4o-mini
 * Implements the /api/context/ai-assistant endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { openAIService } from '@/lib/ai/openai-service'
import { conversationManager } from '@/lib/ai/conversation-manager'
import PromptBuilder from '@/lib/ai/prompt-builder'
import type { BusinessType } from '@/types/onboarding'

export const dynamic = 'force-dynamic'

// Request validation schema
const requestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversation_id: z.string().optional(),
})

// Response type matching API.md specification
interface AIAssistantResponse {
  response: string
  context_updates?: {
    suggested: string[]
  }
  conversation_id: string
  usage?: {
    tokens: number
    estimatedCost: number
  }
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json()
    const validation = requestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { message, conversation_id } = validation.data

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get business data and context
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, business_type')
      .eq('id', user.id)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Get current context data
    const { data: contextData, error: contextError } = await supabase
      .from('business_contexts')
      .select('*')
      .eq('business_id', business.id)
      .single()

    if (contextError) {
      console.error('Error fetching context:', contextError)
    }

    // Load or create conversation session
    let session = conversation_id
      ? await conversationManager.loadSession(business.id, conversation_id)
      : null

    if (!session) {
      session = await conversationManager.createSession(business.id, {
        businessType: business.business_type,
        businessName: business.name,
        currentContext: contextData?.context_data,
      })
    }

    // Add user message to conversation
    await conversationManager.addMessage(session, {
      role: 'user',
      content: message,
    })

    // Detect language from user input
    const language = detectLanguage(message)

    // Build context for AI
    const promptContext = {
      businessType: (business.business_type as BusinessType) || 'other',
      businessName: business.name,
      language,
      completenessScore: contextData?.completeness_score || 0,
      currentContext: contextData?.context_data,
      conversationStage: getConversationStage(contextData?.completeness_score || 0),
    }

    // Get conversation history for API
    const conversationHistory = conversationManager.getMessagesForAPI(session)

    // Send message to OpenAI
    const aiResponse = await openAIService.sendMessage(
      message,
      conversationHistory,
      {
        businessType: promptContext.businessType,
        language,
        businessName: business.name,
        contextData: contextData?.context_data,
      }
    )

    // Handle AI service errors
    if (aiResponse.error) {
      console.error('AI service error:', aiResponse.error)

      // Return graceful fallback response
      return NextResponse.json({
        response: getFallbackResponse(language),
        conversation_id: session.id,
        error: 'AI service temporarily unavailable',
      } as AIAssistantResponse)
    }

    // Add AI response to conversation
    await conversationManager.addMessage(session, {
      role: 'assistant',
      content: aiResponse.content,
    })

    // Extract context update suggestions from AI response
    const contextSuggestions = extractContextSuggestions(aiResponse.content)

    // Update context completeness if needed
    if (contextSuggestions.length > 0) {
      await updateContextCompleteness(business.id, contextData, supabase)
    }

    // Prepare response
    const response: AIAssistantResponse = {
      response: aiResponse.content,
      conversation_id: session.id,
      ...(contextSuggestions.length > 0 && {
        context_updates: {
          suggested: contextSuggestions,
        },
      }),
      ...(aiResponse.usage && {
        usage: {
          tokens: aiResponse.usage.totalTokens,
          estimatedCost: aiResponse.usage.estimatedCost,
        },
      }),
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('AI Assistant API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        response: 'I apologize, but I encountered an error. Please try again.',
        conversation_id: '',
      },
      { status: 500 }
    )
  }
}

/**
 * Detect language from user input
 */
function detectLanguage(text: string): 'sv' | 'en' | 'auto' {
  const swedishIndicators = [
    'jag', 'vi', 'är', 'har', 'kan', 'vill', 'ska', 'och', 'att', 'det',
    'för', 'på', 'med', 'som', 'inte', 'men', 'också', 'mycket', 'bra',
  ]

  const lowercaseText = text.toLowerCase()
  const swedishWordCount = swedishIndicators.filter(word =>
    lowercaseText.includes(` ${word} `) ||
    lowercaseText.startsWith(`${word} `) ||
    lowercaseText.endsWith(` ${word}`)
  ).length

  // If 3+ Swedish indicators found, assume Swedish
  if (swedishWordCount >= 3) {
    return 'sv'
  }

  // Otherwise default to English
  return 'en'
}

/**
 * Get conversation stage based on completeness
 */
function getConversationStage(completenessScore: number): 'initial' | 'building' | 'refining' | 'complete' {
  if (completenessScore >= 85) return 'complete'
  if (completenessScore >= 60) return 'refining'
  if (completenessScore >= 30) return 'building'
  return 'initial'
}

/**
 * Extract context update suggestions from AI response
 */
function extractContextSuggestions(aiResponse: string): string[] {
  const suggestions: string[] = []

  // Look for patterns that suggest context updates
  const patterns = [
    /add[^.]*to (your )?context/gi,
    /update[^.]*context (with|to include)/gi,
    /include[^.]*in (your )?context/gi,
    /document[^.]*in (the|your) context/gi,
  ]

  for (const pattern of patterns) {
    const matches = aiResponse.match(pattern)
    if (matches) {
      suggestions.push(...matches.map(m => m.trim()))
    }
  }

  // Look for specific area mentions
  if (aiResponse.toLowerCase().includes('physical layout')) {
    suggestions.push('Update physical layout information')
  }
  if (aiResponse.toLowerCase().includes('staff') || aiResponse.toLowerCase().includes('employee')) {
    suggestions.push('Add staff information')
  }
  if (aiResponse.toLowerCase().includes('product') || aiResponse.toLowerCase().includes('service')) {
    suggestions.push('Update products/services catalog')
  }
  if (aiResponse.toLowerCase().includes('fraud')) {
    suggestions.push('Add fraud indicators')
  }

  // Return unique suggestions (max 5)
  return Array.from(new Set(suggestions)).slice(0, 5)
}

/**
 * Update context completeness score
 */
async function updateContextCompleteness(
  businessId: string,
  currentContext: any,
  supabase: any
): Promise<void> {
  try {
    // Simple scoring logic - can be enhanced
    let score = 0
    const contextData = currentContext?.context_data || {}

    // Check major areas (20 points each, max 100)
    if (contextData.physical_layout?.departments?.length > 0) score += 20
    if (contextData.staff_info?.employees?.length > 0) score += 20
    if (contextData.products_services?.categories?.length > 0) score += 20
    if (contextData.operational_details?.hours) score += 20
    if (contextData.fraud_indicators?.length > 0) score += 20

    // Only update if score changed significantly (5+ points)
    const currentScore = currentContext?.completeness_score || 0
    if (Math.abs(score - currentScore) >= 5) {
      await supabase
        .from('business_contexts')
        .update({
          completeness_score: score,
          last_ai_update: new Date().toISOString(),
        })
        .eq('business_id', businessId)
    }
  } catch (error) {
    console.error('Error updating completeness score:', error)
  }
}

/**
 * Get fallback response when AI is unavailable
 */
function getFallbackResponse(language: 'sv' | 'en' | 'auto'): string {
  if (language === 'sv') {
    return 'Jag ber om ursäkt, men AI-assistenten är tillfälligt otillgänglig. Du kan fortsätta bygga din kontext manuellt eller försöka igen om några minuter.'
  }
  return 'I apologize, but the AI assistant is temporarily unavailable. You can continue building your context manually or try again in a few minutes.'
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}