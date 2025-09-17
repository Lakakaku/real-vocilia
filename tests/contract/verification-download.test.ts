/**
 * Contract Test: POST /api/verification/download
 *
 * Tests the business verification API endpoint that initiates CSV download
 * for the current verification batch and updates session status.
 *
 * This test MUST FAIL initially (TDD approach) until the endpoint is implemented.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest } from 'next/server'
import { POST } from '../../app/api/verification/download/route'

// Mock data for testing
const mockBusinessId = 'b1e8f9a0-1234-5678-9abc-123456789abc'
const mockVerificationSession = {
  id: 'vs_123456789',
  payment_batch_id: 'pb_123456789',
  business_id: mockBusinessId,
  status: 'not_started',
  deadline: '2024-01-15T23:59:59Z',
  total_transactions: 150,
  verified_transactions: 0,
}

const mockPaymentBatch = {
  id: 'pb_123456789',
  business_id: mockBusinessId,
  week_number: 2,
  year_number: 2024,
  file_path: 'batches/2024/week-2/business-123/verification-batch.csv',
  file_size: 25600,
  total_transactions: 150,
  status: 'pending',
}

const mockCSVContent = `transaction_id,customer_feedback_id,transaction_date,amount_sek,phone_last4,store_code,quality_score,reward_percentage,reward_amount_sek
VCL-001,fb_001,2024-01-08T14:30:00Z,250.00,**34,ABC123,85,5,12.50
VCL-002,fb_002,2024-01-08T15:45:00Z,150.00,**67,ABC123,92,6,9.00`

describe('POST /api/verification/download', () => {
  let mockRequest: NextRequest
  let mockSupabaseClient: any
  let mockStorageResponse: any

  beforeEach(() => {
    // Create mock request
    mockRequest = new NextRequest('http://localhost:3000/api/verification/download', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer mock-jwt-token',
        'content-type': 'application/json',
      },
    })

    // Mock storage download response
    mockStorageResponse = {
      data: new Blob([mockCSVContent], { type: 'text/csv' }),
      error: null,
    }

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
        data: mockVerificationSession,
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
      storage: {
        from: vi.fn().mockReturnThis(),
        download: vi.fn().mockResolvedValue(mockStorageResponse),
      },
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

    const response = await POST(mockRequest)
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

    const response = await POST(mockRequest)
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

  it('should return 400 when verification session is not in downloadable state', async () => {
    const completedSession = {
      ...mockVerificationSession,
      status: 'completed',
    }

    mockSupabaseClient.single.mockResolvedValue({
      data: completedSession,
      error: null,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_SESSION_STATUS',
        message: 'Verification session is not in a downloadable state',
        details: { current_status: 'completed', allowed_statuses: ['not_started', 'downloaded'] },
      },
    })
  })

  it('should successfully download CSV and update session status', async () => {
    // Mock the batch lookup with file path
    const batchLookupChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockPaymentBatch,
        error: null,
      }),
    }

    // Mock the session update
    const sessionUpdateChain = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...mockVerificationSession, status: 'downloaded', downloaded_at: '2024-01-08T16:00:00Z' },
        error: null,
      }),
    }

    // Set up the mock to return different chains for different calls
    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient) // First call for session lookup
      .mockReturnValueOnce(batchLookupChain) // Second call for batch lookup
      .mockReturnValueOnce(sessionUpdateChain) // Third call for session update

    const response = await POST(mockRequest)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/csv')
    expect(response.headers.get('content-disposition')).toContain('attachment')
    expect(response.headers.get('content-disposition')).toContain('verification-batch-week-2-2024.csv')

    // Verify the CSV content
    const csvContent = await response.text()
    expect(csvContent).toContain('transaction_id,customer_feedback_id')
    expect(csvContent).toContain('VCL-001,fb_001')
    expect(csvContent).toContain('VCL-002,fb_002')
  })

  it('should handle missing batch file gracefully', async () => {
    const batchWithoutFile = {
      ...mockPaymentBatch,
      file_path: null,
    }

    const batchLookupChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: batchWithoutFile,
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(batchLookupChain)

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'BATCH_FILE_NOT_FOUND',
        message: 'Verification batch file not available',
      },
    })
  })

  it('should handle storage download errors', async () => {
    const batchLookupChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockPaymentBatch,
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(batchLookupChain)

    // Mock storage error
    mockSupabaseClient.storage.download.mockResolvedValue({
      data: null,
      error: { message: 'File not found in storage' },
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'STORAGE_ERROR',
        message: 'Failed to download verification batch file',
      },
    })
  })

  it('should create audit log entry for download action', async () => {
    const batchLookupChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockPaymentBatch,
        error: null,
      }),
    }

    const sessionUpdateChain = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...mockVerificationSession, status: 'downloaded' },
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
      .mockReturnValueOnce(batchLookupChain)
      .mockReturnValueOnce(sessionUpdateChain)
      .mockReturnValueOnce(auditLogChain)

    const response = await POST(mockRequest)

    expect(response.status).toBe(200)

    // Verify audit log was created
    expect(auditLogChain.insert).toHaveBeenCalledWith({
      business_id: mockBusinessId,
      verification_session_id: mockVerificationSession.id,
      payment_batch_id: mockPaymentBatch.id,
      event_type: 'batch_downloaded',
      event_description: `Verification batch downloaded for week ${mockPaymentBatch.week_number} ${mockPaymentBatch.year_number}`,
      actor_type: 'business_user',
      actor_id: mockBusinessId,
      metadata: {
        file_path: mockPaymentBatch.file_path,
        file_size: mockPaymentBatch.file_size,
        download_timestamp: expect.any(String),
      },
    })
  })

  it('should validate CSV file integrity', async () => {
    // Mock corrupted CSV content
    const corruptedCSVResponse = {
      data: new Blob(['invalid,csv,content'], { type: 'text/csv' }),
      error: null,
    }

    const batchLookupChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockPaymentBatch,
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(batchLookupChain)

    mockSupabaseClient.storage.download.mockResolvedValue(corruptedCSVResponse)

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_CSV_FORMAT',
        message: 'Downloaded CSV file has invalid format',
      },
    })
  })

  it('should handle concurrent download attempts', async () => {
    // Test that multiple simultaneous downloads are handled correctly
    const requests = Array(3).fill(null).map(() => POST(mockRequest))
    const responses = await Promise.all(requests)

    // Only one should succeed, others should get appropriate error
    const successCount = responses.filter(r => r.status === 200).length
    expect(successCount).toBeLessThanOrEqual(1)
  })

  it('should set proper HTTP headers for CSV download', async () => {
    const batchLookupChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockPaymentBatch,
        error: null,
      }),
    }

    const sessionUpdateChain = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...mockVerificationSession, status: 'downloaded' },
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(batchLookupChain)
      .mockReturnValueOnce(sessionUpdateChain)

    const response = await POST(mockRequest)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(response.headers.get('content-disposition')).toMatch(/^attachment; filename="verification-batch-week-\d+-\d+\.csv"$/)
    expect(response.headers.get('cache-control')).toBe('no-cache, no-store, must-revalidate')
    expect(response.headers.get('content-length')).toBe(String(mockCSVContent.length))
  })
})