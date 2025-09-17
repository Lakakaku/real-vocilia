/**
 * Performance monitoring system for verification operations
 *
 * Features:
 * - Request timing and metrics collection
 * - Database query performance tracking
 * - Memory usage monitoring
 * - Critical path analysis
 * - Performance alerts and thresholds
 * - Real-time performance dashboard data
 */

interface PerformanceMetric {
  id: string
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata: Record<string, any>
  tags: string[]
  status: 'running' | 'completed' | 'failed'
  memoryBefore?: number
  memoryAfter?: number
}

interface PerformanceAlert {
  type: 'slow_query' | 'high_memory' | 'timeout' | 'error_rate'
  threshold: number
  currentValue: number
  timestamp: number
  details: Record<string, any>
}

interface PerformanceThresholds {
  slowQueryMs: number
  highMemoryMB: number
  timeoutMs: number
  errorRatePercent: number
  criticalPathMs: number
}

interface PerformanceStats {
  totalRequests: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  errorRate: number
  throughput: number // requests per second
  memoryUsage: number
  cacheHitRate: number
  lastUpdated: number
}

export class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>()
  private completedMetrics: PerformanceMetric[] = []
  private alerts: PerformanceAlert[] = []

  private thresholds: PerformanceThresholds = {
    slowQueryMs: 1000,
    highMemoryMB: 512,
    timeoutMs: 30000,
    errorRatePercent: 5,
    criticalPathMs: 5000
  }

  private stats: PerformanceStats = {
    totalRequests: 0,
    averageResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
    errorRate: 0,
    throughput: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    lastUpdated: Date.now()
  }

  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(customThresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = { ...this.thresholds, ...customThresholds }
    this.startCleanupTimer()
  }

  /**
   * Start timing a performance metric
   */
  startMetric(name: string, metadata: Record<string, any> = {}, tags: string[] = []): string {
    const id = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const metric: PerformanceMetric = {
      id,
      name,
      startTime: Date.now(),
      metadata,
      tags,
      status: 'running',
      memoryBefore: this.getMemoryUsage()
    }

    this.metrics.set(id, metric)
    return id
  }

  /**
   * End timing a performance metric
   */
  endMetric(id: string, status: 'completed' | 'failed' = 'completed', additionalMetadata: Record<string, any> = {}): void {
    const metric = this.metrics.get(id)
    if (!metric) return

    const endTime = Date.now()
    const duration = endTime - metric.startTime

    metric.endTime = endTime
    metric.duration = duration
    metric.status = status
    metric.memoryAfter = this.getMemoryUsage()
    metric.metadata = { ...metric.metadata, ...additionalMetadata }

    // Move to completed metrics
    this.completedMetrics.push(metric)
    this.metrics.delete(id)

    // Update statistics
    this.updateStats(metric)

    // Check for performance alerts
    this.checkAlerts(metric)

    // Cleanup old metrics (keep last 10000)
    if (this.completedMetrics.length > 10000) {
      this.completedMetrics = this.completedMetrics.slice(-5000)
    }
  }

  /**
   * Time a function execution
   */
  async timeFunction<T>(
    name: string,
    fn: () => Promise<T>,
    metadata: Record<string, any> = {},
    tags: string[] = []
  ): Promise<T> {
    const metricId = this.startMetric(name, metadata, tags)

    try {
      const result = await fn()
      this.endMetric(metricId, 'completed')
      return result
    } catch (error) {
      this.endMetric(metricId, 'failed', { error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  /**
   * Track database query performance
   */
  async trackQuery<T>(
    queryName: string,
    query: () => Promise<T>,
    queryText?: string
  ): Promise<T> {
    return this.timeFunction(
      `db_query_${queryName}`,
      query,
      { queryText },
      ['database', 'query']
    )
  }

  /**
   * Track API endpoint performance
   */
  async trackEndpoint<T>(
    endpoint: string,
    handler: () => Promise<T>,
    method: string = 'GET'
  ): Promise<T> {
    return this.timeFunction(
      `api_${method.toLowerCase()}_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`,
      handler,
      { endpoint, method },
      ['api', 'endpoint']
    )
  }

  /**
   * Track verification session performance
   */
  async trackVerificationSession<T>(
    sessionId: string,
    operation: () => Promise<T>,
    operationType: string
  ): Promise<T> {
    return this.timeFunction(
      `verification_${operationType}`,
      operation,
      { sessionId, operationType },
      ['verification', 'session']
    )
  }

  /**
   * Track batch processing performance
   */
  async trackBatchProcessing<T>(
    batchId: string,
    operation: () => Promise<T>,
    batchSize: number
  ): Promise<T> {
    return this.timeFunction(
      'batch_processing',
      operation,
      { batchId, batchSize },
      ['batch', 'processing']
    )
  }

  /**
   * Get current performance statistics
   */
  getStats(): PerformanceStats {
    this.updateCurrentStats()
    return { ...this.stats }
  }

  /**
   * Get metrics by time range
   */
  getMetricsByTimeRange(startTime: number, endTime: number): PerformanceMetric[] {
    return this.completedMetrics.filter(
      metric => metric.startTime >= startTime && metric.startTime <= endTime
    )
  }

  /**
   * Get metrics by name pattern
   */
  getMetricsByName(namePattern: string | RegExp): PerformanceMetric[] {
    const regex = typeof namePattern === 'string' ? new RegExp(namePattern) : namePattern
    return this.completedMetrics.filter(metric => regex.test(metric.name))
  }

  /**
   * Get metrics by tags
   */
  getMetricsByTags(tags: string[]): PerformanceMetric[] {
    return this.completedMetrics.filter(metric =>
      tags.every(tag => metric.tags.includes(tag))
    )
  }

  /**
   * Get slow operations report
   */
  getSlowOperationsReport(limit = 10): PerformanceMetric[] {
    return this.completedMetrics
      .filter(metric => metric.duration && metric.duration > this.thresholds.slowQueryMs)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, limit)
  }

  /**
   * Get error rate by operation
   */
  getErrorRateByOperation(): Record<string, { total: number; errors: number; rate: number }> {
    const operations: Record<string, { total: number; errors: number }> = {}

    for (const metric of this.completedMetrics) {
      if (!operations[metric.name]) {
        operations[metric.name] = { total: 0, errors: 0 }
      }

      operations[metric.name].total++
      if (metric.status === 'failed') {
        operations[metric.name].errors++
      }
    }

    const result: Record<string, { total: number; errors: number; rate: number }> = {}
    for (const [name, data] of Object.entries(operations)) {
      result[name] = {
        ...data,
        rate: data.total > 0 ? (data.errors / data.total) * 100 : 0
      }
    }

    return result
  }

  /**
   * Get performance alerts
   */
  getAlerts(onlyRecent = true): PerformanceAlert[] {
    if (!onlyRecent) return [...this.alerts]

    const oneHourAgo = Date.now() - 60 * 60 * 1000
    return this.alerts.filter(alert => alert.timestamp > oneHourAgo)
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(olderThanHours = 24): number {
    const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000
    const initialLength = this.alerts.length
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff)
    return initialLength - this.alerts.length
  }

  /**
   * Export performance data for analysis
   */
  exportData(timeRange?: { start: number; end: number }): {
    metrics: PerformanceMetric[]
    stats: PerformanceStats
    alerts: PerformanceAlert[]
    summary: Record<string, any>
  } {
    const metrics = timeRange
      ? this.getMetricsByTimeRange(timeRange.start, timeRange.end)
      : this.completedMetrics

    return {
      metrics,
      stats: this.getStats(),
      alerts: this.getAlerts(false),
      summary: {
        totalMetrics: metrics.length,
        avgDuration: metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / metrics.length,
        errorCount: metrics.filter(m => m.status === 'failed').length,
        slowOperations: metrics.filter(m => (m.duration || 0) > this.thresholds.slowQueryMs).length,
        memoryStats: {
          max: Math.max(...metrics.map(m => m.memoryAfter || 0)),
          min: Math.min(...metrics.map(m => m.memoryBefore || 0)),
          avg: metrics.reduce((sum, m) => sum + (m.memoryAfter || 0), 0) / metrics.length
        }
      }
    }
  }

  /**
   * Reset all performance data
   */
  reset(): void {
    this.metrics.clear()
    this.completedMetrics = []
    this.alerts = []
    this.stats = {
      totalRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorRate: 0,
      throughput: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      lastUpdated: Date.now()
    }
  }

  /**
   * Destroy monitor and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.reset()
  }

  // Private methods

  private updateStats(metric: PerformanceMetric): void {
    this.stats.totalRequests++

    if (metric.duration) {
      // Update average response time
      this.stats.averageResponseTime =
        (this.stats.averageResponseTime * (this.stats.totalRequests - 1) + metric.duration) /
        this.stats.totalRequests

      // Update percentiles (simplified calculation)
      const recentMetrics = this.completedMetrics.slice(-100)
      const durations = recentMetrics
        .map(m => m.duration || 0)
        .sort((a, b) => a - b)

      if (durations.length > 0) {
        this.stats.p95ResponseTime = durations[Math.floor(durations.length * 0.95)]
        this.stats.p99ResponseTime = durations[Math.floor(durations.length * 0.99)]
      }
    }

    // Update error rate
    const recentErrors = this.completedMetrics.slice(-100).filter(m => m.status === 'failed')
    this.stats.errorRate = (recentErrors.length / Math.min(100, this.completedMetrics.length)) * 100

    this.stats.lastUpdated = Date.now()
  }

  private updateCurrentStats(): void {
    this.stats.memoryUsage = this.getMemoryUsage()

    // Calculate throughput (requests per second over last minute)
    const oneMinuteAgo = Date.now() - 60 * 1000
    const recentRequests = this.completedMetrics.filter(m => m.startTime > oneMinuteAgo)
    this.stats.throughput = recentRequests.length / 60
  }

  private checkAlerts(metric: PerformanceMetric): void {
    // Check for slow queries
    if (metric.duration && metric.duration > this.thresholds.slowQueryMs) {
      this.addAlert('slow_query', this.thresholds.slowQueryMs, metric.duration, {
        metricId: metric.id,
        operation: metric.name,
        duration: metric.duration
      })
    }

    // Check for high memory usage
    if (metric.memoryAfter && metric.memoryAfter > this.thresholds.highMemoryMB * 1024 * 1024) {
      this.addAlert('high_memory', this.thresholds.highMemoryMB, metric.memoryAfter / 1024 / 1024, {
        metricId: metric.id,
        operation: metric.name,
        memoryMB: metric.memoryAfter / 1024 / 1024
      })
    }

    // Check for timeouts
    if (metric.duration && metric.duration > this.thresholds.timeoutMs) {
      this.addAlert('timeout', this.thresholds.timeoutMs, metric.duration, {
        metricId: metric.id,
        operation: metric.name,
        duration: metric.duration
      })
    }

    // Check error rate
    if (this.stats.errorRate > this.thresholds.errorRatePercent) {
      this.addAlert('error_rate', this.thresholds.errorRatePercent, this.stats.errorRate, {
        totalRequests: this.stats.totalRequests,
        errorRate: this.stats.errorRate
      })
    }
  }

  private addAlert(
    type: PerformanceAlert['type'],
    threshold: number,
    currentValue: number,
    details: Record<string, any>
  ): void {
    this.alerts.push({
      type,
      threshold,
      currentValue,
      timestamp: Date.now(),
      details
    })

    // Limit alerts (keep last 1000)
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-500)
    }
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed
    }
    return 0
  }

  private startCleanupTimer(): void {
    // Cleanup old data every 10 minutes
    this.cleanupInterval = setInterval(() => {
      // Keep only last 24 hours of metrics
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
      this.completedMetrics = this.completedMetrics.filter(
        metric => metric.startTime > oneDayAgo
      )

      // Clear old alerts
      this.clearOldAlerts(24)
    }, 10 * 60 * 1000)
  }
}

// Singleton instance
let monitorInstance: PerformanceMonitor | null = null

export function getPerformanceMonitor(thresholds?: Partial<PerformanceThresholds>): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor(thresholds)
  }
  return monitorInstance
}

// Performance decorator
export function Monitor(name?: string, tags: string[] = []) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const metricName = name || `${target.constructor.name}.${propertyName}`

    descriptor.value = async function (...args: any[]) {
      const monitor = getPerformanceMonitor()
      return monitor.timeFunction(metricName, () => method.apply(this, args), { args }, tags)
    }

    return descriptor
  }
}