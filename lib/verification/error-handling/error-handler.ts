/**
 * Comprehensive error handling and retry system for verification operations
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Circuit breaker pattern for failing services
 * - Error classification and escalation
 * - Graceful degradation strategies
 * - Error reporting and alerting
 * - Recovery mechanisms
 */

import { getPerformanceMonitor } from '../performance/performance-monitor'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export type ErrorCategory =
  | 'network'
  | 'database'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'business_logic'
  | 'external_service'
  | 'system'
  | 'unknown'

export interface VerificationError extends Error {
  code: string
  category: ErrorCategory
  severity: ErrorSeverity
  retryable: boolean
  context: Record<string, any>
  timestamp: Date
  correlationId: string
  userId?: string
  sessionId?: string
  batchId?: string
  transactionId?: string
}

export interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  jitterMs: number
  retryableErrors: string[]
  timeoutMs?: number
}

export interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeoutMs: number
  monitoringPeriodMs: number
  halfOpenMaxCalls: number
}

export interface ErrorHandlerConfig {
  enableRetry: boolean
  enableCircuitBreaker: boolean
  enableGracefulDegradation: boolean
  enableErrorReporting: boolean
  retryConfig: RetryConfig
  circuitBreakerConfig: CircuitBreakerConfig
  alertingConfig: {
    errorRateThreshold: number
    timeWindowMs: number
    notificationChannels: string[]
  }
}

export class VerificationErrorHandler {
  private monitor = getPerformanceMonitor()
  private circuitBreakers = new Map<string, CircuitBreaker>()
  private errorCounts = new Map<string, number>()
  private lastErrorTimes = new Map<string, number>()

  private config: ErrorHandlerConfig = {
    enableRetry: true,
    enableCircuitBreaker: true,
    enableGracefulDegradation: true,
    enableErrorReporting: true,
    retryConfig: {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterMs: 100,
      retryableErrors: [
        'NETWORK_ERROR',
        'TIMEOUT_ERROR',
        'RATE_LIMIT_ERROR',
        'TEMPORARY_FAILURE',
        'SERVICE_UNAVAILABLE'
      ],
      timeoutMs: 30000
    },
    circuitBreakerConfig: {
      failureThreshold: 5,
      resetTimeoutMs: 60000,
      monitoringPeriodMs: 120000,
      halfOpenMaxCalls: 3
    },
    alertingConfig: {
      errorRateThreshold: 10, // errors per minute
      timeWindowMs: 60000,
      notificationChannels: ['email', 'slack']
    }
  }

  constructor(customConfig?: Partial<ErrorHandlerConfig>) {
    this.config = { ...this.config, ...customConfig }
  }

  /**
   * Execute function with comprehensive error handling
   */
  async execute<T>(
    operation: () => Promise<T>,
    context: {
      operationName: string
      correlationId: string
      userId?: string
      sessionId?: string
      batchId?: string
      transactionId?: string
    }
  ): Promise<T> {
    const { operationName, correlationId } = context

    // Check circuit breaker
    if (this.config.enableCircuitBreaker) {
      const circuitBreaker = this.getCircuitBreaker(operationName)
      if (circuitBreaker.state === 'open') {
        throw this.createError(
          'CIRCUIT_BREAKER_OPEN',
          'Operation blocked by circuit breaker',
          'system',
          'high',
          false,
          context
        )
      }
    }

    let lastError: VerificationError | null = null
    let attempt = 0

    while (attempt < this.config.retryConfig.maxAttempts) {
      attempt++

      try {
        // Execute with timeout if configured
        const result = this.config.retryConfig.timeoutMs
          ? await this.withTimeout(operation(), this.config.retryConfig.timeoutMs)
          : await operation()

        // Reset circuit breaker on success
        if (this.config.enableCircuitBreaker) {
          this.getCircuitBreaker(operationName).recordSuccess()
        }

        return result

      } catch (error) {
        const verificationError = this.normalizeError(error, context)
        lastError = verificationError

        // Record failure for circuit breaker
        if (this.config.enableCircuitBreaker) {
          this.getCircuitBreaker(operationName).recordFailure()
        }

        // Report error
        if (this.config.enableErrorReporting) {
          await this.reportError(verificationError, attempt)
        }

        // Check if error is retryable
        if (!this.config.enableRetry ||
            !verificationError.retryable ||
            attempt >= this.config.retryConfig.maxAttempts) {
          break
        }

        // Calculate delay for next attempt
        const delay = this.calculateRetryDelay(attempt)
        await this.sleep(delay)
      }
    }

    // If we get here, all retries failed
    if (lastError) {
      // Try graceful degradation
      if (this.config.enableGracefulDegradation) {
        const fallbackResult = await this.attemptGracefulDegradation(context, lastError)
        if (fallbackResult !== null) {
          return fallbackResult
        }
      }

      // Log final failure
      console.error(`Operation ${context.operationName} failed after ${attempt} attempts:`, lastError)
      throw lastError
    }

    throw this.createError(
      'UNKNOWN_ERROR',
      'Operation failed with unknown error',
      'unknown',
      'high',
      false,
      context
    )
  }

