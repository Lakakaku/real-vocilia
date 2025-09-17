/**
 * Contract Test: GET /api/verification/history
 *
 * Tests the business API endpoint that returns historical verification
 * sessions and their completion statistics for trend analysis.
 *
 * This test MUST FAIL initially (TDD approach) until the endpoint is implemented.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest } from 'next/server'
import { GET } from '../../app/api/verification/history/route'

// Mock data for testing
const mockBusinessUserId = 'user_123456789'
const mockBusinessId = 'bus_123456789'
const mockHistoricalSessions = [
  {
    id: 'vs_001',
    payment_batch_id: 'pb_001',
    week_number: 1,
    year_number: 2024,
    total_transactions: 100,
    verified_transactions: 100,
    approved_count: 85,
    rejected_count: 15,
    status: 'completed',
    deadline: '2024-01-08T23:59:59Z',
    started_at: '2024-01-02T09:00:00Z',
    completed_at: '2024-01-05T16:30:00Z',
    created_at: '2024-01-01T00:00:00Z',
    completion_time_hours: 79.5,
    approval_rate: 85.0,
  },
  {
    id: 'vs_002',
    payment_batch_id: 'pb_002',
    week_number: 2,
    year_number: 2024,
    total_transactions: 150,
    verified_transactions: 25,
    approved_count: 20,
    rejected_count: 5,
    status: 'in_progress',
    deadline: '2024-01-15T23:59:59Z',
    started_at: '2024-01-08T09:00:00Z',
    completed_at: null,
    created_at: '2024-01-08T00:00:00Z',
    completion_time_hours: null,
    approval_rate: 80.0,
  },
  {
    id: 'vs_003',
    payment_batch_id: 'pb_003',
    week_number: 52,
    year_number: 2023,
    total_transactions: 75,
    verified_transactions: 75,
    approved_count: 70,
    rejected_count: 5,
    status: 'completed',
    deadline: '2023-12-31T23:59:59Z',
    started_at: '2023-12-26T10:00:00Z',
    completed_at: '2023-12-29T14:00:00Z',
    created_at: '2023-12-25T00:00:00Z',
    completion_time_hours: 76.0,
    approval_rate: 93.3,
  },
]

describe('GET /api/verification/history', () => {
  let mockRequest: NextRequest
  let mockSupabaseClient: any

  beforeEach(() => {
    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockBusinessUserId } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockHistoricalSessions,
        error: null,
        count: 3,
      }),
      single: vi.fn().mockResolvedValue({
        data: { id: mockBusinessId },
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

    mockRequest = new NextRequest('http://localhost:3000/api/verification/history')
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

  it('should return 403 when user is not authorized for business', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'The result contains 0 rows' },
    })

    mockRequest = new NextRequest('http://localhost:3000/api/verification/history')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Not authorized to view verification history',
      },
    })
  })

  it('should return paginated verification history with default parameters', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/verification/history')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      data: {
        sessions: mockHistoricalSessions.map(session => ({
          id: session.id,
          payment_batch_id: session.payment_batch_id,
          week_number: session.week_number,
          year_number: session.year_number,
          total_transactions: session.total_transactions,
          verified_transactions: session.verified_transactions,
          approved_count: session.approved_count,
          rejected_count: session.rejected_count,
          status: session.status,
          deadline: session.deadline,
          started_at: session.started_at,
          completed_at: session.completed_at,
          completion_time_hours: session.completion_time_hours,
          approval_rate_percentage: session.approval_rate,
          completion_percentage: Math.round((session.verified_transactions / session.total_transactions) * 100),
        })),
        pagination: {
          page: 1,
          limit: 20,
          total: 3,
          pages: 1,
          has_next: false,
          has_prev: false,
        },
        summary: {
          total_sessions: 3,
          completed_sessions: 2,
          in_progress_sessions: 1,
          total_transactions_processed: 250,
          average_completion_time_hours: 77.75,
          average_approval_rate: 86.1,
          completion_trend: expect.any(String),
        },
      },
    })

    // Verify correct database queries
    expect(mockSupabaseClient.select).toHaveBeenCalledWith(`
      id,
      payment_batch_id,
      week_number,
      year_number,
      total_transactions,
      verified_transactions,
      approved_count,
      rejected_count,
      status,
      deadline,
      started_at,
      completed_at,
      created_at,
      payment_batches (
        id,
        business_id
      )
    `)
    expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(mockSupabaseClient.range).toHaveBeenCalledWith(0, 19)
  })

  it('should handle custom pagination parameters', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/verification/history?page=2&limit=5')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 3,
      pages: 1,
      has_next: false,
      has_prev: true,
    })

    expect(mockSupabaseClient.range).toHaveBeenCalledWith(5, 9) // offset 5, limit 5
  })

  it('should filter by date range', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/verification/history?date_from=2024-01-01&date_to=2024-01-31')
    const response = await GET(mockRequest)

    expect(response.status).toBe(200)

    // Verify date filtering was applied
    expect(mockSupabaseClient.gte).toHaveBeenCalledWith('created_at', '2024-01-01T00:00:00.000Z')
    expect(mockSupabaseClient.lte).toHaveBeenCalledWith('created_at', '2024-01-31T23:59:59.999Z')
  })

  it('should filter by status', async () => {
    mockSupabaseClient.range.mockResolvedValue({
      data: [mockHistoricalSessions[0]], // Only completed session
      error: null,
      count: 1,
    })

    mockRequest = new NextRequest('http://localhost:3000/api/verification/history?status=completed')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.sessions).toHaveLength(1)
    expect(data.data.sessions[0].status).toBe('completed')
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'completed')
  })

  it('should filter by year', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/verification/history?year=2024')
    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('year_number', 2024)
  })

  it('should sort by different criteria', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/verification/history?sort_by=completion_rate&sort_order=desc')
    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    // Verify custom sorting was applied
    expect(mockSupabaseClient.order).toHaveBeenCalled()
  })

  it('should calculate completion percentages correctly', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/verification/history')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)

    // First session: 100/100 = 100%
    expect(data.data.sessions[0].completion_percentage).toBe(100)

    // Second session: 25/150 = 17%
    expect(data.data.sessions[1].completion_percentage).toBe(17)

    // Third session: 75/75 = 100%
    expect(data.data.sessions[2].completion_percentage).toBe(100)
  })

  it('should calculate summary statistics correctly', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/verification/history')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.summary).toEqual({
      total_sessions: 3,
      completed_sessions: 2,
      in_progress_sessions: 1,
      total_transactions_processed: 250, // 100 + 150 + 75
      average_completion_time_hours: 77.75, // (79.5 + 76) / 2
      average_approval_rate: 86.1, // (85 + 80 + 93.3) / 3
      completion_trend: expect.any(String),
    })
  })

  it('should determine completion trend correctly', async () => {
    // Test improving trend (older sessions slower)
    const improvingTrendSessions = [
      { ...mockHistoricalSessions[0], completion_time_hours: 90.0, created_at: '2024-01-15T00:00:00Z' },
      { ...mockHistoricalSessions[1], completion_time_hours: 80.0, created_at: '2024-01-08T00:00:00Z' },
      { ...mockHistoricalSessions[2], completion_time_hours: 70.0, created_at: '2024-01-01T00:00:00Z' },
    ]

    mockSupabaseClient.range.mockResolvedValue({
      data: improvingTrendSessions,
      error: null,
      count: 3,
    })

    mockRequest = new NextRequest('http://localhost:3000/api/verification/history')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.summary.completion_trend).toBe('improving')
  })

  it('should include weekly performance breakdown', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/verification/history?include_weekly_breakdown=true')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toHaveProperty('weekly_breakdown')
    expect(data.data.weekly_breakdown).toEqual([
      {
        week_number: 1,
        year_number: 2024,
        sessions: 1,
        total_transactions: 100,
        completion_rate: 100,
        approval_rate: 85.0,
        avg_completion_time: 79.5,
      },
      {
        week_number: 2,
        year_number: 2024,
        sessions: 1,
        total_transactions: 150,
        completion_rate: 16.67,
        approval_rate: 80.0,
        avg_completion_time: null,
      },
      {
        week_number: 52,
        year_number: 2023,
        sessions: 1,
        total_transactions: 75,
        completion_rate: 100,
        approval_rate: 93.3,
        avg_completion_time: 76.0,
      },
    ])
  })

  it('should validate pagination parameters', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/verification/history?page=0')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_PAGINATION',
        message: 'Page number must be greater than 0',
      },
    })
  })

  it('should validate date range parameters', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/verification/history?date_from=invalid-date')
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

  it('should validate status filter values', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/verification/history?status=invalid_status')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_STATUS',
        message: 'Invalid status. Allowed values: not_started, in_progress, completed, expired',
      },
    })
  })

  it('should handle empty history gracefully', async () => {
    mockSupabaseClient.range.mockResolvedValue({
      data: [],
      error: null,
      count: 0,
    })

    mockRequest = new NextRequest('http://localhost:3000/api/verification/history')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.sessions).toEqual([])
    expect(data.data.summary).toEqual({
      total_sessions: 0,
      completed_sessions: 0,
      in_progress_sessions: 0,
      total_transactions_processed: 0,
      average_completion_time_hours: 0,
      average_approval_rate: 0,
      completion_trend: 'no_data',
    })
  })

  it('should handle database errors gracefully', async () => {
    mockSupabaseClient.range.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    })

    mockRequest = new NextRequest('http://localhost:3000/api/verification/history')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch verification history',
      },
    })
  })

  it('should support exporting history data', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/verification/history?format=csv')
    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/csv')
    expect(response.headers.get('content-disposition')).toContain('attachment')

    const csvData = await response.text()
    expect(csvData).toContain('session_id,week_number,year_number,total_transactions')
    expect(csvData).toContain('vs_001,1,2024,100')
  })

  it('should include performance metrics in detailed view', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/verification/history?detailed=true')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)

    // Verify performance metrics are included
    data.data.sessions.forEach(session => {
      expect(session).toHaveProperty('performance_metrics')
      if (session.status === 'completed') {
        expect(session.performance_metrics).toEqual({
          completion_time_hours: expect.any(Number),
          completion_efficiency: expect.any(Number),
          approval_rate: expect.any(Number),
          rejection_breakdown: expect.any(Object),
        })
      }
    })
  })
})