/**
 * Context Initialization Hook - React hook for managing context initialization
 * Handles loading states, error handling, and progress tracking
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { 
  initializeContextFromOnboarding, 
  getContextInitializationStatus,
  retryContextInitialization,
  validateContextEligibility,
  type ContextInitializationResult 
} from '@/app/actions/context-actions'

export interface ContextInitializationState {
  isLoading: boolean
  isInitializing: boolean
  isInitialized: boolean
  isEligible: boolean
  completenessScore?: number
  progress: number
  currentStage: string
  message: string
  error?: string
  canRetry: boolean
}

export interface ContextInitializationActions {
  initialize: () => Promise<void>
  retry: () => Promise<void>
  checkStatus: () => Promise<void>
  checkEligibility: () => Promise<void>
  reset: () => void
}

export interface UseContextInitializationProps {
  businessId: string
  autoCheck?: boolean // Automatically check status on mount
  onSuccess?: (result: ContextInitializationResult) => void
  onError?: (error: string) => void
}

const INITIALIZATION_STAGES = [
  { key: 'loading_business', label: 'Loading business data...', progress: 20 },
  { key: 'applying_template', label: 'Applying industry template...', progress: 40 },
  { key: 'calculating_score', label: 'Calculating completeness...', progress: 60 },
  { key: 'saving_context', label: 'Saving context data...', progress: 80 },
  { key: 'complete', label: 'Context initialized successfully!', progress: 100 },
] as const

/**
 * Hook for managing business context initialization
 */
