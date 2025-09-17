/**
 * Contract Test: GET /api/admin/batches/[id]
 *
 * Tests the admin API endpoint that returns detailed information about
 * a specific payment batch including verification progress and transactions.
 *
 * This test MUST FAIL initially (TDD approach) until the endpoint is implemented.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest } from 'next/server'
import { GET } from '../../app/api/admin/batches/[id]/route'

// Mock data for testing
const mockAdminUserId = 'admin_123456789'
const mockBatchId = 'pb_123456789'
const mockPaymentBatch = {
  id: mockBatchId,
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
    phone_number: '+46701234567',
    address: 'Testgatan 123, Stockholm',
    org_number: '556789-1234',
    subscription_plan: 'premium',
    created_at: '2024-01-01T00:00:00Z',
  },
  verification_sessions: [
    {
      id: 'vs_001',
      status: 'in_progress',
      verified_transactions: 25,
      approved_count: 20,
      rejected_count: 5,
      started_at: '2024-01-08T09:00:00Z',
      deadline: '2024-01-15T23:59:59Z',
      created_at: '2024-01-08T00:00:00Z',
    },
  ],
}

const mockVerificationResults = [
  {
    id: 'vr_001',
    transaction_id: 'VCL-001',
    transaction_date: '2024-01-08T14:30:00Z',
    amount_sek: 250.00,
    phone_last4: '**34',
    store_code: 'ABC123',
    quality_score: 85,
    reward_percentage: 5,
    reward_amount_sek: 12.50,
    verified: true,
    verification_decision: 'approved',
    rejection_reason: null,
    business_notes: 'Verified transaction',
    verified_at: '2024-01-08T15:00:00Z',
    created_at: '2024-01-08T14:30:00Z',
  },
  {
    id: 'vr_002',
    transaction_id: 'VCL-002',
    transaction_date: '2024-01-08T15:45:00Z',
    amount_sek: 150.00,
    phone_last4: '**67',
    store_code: 'ABC123',
    quality_score: 92,
    reward_percentage: 6,
    reward_amount_sek: 9.00,
    verified: false,
    verification_decision: 'rejected',
    rejection_reason: 'amount_mismatch',
    business_notes: 'Amount does not match POS',
    verified_at: '2024-01-08T16:00:00Z',
    created_at: '2024-01-08T15:45:00Z',
  },
]

describe('GET /api/admin/batches/[id]', () => {
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
      single: vi.fn().mockResolvedValue({
        data: mockPaymentBatch,
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

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}`)
    const response = await GET(mockRequest, { params: { id: mockBatchId } })
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

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}`)
    const response = await GET(mockRequest, { params: { id: mockBatchId } })
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

  it('should return 404 when batch is not found', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'The result contains 0 rows' },
    })

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}`)
    const response = await GET(mockRequest, { params: { id: mockBatchId } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'BATCH_NOT_FOUND',
        message: 'Payment batch not found',
      },
    })
  })

  it('should return detailed batch information with business and verification data', async () => {
    // Mock verification results query
    const verificationResultsClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: mockVerificationResults,
        error: null,
      }),
    }

    // Return different client instances for different queries
    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient) // For auth and batch query
      .mockReturnValueOnce(verificationResultsClient) // For verification results

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}`)
    const response = await GET(mockRequest, { params: { id: mockBatchId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      data: {
        batch: {
          id: mockBatchId,
          business: {
            id: mockPaymentBatch.businesses.id,
            name: mockPaymentBatch.businesses.name,
            email: mockPaymentBatch.businesses.email,
            phone_number: mockPaymentBatch.businesses.phone_number,
            address: mockPaymentBatch.businesses.address,
            org_number: mockPaymentBatch.businesses.org_number,
            subscription_plan: mockPaymentBatch.businesses.subscription_plan,
            created_at: mockPaymentBatch.businesses.created_at,
          },
          week_number: mockPaymentBatch.week_number,
          year_number: mockPaymentBatch.year_number,
          total_transactions: mockPaymentBatch.total_transactions,
          total_amount: mockPaymentBatch.total_amount,
          status: mockPaymentBatch.status,
          deadline: mockPaymentBatch.deadline,
          created_at: mockPaymentBatch.created_at,
          verification_progress: {
            session_id: mockPaymentBatch.verification_sessions[0].id,
            session_status: mockPaymentBatch.verification_sessions[0].status,
            verified_transactions: mockPaymentBatch.verification_sessions[0].verified_transactions,
            approved_count: mockPaymentBatch.verification_sessions[0].approved_count,
            rejected_count: mockPaymentBatch.verification_sessions[0].rejected_count,
            completion_percentage: 16.67, // 25/150 * 100
            time_remaining: expect.any(Number),
            started_at: mockPaymentBatch.verification_sessions[0].started_at,
            deadline: mockPaymentBatch.verification_sessions[0].deadline,
          },
          recent_activity: expect.any(Array),
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
        email,
        phone_number,
        address,
        org_number,
        subscription_plan,
        created_at
      ),
      verification_sessions (
        id,
        status,
        verified_transactions,
        approved_count,
        rejected_count,
        started_at,
        deadline,
        created_at
      )
    `)
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', mockBatchId)
    expect(mockSupabaseClient.single).toHaveBeenCalled()
  })

  it('should calculate time remaining correctly', async () => {
    const futureDeadline = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
    const batchWithFutureDeadline = {
      ...mockPaymentBatch,
      deadline: futureDeadline.toISOString(),
      verification_sessions: [
        {
          ...mockPaymentBatch.verification_sessions[0],
          deadline: futureDeadline.toISOString(),
        },
      ],
    }

    mockSupabaseClient.single.mockResolvedValue({
      data: batchWithFutureDeadline,
      error: null,
    })

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}`)
    const response = await GET(mockRequest, { params: { id: mockBatchId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.batch.verification_progress.time_remaining).toBeGreaterThan(0)
    expect(data.data.batch.verification_progress.time_remaining).toBeLessThan(5 * 24 * 60 * 60 * 1000)
  })

  it('should handle batches with no verification session', async () => {
    const batchWithoutSession = {
      ...mockPaymentBatch,
      verification_sessions: [],
    }

    mockSupabaseClient.single.mockResolvedValue({
      data: batchWithoutSession,
      error: null,
    })

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}`)
    const response = await GET(mockRequest, { params: { id: mockBatchId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.batch.verification_progress).toEqual({
      session_id: null,
      session_status: null,
      verified_transactions: 0,
      approved_count: 0,
      rejected_count: 0,
      completion_percentage: 0,
      time_remaining: expect.any(Number),
      started_at: null,
      deadline: batchWithoutSession.deadline,
    })
  })

  it('should include recent activity from verification results', async () => {
    const verificationResultsClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: mockVerificationResults,
        error: null,
      }),
    }

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(verificationResultsClient)

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}`)
    const response = await GET(mockRequest, { params: { id: mockBatchId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.batch.recent_activity).toHaveLength(2)
    expect(data.data.batch.recent_activity[0]).toEqual({
      transaction_id: 'VCL-001',
      verified_at: '2024-01-08T15:00:00Z',
      decision: 'approved',
      amount_sek: 250.00,
    })

    // Verify recent activity query
    expect(verificationResultsClient.select).toHaveBeenCalledWith('transaction_id, verified_at, verification_decision, amount_sek')
    expect(verificationResultsClient.order).toHaveBeenCalledWith('verified_at', { ascending: false })
    expect(verificationResultsClient.limit).toHaveBeenCalledWith(10)
  })

  it('should validate batch ID format', async () => {
    const invalidBatchId = 'invalid-id'

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${invalidBatchId}`)
    const response = await GET(mockRequest, { params: { id: invalidBatchId } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_BATCH_ID',
        message: 'Invalid batch ID format',
      },
    })
  })

  it('should handle database errors gracefully', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    })

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}`)
    const response = await GET(mockRequest, { params: { id: mockBatchId } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch batch details',
      },
    })
  })

  it('should include fraud assessment summary if available', async () => {
    const verificationResultsClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }

    // Mock fraud assessment query
    const fraudClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            risk_level: 'low',
            average_risk_score: 25.5,
            high_risk_count: 2,
            flagged_transactions: 1,
          },
        ],
        error: null,
      }),
    }

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(verificationResultsClient)
      .mockReturnValueOnce(fraudClient)

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}`)
    const response = await GET(mockRequest, { params: { id: mockBatchId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.batch).toHaveProperty('fraud_summary')
    expect(data.data.batch.fraud_summary).toEqual({
      average_risk_score: 25.5,
      high_risk_count: 2,
      flagged_transactions: 1,
      overall_risk_level: 'low',
    })
  })
})