/**
 * Contract Test: GET /api/admin/businesses/[id]
 *
 * Tests the admin API endpoint that returns detailed information about
 * a specific business including verification history and statistics.
 *
 * This test MUST FAIL initially (TDD approach) until the endpoint is implemented.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest } from 'next/server'
import { GET } from '../../app/api/admin/businesses/[id]/route'

// Mock data for testing
const mockAdminUserId = 'admin_123456789'
const mockBusinessId = 'bus_123456789'
const mockBusiness = {
  id: mockBusinessId,
  name: 'Test Restaurant AB',
  email: 'test@restaurant.se',
  phone_number: '+46701234567',
  address: 'Testgatan 123, 111 11 Stockholm',
  org_number: '556789-1234',
  subscription_plan: 'premium',
  status: 'active',
  verification_contact_email: 'verification@restaurant.se',
  business_category: 'restaurant',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-08T00:00:00Z',
}

const mockPaymentBatches = [
  {
    id: 'pb_001',
    week_number: 2,
    year_number: 2024,
    total_transactions: 150,
    total_amount: 15000.00,
    status: 'pending',
    deadline: '2024-01-15T23:59:59Z',
    created_at: '2024-01-08T00:00:00Z',
    verification_sessions: [
      {
        id: 'vs_001',
        status: 'in_progress',
        verified_transactions: 25,
        approved_count: 20,
        rejected_count: 5,
      },
    ],
  },
  {
    id: 'pb_002',
    week_number: 1,
    year_number: 2024,
    total_transactions: 100,
    total_amount: 10000.00,
    status: 'completed',
    deadline: '2024-01-08T23:59:59Z',
    created_at: '2024-01-01T00:00:00Z',
    verification_sessions: [
      {
        id: 'vs_002',
        status: 'completed',
        verified_transactions: 100,
        approved_count: 85,
        rejected_count: 15,
      },
    ],
  },
]

const mockVerificationStats = {
  total_batches: 2,
  completed_batches: 1,
  pending_batches: 1,
  total_transactions_processed: 250,
  total_amount_processed: 25000.00,
  average_completion_time: 4.5, // days
  approval_rate: 70, // percentage
}

describe('GET /api/admin/businesses/[id]', () => {
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
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockBusiness,
        error: null,
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

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/businesses/${mockBusinessId}`)
    const response = await GET(mockRequest, { params: { id: mockBusinessId } })
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

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/businesses/${mockBusinessId}`)
    const response = await GET(mockRequest, { params: { id: mockBusinessId } })
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

  it('should return 404 when business is not found', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'The result contains 0 rows' },
    })

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/businesses/${mockBusinessId}`)
    const response = await GET(mockRequest, { params: { id: mockBusinessId } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'BUSINESS_NOT_FOUND',
        message: 'Business not found',
      },
    })
  })

  it('should return detailed business information with verification history', async () => {
    // Mock payment batches query
    const batchesClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: mockPaymentBatches,
        error: null,
      }),
    }

    // Mock verification statistics query
    const statsClient = {
      rpc: vi.fn().mockResolvedValue({
        data: [mockVerificationStats],
        error: null,
      }),
    }

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient) // For auth and business query
      .mockReturnValueOnce(batchesClient) // For payment batches
      .mockReturnValueOnce(statsClient) // For verification stats

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/businesses/${mockBusinessId}`)
    const response = await GET(mockRequest, { params: { id: mockBusinessId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      data: {
        business: {
          id: mockBusinessId,
          name: mockBusiness.name,
          email: mockBusiness.email,
          phone_number: mockBusiness.phone_number,
          address: mockBusiness.address,
          org_number: mockBusiness.org_number,
          subscription_plan: mockBusiness.subscription_plan,
          status: mockBusiness.status,
          verification_contact_email: mockBusiness.verification_contact_email,
          business_category: mockBusiness.business_category,
          created_at: mockBusiness.created_at,
          updated_at: mockBusiness.updated_at,
        },
        verification_statistics: {
          total_batches: 2,
          completed_batches: 1,
          pending_batches: 1,
          total_transactions_processed: 250,
          total_amount_processed: 25000.00,
          average_completion_time_days: 4.5,
          approval_rate_percentage: 70,
          current_pending_amount: 15000.00,
          overdue_batches: 0,
        },
        recent_batches: mockPaymentBatches.map(batch => ({
          id: batch.id,
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
        compliance_status: {
          kyc_status: 'verified',
          document_status: 'approved',
          verification_contact_status: 'active',
          last_audit_date: expect.any(String),
          next_audit_due: expect.any(String),
          compliance_score: expect.any(Number),
        },
      },
    })

    // Verify correct database queries
    expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', mockBusinessId)
    expect(mockSupabaseClient.single).toHaveBeenCalled()
  })

  it('should calculate verification statistics correctly', async () => {
    const statsClient = {
      rpc: vi.fn().mockResolvedValue({
        data: [mockVerificationStats],
        error: null,
      }),
    }

    const batchesClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: mockPaymentBatches,
        error: null,
      }),
    }

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(batchesClient)
      .mockReturnValueOnce(statsClient)

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/businesses/${mockBusinessId}`)
    const response = await GET(mockRequest, { params: { id: mockBusinessId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.verification_statistics.approval_rate_percentage).toBe(70)
    expect(data.data.verification_statistics.average_completion_time_days).toBe(4.5)
    expect(data.data.verification_statistics.current_pending_amount).toBe(15000.00)

    // Verify statistics RPC call
    expect(statsClient.rpc).toHaveBeenCalledWith('get_business_verification_stats', {
      business_id: mockBusinessId,
    })
  })

  it('should include recent batch history with pagination', async () => {
    const batchesClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: mockPaymentBatches,
        error: null,
      }),
    }

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(batchesClient)
      .mockReturnValueOnce({ rpc: vi.fn().mockResolvedValue({ data: [mockVerificationStats], error: null }) })

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/businesses/${mockBusinessId}`)
    const response = await GET(mockRequest, { params: { id: mockBusinessId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.recent_batches).toHaveLength(2)

    // Verify batches query
    expect(batchesClient.select).toHaveBeenCalledWith(`
      id,
      week_number,
      year_number,
      total_transactions,
      total_amount,
      status,
      deadline,
      created_at,
      verification_sessions (
        id,
        status,
        verified_transactions,
        approved_count,
        rejected_count
      )
    `)
    expect(batchesClient.eq).toHaveBeenCalledWith('business_id', mockBusinessId)
    expect(batchesClient.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(batchesClient.limit).toHaveBeenCalledWith(10)
  })

  it('should calculate overdue batches correctly', async () => {
    const overdueDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
    const overdueBatch = {
      ...mockPaymentBatches[0],
      deadline: overdueDeadline,
      status: 'pending',
    }

    const batchesClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [overdueBatch],
        error: null,
      }),
    }

    const statsWithOverdue = {
      ...mockVerificationStats,
      overdue_batches: 1,
    }

    const statsClient = {
      rpc: vi.fn().mockResolvedValue({
        data: [statsWithOverdue],
        error: null,
      }),
    }

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(batchesClient)
      .mockReturnValueOnce(statsClient)

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/businesses/${mockBusinessId}`)
    const response = await GET(mockRequest, { params: { id: mockBusinessId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.verification_statistics.overdue_batches).toBe(1)
  })

  it('should validate business ID format', async () => {
    const invalidBusinessId = 'invalid-id'

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/businesses/${invalidBusinessId}`)
    const response = await GET(mockRequest, { params: { id: invalidBusinessId } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_BUSINESS_ID',
        message: 'Invalid business ID format',
      },
    })
  })

  it('should handle database errors gracefully', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    })

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/businesses/${mockBusinessId}`)
    const response = await GET(mockRequest, { params: { id: mockBusinessId } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch business details',
      },
    })
  })

  it('should include compliance status information', async () => {
    const batchesClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }

    const statsClient = {
      rpc: vi.fn().mockResolvedValue({
        data: [mockVerificationStats],
        error: null,
      }),
    }

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(batchesClient)
      .mockReturnValueOnce(statsClient)

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/businesses/${mockBusinessId}`)
    const response = await GET(mockRequest, { params: { id: mockBusinessId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.compliance_status).toBeDefined()
    expect(data.data.compliance_status.kyc_status).toBe('verified')
    expect(data.data.compliance_status.document_status).toBe('approved')
    expect(data.data.compliance_status.compliance_score).toBeGreaterThan(0)
  })

  it('should handle businesses with no verification history', async () => {
    const batchesClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }

    const emptyStats = {
      total_batches: 0,
      completed_batches: 0,
      pending_batches: 0,
      total_transactions_processed: 0,
      total_amount_processed: 0,
      average_completion_time: 0,
      approval_rate: 0,
    }

    const statsClient = {
      rpc: vi.fn().mockResolvedValue({
        data: [emptyStats],
        error: null,
      }),
    }

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(batchesClient)
      .mockReturnValueOnce(statsClient)

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/businesses/${mockBusinessId}`)
    const response = await GET(mockRequest, { params: { id: mockBusinessId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.recent_batches).toEqual([])
    expect(data.data.verification_statistics.total_batches).toBe(0)
    expect(data.data.verification_statistics.approval_rate_percentage).toBe(0)
  })
})