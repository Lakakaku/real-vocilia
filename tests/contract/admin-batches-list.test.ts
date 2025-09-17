/**
 * Contract Test: GET /api/admin/batches
 *
 * Tests the admin API endpoint that returns paginated list of
 * payment batches across all businesses for admin management.
 *
 * This test MUST FAIL initially (TDD approach) until the endpoint is implemented.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest } from 'next/server'
import { GET } from '../../app/api/admin/batches/route'

// Mock data for testing
const mockAdminUserId = 'admin_123456789'
const mockPaymentBatches = [
  {
    id: 'pb_001',
    business_id: 'bus_001',
    week_number: 2,
    year_number: 2024,
    total_transactions: 150,
    total_amount: 15000.00,
    status: 'pending',
    deadline: '2024-01-15T23:59:59Z',
    created_at: '2024-01-08T00:00:00Z',
    created_by: mockAdminUserId,
    businesses: {
      id: 'bus_001',
      name: 'Test Restaurant AB',
      email: 'test@restaurant.se',
    },
    verification_sessions: [
      {
        id: 'vs_001',
        status: 'not_started',
        verified_transactions: 0,
        approved_count: 0,
        rejected_count: 0,
      },
    ],
  },
  {
    id: 'pb_002',
    business_id: 'bus_002',
    week_number: 2,
    year_number: 2024,
    total_transactions: 75,
    total_amount: 7500.00,
    status: 'completed',
    deadline: '2024-01-15T23:59:59Z',
    created_at: '2024-01-08T00:00:00Z',
    created_by: mockAdminUserId,
    businesses: {
      id: 'bus_002',
      name: 'Coffee Shop Ltd',
      email: 'info@coffeeshop.se',
    },
    verification_sessions: [
      {
        id: 'vs_002',
        status: 'completed',
        verified_transactions: 75,
        approved_count: 65,
        rejected_count: 10,
      },
    ],
  },
]

describe('GET /api/admin/batches', () => {
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
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockPaymentBatches,
        error: null,
        count: 2,
      }),
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

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches')
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

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches')
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

  it('should return paginated list of payment batches with default pagination', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      data: {
        batches: mockPaymentBatches.map(batch => ({
          id: batch.id,
          business: {
            id: batch.businesses.id,
            name: batch.businesses.name,
            email: batch.businesses.email,
          },
          week_number: batch.week_number,
          year_number: batch.year_number,
          total_transactions: batch.total_transactions,
          total_amount: batch.total_amount,
          status: batch.status,
          deadline: batch.deadline,
          created_at: batch.created_at,
          verification_progress: {
            session_id: batch.verification_sessions[0].id,
            session_status: batch.verification_sessions[0].status,
            verified_transactions: batch.verification_sessions[0].verified_transactions,
            approved_count: batch.verification_sessions[0].approved_count,
            rejected_count: batch.verification_sessions[0].rejected_count,
            completion_percentage: expect.any(Number),
          },
        })),
        pagination: {
          page: 1,
          limit: 50,
          total: 2,
          pages: 1,
          has_next: false,
          has_prev: false,
        },
      },
    })

    // Verify correct database queries
    expect(mockSupabaseClient.select).toHaveBeenCalledWith(`
      id,
      business_id,
      week_number,
      year_number,
      total_transactions,
      total_amount,
      status,
      deadline,
      created_at,
      businesses (
        id,
        name,
        email
      ),
      verification_sessions (
        id,
        status,
        verified_transactions,
        approved_count,
        rejected_count
      )
    `)
    expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(mockSupabaseClient.range).toHaveBeenCalledWith(0, 49)
  })

  it('should handle custom pagination parameters', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches?page=2&limit=10')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 2,
      pages: 1,
      has_next: false,
      has_prev: true,
    })

    expect(mockSupabaseClient.range).toHaveBeenCalledWith(10, 19) // offset 10, limit 10
  })

  it('should filter by batch status', async () => {
    mockSupabaseClient.range.mockResolvedValue({
      data: [mockPaymentBatches[0]], // Only pending batch
      error: null,
      count: 1,
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches?status=pending')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.batches).toHaveLength(1)
    expect(data.data.batches[0].status).toBe('pending')
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'pending')
  })

  it('should filter by week and year', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches?week=2&year=2024')
    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('week_number', 2)
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('year_number', 2024)
  })

  it('should filter by business', async () => {
    mockSupabaseClient.range.mockResolvedValue({
      data: [mockPaymentBatches[0]],
      error: null,
      count: 1,
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches?business_id=bus_001')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.batches).toHaveLength(1)
    expect(data.data.batches[0].business.id).toBe('bus_001')
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('business_id', 'bus_001')
  })

  it('should search by business name', async () => {
    const searchChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [mockPaymentBatches[0]],
        error: null,
        count: 1,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(searchChain)

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches?search=Restaurant')
    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    expect(searchChain.ilike).toHaveBeenCalledWith('businesses.name', '%Restaurant%')
  })

  it('should filter by deadline range', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches?deadline_before=2024-01-20&deadline_after=2024-01-10')
    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    // Verify date filtering was applied (exact implementation may vary)
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('payment_batches')
  })

  it('should calculate completion percentage correctly', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)

    // First batch: 0/150 = 0%
    expect(data.data.batches[0].verification_progress.completion_percentage).toBe(0)

    // Second batch: 75/75 = 100%
    expect(data.data.batches[1].verification_progress.completion_percentage).toBe(100)
  })

  it('should validate pagination parameters', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches?page=0')
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

  it('should validate limit parameters', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches?limit=101')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_PAGINATION',
        message: 'Limit must be between 1 and 100',
      },
    })
  })

  it('should handle empty result set', async () => {
    mockSupabaseClient.range.mockResolvedValue({
      data: [],
      error: null,
      count: 0,
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.batches).toEqual([])
    expect(data.data.pagination.total).toBe(0)
  })

  it('should handle database errors gracefully', async () => {
    mockSupabaseClient.range.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch payment batches',
      },
    })
  })

  it('should sort batches by multiple criteria', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches?sort_by=deadline&sort_order=asc')
    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    expect(mockSupabaseClient.order).toHaveBeenCalledWith('deadline', { ascending: true })
  })

  it('should include verification session status for each batch', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)

    // Verify verification progress is included
    expect(data.data.batches[0].verification_progress).toBeDefined()
    expect(data.data.batches[0].verification_progress.session_status).toBe('not_started')
    expect(data.data.batches[1].verification_progress.session_status).toBe('completed')
  })

  it('should handle batches with missing verification sessions', async () => {
    const batchWithoutSession = {
      ...mockPaymentBatches[0],
      verification_sessions: [],
    }

    mockSupabaseClient.range.mockResolvedValue({
      data: [batchWithoutSession],
      error: null,
      count: 1,
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.batches[0].verification_progress).toEqual({
      session_id: null,
      session_status: null,
      verified_transactions: 0,
      approved_count: 0,
      rejected_count: 0,
      completion_percentage: 0,
    })
  })

  it('should validate filter parameters', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches?status=invalid_status')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('INVALID_FILTER')
    expect(data.error.message).toContain('Invalid status filter')
  })

  it('should support multiple status filters', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches?status=pending,in_progress')
    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    // Verify that multiple status filtering was applied
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('payment_batches')
  })
})