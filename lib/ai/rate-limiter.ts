/**
 * Rate Limiter - Controls AI API usage and costs
 * Implements per-business limits and usage tracking
 */

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface RateLimitConfig {
  maxRequestsPerDay: number
  maxTokensPerDay: number
  maxCostPerMonth: number
  burstLimit: number // Max requests in 1 minute
}

export interface UsageStats {
  requestsToday: number
  tokensToday: number
  costThisMonth: number
  lastRequestAt: Date | null
  recentRequests: number // In last minute
}

export interface RateLimitResult {
  allowed: boolean
  reason?: string
  remainingRequests?: number
  remainingTokens?: number
  resetAt?: Date
}

export class RateLimiter {
  private static readonly DEFAULT_CONFIG: RateLimitConfig = {
    maxRequestsPerDay: 100,
    maxTokensPerDay: 50000,
    maxCostPerMonth: 10.0, // 10 SEK per month
    burstLimit: 10, // 10 requests per minute
  }

  private static readonly TIER_CONFIGS: Record<string, RateLimitConfig> = {
    trial: {
      maxRequestsPerDay: 50,
      maxTokensPerDay: 25000,
      maxCostPerMonth: 5.0,
      burstLimit: 5,
    },
    basic: {
      maxRequestsPerDay: 100,
      maxTokensPerDay: 50000,
      maxCostPerMonth: 10.0,
      burstLimit: 10,
    },
    premium: {
      maxRequestsPerDay: 500,
      maxTokensPerDay: 250000,
      maxCostPerMonth: 50.0,
      burstLimit: 20,
    },
    enterprise: {
      maxRequestsPerDay: 2000,
      maxTokensPerDay: 1000000,
      maxCostPerMonth: 200.0,
      burstLimit: 50,
    },
  }

  /**
   * Check if request is allowed
   */
  static async checkLimit(
    businessId: string,
    estimatedTokens: number = 1000
  ): Promise<RateLimitResult> {
    const supabase = await createClient()

    // Get business subscription tier
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('subscription_status')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return {
        allowed: false,
        reason: 'Business not found',
      }
    }

    const config = this.getTierConfig(business.subscription_status || 'trial')

    // Get or create usage record
    const usage = await this.getUsageStats(businessId, supabase)

    // Check burst limit (requests per minute)
    if (usage.recentRequests >= config.burstLimit) {
      return {
        allowed: false,
        reason: 'Too many requests. Please wait a minute.',
        resetAt: new Date(Date.now() + 60000), // 1 minute
      }
    }

    // Check daily request limit
    if (usage.requestsToday >= config.maxRequestsPerDay) {
      const resetAt = this.getNextDayReset()
      return {
        allowed: false,
        reason: `Daily request limit reached (${config.maxRequestsPerDay})`,
        remainingRequests: 0,
        resetAt,
      }
    }

    // Check daily token limit
    if (usage.tokensToday + estimatedTokens > config.maxTokensPerDay) {
      const resetAt = this.getNextDayReset()
      return {
        allowed: false,
        reason: `Daily token limit would be exceeded`,
        remainingTokens: Math.max(0, config.maxTokensPerDay - usage.tokensToday),
        resetAt,
      }
    }

    // Check monthly cost limit
    const estimatedCost = this.estimateRequestCost(estimatedTokens)
    if (usage.costThisMonth + estimatedCost > config.maxCostPerMonth) {
      const resetAt = this.getNextMonthReset()
      return {
        allowed: false,
        reason: `Monthly cost limit would be exceeded (${config.maxCostPerMonth} SEK)`,
        resetAt,
      }
    }