  /**
   * Create a standardized verification error
   */
  createError(
    code: string,
    message: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    retryable: boolean,
    context: Record<string, any>
  ): VerificationError {
    const error = new Error(message) as VerificationError
    error.code = code
    error.category = category
    error.severity = severity
    error.retryable = retryable
    error.context = context
    error.timestamp = new Date()
    error.correlationId = context.correlationId || this.generateCorrelationId()
    error.userId = context.userId
    error.sessionId = context.sessionId
    error.batchId = context.batchId
    error.transactionId = context.transactionId

    return error
  }

  /**
   * Handle database errors specifically
   */
  async handleDatabaseError<T>(
    operation: () => Promise<T>,
    context: Record<string, any>
  ): Promise<T> {
    return this.execute(operation, {
      operationName: 'database_operation',
      correlationId: context.correlationId || this.generateCorrelationId(),
      ...context
    })
  }

  /**
   * Handle external service calls
   */
  async handleExternalServiceCall<T>(
    serviceName: string,
    operation: () => Promise<T>,
    context: Record<string, any>
  ): Promise<T> {
    return this.execute(operation, {
      operationName: `external_service_${serviceName}`,
      correlationId: context.correlationId || this.generateCorrelationId(),
      ...context
    })
  }

  /**
   * Handle verification-specific operations
   */
  async handleVerificationOperation<T>(
    operationType: string,
    operation: () => Promise<T>,
    context: Record<string, any>
  ): Promise<T> {
    return this.execute(operation, {
      operationName: `verification_${operationType}`,
      correlationId: context.correlationId || this.generateCorrelationId(),
      ...context
    })
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(timeWindowMs = 3600000): {
    totalErrors: number
    errorsByCategory: Record<ErrorCategory, number>
    errorsBySeverity: Record<ErrorSeverity, number>
    errorRate: number
    topErrors: Array<{ code: string; count: number }>
  } {
    const now = Date.now()
    const cutoff = now - timeWindowMs

    // This would typically fetch from a persistent store
    // For now, return mock data structure
    return {
      totalErrors: 0,
      errorsByCategory: {
        network: 0,
        database: 0,
        authentication: 0,
        authorization: 0,
        validation: 0,
        business_logic: 0,
        external_service: 0,
        system: 0,
        unknown: 0
      },
      errorsBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      errorRate: 0,
      topErrors: []
    }
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): Record<string, {
    state: 'closed' | 'open' | 'half-open'
    failureCount: number
    lastFailureTime: number | null
    nextAttemptTime: number | null
  }> {
    const status: Record<string, any> = {}

    for (const [name, breaker] of this.circuitBreakers.entries()) {
      status[name] = {
        state: breaker.state,
        failureCount: breaker.failureCount,
        lastFailureTime: breaker.lastFailureTime,
        nextAttemptTime: breaker.nextAttemptTime
      }
    }

    return status
  }

  /**
   * Reset circuit breaker for a specific operation
   */
  resetCircuitBreaker(operationName: string): void {
    const breaker = this.circuitBreakers.get(operationName)
    if (breaker) {
      breaker.reset()
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset()
    }
  }

  // Private methods

  private normalizeError(error: any, context: Record<string, any>): VerificationError {
    if (error instanceof VerificationError) {
      return error
    }

    // Classify error based on type and message
    const { code, category, severity, retryable } = this.classifyError(error)

    return this.createError(code, error.message || 'Unknown error', category, severity, retryable, context)
  }

  private classifyError(error: any): {
    code: string
    category: ErrorCategory
    severity: ErrorSeverity
    retryable: boolean
  } {
    const message = error.message?.toLowerCase() || ''
    const errorCode = error.code || error.status

    // Network errors
    if (message.includes('network') || message.includes('connection') || errorCode === 'ECONNRESET') {
      return { code: 'NETWORK_ERROR', category: 'network', severity: 'medium', retryable: true }
    }

    // Database errors
    if (message.includes('database') || message.includes('postgres') || errorCode?.startsWith('23')) {
      return { code: 'DATABASE_ERROR', category: 'database', severity: 'high', retryable: true }
    }

    // Authentication errors
    if (errorCode === 401 || message.includes('unauthorized') || message.includes('authentication')) {
      return { code: 'AUTH_ERROR', category: 'authentication', severity: 'medium', retryable: false }
    }

    // Authorization errors
    if (errorCode === 403 || message.includes('forbidden') || message.includes('permission')) {
      return { code: 'AUTHZ_ERROR', category: 'authorization', severity: 'medium', retryable: false }
    }

    // Validation errors
    if (errorCode === 400 || message.includes('validation') || message.includes('invalid')) {
      return { code: 'VALIDATION_ERROR', category: 'validation', severity: 'low', retryable: false }
    }

    // Rate limiting
    if (errorCode === 429 || message.includes('rate limit') || message.includes('too many')) {
      return { code: 'RATE_LIMIT_ERROR', category: 'external_service', severity: 'medium', retryable: true }
    }

    // Service unavailable
    if (errorCode === 503 || message.includes('unavailable') || message.includes('maintenance')) {
      return { code: 'SERVICE_UNAVAILABLE', category: 'external_service', severity: 'high', retryable: true }
    }

    // Timeout errors
    if (message.includes('timeout') || errorCode === 'ETIMEDOUT') {
      return { code: 'TIMEOUT_ERROR', category: 'network', severity: 'medium', retryable: true }
    }

    // Default classification
    return { code: 'UNKNOWN_ERROR', category: 'unknown', severity: 'medium', retryable: false }
  }

  private calculateRetryDelay(attempt: number): number {
    const { baseDelayMs, maxDelayMs, backoffMultiplier, jitterMs } = this.config.retryConfig

    const exponentialDelay = Math.min(
      baseDelayMs * Math.pow(backoffMultiplier, attempt - 1),
      maxDelayMs
    )

    const jitter = Math.random() * jitterMs
    return exponentialDelay + jitter
  }

  private getCircuitBreaker(operationName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(operationName)) {
      this.circuitBreakers.set(
        operationName,
        new CircuitBreaker(operationName, this.config.circuitBreakerConfig)
      )
    }
    return this.circuitBreakers.get(operationName)!
  }

