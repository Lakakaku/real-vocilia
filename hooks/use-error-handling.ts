/**
 * React hook for comprehensive error handling in verification components
 *
 * Features:
 * - Automatic error boundary integration
 * - User-friendly error messages
 * - Error reporting and tracking
 * - Recovery actions and retry mechanisms
 * - Toast notifications for errors
 * - Error state management
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'
export type ErrorCategory = 'network' | 'validation' | 'auth' | 'system' | 'business'

export interface AppError {
  id: string
  code: string
  message: string
  category: ErrorCategory
  severity: ErrorSeverity
  retryable: boolean
  timestamp: Date
  context?: Record<string, any>
  userMessage?: string
  recoveryActions?: RecoveryAction[]
}

export interface RecoveryAction {
  label: string
  action: () => void | Promise<void>
  primary?: boolean
}

interface ErrorState {
  errors: AppError[]
  lastError: AppError | null
  isRetrying: boolean
  retryCount: number
}

interface UseErrorHandlingOptions {
  // Error display options
  showToasts: boolean
  autoHideToasts: boolean
  toastDuration: number

  // Retry options
  enableAutoRetry: boolean
  maxRetries: number
  retryDelay: number

  // Error filtering
  ignoreErrorCodes: string[]
  categoryFilter: ErrorCategory[]

  // Callbacks
  onError?: (error: AppError) => void
  onRetry?: (error: AppError, attempt: number) => void
  onRecovery?: (error: AppError) => void
}

const defaultOptions: UseErrorHandlingOptions = {
  showToasts: true,
  autoHideToasts: true,
  toastDuration: 5000,
  enableAutoRetry: false,
  maxRetries: 3,
  retryDelay: 1000,
  ignoreErrorCodes: [],
  categoryFilter: []
}

/**
 * Hook for comprehensive error handling
 */
export function useErrorHandling(options: Partial<UseErrorHandlingOptions> = {}) {
  const config = { ...defaultOptions, ...options }
  const [errorState, setErrorState] = useState<ErrorState>({
    errors: [],
    lastError: null,
    isRetrying: false,
    retryCount: 0
  })

  const retryTimerRef = useRef<NodeJS.Timeout>()
  const errorCounterRef = useRef(0)

  /**
   * Handle a new error
   */
  const handleError = useCallback((
    error: Error | AppError | any,
    context?: Record<string, any>,
    userMessage?: string
  ) => {
    const appError = normalizeError(error, context, userMessage)

    // Check if error should be ignored
    if (config.ignoreErrorCodes.includes(appError.code)) {
      return
    }

    // Check category filter
    if (config.categoryFilter.length > 0 && !config.categoryFilter.includes(appError.category)) {
      return
    }

    // Update error state
    setErrorState(prev => ({
      ...prev,
      errors: [...prev.errors.slice(-9), appError], // Keep last 10 errors
      lastError: appError,
      retryCount: 0
    }))

    // Show toast notification
    if (config.showToasts) {
      showErrorToast(appError, config)
    }

    // Call error callback
    if (config.onError) {
      config.onError(appError)
    }

    // Auto-retry if enabled and error is retryable
    if (config.enableAutoRetry && appError.retryable) {
      scheduleRetry(appError)
    }

    // Log error for debugging
    console.error('Error handled:', appError)

  }, [config])

  /**
   * Retry the last retryable error
   */
  const retry = useCallback(async (customError?: AppError) => {
    const errorToRetry = customError || errorState.lastError
    if (!errorToRetry || !errorToRetry.retryable) return

    if (errorState.retryCount >= config.maxRetries) {
      toast.error('Maximum retry attempts reached')
      return
    }

    setErrorState(prev => ({
      ...prev,
      isRetrying: true,
      retryCount: prev.retryCount + 1
    }))

    // Call retry callback
    if (config.onRetry) {
      config.onRetry(errorToRetry, errorState.retryCount + 1)
    }

    try {
      // If the error has recovery actions, try the primary one
      const primaryAction = errorToRetry.recoveryActions?.find(action => action.primary)
      if (primaryAction) {
        await primaryAction.action()

        // Mark as recovered
        if (config.onRecovery) {
          config.onRecovery(errorToRetry)
        }

        toast.success('Operation completed successfully')
        clearError(errorToRetry.id)
      }
    } catch (retryError) {
      handleError(retryError, { originalError: errorToRetry }, 'Retry failed')
    } finally {
      setErrorState(prev => ({ ...prev, isRetrying: false }))
    }
  }, [errorState.lastError, errorState.retryCount, config, handleError])

  /**
   * Clear a specific error
   */
  const clearError = useCallback((errorId: string) => {
    setErrorState(prev => ({
      ...prev,
      errors: prev.errors.filter(e => e.id !== errorId),
      lastError: prev.lastError?.id === errorId ? null : prev.lastError
    }))
  }, [])

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    setErrorState({
      errors: [],
      lastError: null,
      isRetrying: false,
      retryCount: 0
    })

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
    }
  }, [])

  /**
   * Execute an async operation with error handling
   */
  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>
  ): Promise<T | null> => {
    try {
      const result = await operation()
      return result
    } catch (error) {
      handleError(error, { operation: operationName, ...context })
      return null
    }
  }, [handleError])

  /**
   * Wrap an async function with error handling
   */
  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    operationName: string
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        return await fn(...args)
      } catch (error) {
        handleError(error, { operation: operationName, args })
        return null
      }
    }
  }, [handleError])

  /**
   * Get user-friendly error message
   */
  const getErrorMessage = useCallback((error: AppError): string => {
    if (error.userMessage) return error.userMessage

    // Generate user-friendly messages based on error category and code
    switch (error.category) {
      case 'network':
        return 'Connection problem. Please check your internet connection and try again.'
      case 'auth':
        return 'Authentication required. Please log in and try again.'
      case 'validation':
        return 'Please check your input and try again.'
      case 'business':
        return error.message || 'Operation could not be completed. Please try again.'
      case 'system':
        return 'System error occurred. Our team has been notified.'
      default:
        return error.message || 'An unexpected error occurred. Please try again.'
    }
  }, [])

  /**
   * Schedule automatic retry
   */
  const scheduleRetry = useCallback((error: AppError) => {
    if (errorState.retryCount >= config.maxRetries) return

    const delay = config.retryDelay * Math.pow(2, errorState.retryCount) // Exponential backoff

    retryTimerRef.current = setTimeout(() => {
      retry(error)
    }, delay)
  }, [errorState.retryCount, config.maxRetries, config.retryDelay, retry])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
      }
    }
  }, [])

  return {
    // Error state
    errors: errorState.errors,
    lastError: errorState.lastError,
    hasErrors: errorState.errors.length > 0,
    isRetrying: errorState.isRetrying,
    retryCount: errorState.retryCount,

    // Error handling methods
    handleError,
    clearError,
    clearAllErrors,
    retry,
    executeWithErrorHandling,
    withErrorHandling,
    getErrorMessage,

    // Convenience methods for common error types
    handleNetworkError: (error: any, context?: Record<string, any>) =>
      handleError(error, { ...context, category: 'network' }),

    handleValidationError: (error: any, context?: Record<string, any>) =>
      handleError(error, { ...context, category: 'validation' }),

    handleAuthError: (error: any, context?: Record<string, any>) =>
      handleError(error, { ...context, category: 'auth' }),

    handleBusinessError: (error: any, context?: Record<string, any>) =>
      handleError(error, { ...context, category: 'business' }),

    handleSystemError: (error: any, context?: Record<string, any>) =>
      handleError(error, { ...context, category: 'system' }),
  }
}

