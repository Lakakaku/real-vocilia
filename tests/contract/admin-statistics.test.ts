/**
 * Contract Test: GET /api/admin/statistics
 *
 * Tests the admin API endpoint that returns comprehensive system
 * statistics and metrics for dashboard display.
 *
 * This test MUST FAIL initially (TDD approach) until the endpoint is implemented.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest } from 'next/server'
import { GET } from '../../app/api/admin/statistics/route'

// Mock data for testing
const mockAdminUserId = 'admin_123456789'
const mockSystemStats = {
  // Business metrics
  total_businesses: 25,
  active_businesses: 22,
  suspended_businesses: 3,
  new_businesses_this_month: 5,
  businesses_by_plan: {
    basic: 10,
    premium: 12,
    enterprise: 3,
  },

  // Verification metrics
  total_batches: 150,
  pending_batches: 8,
  overdue_batches: 2,
  completed_batches: 140,
  total_transactions_processed: 15000,
  total_amount_processed: 1500000.00, // 1.5M SEK
  average_completion_time_days: 4.2,

  // Approval metrics
  overall_approval_rate: 87.5,
  approval_rate_by_plan: {
    basic: 85.2,
    premium: 89.1,
    enterprise: 92.3,
  },

  // Time-based metrics
  verification_times: {
    under_24h: 45,
    under_48h: 78,
    under_72h: 95,
    over_72h: 5,
  },

  // Fraud detection metrics
  fraud_assessments_total: 12500,
  high_risk_transactions: 125,
  flagged_for_review: 89,
  false_positives: 12,
  fraud_detection_accuracy: 96.8,

  // System health
  system_health: {
    api_uptime: 99.9,
    database_performance: 'optimal',
    storage_usage_gb: 12.5,
    active_sessions: 45,
  },
}

const mockTrendData = {
  weekly_batches: [
    { week: '2024-W01', count: 18, amount: 180000 },
    { week: '2024-W02', count: 22, amount: 220000 },
    { week: '2024-W03', count: 19, amount: 190000 },
    { week: '2024-W04', count: 25, amount: 250000 },
  ],
  monthly_businesses: [
    { month: '2024-01', new_businesses: 8, total_businesses: 20 },
    { month: '2024-02', new_businesses: 5, total_businesses: 25 },
  ],
  approval_rates_weekly: [
    { week: '2024-W01', rate: 85.5 },
    { week: '2024-W02', rate: 87.2 },
    { week: '2024-W03', rate: 86.8 },
    { week: '2024-W04', rate: 89.1 },
  ],
}

describe('GET /api/admin/statistics', () => {
  let mockRequest: NextRequest
  let mockSupabaseClient: any

  beforeEach(() => {
    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockAdminUserId } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        data: [{ is_admin: true }],
        error: null,
      }),
    }

    // Mock the createRouteHandlerClient
    vi.mocked(createRouteHandlerClient).mockReturnValue(mockSupabaseClient)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid JWT' },
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/statistics')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    })
  })

  it('should return 403 when user is not an admin', async () => {
    mockSupabaseClient.rpc.mockResolvedValue({
      data: [{ is_admin: false }],
      error: null,
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/statistics')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      },
    })
  })

  it('should return comprehensive system statistics', async () => {
    // Mock different RPC calls for different statistics
    mockSupabaseClient.rpc
      .mockResolvedValueOnce({ data: [mockSystemStats], error: null }) // get_system_statistics
      .mockResolvedValueOnce({ data: mockTrendData.weekly_batches, error: null }) // get_weekly_batch_trends
      .mockResolvedValueOnce({ data: mockTrendData.monthly_businesses, error: null }) // get_monthly_business_trends
      .mockResolvedValueOnce({ data: mockTrendData.approval_rates_weekly, error: null }) // get_approval_rate_trends

    mockRequest = new NextRequest('http://localhost:3000/api/admin/statistics')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      data: {
        overview: {
          total_businesses: 25,
          active_businesses: 22,
          suspended_businesses: 3,
          new_businesses_this_month: 5,
          total_batches: 150,
          pending_batches: 8,
          overdue_batches: 2,
          total_transactions_processed: 15000,
          total_amount_processed: 1500000.00,
          overall_approval_rate: 87.5,
          average_completion_time_days: 4.2,
        },
        business_breakdown: {
          by_subscription_plan: {
            basic: { count: 10, percentage: 40.0 },
            premium: { count: 12, percentage: 48.0 },
            enterprise: { count: 3, percentage: 12.0 },
          },
          approval_rates_by_plan: {
            basic: 85.2,
            premium: 89.1,
            enterprise: 92.3,
          },
        },
        verification_performance: {
          completion_times: {
            under_24h: { count: 45, percentage: 30.0 },
            under_48h: { count: 78, percentage: 52.0 },
            under_72h: { count: 95, percentage: 63.3 },
            over_72h: { count: 5, percentage: 3.3 },
          },
          average_completion_time_days: 4.2,
          on_time_completion_rate: 96.7,
        },
        fraud_detection: {
          total_assessments: 12500,
          high_risk_transactions: 125,
          flagged_for_review: 89,
          false_positives: 12,
          accuracy_percentage: 96.8,
          risk_distribution: {
            low: expect.any(Number),
            medium: expect.any(Number),
            high: expect.any(Number),
          },
        },
        trends: {
          weekly_batches: mockTrendData.weekly_batches,
          monthly_businesses: mockTrendData.monthly_businesses,
          approval_rates: mockTrendData.approval_rates_weekly,
        },
        system_health: {
          api_uptime_percentage: 99.9,
          database_performance: 'optimal',
          storage_usage_gb: 12.5,
          active_sessions: 45,
          last_updated: expect.any(String),
        },
      },
    })

    // Verify correct RPC calls were made
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_system_statistics')
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_weekly_batch_trends', { weeks: 12 })
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_monthly_business_trends', { months: 6 })
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_approval_rate_trends', { weeks: 12 })
  })

  it('should support custom date range filtering', async () => {
    mockSupabaseClient.rpc
      .mockResolvedValueOnce({ data: [mockSystemStats], error: null })
      .mockResolvedValueOnce({ data: mockTrendData.weekly_batches, error: null })
      .mockResolvedValueOnce({ data: mockTrendData.monthly_businesses, error: null })
      .mockResolvedValueOnce({ data: mockTrendData.approval_rates_weekly, error: null })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/statistics?date_from=2024-01-01&date_to=2024-02-29')
    const response = await GET(mockRequest)

    expect(response.status).toBe(200)

    // Verify date range was passed to RPC calls
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_system_statistics', {
      date_from: '2024-01-01',
      date_to: '2024-02-29',
    })
  })

  it('should include real-time metrics', async () => {
    const realTimeStats = {
      ...mockSystemStats,
      real_time: {
        active_verification_sessions: 12,
        recent_batch_uploads: 3,
        pending_fraud_reviews: 5,
        system_alerts: 1,
      },
    }

    mockSupabaseClient.rpc
      .mockResolvedValueOnce({ data: [realTimeStats], error: null })
      .mockResolvedValueOnce({ data: mockTrendData.weekly_batches, error: null })
      .mockResolvedValueOnce({ data: mockTrendData.monthly_businesses, error: null })
      .mockResolvedValueOnce({ data: mockTrendData.approval_rates_weekly, error: null })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/statistics?include_realtime=true')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.real_time).toEqual({
      active_verification_sessions: 12,
      recent_batch_uploads: 3,
      pending_fraud_reviews: 5,
      system_alerts: 1,
      last_updated: expect.any(String),
    })
  })

  it('should calculate percentages correctly', async () => {
    mockSupabaseClient.rpc
      .mockResolvedValueOnce({ data: [mockSystemStats], error: null })
      .mockResolvedValueOnce({ data: mockTrendData.weekly_batches, error: null })
      .mockResolvedValueOnce({ data: mockTrendData.monthly_businesses, error: null })
      .mockResolvedValueOnce({ data: mockTrendData.approval_rates_weekly, error: null })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/statistics')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)

    // Verify subscription plan percentages add up to 100%
    const planPercentages = Object.values(data.data.business_breakdown.by_subscription_plan)
      .map((plan: any) => plan.percentage)
    const totalPercentage = planPercentages.reduce((sum: number, pct: number) => sum + pct, 0)
    expect(totalPercentage).toBe(100)

    // Verify completion time percentages are calculated correctly
    const completionTimes = data.data.verification_performance.completion_times
    expect(completionTimes.under_24h.percentage).toBe(30.0) // 45/150 * 100
    expect(completionTimes.over_72h.percentage).toBe(3.3) // 5/150 * 100 (rounded)
  })

  it('should handle empty data gracefully', async () => {
    const emptyStats = {
      total_businesses: 0,
      active_businesses: 0,
      suspended_businesses: 0,
      new_businesses_this_month: 0,
      total_batches: 0,
      pending_batches: 0,
      overdue_batches: 0,
      completed_batches: 0,
      total_transactions_processed: 0,
      total_amount_processed: 0,
      overall_approval_rate: 0,
      average_completion_time_days: 0,
      businesses_by_plan: { basic: 0, premium: 0, enterprise: 0 },
      approval_rate_by_plan: { basic: 0, premium: 0, enterprise: 0 },
      verification_times: { under_24h: 0, under_48h: 0, under_72h: 0, over_72h: 0 },
      fraud_assessments_total: 0,
      high_risk_transactions: 0,
      flagged_for_review: 0,
      false_positives: 0,
      fraud_detection_accuracy: 0,
      system_health: {
        api_uptime: 100,
        database_performance: 'optimal',
        storage_usage_gb: 0,
        active_sessions: 0,
      },
    }

    mockSupabaseClient.rpc
      .mockResolvedValueOnce({ data: [emptyStats], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/statistics')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.overview.total_businesses).toBe(0)
    expect(data.data.trends.weekly_batches).toEqual([])
    expect(data.data.business_breakdown.by_subscription_plan.basic.percentage).toBe(0)
  })

  it('should validate date range parameters', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/statistics?date_from=invalid-date')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_DATE_RANGE',
        message: 'Invalid date format. Use YYYY-MM-DD',
      },
    })
  })

  it('should handle database errors gracefully', async () => {
    mockSupabaseClient.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/statistics')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch system statistics',
      },
    })
  })

  it('should include trend analysis with growth rates', async () => {
    const trendWithGrowth = {
      weekly_batches: [
        { week: '2024-W01', count: 18, amount: 180000, growth_rate: 5.9 },
        { week: '2024-W02', count: 22, amount: 220000, growth_rate: 22.2 },
        { week: '2024-W03', count: 19, amount: 190000, growth_rate: -13.6 },
        { week: '2024-W04', count: 25, amount: 250000, growth_rate: 31.6 },
      ],
      monthly_businesses: [
        { month: '2024-01', new_businesses: 8, total_businesses: 20, growth_rate: 66.7 },
        { month: '2024-02', new_businesses: 5, total_businesses: 25, growth_rate: 25.0 },
      ],
      approval_rates_weekly: [
        { week: '2024-W01', rate: 85.5 },
        { week: '2024-W02', rate: 87.2 },
        { week: '2024-W03', rate: 86.8 },
        { week: '2024-W04', rate: 89.1 },
      ],
    }

    mockSupabaseClient.rpc
      .mockResolvedValueOnce({ data: [mockSystemStats], error: null })
      .mockResolvedValueOnce({ data: trendWithGrowth.weekly_batches, error: null })
      .mockResolvedValueOnce({ data: trendWithGrowth.monthly_businesses, error: null })
      .mockResolvedValueOnce({ data: trendWithGrowth.approval_rates_weekly, error: null })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/statistics?include_growth_rates=true')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.trends.weekly_batches[1].growth_rate).toBe(22.2)
    expect(data.data.trends.monthly_businesses[0].growth_rate).toBe(66.7)
  })

  it('should support business category breakdown', async () => {
    const statsWithCategories = {
      ...mockSystemStats,
      businesses_by_category: {
        restaurant: 12,
        retail: 8,
        cafe: 3,
        other: 2,
      },
    }

    mockSupabaseClient.rpc
      .mockResolvedValueOnce({ data: [statsWithCategories], error: null })
      .mockResolvedValueOnce({ data: mockTrendData.weekly_batches, error: null })
      .mockResolvedValueOnce({ data: mockTrendData.monthly_businesses, error: null })
      .mockResolvedValueOnce({ data: mockTrendData.approval_rates_weekly, error: null })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/statistics?include_categories=true')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.business_breakdown.by_category).toEqual({
      restaurant: { count: 12, percentage: 48.0 },
      retail: { count: 8, percentage: 32.0 },
      cafe: { count: 3, percentage: 12.0 },
      other: { count: 2, percentage: 8.0 },
    })
  })
})