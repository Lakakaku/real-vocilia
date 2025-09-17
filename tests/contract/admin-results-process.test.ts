/**
 * Contract Test: POST /api/admin/verification-results/[id]/process
 *
 * Tests the admin API endpoint for processing completed verification
 * results including payment calculations and finalization.
 *
 * This test MUST FAIL initially (TDD approach) until the endpoint is implemented.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest } from 'next/server'
import { POST } from '../../app/api/admin/verification-results/[id]/process/route'

// Mock data for testing
const mockAdminUserId = 'admin_123456789'
const mockSessionId = 'vs_123456789'
const mockBatchId = 'pb_123456789'
const mockBusinessId = 'bus_123456789'

const mockVerificationSession = {
  id: mockSessionId,
  payment_batch_id: mockBatchId,
  business_id: mockBusinessId,
  status: 'completed',
  verified_transactions: 100,
  approved_count: 85,
  rejected_count: 15,
  deadline: '2024-01-15T23:59:59Z',
  completed_at: '2024-01-14T16:30:00Z',
  total_transactions: 100,
  businesses: {
    id: mockBusinessId,
    name: 'Test Restaurant AB',
    email: 'accounting@restaurant.se',
    bank_account: '1234567890',
  },
  payment_batches: {
    id: mockBatchId,
    total_amount: 25000.00,
    week_number: 2,
    year_number: 2024,
    status: 'completed',
  },
}

const mockVerificationResults = [
  {
    id: 'vr_001',
    transaction_id: 'VCL-001',
    amount_sek: 250.00,
    reward_amount_sek: 12.50,
    verified: true,
    verification_decision: 'approved',
  },
  {
    id: 'vr_002',
    transaction_id: 'VCL-002',
    amount_sek: 150.00,
    reward_amount_sek: 9.00,
    verified: true,
    verification_decision: 'approved',
  },
  {
    id: 'vr_003',
    transaction_id: 'VCL-003',
    amount_sek: 300.00,
    reward_amount_sek: 15.00,
    verified: false,
    verification_decision: 'rejected',
    rejection_reason: 'amount_mismatch',
  },
]

const mockProcessingResult = {
  id: 'pr_123456789',
  session_id: mockSessionId,
  batch_id: mockBatchId,
  business_id: mockBusinessId,
  total_approved_transactions: 85,
  total_rejected_transactions: 15,
  total_approved_amount: 21250.00,
  total_reward_amount: 1062.50,
  processing_fee: 31.88, // 1.5% of approved amount
  net_payout_amount: 1030.62,
  processed_at: '2024-01-15T10:00:00Z',
  processed_by: mockAdminUserId,
  status: 'processed',
  payment_reference: 'PAY-2024-W02-bus_123456789',
}

describe('POST /api/admin/verification-results/[id]/process', () => {
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
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockVerificationSession,
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

    const requestBody = {
      processing_type: 'standard',
      notes: 'Processing completed verification results',
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/verification-results/${mockSessionId}/process`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockSessionId } })
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

    const requestBody = {
      processing_type: 'standard',
      notes: 'Processing completed verification results',
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/verification-results/${mockSessionId}/process`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockSessionId } })
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

  it('should return 404 when verification session is not found', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'The result contains 0 rows' },
    })

    const requestBody = {
      processing_type: 'standard',
      notes: 'Processing completed verification results',
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/verification-results/${mockSessionId}/process`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockSessionId } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'SESSION_NOT_FOUND',
        message: 'Verification session not found',
      },
    })
  })

  it('should successfully process completed verification results', async () => {
    // Mock verification results query
    const resultsClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: mockVerificationResults,
        error: null,
      }),
    }

    // Mock processing result insertion
    const processingClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({
        data: [mockProcessingResult],
        error: null,
      }),
    }

    // Mock batch status update
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ id: mockBatchId, status: 'processed' }],
        error: null,
      }),
    }

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient) // For auth and session fetch
      .mockReturnValueOnce(resultsClient) // For verification results
      .mockReturnValueOnce(processingClient) // For processing result insertion
      .mockReturnValueOnce(updateClient) // For batch status update

    const requestBody = {
      processing_type: 'standard',
      notes: 'Processing completed verification results',
      override_fee_percentage: null,
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/verification-results/${mockSessionId}/process`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockSessionId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      data: {
        processing_result: {
          id: mockProcessingResult.id,
          session_id: mockSessionId,
          batch_id: mockBatchId,
          business_id: mockBusinessId,
          payment_reference: mockProcessingResult.payment_reference,
          processed_at: mockProcessingResult.processed_at,
          processed_by: mockAdminUserId,
          status: 'processed',
        },
        financial_summary: {
          total_approved_transactions: 85,
          total_rejected_transactions: 15,
          total_approved_amount: 21250.00,
          total_reward_amount: 1062.50,
          processing_fee_percentage: 1.5,
          processing_fee_amount: 31.88,
          net_payout_amount: 1030.62,
        },
        business_notification: {
          email_sent: true,
          notification_type: 'payment_processed',
          recipient: 'accounting@restaurant.se',
        },
      },
    })

    // Verify verification results were fetched
    expect(resultsClient.select).toHaveBeenCalledWith('*')
    expect(resultsClient.eq).toHaveBeenCalledWith('verification_session_id', mockSessionId)

    // Verify processing result was created
    expect(processingClient.insert).toHaveBeenCalledWith({
      session_id: mockSessionId,
      batch_id: mockBatchId,
      business_id: mockBusinessId,
      total_approved_transactions: 85,
      total_rejected_transactions: 15,
      total_approved_amount: 21250.00,
      total_reward_amount: 1062.50,
      processing_fee: 31.88,
      net_payout_amount: 1030.62,
      processed_by: mockAdminUserId,
      status: 'processed',
      payment_reference: expect.any(String),
      processing_notes: 'Processing completed verification results',
    })

    // Verify batch status was updated
    expect(updateClient.update).toHaveBeenCalledWith({
      status: 'processed',
      processed_at: expect.any(String),
    })
  })

  it('should validate session is in completed status', async () => {
    const inProgressSession = {
      ...mockVerificationSession,
      status: 'in_progress',
      completed_at: null,
    }

    mockSupabaseClient.single.mockResolvedValue({
      data: inProgressSession,
      error: null,
    })

    const requestBody = {
      processing_type: 'standard',
      notes: 'Processing verification results',
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/verification-results/${mockSessionId}/process`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockSessionId } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_SESSION_STATUS',
        message: 'Can only process completed verification sessions',
        current_status: 'in_progress',
      },
    })
  })

  it('should handle custom processing fee override', async () => {
    const resultsClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: mockVerificationResults,
        error: null,
      }),
    }

    const processingClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({
        data: [{
          ...mockProcessingResult,
          processing_fee: 21.25, // 1.0% instead of 1.5%
          net_payout_amount: 1041.25,
        }],
        error: null,
      }),
    }

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(resultsClient)
      .mockReturnValueOnce(processingClient)
      .mockReturnValueOnce({ from: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) })

    const requestBody = {
      processing_type: 'custom',
      notes: 'Special processing with reduced fee',
      override_fee_percentage: 1.0,
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/verification-results/${mockSessionId}/process`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockSessionId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.financial_summary.processing_fee_percentage).toBe(1.0)
    expect(data.data.financial_summary.processing_fee_amount).toBe(21.25)
    expect(data.data.financial_summary.net_payout_amount).toBe(1041.25)
  })

  it('should validate processing type parameter', async () => {
    const requestBody = {
      processing_type: 'invalid_type',
      notes: 'Processing verification results',
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/verification-results/${mockSessionId}/process`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockSessionId } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_PROCESSING_TYPE',
        message: 'Invalid processing type. Allowed: standard, expedited, custom',
      },
    })
  })

  it('should validate custom fee percentage range', async () => {
    const requestBody = {
      processing_type: 'custom',
      notes: 'Processing verification results',
      override_fee_percentage: 5.0, // Too high
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/verification-results/${mockSessionId}/process`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockSessionId } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_FEE_PERCENTAGE',
        message: 'Custom fee percentage must be between 0.0 and 3.0',
      },
    })
  })

  it('should handle expedited processing with higher fee', async () => {
    const resultsClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: mockVerificationResults,
        error: null,
      }),
    }

    const processingClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({
        data: [{
          ...mockProcessingResult,
          processing_fee: 42.50, // 2.0% for expedited
          net_payout_amount: 1020.00,
        }],
        error: null,
      }),
    }

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(resultsClient)
      .mockReturnValueOnce(processingClient)
      .mockReturnValueOnce({ from: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) })

    const requestBody = {
      processing_type: 'expedited',
      notes: 'Expedited processing requested by business',
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/verification-results/${mockSessionId}/process`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockSessionId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.financial_summary.processing_fee_percentage).toBe(2.0)
    expect(data.data.financial_summary.processing_fee_amount).toBe(42.50)
  })

  it('should generate unique payment reference', async () => {
    const resultsClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: mockVerificationResults,
        error: null,
      }),
    }

    const processingClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockImplementation((data) => {
        expect(data.payment_reference).toMatch(/^PAY-2024-W\d{2}-[a-z0-9]+$/)
        return Promise.resolve({
          data: [{ ...mockProcessingResult, payment_reference: data.payment_reference }],
          error: null,
        })
      }),
    }

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(resultsClient)
      .mockReturnValueOnce(processingClient)
      .mockReturnValueOnce({ from: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) })

    const requestBody = {
      processing_type: 'standard',
      notes: 'Processing verification results',
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/verification-results/${mockSessionId}/process`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    await POST(mockRequest, { params: { id: mockSessionId } })

    expect(processingClient.insert).toHaveBeenCalled()
  })

  it('should handle database errors gracefully', async () => {
    const resultsClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      }),
    }

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(resultsClient)

    const requestBody = {
      processing_type: 'standard',
      notes: 'Processing verification results',
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/verification-results/${mockSessionId}/process`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockSessionId } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to process verification results',
      },
    })
  })

  it('should prevent duplicate processing', async () => {
    // Mock existing processing result
    const existingProcessingClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ id: 'existing_processing_result' }],
        error: null,
      }),
    }

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(existingProcessingClient)

    const requestBody = {
      processing_type: 'standard',
      notes: 'Processing verification results',
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/verification-results/${mockSessionId}/process`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockSessionId } })
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'ALREADY_PROCESSED',
        message: 'Verification results have already been processed',
        existing_processing_id: 'existing_processing_result',
      },
    })
  })

  it('should include audit trail in processing result', async () => {
    const resultsClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: mockVerificationResults,
        error: null,
      }),
    }

    const processingClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({
        data: [mockProcessingResult],
        error: null,
      }),
    }

    const auditClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({
        data: [{ id: 'audit_001' }],
        error: null,
      }),
    }

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(resultsClient)
      .mockReturnValueOnce(processingClient)
      .mockReturnValueOnce({ from: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) })
      .mockReturnValueOnce(auditClient)

    const requestBody = {
      processing_type: 'standard',
      notes: 'Processing completed verification results',
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/verification-results/${mockSessionId}/process`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockSessionId } })

    expect(response.status).toBe(200)

    // Verify audit log was created
    expect(auditClient.insert).toHaveBeenCalledWith({
      batch_id: mockBatchId,
      action_type: 'results_processed',
      performed_by: mockAdminUserId,
      metadata: {
        session_id: mockSessionId,
        processing_type: 'standard',
        approved_transactions: 85,
        rejected_transactions: 15,
        total_payout: 1030.62,
        payment_reference: expect.any(String),
      },
    })
  })
})