  private async reportError(error: VerificationError, attempt: number): Promise<void> {
    try {
      // Log error with performance monitor
      this.monitor.startMetric('error_reporting', {
        errorCode: error.code,
        category: error.category,
        severity: error.severity,
        attempt,
        correlationId: error.correlationId
      }, ['error', 'reporting'])

      // Check if we should send alerts
      await this.checkAndSendAlerts(error)

      // Store error for analysis (would typically persist to database)
      console.error('Verification Error:', {
        code: error.code,
        message: error.message,
        category: error.category,
        severity: error.severity,
        context: error.context,
        attempt,
        timestamp: error.timestamp,
        correlationId: error.correlationId
      })

    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  private async checkAndSendAlerts(error: VerificationError): Promise<void> {
    if (error.severity === 'critical') {
      // Immediate alert for critical errors
      await this.sendAlert({
        type: 'critical_error',
        error,
        timestamp: Date.now()
      })
    }

    // Check error rate threshold
    const now = Date.now()
    const windowStart = now - this.config.alertingConfig.timeWindowMs

    // Count recent errors (simplified - would use persistent storage in production)
    const recentErrorCount = this.countRecentErrors(windowStart, now)

    if (recentErrorCount >= this.config.alertingConfig.errorRateThreshold) {
      await this.sendAlert({
        type: 'error_rate_threshold',
        errorCount: recentErrorCount,
        timeWindow: this.config.alertingConfig.timeWindowMs,
        timestamp: now
      })
    }
  }

  private countRecentErrors(startTime: number, endTime: number): number {
    // This would query a persistent error log in production
    return 0
  }

  private async sendAlert(alert: any): Promise<void> {
    // Implementation would send alerts via configured channels
    console.warn('Alert:', alert)
  }

  private async attemptGracefulDegradation<T>(
    context: Record<string, any>,
    error: VerificationError
  ): Promise<T | null> {
    // Implement graceful degradation strategies based on operation type
    const operationName = context.operationName

    if (operationName.includes('verification')) {
      // For verification operations, might return cached results or simplified verification
      return this.getGracefulVerificationFallback(context) as T | null
    }

    if (operationName.includes('database')) {
      // For database operations, might use cached data or read replicas
      return this.getGracefulDatabaseFallback(context) as T | null
    }

    return null
  }

  private async getGracefulVerificationFallback(context: Record<string, any>): Promise<any> {
    // Return simplified verification or cached results
    console.warn('Using graceful degradation for verification operation:', context)
    return null
  }

  private async getGracefulDatabaseFallback(context: Record<string, any>): Promise<any> {
    // Return cached data or use read replica
    console.warn('Using graceful degradation for database operation:', context)
    return null
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
      )
    ])
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Circuit Breaker implementation
 */
class CircuitBreaker {
  public state: 'closed' | 'open' | 'half-open' = 'closed'
  public failureCount = 0
  public lastFailureTime: number | null = null
  public nextAttemptTime: number | null = null
  private halfOpenAttempts = 0

  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {}

