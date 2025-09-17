/**
 * API endpoint for verification performance metrics and monitoring
 *
 * GET /api/verification/performance
 * Returns real-time performance metrics, cache statistics, and system health
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// import { getCachedVerificationService } from '@/lib/verification/services/cached-verification-service'
import { getPerformanceMonitor } from '@/lib/verification/performance/performance-monitor'
import { getVerificationCache } from '@/lib/verification/caching/verification-cache'
import { z } from 'zod'

// Query parameters validation
const performanceQuerySchema = z.object({
  timeframe: z.enum(['1h', '24h', '7d', '30d']).optional().default('24h'),
  include_cache: z.boolean().optional().default(true),
  include_alerts: z.boolean().optional().default(true),
  include_slow_ops: z.boolean().optional().default(true),
  limit: z.coerce.number().min(1).max(100).optional().default(10)
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication and admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin access
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!adminData || !['admin', 'super_admin'].includes(adminData.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)
    const queryParams = {
      timeframe: searchParams.get('timeframe') || '24h',
      include_cache: searchParams.get('include_cache') !== 'false',
      include_alerts: searchParams.get('include_alerts') !== 'false',
      include_slow_ops: searchParams.get('include_slow_ops') !== 'false',
      limit: parseInt(searchParams.get('limit') || '10')
    }

    const validation = performanceQuerySchema.safeParse(queryParams)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { timeframe, include_cache, include_alerts, include_slow_ops, limit } = validation.data

    // Get services
    const verificationService = getCachedVerificationService()
    const performanceMonitor = getPerformanceMonitor()
    const cache = getVerificationCache()

    // Collect performance data
    const performanceData: any = {
      timestamp: new Date().toISOString(),
      timeframe,
      system: {
        uptime: process.uptime?.() || 0,
        memory: process.memoryUsage?.() || {},
        platform: process.platform || 'unknown',
        version: process.version || 'unknown'
      }
    }

    // Get performance statistics
    performanceData.performance = performanceMonitor.getStats()

    // Get cache metrics if requested
    if (include_cache) {
      performanceData.cache = cache.getMetrics()
    }

    // Get alerts if requested
    if (include_alerts) {
      performanceData.alerts = performanceMonitor.getAlerts(true)
    }

    // Get slow operations if requested
    if (include_slow_ops) {
      performanceData.slowOperations = performanceMonitor.getSlowOperationsReport(limit)
    }

    // Get error rates by operation
    performanceData.errorRates = performanceMonitor.getErrorRateByOperation()

    // Get verification-specific metrics
    const timeframeDays = timeframe === '1h' ? 1/24 :
                         timeframe === '24h' ? 1 :
                         timeframe === '7d' ? 7 : 30

    const startTime = Date.now() - (timeframeDays * 24 * 60 * 60 * 1000)
    const metrics = performanceMonitor.getMetricsByTimeRange(startTime, Date.now())

    // Analyze verification performance
    const verificationMetrics = metrics.filter(m => m.tags.includes('verification'))
    const dbMetrics = metrics.filter(m => m.tags.includes('database'))
    const apiMetrics = metrics.filter(m => m.tags.includes('api'))

    performanceData.verification = {
      totalOperations: verificationMetrics.length,
      averageDuration: verificationMetrics.length > 0
        ? verificationMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / verificationMetrics.length
        : 0,
      slowOperations: verificationMetrics.filter(m => (m.duration || 0) > 1000).length,
      errorRate: verificationMetrics.length > 0
        ? (verificationMetrics.filter(m => m.status === 'failed').length / verificationMetrics.length) * 100
        : 0
    }

    performanceData.database = {
      totalQueries: dbMetrics.length,
      averageQueryTime: dbMetrics.length > 0
        ? dbMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / dbMetrics.length
        : 0,
      slowQueries: dbMetrics.filter(m => (m.duration || 0) > 500).length,
      errorRate: dbMetrics.length > 0
        ? (dbMetrics.filter(m => m.status === 'failed').length / dbMetrics.length) * 100
        : 0
    }

    performanceData.api = {
      totalRequests: apiMetrics.length,
      averageResponseTime: apiMetrics.length > 0
        ? apiMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / apiMetrics.length
        : 0,
      slowRequests: apiMetrics.filter(m => (m.duration || 0) > 2000).length,
      errorRate: apiMetrics.length > 0
        ? (apiMetrics.filter(m => m.status === 'failed').length / apiMetrics.length) * 100
        : 0
    }

    // Calculate health score
    const healthScore = calculateSystemHealthScore(performanceData)
    performanceData.health = {
      score: healthScore,
      status: healthScore >= 90 ? 'excellent' :
              healthScore >= 75 ? 'good' :
              healthScore >= 60 ? 'warning' : 'critical',
      recommendations: generateRecommendations(performanceData)
    }

    return NextResponse.json({
      success: true,
      data: performanceData
    })

  } catch (error) {
    console.error('Error in GET /api/verification/performance:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Clear performance data (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication and admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has super admin access
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!adminData || adminData.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    // Clear performance data
    const performanceMonitor = getPerformanceMonitor()
    const cache = getVerificationCache()

    performanceMonitor.reset()
    await cache.clear()

    // Log the action
    await supabase
      .from('admin_logs')
      .insert({
        admin_id: user.id,
        action: 'clear_performance_data',
        details: {
          timestamp: new Date().toISOString(),
          reason: 'Manual reset by super admin'
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Performance data cleared successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/verification/performance:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper functions

function calculateSystemHealthScore(data: any): number {
  let score = 100

  // Performance penalties
  if (data.performance.errorRate > 5) score -= 20
  if (data.performance.averageResponseTime > 2000) score -= 15
  if (data.verification.errorRate > 3) score -= 15
  if (data.database.slowQueries > 10) score -= 10
  if (data.api.slowRequests > 5) score -= 10

  // Cache efficiency
  if (data.cache && data.cache.hitRatio < 0.8) score -= 10

  // Alert penalties
  if (data.alerts) {
    const criticalAlerts = data.alerts.filter((a: any) => a.type === 'timeout' || a.type === 'error_rate')
    score -= criticalAlerts.length * 5
  }

  return Math.max(0, Math.min(100, score))
}

function generateRecommendations(data: any): string[] {
  const recommendations: string[] = []

  if (data.performance.errorRate > 5) {
    recommendations.push('High error rate detected. Review error logs and fix failing operations.')
  }

  if (data.performance.averageResponseTime > 2000) {
    recommendations.push('Slow response times detected. Consider optimizing queries and adding more caching.')
  }

  if (data.cache && data.cache.hitRatio < 0.8) {
    recommendations.push('Low cache hit ratio. Review caching strategies and TTL settings.')
  }

  if (data.database.slowQueries > 10) {
    recommendations.push('Multiple slow database queries detected. Add indexes and optimize query performance.')
  }

  if (data.verification.slowOperations > 5) {
    recommendations.push('Slow verification operations detected. Review fraud detection algorithms and batch processing.')
  }

  if (data.system.memory.heapUsed > 500 * 1024 * 1024) {
    recommendations.push('High memory usage detected. Monitor for memory leaks and optimize data structures.')
  }

  if (recommendations.length === 0) {
    recommendations.push('System is performing well. Continue monitoring for optimal performance.')
  }

  return recommendations
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'GET, DELETE' } }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'GET, DELETE' } }
  )
}