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