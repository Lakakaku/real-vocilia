/**
 * Context Server Actions - Server-side actions for context management
 * Handles context initialization and updates from client components
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ContextService, type BusinessData } from '@/lib/services/context-service'
import { ContextOperations } from '@/lib/db/context-operations'

export interface ContextInitializationResult {
  success: boolean
  completenessScore?: number
  message?: string
  error?: string
}

export interface ContextInitializationProgress {
  stage: 'loading_business' | 'applying_template' | 'calculating_score' | 'saving_context' | 'complete' | 'error'
  progress: number
  message: string
  error?: string
}

/**
 * Initialize business context from onboarding data
 */
export async function initializeContextFromOnboarding(
  businessId: string
): Promise<ContextInitializationResult> {
  try {
    if (!businessId) {
      return { success: false, error: 'Business ID is required' }
    }

    const supabase = await createClient()
    
    // Get business data from database
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select(`
        id,
        business_type,
        store_count,
        avg_transaction_value,
        primary_goals,
        pos_system,
        verification_preference,
        quick_context
      `)
      .eq('id', businessId)
      .single()
    
    if (businessError) {
      console.error('Error fetching business data:', businessError)
      return { success: false, error: 'Failed to load business data' }
    }
    
    if (!businessData) {
      return { success: false, error: 'Business not found' }
    }
    
    // Check if context already exists
    const { success: checkSuccess, hasContext } = await ContextOperations.hasInitializedContext(
      businessId, 
      true // use server client
    )
    
    if (!checkSuccess) {
      return { success: false, error: 'Failed to check existing context' }
    }
    
    if (hasContext) {
      return { 
        success: false, 
        error: 'Context already initialized for this business',
        message: 'Context has already been set up. Use the context manager to make updates.'
      }
    }
    
    // Initialize context using the service
    const initResult = await ContextService.initializeFromOnboarding(businessData as BusinessData)
    
    if (initResult.status === 'error') {
      return { 
        success: false, 
        error: initResult.message || 'Failed to initialize context' 
      }
    }
    
    // Save to database
    const { success: saveSuccess, error: saveError } = await ContextOperations.createInitialContext(
      businessId,
      initResult.contextData,
      initResult.completenessScore,
      true // use server client
    )
    
    if (!saveSuccess) {
      console.error('Error saving context:', saveError)
      return { success: false, error: 'Failed to save context to database' }
    }
    
    // Update business record to mark context as initialized
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ 
        context_initialized: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessId)
    
    if (updateError) {
      console.error('Error updating business record:', updateError)
      // Don't fail the whole operation for this
    }
    
    // Revalidate relevant paths
    revalidatePath('/business/context')
    revalidatePath('/business/dashboard')
    
    return {
      success: true,
      completenessScore: initResult.completenessScore,
      message: initResult.message
    }
    
  } catch (error) {
    console.error('Unexpected error in initializeContextFromOnboarding:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Get context initialization status for a business
 */
export async function getContextInitializationStatus(
  businessId: string
): Promise<{
  success: boolean
  isInitialized?: boolean
  completenessScore?: number
  error?: string
}> {
  try {
    if (!businessId) {
      return { success: false, error: 'Business ID is required' }
    }
    
    const { success, hasContext, error } = await ContextOperations.hasInitializedContext(
      businessId,
      true // use server client
    )
    
    if (!success) {
      return { success: false, error: error || 'Failed to check context status' }
    }
    
    if (!hasContext) {
      return { success: true, isInitialized: false }
    }
    
    // Get completeness score
    const { success: statsSuccess, stats, error: statsError } = await ContextOperations.getContextStats(
      businessId,
      true // use server client
    )
    
    if (!statsSuccess) {
      console.error('Error getting context stats:', statsError)
      return { success: true, isInitialized: true } // Context exists but couldn't get stats
    }
    
    return {
      success: true,
      isInitialized: true,
      completenessScore: stats?.completenessScore
    }
    
  } catch (error) {
    console.error('Unexpected error in getContextInitializationStatus:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Retry context initialization (for error recovery)
 */
export async function retryContextInitialization(
  businessId: string
): Promise<ContextInitializationResult> {
  try {
    if (!businessId) {
      return { success: false, error: 'Business ID is required' }
    }
    
    // Delete existing context if any (for retry)
    const { success: deleteSuccess } = await ContextOperations.deleteContext(
      businessId,
      true // use server client
    )
    
    if (!deleteSuccess) {
      console.warn('Could not delete existing context for retry, proceeding anyway')
    }
    
    // Retry initialization
    return await initializeContextFromOnboarding(businessId)
    
  } catch (error) {
    console.error('Unexpected error in retryContextInitialization:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Update context completeness score (called by AI service)
 */
export async function updateContextCompleteness(
  businessId: string,
  score: number
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!businessId) {
      return { success: false, error: 'Business ID is required' }
    }
    
    if (typeof score !== 'number' || score < 0 || score > 100) {
      return { success: false, error: 'Score must be a number between 0 and 100' }
    }
    
    const { success, error } = await ContextOperations.updateCompletenessScore(
      businessId,
      score,
      true // use server client
    )
    
    if (!success) {
      console.error('Error updating completeness score:', error)
      return { success: false, error: error || 'Failed to update completeness score' }
    }
    
    // Revalidate context page
    revalidatePath('/business/context')
    revalidatePath('/business/dashboard')
    
    return { success: true }
    
  } catch (error) {
    console.error('Unexpected error in updateContextCompleteness:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Get context data for display
 */
export async function getContextData(businessId: string) {
  try {
    if (!businessId) {
      throw new Error('Business ID is required')
    }
    
    const { success, data, error } = await ContextOperations.getContextByBusinessId(
      businessId,
      true // use server client
    )
    
    if (!success) {
      console.error('Error getting context data:', error)
      throw new Error(error || 'Failed to load context data')
    }
    
    return data
    
  } catch (error) {
    console.error('Unexpected error in getContextData:', error)
    throw error
  }
}

/**
 * Validate business eligibility for context initialization
 */
export async function validateContextEligibility(
  businessId: string
): Promise<{
  success: boolean
  eligible?: boolean
  reason?: string
  error?: string
}> {
  try {
    if (!businessId) {
      return { success: false, error: 'Business ID is required' }
    }

    const supabase = await createClient()

    // Check business exists and has completed onboarding
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, onboarding_completed, business_type')
      .eq('id', businessId)
      .single()

    if (businessError) {
      console.error('Error checking business eligibility:', businessError)
      return { success: false, error: 'Failed to verify business status' }
    }

    if (!business) {
      return {
        success: true,
        eligible: false,
        reason: 'Business not found'
      }
    }

    if (!business.onboarding_completed) {
      return {
        success: true,
        eligible: false,
        reason: 'Onboarding must be completed first'
      }
    }

    if (!business.business_type) {
      return {
        success: true,
        eligible: false,
        reason: 'Business type must be specified'
      }
    }

    // Check if context already exists
    const { success: checkSuccess, hasContext } = await ContextOperations.hasInitializedContext(
      businessId,
      true // use server client
    )

    if (!checkSuccess) {
      return { success: false, error: 'Failed to check context status' }
    }

    if (hasContext) {
      return {
        success: true,
        eligible: false,
        reason: 'Context already initialized'
      }
    }

    return { success: true, eligible: true }

  } catch (error) {
    console.error('Unexpected error in validateContextEligibility:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Update specific context category data
 */
export async function updateContextCategory(
  businessId: string,
  categoryId: string,
  categoryData: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!businessId || !categoryId || !categoryData) {
      return { success: false, error: 'All parameters are required' }
    }

    // Get existing context data
    const { success, data: existingContext, error } = await ContextOperations.getContextByBusinessId(
      businessId,
      true // use server client
    )

    if (!success) {
      console.error('Error getting existing context:', error)
      return { success: false, error: error || 'Failed to load existing context' }
    }

    if (!existingContext) {
      return { success: false, error: 'Context not found for business' }
    }

    // Update the specific category data
    const updatedContextData = {
      ...existingContext.context_data,
      [`${categoryId}_data`]: categoryData
    }

    // Recalculate completeness score
    const newCompleteness = calculateCategoryBasedCompleteness(updatedContextData)

    // Update in database
    const { success: updateSuccess, error: updateError } = await ContextOperations.updateContext(
      businessId,
      {
        context_data: updatedContextData,
        completeness_score: newCompleteness
      },
      true // use server client
    )

    if (!updateSuccess) {
      console.error('Error updating context category:', updateError)
      return { success: false, error: updateError || 'Failed to update context' }
    }

    // Revalidate relevant paths
    revalidatePath('/business/context')
    revalidatePath('/business/dashboard')

    return { success: true }

  } catch (error) {
    console.error('Unexpected error in updateContextCategory:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Calculate completeness score based on category data
 */
function calculateCategoryBasedCompleteness(contextData: any): number {
  const categories = [
    'business-details',
    'products-services',
    'customer-demographics',
    'transaction-patterns',
    'operations',
    'business-goals'
  ]

  const categoryWeights = {
    'business-details': 0.25,      // 25% - Most important
    'products-services': 0.20,     // 20%
    'customer-demographics': 0.15,  // 15%
    'transaction-patterns': 0.15,   // 15%
    'operations': 0.15,            // 15%
    'business-goals': 0.10         // 10% - Least critical for fraud detection
  }

  let totalScore = 0

  categories.forEach(categoryId => {
    const categoryData = contextData[`${categoryId}_data`]
    const categoryScore = calculateSingleCategoryCompleteness(categoryData)
    const weight = categoryWeights[categoryId as keyof typeof categoryWeights] || 0
    totalScore += categoryScore * weight
  })

  // Add base score from original context data (for backward compatibility)
  const baseFields = [
    'businessType', 'storeCount', 'avgTransactionValue', 'primaryGoals',
    'businessSpecialty', 'commonCompliment', 'improvementArea', 'uniqueOffering'
  ]

  const filledBaseFields = baseFields.filter(field =>
    contextData[field] &&
    (typeof contextData[field] === 'string' ? contextData[field].trim() : true)
  ).length

  const baseScore = (filledBaseFields / baseFields.length) * 0.3 // 30% for backward compatibility

  return Math.min(100, Math.round((totalScore + baseScore) * 100))
}

/**
 * Calculate completeness for a single category
 */
function calculateSingleCategoryCompleteness(categoryData: any): number {
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
 * Get context category data for display
 */
export async function getContextCategoryData(
  businessId: string,
  categoryId?: string
): Promise<{
  success: boolean
  data?: any
  error?: string
}> {
  try {
    if (!businessId) {
      return { success: false, error: 'Business ID is required' }
    }

    const { success, data: contextData, error } = await ContextOperations.getContextByBusinessId(
      businessId,
      true // use server client
    )

    if (!success) {
      console.error('Error getting context category data:', error)
      return { success: false, error: error || 'Failed to load context data' }
    }

    if (!contextData) {
      return { success: false, error: 'Context not found' }
    }

    // If specific category requested, return just that
    if (categoryId) {
      const categoryData = (contextData.context_data as any)[`${categoryId}_data`]
      return { success: true, data: categoryData || {} }
    }

    // Return all context data
    return { success: true, data: contextData }

  } catch (error) {
    console.error('Unexpected error in getContextCategoryData:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Save draft data for auto-save functionality
 */
export async function saveDraft(
  businessId: string,
  draftData: any,
  category?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!businessId || !draftData) {
      return { success: false, error: 'Business ID and draft data are required' }
    }

    const supabase = await createClient()

    // Update draft data in business_contexts table
    const { error } = await supabase
      .from('business_contexts')
      .update({
        draft_data: draftData,
        last_draft_saved_at: new Date().toISOString(),
        has_unsaved_changes: true,
        updated_at: new Date().toISOString()
      })
      .eq('business_id', businessId)

    if (error) {
      console.error('Error saving draft:', error)
      return { success: false, error: 'Failed to save draft' }
    }

    return { success: true }

  } catch (error) {
    console.error('Unexpected error in saveDraft:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Load draft data
 */
export async function loadDraft(businessId: string): Promise<{
  success: boolean
  data?: any
  error?: string
}> {
  try {
    if (!businessId) {
      return { success: false, error: 'Business ID is required' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('business_contexts')
      .select('draft_data, last_draft_saved_at')
      .eq('business_id', businessId)
      .single()

    if (error) {
      console.error('Error loading draft:', error)
      return { success: false, error: 'Failed to load draft' }
    }

    return {
      success: true,
      data: {
        draft_data: data?.draft_data,
        last_draft_saved_at: data?.last_draft_saved_at
      }
    }

  } catch (error) {
    console.error('Unexpected error in loadDraft:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Clear draft data
 */
export async function clearDraft(businessId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    if (!businessId) {
      return { success: false, error: 'Business ID is required' }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('business_contexts')
      .update({
        draft_data: {},
        last_draft_saved_at: null,
        has_unsaved_changes: false,
        updated_at: new Date().toISOString()
      })
      .eq('business_id', businessId)

    if (error) {
      console.error('Error clearing draft:', error)
      return { success: false, error: 'Failed to clear draft' }
    }

    return { success: true }

  } catch (error) {
    console.error('Unexpected error in clearDraft:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Save conversation history
 */
export async function saveConversationHistory(
  businessId: string,
  messages: any[]
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!businessId) {
      return { success: false, error: 'Business ID is required' }
    }

    const supabase = await createClient()

    // Get current context record
    const { data: currentContext, error: getError } = await supabase
      .from('business_contexts')
      .select('ai_conversation_history')
      .eq('business_id', businessId)
      .single()

    if (getError) {
      console.error('Error getting current context:', getError)
      return { success: false, error: 'Failed to load current conversation' }
    }

    // Merge new messages with existing history
    const existingHistory = currentContext?.ai_conversation_history || []
    const updatedHistory = [...existingHistory, ...messages]

    // Keep only last 500 messages to prevent database bloat
    const recentHistory = updatedHistory.slice(-500)

    const { error } = await supabase
      .from('business_contexts')
      .update({
        ai_conversation_history: recentHistory,
        last_ai_update: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('business_id', businessId)

    if (error) {
      console.error('Error saving conversation history:', error)
      return { success: false, error: 'Failed to save conversation history' }
    }

    return { success: true }

  } catch (error) {
    console.error('Unexpected error in saveConversationHistory:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Load conversation history
 */
export async function loadConversationHistory(
  businessId: string,
  limit: number = 50,
  before?: string
): Promise<{
  success: boolean
  history?: any[]
  hasMore?: boolean
  error?: string
}> {
  try {
    if (!businessId) {
      return { success: false, error: 'Business ID is required' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('business_contexts')
      .select('ai_conversation_history')
      .eq('business_id', businessId)
      .single()

    if (error) {
      console.error('Error loading conversation history:', error)
      return { success: false, error: 'Failed to load conversation history' }
    }

    let history = data?.ai_conversation_history || []

    // Filter messages before timestamp if provided
    if (before) {
      const beforeDate = new Date(before)
      history = history.filter((msg: any) => new Date(msg.timestamp) < beforeDate)
    }

    // Sort by timestamp descending and limit
    history.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const hasMore = history.length > limit
    const limitedHistory = history.slice(0, limit)

    return {
      success: true,
      history: limitedHistory.reverse(), // Return in chronological order
      hasMore
    }

  } catch (error) {
    console.error('Unexpected error in loadConversationHistory:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Clear conversation history
 */
export async function clearConversationHistory(businessId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    if (!businessId) {
      return { success: false, error: 'Business ID is required' }
    }

    const supabase = await createClient()

    const { error } = await supabase
      .from('business_contexts')
      .update({
        ai_conversation_history: [],
        last_ai_update: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('business_id', businessId)

    if (error) {
      console.error('Error clearing conversation history:', error)
      return { success: false, error: 'Failed to clear conversation history' }
    }

    return { success: true }

  } catch (error) {
    console.error('Unexpected error in clearConversationHistory:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}

/**
 * Update context with optimistic updates and conflict detection
 */
export async function updateContextWithOptimisticUpdate(
  businessId: string,
  updates: any,
  lastKnownVersion?: string
): Promise<{
  success: boolean
  data?: any
  conflicts?: any[]
  error?: string
}> {
  try {
    if (!businessId || !updates) {
      return { success: false, error: 'Business ID and updates are required' }
    }

    const supabase = await createClient()

    // Get current context data with version check
    const { data: currentContext, error: getError } = await supabase
      .from('business_contexts')
      .select('*')
      .eq('business_id', businessId)
      .single()

    if (getError) {
      console.error('Error getting current context:', getError)
      return { success: false, error: 'Failed to load current context' }
    }

    // Check for conflicts if version is provided
    if (lastKnownVersion && currentContext?.updated_at) {
      const currentVersion = new Date(currentContext.updated_at).toISOString()
      if (currentVersion !== lastKnownVersion) {
        // Detect specific conflicts
        const conflicts = Object.keys(updates).filter(key => {
          return JSON.stringify(currentContext.context_data[key]) !== JSON.stringify(updates[key])
        })

        if (conflicts.length > 0) {
          return {
            success: false,
            conflicts: conflicts.map(key => ({
              field: key,
              currentValue: currentContext.context_data[key],
              newValue: updates[key]
            })),
            error: 'Conflicts detected - data was modified by another user'
          }
        }
      }
    }

    // Merge updates with current context
    const updatedContextData = {
      ...currentContext.context_data,
      ...updates
    }

    // Recalculate completeness score
    const newCompleteness = calculateCategoryBasedCompleteness(updatedContextData)

    const { data: updatedContext, error: updateError } = await supabase
      .from('business_contexts')
      .update({
        context_data: updatedContextData,
        completeness_score: newCompleteness,
        has_unsaved_changes: false,
        last_saved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('business_id', businessId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating context:', updateError)
      return { success: false, error: 'Failed to update context' }
    }

    // Revalidate relevant paths
    revalidatePath('/business/context')
    revalidatePath('/business/dashboard')

    return {
      success: true,
      data: updatedContext
    }

  } catch (error) {
    console.error('Unexpected error in updateContextWithOptimisticUpdate:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}