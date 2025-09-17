/**
 * Advanced caching system for verification data and operations
 *
 * Features:
 * - In-memory caching with TTL
 * - Redis-like operations for production scalability
 * - Cache invalidation strategies
 * - Performance monitoring and metrics
 * - Batch operations optimization
 * - Session-based caching for verification workflows
 */

interface CacheConfig {
  // TTL settings (in milliseconds)
  sessionTTL: number
  batchTTL: number
  transactionTTL: number
  metricsTTL: number
  userPreferencesTTL: number

  // Cache limits
  maxSessionEntries: number
  maxBatchEntries: number
  maxTransactionEntries: number

  // Performance settings
  enableCompression: boolean
  enableMetrics: boolean
  preloadStrategies: string[]
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
  tags: string[]
}

interface CacheMetrics {
  hits: number
  misses: number
  hitRatio: number
  totalRequests: number
  averageResponseTime: number
  memoryUsage: number
  lastCleanup: number
}

export type CacheKey =
  | `session:${string}`
  | `batch:${string}`
  | `transaction:${string}`
  | `business:${string}`
  | `user_prefs:${string}`
  | `metrics:${string}`
  | `fraud_patterns:${string}`
  | `audit_trail:${string}`

export class VerificationCache {
  private cache = new Map<string, CacheEntry<any>>()
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRatio: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    memoryUsage: 0,
    lastCleanup: Date.now()
  }

  private config: CacheConfig = {
    sessionTTL: 2 * 60 * 60 * 1000, // 2 hours
    batchTTL: 24 * 60 * 60 * 1000, // 24 hours
    transactionTTL: 6 * 60 * 60 * 1000, // 6 hours
    metricsTTL: 15 * 60 * 1000, // 15 minutes
    userPreferencesTTL: 60 * 60 * 1000, // 1 hour

    maxSessionEntries: 1000,
    maxBatchEntries: 500,
    maxTransactionEntries: 10000,

    enableCompression: true,
    enableMetrics: true,
    preloadStrategies: ['active_sessions', 'critical_batches']
  }

  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(customConfig?: Partial<CacheConfig>) {
    this.config = { ...this.config, ...customConfig }
    this.startCleanupTimer()
  }

  /**
   * Get cached data with performance tracking
   */
  async get<T>(key: CacheKey): Promise<T | null> {
    const startTime = Date.now()
    this.metrics.totalRequests++

    const entry = this.cache.get(key)

    if (!entry) {
      this.metrics.misses++
      this.updateMetrics(startTime)
      return null
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      this.metrics.misses++
      this.updateMetrics(startTime)
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = Date.now()

    this.metrics.hits++
    this.updateMetrics(startTime)

    return entry.data as T
  }

  /**
   * Set cached data with automatic TTL determination
   */
  async set<T>(key: CacheKey, data: T, customTTL?: number, tags: string[] = []): Promise<void> {
    const ttl = customTTL || this.getTTLForKey(key)

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      tags
    }

    this.cache.set(key, entry)

    // Enforce cache size limits
    await this.enforceLimits()
  }

  /**
   * Cache verification session data
   */
  async cacheSession(sessionId: string, sessionData: any): Promise<void> {
    const key: CacheKey = `session:${sessionId}`
    await this.set(key, sessionData, this.config.sessionTTL, ['session', 'verification'])

    // Preload related data
    if (sessionData.batch_id) {
      await this.preloadBatch(sessionData.batch_id)
    }
  }

  /**
   * Cache batch data with related transactions
   */
  async cacheBatch(batchId: string, batchData: any): Promise<void> {
    const key: CacheKey = `batch:${batchId}`
    await this.set(key, batchData, this.config.batchTTL, ['batch', 'verification'])

    // Cache transaction summaries
    if (batchData.transactions) {
      for (const transaction of batchData.transactions) {
        const transactionKey: CacheKey = `transaction:${transaction.id}`
        await this.set(transactionKey, transaction, this.config.transactionTTL, ['transaction', batchId])
      }
    }
  }

  /**
   * Cache user preferences and settings
   */
  async cacheUserPreferences(userId: string, preferences: any): Promise<void> {
    const key: CacheKey = `user_prefs:${userId}`
    await this.set(key, preferences, this.config.userPreferencesTTL, ['user', 'preferences'])
  }

  /**
   * Cache business-specific data
   */
  async cacheBusiness(businessId: string, businessData: any): Promise<void> {
    const key: CacheKey = `business:${businessId}`
    await this.set(key, businessData, this.config.batchTTL, ['business', businessId])
  }

  /**
   * Cache fraud detection patterns and rules
   */
  async cacheFraudPatterns(patterns: any): Promise<void> {
    const key: CacheKey = 'fraud_patterns:current'
    await this.set(key, patterns, this.config.metricsTTL, ['fraud', 'patterns'])
  }

  /**
   * Bulk get operation for efficiency
   */
  async getBulk<T>(keys: CacheKey[]): Promise<Map<CacheKey, T | null>> {
    const results = new Map<CacheKey, T | null>()

    for (const key of keys) {
      const value = await this.get<T>(key)
      results.set(key, value)
    }

    return results
  }

  /**
   * Bulk set operation for efficiency
   */
  async setBulk<T>(entries: Array<{ key: CacheKey; data: T; ttl?: number; tags?: string[] }>): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.data, entry.ttl, entry.tags)
    }
  }

  /**
   * Invalidate cache by key pattern or tags
   */
  async invalidate(pattern: string | RegExp, byTags = false): Promise<number> {
    let deletedCount = 0

    if (byTags && typeof pattern === 'string') {
      // Invalidate by tags
      for (const [key, entry] of this.cache.entries()) {
        if (entry.tags.includes(pattern)) {
          this.cache.delete(key)
          deletedCount++
        }
      }
    } else {
      // Invalidate by key pattern
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key)
          deletedCount++
        }
      }
    }

    return deletedCount
  }

  /**
   * Invalidate session-related cache
   */
  async invalidateSession(sessionId: string): Promise<void> {
    await this.invalidate(`session:${sessionId}`)
    await this.invalidate(sessionId, true) // By tags
  }

  /**
   * Invalidate batch-related cache
   */
  async invalidateBatch(batchId: string): Promise<void> {
    await this.invalidate(`batch:${batchId}`)
    await this.invalidate(batchId, true) // By tags
  }

  /**
   * Invalidate user-specific cache
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.invalidate(`user_prefs:${userId}`)
    await this.invalidate(userId, true) // By tags
  }

  /**
   * Preload critical data based on strategies
   */
  async preload(): Promise<void> {
    if (!this.config.preloadStrategies.length) return

    for (const strategy of this.config.preloadStrategies) {
      switch (strategy) {
        case 'active_sessions':
          await this.preloadActiveSessions()
          break
        case 'critical_batches':
          await this.preloadCriticalBatches()
          break
        case 'fraud_patterns':
          await this.preloadFraudPatterns()
          break
      }
    }
  }

  /**
   * Get cache performance metrics
   */
  getMetrics(): CacheMetrics & { cacheSize: number; memoryEstimate: string } {
    const cacheSize = this.cache.size
    const memoryEstimate = this.estimateMemoryUsage()

    return {
      ...this.metrics,
      hitRatio: this.metrics.totalRequests > 0
        ? this.metrics.hits / this.metrics.totalRequests
        : 0,
      cacheSize,
      memoryEstimate
    }
  }

  /**
   * Clear all cache data
   */
  async clear(): Promise<void> {
    this.cache.clear()
    this.resetMetrics()
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    const now = Date.now()
    let deletedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        deletedCount++
      }
    }

    this.metrics.lastCleanup = now
    this.metrics.memoryUsage = this.estimateMemoryUsage()

    return deletedCount
  }

  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
    this.resetMetrics()
  }

  // Private methods

  private getTTLForKey(key: CacheKey): number {
    if (key.startsWith('session:')) return this.config.sessionTTL
    if (key.startsWith('batch:')) return this.config.batchTTL
    if (key.startsWith('transaction:')) return this.config.transactionTTL
    if (key.startsWith('user_prefs:')) return this.config.userPreferencesTTL
    if (key.startsWith('metrics:')) return this.config.metricsTTL
    return this.config.metricsTTL // Default
  }

  private async enforceLimits(): Promise<void> {
    // Enforce session limit
    await this.enforceLimitByPrefix('session:', this.config.maxSessionEntries)

    // Enforce batch limit
    await this.enforceLimitByPrefix('batch:', this.config.maxBatchEntries)

    // Enforce transaction limit
    await this.enforceLimitByPrefix('transaction:', this.config.maxTransactionEntries)
  }

  private async enforceLimitByPrefix(prefix: string, maxEntries: number): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .filter(([key]) => key.startsWith(prefix))
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)

    while (entries.length > maxEntries) {
      const [oldestKey] = entries.shift()!
      this.cache.delete(oldestKey)
    }
  }

  private async preloadActiveSessions(): Promise<void> {
    // Implementation would fetch active sessions from database
    console.log('Preloading active sessions...')
  }

  private async preloadCriticalBatches(): Promise<void> {
    // Implementation would fetch critical batches from database
    console.log('Preloading critical batches...')
  }

  private async preloadBatch(batchId: string): Promise<void> {
    // Implementation would fetch batch data if not cached
    console.log(`Preloading batch: ${batchId}`)
  }

  private async preloadFraudPatterns(): Promise<void> {
    // Implementation would fetch latest fraud patterns
    console.log('Preloading fraud patterns...')
  }

  private updateMetrics(startTime: number): void {
    if (!this.config.enableMetrics) return

    const responseTime = Date.now() - startTime
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime + responseTime) / 2

    this.metrics.hitRatio = this.metrics.totalRequests > 0
      ? this.metrics.hits / this.metrics.totalRequests
      : 0
  }

  private estimateMemoryUsage(): number {
    // Rough memory estimation in bytes
    let totalSize = 0
    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2 // UTF-16 encoding
      totalSize += JSON.stringify(entry.data).length * 2
      totalSize += 64 // Overhead for entry metadata
    }
    return totalSize
  }

  private resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRatio: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      lastCleanup: Date.now()
    }
  }

  private startCleanupTimer(): void {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch(console.error)
    }, 5 * 60 * 1000)
  }
}

// Singleton instance for global use
let cacheInstance: VerificationCache | null = null

export function getVerificationCache(config?: Partial<CacheConfig>): VerificationCache {
  if (!cacheInstance) {
    cacheInstance = new VerificationCache(config)
  }
  return cacheInstance
}

// Cache middleware for API routes
export function withCache<T>(
  key: CacheKey,
  fetcher: () => Promise<T>,
  customTTL?: number
) {
  return async (): Promise<T> => {
    const cache = getVerificationCache()

    // Try to get from cache first
    const cached = await cache.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Fetch fresh data
    const data = await fetcher()

    // Cache the result
    await cache.set(key, data, customTTL)

    return data
  }
}

// Cache decorator for methods
export function Cached(key: (args: any[]) => CacheKey, ttl?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const cache = getVerificationCache()
      const cacheKey = key(args)

      const cached = await cache.get(cacheKey)
      if (cached !== null) {
        return cached
      }

      const result = await method.apply(this, args)
      await cache.set(cacheKey, result, ttl)

      return result
    }

    return descriptor
  }
}