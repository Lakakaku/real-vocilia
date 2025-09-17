/**
 * Contract Test: GET /api/verification/transactions
 *
 * Tests the business verification API endpoint that returns paginated
 * transaction list for the current verification session.
 *
 * This test MUST FAIL initially (TDD approach) until the endpoint is implemented.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest } from 'next/server'
import { GET } from '../../app/api/verification/transactions/route'

// Mock data for testing
const mockBusinessId = 'b1e8f9a0-1234-5678-9abc-123456789abc'
const mockVerificationSession = {
  id: 'vs_123456789',
  payment_batch_id: 'pb_123456789',
  business_id: mockBusinessId,
  status: 'in_progress',
}

const mockTransactions = [
  {
    id: 'vr_001',
    verification_session_id: 'vs_123456789',
    transaction_id: 'VCL-001',
    customer_feedback_id: 'fb_001',
    transaction_date: '2024-01-08T14:30:00Z',
    amount_sek: 250.00,
    phone_last4: '**34',
    store_code: 'ABC123',
    quality_score: 85,
    reward_percentage: 5,
    reward_amount_sek: 12.50,
    verified: null,
    verification_decision: null,
    rejection_reason: null,
    business_notes: null,
    fraud_assessment_id: 'fa_001',
    created_at: '2024-01-08T00:00:00Z',
    fraud_assessments: {
      id: 'fa_001',
      risk_score: 25,
      risk_level: 'low',
      confidence: 0.92,
      recommendation: 'approve',
      reasoning: ['Normal transaction pattern', 'Customer has good history'],
    },
  },
  {
    id: 'vr_002',
    verification_session_id: 'vs_123456789',
    transaction_id: 'VCL-002',
    customer_feedback_id: 'fb_002',
    transaction_date: '2024-01-08T15:45:00Z',
    amount_sek: 150.00,
    phone_last4: '**67',
    store_code: 'ABC123',
    quality_score: 92,
    reward_percentage: 6,
    reward_amount_sek: 9.00,
    verified: true,
    verification_decision: 'approved',
    rejection_reason: null,
    business_notes: 'Verified transaction',
    fraud_assessment_id: 'fa_002',
    created_at: '2024-01-08T00:00:00Z',
    fraud_assessments: {
      id: 'fa_002',
      risk_score: 75,
      risk_level: 'high',
      confidence: 0.88,
      recommendation: 'review',
      reasoning: ['Unusual transaction amount', 'Time pattern anomaly'],
    },
  },
]

describe('GET /api/verification/transactions', () => {
  let mockRequest: NextRequest
  let mockSupabaseClient: any

  beforeEach(() => {
    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockBusinessId } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockVerificationSession,
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

    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions')
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

  it('should return 404 when no current verification session exists', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    })

    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'NO_CURRENT_VERIFICATION',
        message: 'No active verification session found',
      },
    })
  })

  it('should return paginated transaction list with default pagination', async () => {
    // Mock transactions query
    const transactionsChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockTransactions,
        error: null,
        count: 2,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient) // Session lookup
      .mockReturnValueOnce(transactionsChain) // Transactions query

    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      data: {
        transactions: mockTransactions.map(tx => ({
          id: tx.id,
          transaction_id: tx.transaction_id,
          transaction_date: tx.transaction_date,
          amount_sek: tx.amount_sek,
          phone_last4: tx.phone_last4,
          store_code: tx.store_code,
          quality_score: tx.quality_score,
          reward_amount_sek: tx.reward_amount_sek,
          verified: tx.verified,
          verification_decision: tx.verification_decision,
          rejection_reason: tx.rejection_reason,
          business_notes: tx.business_notes,
          fraud_assessment: {
            risk_score: tx.fraud_assessments.risk_score,
            risk_level: tx.fraud_assessments.risk_level,
            confidence: tx.fraud_assessments.confidence,
            recommendation: tx.fraud_assessments.recommendation,
            reasoning: tx.fraud_assessments.reasoning,
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
    expect(transactionsChain.select).toHaveBeenCalledWith(`
      id,
      transaction_id,
      transaction_date,
      amount_sek,
      phone_last4,
      store_code,
      quality_score,
      reward_amount_sek,
      verified,
      verification_decision,
      rejection_reason,
      business_notes,
      fraud_assessments (
        risk_score,
        risk_level,
        confidence,
        recommendation,
        reasoning
      )
    `)
    expect(transactionsChain.eq).toHaveBeenCalledWith('verification_session_id', mockVerificationSession.id)
    expect(transactionsChain.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(transactionsChain.range).toHaveBeenCalledWith(0, 49)
  })

  it('should handle custom pagination parameters', async () => {
    const transactionsChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [mockTransactions[0]],
        error: null,
        count: 2,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(transactionsChain)

    // Test with custom pagination
    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions?page=2&limit=1')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.pagination).toEqual({
      page: 2,
      limit: 1,
      total: 2,
      pages: 2,
      has_next: false,
      has_prev: true,
    })

    expect(transactionsChain.range).toHaveBeenCalledWith(1, 1) // offset 1, limit 1
  })

  it('should filter by verification status', async () => {
    const transactionsChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [mockTransactions[1]], // Only verified transaction
        error: null,
        count: 1,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(transactionsChain)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions?verified=true')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.transactions).toHaveLength(1)
    expect(data.data.transactions[0].verified).toBe(true)
    expect(transactionsChain.eq).toHaveBeenCalledWith('verified', true)
  })

  it('should filter by risk level', async () => {
    const transactionsChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [mockTransactions[1]], // Only high risk transaction
        error: null,
        count: 1,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(transactionsChain)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions?risk_level=high')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.transactions).toHaveLength(1)
    expect(data.data.transactions[0].fraud_assessment.risk_level).toBe('high')
  })

  it('should search by transaction ID', async () => {
    const transactionsChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [mockTransactions[0]],
        error: null,
        count: 1,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(transactionsChain)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions?search=VCL-001')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(transactionsChain.ilike).toHaveBeenCalledWith('transaction_id', '%VCL-001%')
  })

  it('should validate pagination parameters', async () => {
    // Test with invalid page number
    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions?page=0')
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
    // Test with invalid limit
    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions?limit=101')
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
    const transactionsChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(transactionsChain)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.transactions).toEqual([])
    expect(data.data.pagination.total).toBe(0)
  })

  it('should handle database errors gracefully', async () => {
    const transactionsChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(transactionsChain)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch verification transactions',
      },
    })
  })

  it('should sort transactions by multiple criteria', async () => {
    const transactionsChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockTransactions,
        error: null,
        count: 2,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(transactionsChain)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions?sort_by=amount_sek&sort_order=desc')
    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    expect(transactionsChain.order).toHaveBeenCalledWith('amount_sek', { ascending: false })
  })

  it('should include fraud assessment data when available', async () => {
    const transactionsChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockTransactions,
        error: null,
        count: 2,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(transactionsChain)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.transactions[0].fraud_assessment).toBeDefined()
    expect(data.data.transactions[0].fraud_assessment.risk_score).toBe(25)
    expect(data.data.transactions[0].fraud_assessment.reasoning).toContain('Normal transaction pattern')
  })
})