export function useContextInitialization({
  businessId,
  autoCheck = true,
  onSuccess,
  onError,
}: UseContextInitializationProps): [ContextInitializationState, ContextInitializationActions] {
  
  const [state, setState] = useState<ContextInitializationState>({
    isLoading: false,
    isInitializing: false,
    isInitialized: false,
    isEligible: false,
    progress: 0,
    currentStage: 'Ready to initialize',
    message: '',
    canRetry: false,
  })
  
  // Simulate progress during initialization
  const simulateProgress = useCallback((onComplete: () => void) => {
    let currentStageIndex = 0
    
    const updateProgress = () => {
      if (currentStageIndex < INITIALIZATION_STAGES.length) {
        const stage = INITIALIZATION_STAGES[currentStageIndex]
        setState(prev => ({
          ...prev,
          currentStage: stage.label,
          progress: stage.progress,
        }))
        
        currentStageIndex++
        
        // Simulate realistic timing for each stage
        const delay = currentStageIndex === 1 ? 1000 : // Loading business data
                     currentStageIndex === 2 ? 1500 : // Applying template
                     currentStageIndex === 3 ? 800 :  // Calculating score
                     currentStageIndex === 4 ? 1200 : // Saving context
                     500 // Complete
        
        setTimeout(updateProgress, delay)
      } else {
        onComplete()
      }
    }
    
    updateProgress()
  }, [])
  
  /**
   * Check current context initialization status
   */
  const checkStatus = useCallback(async () => {
    if (!businessId) return
    
    setState(prev => ({ ...prev, isLoading: true, error: undefined }))
    
    try {
      const result = await getContextInitializationStatus(businessId)
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isInitialized: result.isInitialized || false,
          completenessScore: result.completenessScore,
          message: result.isInitialized 
            ? `Context initialized with ${result.completenessScore}% completeness`
            : 'Context not yet initialized',
        }))
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to check status',
          canRetry: true,
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        canRetry: true,
      }))
    }
  }, [businessId])
  
  /**
   * Check if business is eligible for context initialization
   */
  const checkEligibility = useCallback(async () => {
    if (!businessId) return
    
    setState(prev => ({ ...prev, isLoading: true, error: undefined }))
    
    try {
      const result = await validateContextEligibility(businessId)
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isEligible: result.eligible || false,
          message: result.eligible 
            ? 'Ready to initialize context'
            : result.reason || 'Not eligible for initialization',
        }))
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to check eligibility',
          canRetry: true,
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        canRetry: true,
      }))
    }
  }, [businessId])
  
  /**
   * Initialize context from onboarding data
   */
  const initialize = useCallback(async () => {
    if (!businessId) return
    
    setState(prev => ({
      ...prev,
      isInitializing: true,
      error: undefined,
      progress: 0,
      currentStage: 'Starting initialization...',
      canRetry: false,
    }))
    
    try {
      // Start progress simulation
      simulateProgress(async () => {
        try {
          const result = await initializeContextFromOnboarding(businessId)
          
          if (result.success) {
            setState(prev => ({
              ...prev,
              isInitializing: false,
              isInitialized: true,
              completenessScore: result.completenessScore,
              progress: 100,
              currentStage: 'Complete!',
              message: result.message || 'Context initialized successfully',
            }))
            
            onSuccess?.(result)
          } else {
            setState(prev => ({
              ...prev,
              isInitializing: false,
              error: result.error || 'Initialization failed',
              progress: 0,
              currentStage: 'Failed',
              canRetry: true,
            }))
            
            onError?.(result.error || 'Initialization failed')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
          
          setState(prev => ({
            ...prev,
            isInitializing: false,
            error: errorMessage,
            progress: 0,
            currentStage: 'Failed',
            canRetry: true,
          }))
          
          onError?.(errorMessage)
        }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      
      setState(prev => ({
        ...prev,
        isInitializing: false,
        error: errorMessage,
        progress: 0,
        currentStage: 'Failed',
        canRetry: true,
      }))
      
      onError?.(errorMessage)
    }
  }, [businessId, simulateProgress, onSuccess, onError])
  
  /**
   * Retry failed initialization
   */
  const retry = useCallback(async () => {
    if (!businessId) return
    
    setState(prev => ({
      ...prev,
      isInitializing: true,
      error: undefined,
      progress: 0,
      currentStage: 'Retrying initialization...',
      canRetry: false,
    }))
    
    try {
      // Start progress simulation
      simulateProgress(async () => {
        try {
          const result = await retryContextInitialization(businessId)
          
          if (result.success) {
            setState(prev => ({
              ...prev,
              isInitializing: false,
              isInitialized: true,
              completenessScore: result.completenessScore,
              progress: 100,
              currentStage: 'Complete!',
              message: result.message || 'Context initialized successfully',
            }))
            
            onSuccess?.(result)
          } else {
            setState(prev => ({
              ...prev,
              isInitializing: false,
              error: result.error || 'Retry failed',
              progress: 0,
              currentStage: 'Failed',
              canRetry: true,
            }))
            
            onError?.(result.error || 'Retry failed')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
          
          setState(prev => ({
            ...prev,
            isInitializing: false,
            error: errorMessage,
            progress: 0,
            currentStage: 'Failed',
            canRetry: true,
          }))
          
          onError?.(errorMessage)
        }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      
      setState(prev => ({
        ...prev,
        isInitializing: false,
        error: errorMessage,
        progress: 0,
        currentStage: 'Failed',
        canRetry: true,
      }))
      
      onError?.(errorMessage)
    }
  }, [businessId, simulateProgress, onSuccess, onError])
  
  /**
   * Reset state to initial values
   */
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isInitializing: false,
      isInitialized: false,
      isEligible: false,
      progress: 0,
      currentStage: 'Ready to initialize',
      message: '',
      canRetry: false,
    })
  }, [])
  
  // Auto-check status and eligibility on mount
  useEffect(() => {
    if (autoCheck && businessId) {
      checkEligibility().then(() => {
        checkStatus()
      })
    }
  }, [autoCheck, businessId, checkEligibility, checkStatus])
  
  const actions: ContextInitializationActions = {
    initialize,
    retry,
    checkStatus,
    checkEligibility,
    reset,
  }
  
  return [state, actions]
}

/**
 * Simplified hook for checking context initialization status only
 */
export function useContextStatus(businessId: string) {
  const [state, actions] = useContextInitialization({
    businessId,
    autoCheck: true,
  })
  
  return {
    isLoading: state.isLoading,
    isInitialized: state.isInitialized,
    completenessScore: state.completenessScore,
    error: state.error,
    checkStatus: actions.checkStatus,
  }
}

/**
 * Hook for context initialization progress display
 */
export function useContextProgress(businessId: string) {
  const [state, actions] = useContextInitialization({
    businessId,
    autoCheck: false,
  })
  
  return {
    isInitializing: state.isInitializing,
    progress: state.progress,
    currentStage: state.currentStage,
    error: state.error,
    canRetry: state.canRetry,
    initialize: actions.initialize,
    retry: actions.retry,
  }
}