/**
 * Hook for form-specific error handling
 */
export function useFormErrorHandling() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const setFieldError = useCallback((field: string, message: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: message }))
  }, [])

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const { [field]: _, ...rest } = prev
      return rest
    })
  }, [])

  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({})
  }, [])

  const handleFormError = useCallback((error: any) => {
    if (error.field) {
      setFieldError(error.field, error.message)
    } else {
      setFormError(error.message || 'Form submission failed')
    }
  }, [setFieldError])

  return {
    fieldErrors,
    formError,
    hasFieldErrors: Object.keys(fieldErrors).length > 0,
    hasFormError: formError !== null,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    setFormError,
    clearFormError: () => setFormError(null),
    handleFormError
  }
}

/**
 * Hook for async operation error handling
 */
export function useAsyncErrorHandling() {
  const { handleError, executeWithErrorHandling } = useErrorHandling()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AppError | null>(null)

  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string = 'async_operation'
  ): Promise<T | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await operation()
      return result
    } catch (err) {
      const appError = normalizeError(err)
      setError(appError)
      handleError(err, { operation: operationName })
      return null
    } finally {
      setIsLoading(false)
    }
  }, [handleError])

  return {
    isLoading,
    error,
    execute,
    clearError: () => setError(null)
  }
}

// Helper functions

function normalizeError(
  error: any,
  context?: Record<string, any>,
  userMessage?: string
): AppError {
  const id = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  if (error.code && error.category) {
    // Already an AppError
    return { ...error, id, context: { ...error.context, ...context } }
  }

  // Classify error based on type and message
  const { code, category, severity, retryable } = classifyError(error)

  return {
    id,
    code,
    message: error.message || 'Unknown error',
    category,
    severity,
    retryable,
    timestamp: new Date(),
    context,
    userMessage
  }
}

function classifyError(error: any): {
  code: string
  category: ErrorCategory
  severity: ErrorSeverity
  retryable: boolean
} {
  const message = error.message?.toLowerCase() || ''
  const status = error.status || error.response?.status

  // Network errors
  if (message.includes('network') || message.includes('fetch') || !navigator.onLine) {
    return { code: 'NETWORK_ERROR', category: 'network', severity: 'medium', retryable: true }
  }

  // Authentication errors
  if (status === 401 || message.includes('unauthorized')) {
    return { code: 'AUTH_ERROR', category: 'auth', severity: 'medium', retryable: false }
  }

  // Validation errors
  if (status === 400 || message.includes('validation') || message.includes('invalid')) {
    return { code: 'VALIDATION_ERROR', category: 'validation', severity: 'low', retryable: false }
  }

  // Server errors
  if (status >= 500) {
    return { code: 'SERVER_ERROR', category: 'system', severity: 'high', retryable: true }
  }

  // Rate limiting
  if (status === 429) {
    return { code: 'RATE_LIMIT_ERROR', category: 'network', severity: 'medium', retryable: true }
  }

  // Default
  return { code: 'UNKNOWN_ERROR', category: 'system', severity: 'medium', retryable: false }
}

function showErrorToast(error: AppError, config: UseErrorHandlingOptions) {
  const message = error.userMessage || error.message
  const duration = config.autoHideToasts ? config.toastDuration : Infinity

  const action = error.retryable && error.recoveryActions ? {
    label: 'Retry',
    onClick: () => {
      const primaryAction = error.recoveryActions?.find(a => a.primary)
      if (primaryAction) {
        primaryAction.action()
      }
    }
  } : undefined

  switch (error.severity) {
    case 'critical':
      toast.error(message, { duration, action })
      break
    case 'high':
      toast.error(message, { duration, action })
      break
    case 'medium':
      toast.warning(message, { duration, action })
      break
    case 'low':
      toast(message, { duration, action })
      break
  }
}