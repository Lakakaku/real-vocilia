/**
 * Contract Test: PUT /api/verification/transactions/{id}
 *
 * Tests the business verification API endpoint that updates individual
 * transaction verification decisions (approve/reject with reasons).
 *
 * This test MUST FAIL initially (TDD approach) until the endpoint is implemented.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest } from 'next/server'
import { PUT } from '../../app/api/verification/transactions/[id]/route'

// Mock data for testing
const mockBusinessId = 'b1e8f9a0-1234-5678-9abc-123456789abc'
const mockTransactionId = 'vr_123456789'
const mockVerificationSession = {
  id: 'vs_123456789',
  business_id: mockBusinessId,
  status: 'in_progress',
  total_transactions: 150,
  verified_transactions: 50,
  approved_count: 35,
  rejected_count: 15,
}

const mockVerificationResult = {
  id: mockTransactionId,
  verification_session_id: 'vs_123456789',
  transaction_id: 'VCL-001',
  transaction_date: '2024-01-08T14:30:00Z',
  amount_sek: 250.00,
  phone_last4: '**34',
  store_code: 'ABC123',
  quality_score: 85,
  verified: null,
  verification_decision: null,
  rejection_reason: null,
  business_notes: null,
  created_at: '2024-01-08T00:00:00Z',
}

describe('PUT /api/verification/transactions/{id}', () => {
  let mockRequest: NextRequest
  let mockSupabaseClient: any
  let mockParams: { params: { id: string } }

  beforeEach(() => {
    mockParams = { params: { id: mockTransactionId } }

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
      single: vi.fn().mockResolvedValue({
        data: mockVerificationResult,
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
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

    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions/123', {
      method: 'PUT',
      body: JSON.stringify({ verified: true }),
    })

    const response = await PUT(mockRequest, mockParams)
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

  it('should return 404 when transaction is not found', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' },
    })

    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions/invalid', {
      method: 'PUT',
      body: JSON.stringify({ verified: true }),
    })

    const response = await PUT(mockRequest, mockParams)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'TRANSACTION_NOT_FOUND',
        message: 'Verification transaction not found',
      },
    })
  })

  it('should successfully approve a transaction', async () => {
    const updatedTransaction = {
      ...mockVerificationResult,
      verified: true,
      verification_decision: 'approved',
      verified_at: '2024-01-08T16:00:00Z',
      verified_by: mockBusinessId,
    }

    const updateChain = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: updatedTransaction,
        error: null,
      }),
    }

    const sessionUpdateChain = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...mockVerificationSession, verified_transactions: 51, approved_count: 36 },
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient) // Transaction lookup
      .mockReturnValueOnce(updateChain) // Transaction update
      .mockReturnValueOnce(sessionUpdateChain) // Session update

    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions/123', {
      method: 'PUT',
      body: JSON.stringify({
        verified: true,
        business_notes: 'Transaction verified successfully',
      }),
    })

    const response = await PUT(mockRequest, mockParams)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      data: {
        transaction: {
          id: updatedTransaction.id,
          transaction_id: updatedTransaction.transaction_id,
          verified: true,
          verification_decision: 'approved',
          business_notes: 'Transaction verified successfully',
          verified_at: updatedTransaction.verified_at,
        },
        session_progress: {
          verified_transactions: 51,
          approved_count: 36,
          rejected_count: 15,
          completion_percentage: expect.any(Number),
        },
      },
    })

    // Verify update was called correctly
    expect(updateChain.update).toHaveBeenCalledWith({
      verified: true,
      verification_decision: 'approved',
      business_notes: 'Transaction verified successfully',
      verified_at: expect.any(String),
      verified_by: mockBusinessId,
      updated_at: expect.any(String),
    })
  })

  it('should successfully reject a transaction with reason', async () => {
    const updatedTransaction = {
      ...mockVerificationResult,
      verified: false,
      verification_decision: 'rejected',
      rejection_reason: 'amount_mismatch',
      business_notes: 'Amount does not match POS system',
      verified_at: '2024-01-08T16:00:00Z',
      verified_by: mockBusinessId,
    }

    const updateChain = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: updatedTransaction,
        error: null,
      }),
    }

    const sessionUpdateChain = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...mockVerificationSession, verified_transactions: 51, rejected_count: 16 },
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(sessionUpdateChain)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions/123', {
      method: 'PUT',
      body: JSON.stringify({
        verified: false,
        rejection_reason: 'amount_mismatch',
        business_notes: 'Amount does not match POS system',
      }),
    })

    const response = await PUT(mockRequest, mockParams)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.transaction.verified).toBe(false)
    expect(data.data.transaction.verification_decision).toBe('rejected')
    expect(data.data.transaction.rejection_reason).toBe('amount_mismatch')
  })

  it('should return 400 when rejection reason is missing for rejected transaction', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions/123', {
      method: 'PUT',
      body: JSON.stringify({
        verified: false,
        // missing rejection_reason
      }),
    })

    const response = await PUT(mockRequest, mockParams)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Rejection reason is required when rejecting a transaction',
      },
    })
  })

  it('should return 400 when business notes are required for "other" rejection reason', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions/123', {
      method: 'PUT',
      body: JSON.stringify({
        verified: false,
        rejection_reason: 'other',
        // missing business_notes
      }),
    })

    const response = await PUT(mockRequest, mockParams)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Business notes are required when rejection reason is "other"',
      },
    })
  })

  it('should return 400 when transaction is already verified', async () => {
    const alreadyVerifiedTransaction = {
      ...mockVerificationResult,
      verified: true,
      verification_decision: 'approved',
      verified_at: '2024-01-08T15:00:00Z',
    }

    mockSupabaseClient.single.mockResolvedValue({
      data: alreadyVerifiedTransaction,
      error: null,
    })

    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions/123', {
      method: 'PUT',
      body: JSON.stringify({ verified: false }),
    })

    const response = await PUT(mockRequest, mockParams)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'ALREADY_VERIFIED',
        message: 'Transaction has already been verified',
        details: {
          current_decision: 'approved',
          verified_at: '2024-01-08T15:00:00Z',
        },
      },
    })
  })

  it('should validate request body schema', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions/123', {
      method: 'PUT',
      body: JSON.stringify({
        verified: 'invalid', // should be boolean
        rejection_reason: 'invalid_reason', // should be from enum
      }),
    })

    const response = await PUT(mockRequest, mockParams)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toContain('Invalid request data')
  })

  it('should create audit log entry for verification decision', async () => {
    const updateChain = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...mockVerificationResult, verified: true },
        error: null,
      }),
    }

    const sessionUpdateChain = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockVerificationSession,
        error: null,
      }),
    }

    const auditLogChain = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'audit_123' },
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(sessionUpdateChain)
      .mockReturnValueOnce(auditLogChain)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions/123', {
      method: 'PUT',
      body: JSON.stringify({ verified: true }),
    })

    const response = await PUT(mockRequest, mockParams)

    expect(response.status).toBe(200)

    // Verify audit log was created
    expect(auditLogChain.insert).toHaveBeenCalledWith({
      business_id: mockBusinessId,
      verification_session_id: mockVerificationResult.verification_session_id,
      transaction_id: mockVerificationResult.transaction_id,
      event_type: 'transaction_approved',
      event_description: `Transaction ${mockVerificationResult.transaction_id} approved`,
      actor_type: 'business_user',
      actor_id: mockBusinessId,
      before_state: { verified: null },
      after_state: { verified: true },
      metadata: {
        verification_timestamp: expect.any(String),
        business_notes: undefined,
      },
    })
  })

  it('should handle database update errors gracefully', async () => {
    const updateChain = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database update failed' },
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(updateChain)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions/123', {
      method: 'PUT',
      body: JSON.stringify({ verified: true }),
    })

    const response = await PUT(mockRequest, mockParams)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to update verification result',
      },
    })
  })

  it('should validate transaction belongs to business', async () => {
    // Mock transaction belonging to different business
    const unauthorizedTransaction = {
      ...mockVerificationResult,
      verification_sessions: {
        business_id: 'different-business-id',
      },
    }

    const transactionLookupChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: unauthorizedTransaction,
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(transactionLookupChain)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions/123', {
      method: 'PUT',
      body: JSON.stringify({ verified: true }),
    })

    const response = await PUT(mockRequest, mockParams)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Not authorized to modify this transaction',
      },
    })
  })

  it('should handle malformed JSON in request body', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/verification/transactions/123', {
      method: 'PUT',
      body: 'invalid json',
    })

    const response = await PUT(mockRequest, mockParams)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
      },
    })
  })
})