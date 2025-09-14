/**
 * Context Database Operations - CRUD operations for business_contexts table
 * Handles all database interactions for business context management
 */

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { BusinessContextData } from '@/lib/services/context-service'

export interface BusinessContextRecord {
  id: string
  business_id: string
  context_data: BusinessContextData
  completeness_score: number
  created_at: string
  updated_at: string
  last_ai_update?: string
  version: number
}

export interface ContextUpdateData {
  context_data?: BusinessContextData
  completeness_score?: number
  last_ai_update?: string
}

/**
 * Database operations for business contexts
 */
export class ContextOperations {
  /**
   * Create initial business context from onboarding data
   */
  static async createInitialContext(
    businessId: string,
    contextData: BusinessContextData,
    completenessScore: number,
    useServerClient = false
  ): Promise<{ success: boolean; data?: BusinessContextRecord; error?: string }> {
    try {
      const supabase = useServerClient ? await createServerClient() : createBrowserClient()
      
      const newContext = {
        business_id: businessId,
        context_data: contextData,
        completeness_score: completenessScore,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      const { data, error } = await supabase
        .from('business_contexts')
        .insert(newContext)
        .select()
        .single()
      
      if (error) {
        console.error('Error creating initial context:', error)
        return { success: false, error: error.message }
      }
      
      return { success: true, data }
    } catch (error) {
      console.error('Unexpected error creating initial context:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }
  
  /**
   * Get business context by business ID
   */
  static async getContextByBusinessId(
    businessId: string,
    useServerClient = false
  ): Promise<{ success: boolean; data?: BusinessContextRecord; error?: string }> {
    try {
      const supabase = useServerClient ? await createServerClient() : createBrowserClient()
      
      const { data, error } = await supabase
        .from('business_contexts')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No context found - this is normal for new businesses
          return { success: true, data: undefined }
        }
        console.error('Error getting context:', error)
        return { success: false, error: error.message }
      }
      
      return { success: true, data }
    } catch (error) {
      console.error('Unexpected error getting context:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }
  
  /**
   * Update existing business context
   */
  static async updateContext(
    businessId: string,
    updates: ContextUpdateData,
    useServerClient = false
  ): Promise<{ success: boolean; data?: BusinessContextRecord; error?: string }> {
    try {
      const supabase = useServerClient ? await createServerClient() : createBrowserClient()
      
      // First check if context exists
      const { data: existing } = await supabase
        .from('business_contexts')
        .select('id, version')
        .eq('business_id', businessId)
        .single()
      
      if (!existing) {
        return { success: false, error: 'Business context not found' }
      }
      
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
        version: existing.version + 1,
      }
      
      const { data, error } = await supabase
        .from('business_contexts')
        .update(updateData)
        .eq('business_id', businessId)
        .select()
        .single()
      
      if (error) {
        console.error('Error updating context:', error)
        return { success: false, error: error.message }
      }
      
      return { success: true, data }
    } catch (error) {
      console.error('Unexpected error updating context:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }
  
  /**
   * Update context completeness score
   */
  static async updateCompletenessScore(
    businessId: string,
    score: number,
    useServerClient = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = useServerClient ? await createServerClient() : createBrowserClient()
      
      const { error } = await supabase
        .from('business_contexts')
        .update({ 
          completeness_score: score,
          updated_at: new Date().toISOString() 
        })
        .eq('business_id', businessId)
      
      if (error) {
        console.error('Error updating completeness score:', error)
        return { success: false, error: error.message }
      }
      
      return { success: true }
    } catch (error) {
      console.error('Unexpected error updating completeness score:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }
  
  /**
   * Check if business has context initialized
   */
  static async hasInitializedContext(
    businessId: string,
    useServerClient = false
  ): Promise<{ success: boolean; hasContext?: boolean; error?: string }> {
    try {
      const supabase = useServerClient ? await createServerClient() : createBrowserClient()
      
      const { data, error } = await supabase
        .from('business_contexts')
        .select('id')
        .eq('business_id', businessId)
        .limit(1)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No context found
          return { success: true, hasContext: false }
        }
        console.error('Error checking context existence:', error)
        return { success: false, error: error.message }
      }
      
      return { success: true, hasContext: !!data }
    } catch (error) {
      console.error('Unexpected error checking context existence:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }
  
  /**
   * Get context statistics for dashboard
   */
  static async getContextStats(
    businessId: string,
    useServerClient = false
  ): Promise<{ 
    success: boolean
    stats?: {
      completenessScore: number
      lastUpdated: string
      version: number
      departmentCount: number
      questionsCount: number
    }
    error?: string 
  }> {
    try {
      const supabase = useServerClient ? await createServerClient() : createBrowserClient()
      
      const { data, error } = await supabase
        .from('business_contexts')
        .select('completeness_score, updated_at, version, context_data')
        .eq('business_id', businessId)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No context found
          return { success: true, stats: undefined }
        }
        console.error('Error getting context stats:', error)
        return { success: false, error: error.message }
      }
      
      const contextData = data.context_data as BusinessContextData
      
      const stats = {
        completenessScore: data.completeness_score,
        lastUpdated: data.updated_at,
        version: data.version,
        departmentCount: contextData?.departments?.length || 0,
        questionsCount: contextData?.customQuestions?.length || 0,
      }
      
      return { success: true, stats }
    } catch (error) {
      console.error('Unexpected error getting context stats:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }
  
  /**
   * Delete business context (for cleanup/testing)
   */
  static async deleteContext(
    businessId: string,
    useServerClient = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = useServerClient ? await createServerClient() : createBrowserClient()
      
      const { error } = await supabase
        .from('business_contexts')
        .delete()
        .eq('business_id', businessId)
      
      if (error) {
        console.error('Error deleting context:', error)
        return { success: false, error: error.message }
      }
      
      return { success: true }
    } catch (error) {
      console.error('Unexpected error deleting context:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }
  
  /**
   * Batch update multiple contexts (for admin operations)
   */
  static async batchUpdateContexts(
    updates: Array<{ businessId: string; data: ContextUpdateData }>,
    useServerClient = true
  ): Promise<{ success: boolean; updated: number; errors: string[] }> {
    const errors: string[] = []
    let updated = 0
    
    try {
      const supabase = useServerClient ? await createServerClient() : createBrowserClient()
      
      for (const update of updates) {
        try {
          const result = await this.updateContext(update.businessId, update.data, useServerClient)
          if (result.success) {
            updated++
          } else {
            errors.push(`Business ${update.businessId}: ${result.error}`)
          }
        } catch (error) {
          errors.push(`Business ${update.businessId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
      
      return { success: true, updated, errors }
    } catch (error) {
      console.error('Unexpected error in batch update:', error)
      return { 
        success: false, 
        updated, 
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'] 
      }
    }
  }
  
  /**
   * Get contexts that need AI enhancement (completeness < 85%)
   */
  static async getContextsForAIEnhancement(
    limit = 10,
    useServerClient = true
  ): Promise<{ success: boolean; data?: BusinessContextRecord[]; error?: string }> {
    try {
      const supabase = useServerClient ? await createServerClient() : createBrowserClient()
      
      const { data, error } = await supabase
        .from('business_contexts')
        .select('*')
        .lt('completeness_score', 85)
        .order('updated_at', { ascending: true })
        .limit(limit)
      
      if (error) {
        console.error('Error getting contexts for AI enhancement:', error)
        return { success: false, error: error.message }
      }
      
      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Unexpected error getting contexts for AI enhancement:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }
}