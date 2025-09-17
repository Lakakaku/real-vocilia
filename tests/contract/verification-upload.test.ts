/**
 * Contract Test: POST /api/verification/upload
 *
 * Tests the business verification API endpoint that handles CSV upload
 * with verification results and completes the verification session.
 *
 * This test MUST FAIL initially (TDD approach) until the endpoint is implemented.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest } from 'next/server'
import { POST } from '../../app/api/verification/upload/route'

// Mock data for testing
const mockBusinessId = 'b1e8f9a0-1234-5678-9abc-123456789abc'
const mockVerificationSession = {
  id: 'vs_123456789',
  payment_batch_id: 'pb_123456789',
  business_id: mockBusinessId,
  status: 'in_progress',
  deadline: '2024-01-15T23:59:59Z',
  total_transactions: 3,
  verified_transactions: 0,
}

const validCSVContent = `transaction_id,verified,verification_decision,rejection_reason,business_notes
VCL-001,true,approved,,Verified transaction
VCL-002,false,rejected,amount_mismatch,Amount does not match POS
VCL-003,true,approved,,Good transaction`

const invalidCSVContent = `invalid,csv,format
missing,required,columns`

const partialCSVContent = `transaction_id,verified,verification_decision,rejection_reason,business_notes
VCL-001,true,approved,,Verified transaction
VCL-999,false,rejected,not_found,Transaction not in our system`

describe('POST /api/verification/upload', () => {
  let mockRequest: NextRequest
  let mockSupabaseClient: any
  let mockFile: File

  beforeEach(() => {
    // Create mock CSV file
    mockFile = new File([validCSVContent], 'verification-results.csv', {
      type: 'text/csv',
    })

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
      insert: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      storage: {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn().mockResolvedValue({
          data: { path: 'verification-results/vs_123456789/results.csv' },
          error: null,
        }),
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

    const formData = new FormData()
    formData.append('file', mockFile)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/upload', {
      method: 'POST',
      body: formData,
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

    const formData = new FormData()
    formData.append('file', mockFile)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/upload', {
      method: 'POST',
      body: formData,
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

  it('should return 400 when no file is uploaded', async () => {
    const formData = new FormData()
    // No file attached

    mockRequest = new NextRequest('http://localhost:3000/api/verification/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'MISSING_FILE',
        message: 'No file uploaded',
      },
    })
  })

  it('should return 400 when file is not CSV format', async () => {
    const invalidFile = new File(['not csv content'], 'test.txt', {
      type: 'text/plain',
    })

    const formData = new FormData()
    formData.append('file', invalidFile)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: 'File must be in CSV format',
      },
    })
  })

  it('should return 400 when file exceeds size limit', async () => {
    // Create a large file (simulate > 10MB)
    const largeContent = 'x'.repeat(11 * 1024 * 1024) // 11MB
    const largeFile = new File([largeContent], 'large.csv', {
      type: 'text/csv',
    })

    const formData = new FormData()
    formData.append('file', largeFile)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds maximum limit of 10MB',
      },
    })
  })

  it('should return 400 when CSV has invalid format', async () => {
    const invalidFile = new File([invalidCSVContent], 'invalid.csv', {
      type: 'text/csv',
    })

    const formData = new FormData()
    formData.append('file', invalidFile)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('INVALID_CSV_FORMAT')
    expect(data.error.message).toContain('Missing required columns')
    expect(data.error.details.missing_columns).toContain('transaction_id')
  })

  it('should successfully process valid CSV and update verification results', async () => {
    // Mock transaction lookups
    const transactionLookupChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { id: 'vr_001', transaction_id: 'VCL-001', verified: null },
          { id: 'vr_002', transaction_id: 'VCL-002', verified: null },
          { id: 'vr_003', transaction_id: 'VCL-003', verified: null },
        ],
        error: null,
      }),
    }

    // Mock bulk update
    const bulkUpdateChain = {
      from: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: [
          { id: 'vr_001', transaction_id: 'VCL-001', verified: true },
          { id: 'vr_002', transaction_id: 'VCL-002', verified: false },
          { id: 'vr_003', transaction_id: 'VCL-003', verified: true },
        ],
        error: null,
      }),
    }

    // Mock session update
    const sessionUpdateChain = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          ...mockVerificationSession,
          status: 'submitted',
          verified_transactions: 3,
          approved_count: 2,
          rejected_count: 1,
          submitted_at: '2024-01-08T17:00:00Z',
        },
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient) // Session lookup
      .mockReturnValueOnce(transactionLookupChain) // Transaction lookup
      .mockReturnValueOnce(bulkUpdateChain) // Bulk update
      .mockReturnValueOnce(sessionUpdateChain) // Session update

    const formData = new FormData()
    formData.append('file', mockFile)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      data: {
        session: {
          id: mockVerificationSession.id,
          status: 'submitted',
          verified_transactions: 3,
          approved_count: 2,
          rejected_count: 1,
          submitted_at: '2024-01-08T17:00:00Z',
        },
        processing_summary: {
          total_rows: 3,
          processed_rows: 3,
          approved_transactions: 2,
          rejected_transactions: 1,
          errors: [],
        },
        file_info: {
          path: 'verification-results/vs_123456789/results.csv',
          size: expect.any(Number),
          processed_at: expect.any(String),
        },
      },
    })

    // Verify storage upload was called
    expect(mockSupabaseClient.storage.upload).toHaveBeenCalledWith(
      expect.stringContaining('vs_123456789'),
      expect.any(File),
      {
        contentType: 'text/csv',
        upsert: false,
      }
    )
  })

  it('should handle partial CSV processing with errors', async () => {
    const partialFile = new File([partialCSVContent], 'partial.csv', {
      type: 'text/csv',
    })

    // Mock transaction lookup returning only one transaction
    const transactionLookupChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [
          { id: 'vr_001', transaction_id: 'VCL-001', verified: null },
          // VCL-999 not found
        ],
        error: null,
      }),
    }

    const bulkUpdateChain = {
      from: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: [{ id: 'vr_001', transaction_id: 'VCL-001', verified: true }],
        error: null,
      }),
    }

    const sessionUpdateChain = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...mockVerificationSession, verified_transactions: 1 },
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(transactionLookupChain)
      .mockReturnValueOnce(bulkUpdateChain)
      .mockReturnValueOnce(sessionUpdateChain)

    const formData = new FormData()
    formData.append('file', partialFile)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(207) // Partial success
    expect(data.data.processing_summary.errors).toContainEqual({
      row: 3,
      transaction_id: 'VCL-999',
      error: 'Transaction not found in current verification session',
    })
  })

  it('should return 400 when verification session is not in uploadable state', async () => {
    const completedSession = {
      ...mockVerificationSession,
      status: 'completed',
    }

    mockSupabaseClient.single.mockResolvedValue({
      data: completedSession,
      error: null,
    })

    const formData = new FormData()
    formData.append('file', mockFile)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_SESSION_STATUS',
        message: 'Cannot upload to verification session in current state',
        details: {
          current_status: 'completed',
          allowed_statuses: ['downloaded', 'in_progress'],
        },
      },
    })
  })

  it('should validate CSV data integrity', async () => {
    const invalidDataCSV = `transaction_id,verified,verification_decision,rejection_reason,business_notes
VCL-001,invalid_boolean,approved,,Notes
VCL-002,false,invalid_decision,amount_mismatch,Notes`

    const invalidDataFile = new File([invalidDataCSV], 'invalid-data.csv', {
      type: 'text/csv',
    })

    const formData = new FormData()
    formData.append('file', invalidDataFile)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('INVALID_CSV_DATA')
    expect(data.error.details.validation_errors).toContainEqual({
      row: 2,
      field: 'verified',
      error: 'Must be true or false',
      value: 'invalid_boolean',
    })
  })

  it('should create audit log entries for upload action', async () => {
    const transactionLookupChain = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: [{ id: 'vr_001', transaction_id: 'VCL-001', verified: null }],
        error: null,
      }),
    }

    const bulkUpdateChain = {
      from: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: [{ id: 'vr_001', transaction_id: 'VCL-001', verified: true }],
        error: null,
      }),
    }

    const sessionUpdateChain = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...mockVerificationSession, status: 'submitted' },
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
      .mockReturnValueOnce(transactionLookupChain)
      .mockReturnValueOnce(bulkUpdateChain)
      .mockReturnValueOnce(sessionUpdateChain)
      .mockReturnValueOnce(auditLogChain)

    const formData = new FormData()
    formData.append('file', mockFile)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)

    expect(response.status).toBe(200)

    // Verify audit log was created
    expect(auditLogChain.insert).toHaveBeenCalledWith({
      business_id: mockBusinessId,
      verification_session_id: mockVerificationSession.id,
      payment_batch_id: mockVerificationSession.payment_batch_id,
      event_type: 'batch_uploaded',
      event_description: 'Verification results uploaded and processed',
      actor_type: 'business_user',
      actor_id: mockBusinessId,
      metadata: {
        file_name: 'verification-results.csv',
        file_size: expect.any(Number),
        total_rows: expect.any(Number),
        processed_rows: expect.any(Number),
        upload_timestamp: expect.any(String),
      },
    })
  })

  it('should handle storage upload errors', async () => {
    mockSupabaseClient.storage.upload.mockResolvedValue({
      data: null,
      error: { message: 'Storage upload failed' },
    })

    const formData = new FormData()
    formData.append('file', mockFile)

    mockRequest = new NextRequest('http://localhost:3000/api/verification/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'STORAGE_ERROR',
        message: 'Failed to store verification results file',
      },
    })
  })
})