    // Request is allowed
    return {
      allowed: true,
      remainingRequests: config.maxRequestsPerDay - usage.requestsToday - 1,
      remainingTokens: config.maxTokensPerDay - usage.tokensToday - estimatedTokens,
    }
  }

  /**
   * Record API usage
   */
  static async recordUsage(
    businessId: string,
    tokens: number,
    cost: number
  ): Promise<void> {
    const supabase = await createClient()

    try {
      // Get current usage
      const { data: existingUsage } = await supabase
        .from('ai_usage')
        .select('*')
        .eq('business_id', businessId)
        .eq('date', new Date().toISOString().split('T')[0])
        .single()

      if (existingUsage) {
        // Update existing record
        await supabase
          .from('ai_usage')
          .update({
            requests: existingUsage.requests + 1,
            tokens: existingUsage.tokens + tokens,
            cost: existingUsage.cost + cost,
            last_request_at: new Date().toISOString(),
          })
          .eq('id', existingUsage.id)
      } else {
        // Create new record for today
        await supabase
          .from('ai_usage')
          .insert({
            business_id: businessId,
            date: new Date().toISOString().split('T')[0],
            requests: 1,
            tokens,
            cost,
            last_request_at: new Date().toISOString(),
          })
      }

      // Record in recent requests cache (for burst limiting)
      await this.recordRecentRequest(businessId, supabase)

    } catch (error) {
      console.error('Error recording AI usage:', error)
    }
  }

  /**
   * Get usage statistics
   */
  private static async getUsageStats(
    businessId: string,
    supabase: SupabaseClient
  ): Promise<UsageStats> {
    const today = new Date().toISOString().split('T')[0]
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Get today's usage
    const { data: todayUsage } = await supabase
      .from('ai_usage')
      .select('requests, tokens, last_request_at')
      .eq('business_id', businessId)
      .eq('date', today)
      .single()

    // Get month's total cost
    const { data: monthUsage } = await supabase
      .from('ai_usage')
      .select('cost')
      .eq('business_id', businessId)
      .gte('date', startOfMonth.toISOString().split('T')[0])

    const monthCost = monthUsage?.reduce((sum, record) => sum + (record.cost || 0), 0) || 0

    // Get recent requests (last minute)
    const oneMinuteAgo = new Date(Date.now() - 60000)
    const { data: recentRequests } = await supabase
      .from('ai_request_log')
      .select('id')
      .eq('business_id', businessId)
      .gte('created_at', oneMinuteAgo.toISOString())

    return {
      requestsToday: todayUsage?.requests || 0,
      tokensToday: todayUsage?.tokens || 0,
      costThisMonth: monthCost,
      lastRequestAt: todayUsage?.last_request_at ? new Date(todayUsage.last_request_at) : null,
      recentRequests: recentRequests?.length || 0,
    }
  }

  /**
   * Record recent request for burst limiting
   */
  private static async recordRecentRequest(
    businessId: string,
    supabase: SupabaseClient
  ): Promise<void> {
    try {
      // Insert request log
      await supabase
        .from('ai_request_log')
        .insert({
          business_id: businessId,
          created_at: new Date().toISOString(),
        })

      // Clean up old entries (older than 1 minute)
      const oneMinuteAgo = new Date(Date.now() - 60000)
      await supabase
        .from('ai_request_log')
        .delete()
        .eq('business_id', businessId)
        .lt('created_at', oneMinuteAgo.toISOString())

    } catch (error) {
      console.error('Error recording recent request:', error)
    }
  }

  /**
   * Get tier configuration
   */
  private static getTierConfig(tier: string): RateLimitConfig {
    return this.TIER_CONFIGS[tier] || this.DEFAULT_CONFIG
  }

  /**
   * Estimate request cost in SEK
   */
  private static estimateRequestCost(tokens: number): number {
    // GPT-4o-mini pricing (approximate)
    const costPerThousandTokens = 0.002 // USD
    const usdToSek = 10.5 // Approximate exchange rate

    return (tokens / 1000) * costPerThousandTokens * usdToSek
  }

  /**
   * Get next day reset time
   */
  private static getNextDayReset(): Date {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return tomorrow
  }

  /**
   * Get next month reset time
   */
  private static getNextMonthReset(): Date {
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(1)
    nextMonth.setHours(0, 0, 0, 0)
    return nextMonth
  }

  /**
   * Get usage summary for business
   */
  static async getUsageSummary(businessId: string): Promise<{
    daily: UsageStats
    monthly: {
      totalRequests: number
      totalTokens: number
      totalCost: number
    }
    limits: RateLimitConfig
    percentUsed: {
      requests: number
      tokens: number
      cost: number
    }
  }> {
    const supabase = await createClient()

    // Get business tier
    const { data: business } = await supabase
      .from('businesses')
      .select('subscription_status')
      .eq('id', businessId)
      .single()

    const config = this.getTierConfig(business?.subscription_status || 'trial')
    const usage = await this.getUsageStats(businessId, supabase)

    // Get monthly totals
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: monthData } = await supabase
      .from('ai_usage')
      .select('requests, tokens, cost')
      .eq('business_id', businessId)
      .gte('date', startOfMonth.toISOString().split('T')[0])

    const monthlyTotals = monthData?.reduce(
      (acc, record) => ({
        totalRequests: acc.totalRequests + (record.requests || 0),
        totalTokens: acc.totalTokens + (record.tokens || 0),
        totalCost: acc.totalCost + (record.cost || 0),
      }),
      { totalRequests: 0, totalTokens: 0, totalCost: 0 }
    ) || { totalRequests: 0, totalTokens: 0, totalCost: 0 }

    // Calculate percentage used
    const percentUsed = {
      requests: (usage.requestsToday / config.maxRequestsPerDay) * 100,
      tokens: (usage.tokensToday / config.maxTokensPerDay) * 100,
      cost: (monthlyTotals.totalCost / config.maxCostPerMonth) * 100,
    }

    return {
      daily: usage,
      monthly: monthlyTotals,
      limits: config,
      percentUsed,
    }
  }

  /**
   * Reset daily limits (for admin use)
   */
  static async resetDailyLimits(businessId: string): Promise<void> {
    const supabase = await createClient()

    const today = new Date().toISOString().split('T')[0]

    await supabase
      .from('ai_usage')
      .delete()
      .eq('business_id', businessId)
      .eq('date', today)

    await supabase
      .from('ai_request_log')
      .delete()
      .eq('business_id', businessId)
  }

  /**
   * Set custom limits for a business (admin use)
   */
  static async setCustomLimits(
    businessId: string,
    limits: Partial<RateLimitConfig>
  ): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('businesses')
      .update({
        settings: {
          ai_limits: limits,
        },
      })
      .eq('id', businessId)
  }
}

export default RateLimiter