  recordSuccess(): void {
    this.failureCount = 0
    this.lastFailureTime = null
    this.nextAttemptTime = null
    this.halfOpenAttempts = 0
    this.state = 'closed'
  }

  recordFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.state === 'half-open') {
      this.state = 'open'
      this.nextAttemptTime = Date.now() + this.config.resetTimeoutMs
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open'
      this.nextAttemptTime = Date.now() + this.config.resetTimeoutMs
    }
  }

  canAttempt(): boolean {
    if (this.state === 'closed') return true
    if (this.state === 'open') {
      if (this.nextAttemptTime && Date.now() >= this.nextAttemptTime) {
        this.state = 'half-open'
        this.halfOpenAttempts = 0
        return true
      }
      return false
    }
    if (this.state === 'half-open') {
      return this.halfOpenAttempts < this.config.halfOpenMaxCalls
    }
    return false
  }

  reset(): void {
    this.state = 'closed'
    this.failureCount = 0
    this.lastFailureTime = null
    this.nextAttemptTime = null
    this.halfOpenAttempts = 0
  }
}

// Singleton instance
let errorHandlerInstance: VerificationErrorHandler | null = null

export function getVerificationErrorHandler(config?: Partial<ErrorHandlerConfig>): VerificationErrorHandler {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new VerificationErrorHandler(config)
  }
  return errorHandlerInstance
}

// Error handling decorator
export function HandleErrors(options?: {
  retryable?: boolean
  severity?: ErrorSeverity
  category?: ErrorCategory
}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const errorHandler = getVerificationErrorHandler()

    descriptor.value = async function (...args: any[]) {
      const context = {
        operationName: `${target.constructor.name}.${propertyName}`,
        correlationId: errorHandler.generateCorrelationId(),
        ...args[0] // Assume first arg contains context
      }

      return errorHandler.execute(() => method.apply(this, args), context)
    }

    return descriptor
  }
}