/**
 * Contract Test: POST /api/admin/batches
 *
 * Tests the admin API endpoint for creating new payment batches
 * with CSV data upload and validation.
 *
 * This test MUST FAIL initially (TDD approach) until the endpoint is implemented.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest } from 'next/server'
import { POST } from '../../app/api/admin/batches/route'
import { testUtils, mockData } from '../setup'

// Mock data for testing
const mockAdminUserId = 'admin_123456789'
const mockBusinessId = 'bus_123456789'
const mockCreatedBatch = {
  id: 'pb_new_batch',
  business_id: mockBusinessId,
  week_number: 3,
  year_number: 2024,
  total_transactions: 2,
  total_amount: 400.00,
  status: 'draft',
  deadline: '2024-01-22T23:59:59Z',
  created_at: '2024-01-15T00:00:00Z',
  created_by: mockAdminUserId,
}

const mockCreatedSession = {
  id: 'vs_new_session',
  payment_batch_id: 'pb_new_batch',
  business_id: mockBusinessId,
  status: 'not_started',
  deadline: '2024-01-22T23:59:59Z',
  total_transactions: 2,
  verified_transactions: 0,
  approved_count: 0,
  rejected_count: 0,
  created_at: '2024-01-15T00:00:00Z',
}

describe('POST /api/admin/batches', () => {
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
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: mockBusinessId, name: 'Test Restaurant AB' },
        error: null,
      }),
      rpc: vi.fn().mockResolvedValue({
        data: [{ is_admin: true }],
        error: null,
      }),
      storage: {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn().mockResolvedValue({
          data: { path: 'batches/pb_new_batch/transactions.csv' },
          error: null,
        }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://storage.supabase.co/signed-url' },
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

    const formData = testUtils.createMockFormData({
      csv_file: testUtils.createMockCSVFile(mockData.csvContent.valid),
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches', {
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

  it('should return 403 when user is not an admin', async () => {
    mockSupabaseClient.rpc.mockResolvedValue({
      data: [{ is_admin: false }],
      error: null,
    })

    const formData = testUtils.createMockFormData({
      csv_file: testUtils.createMockCSVFile(mockData.csvContent.valid),
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
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

  it('should successfully create a new payment batch with CSV data', async () => {
    // Mock successful batch creation
    mockSupabaseClient.insert
      .mockResolvedValueOnce({
        data: [mockCreatedBatch],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [mockCreatedSession],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          { id: 'vr_001', transaction_id: 'VCL-001' },
          { id: 'vr_002', transaction_id: 'VCL-002' },
        ],
        error: null,
      })

    const formData = testUtils.createMockFormData({
      csv_file: testUtils.createMockCSVFile(mockData.csvContent.valid),
      business_id: mockBusinessId,
      week_number: '3',
      year_number: '2024',
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual({
      success: true,
      data: {
        batch: {
          id: mockCreatedBatch.id,
          business_id: mockCreatedBatch.business_id,
          week_number: mockCreatedBatch.week_number,
          year_number: mockCreatedBatch.year_number,
          total_transactions: mockCreatedBatch.total_transactions,
          total_amount: mockCreatedBatch.total_amount,
          status: mockCreatedBatch.status,
          deadline: mockCreatedBatch.deadline,
          created_at: mockCreatedBatch.created_at,
          created_by: mockCreatedBatch.created_by,
        },
        verification_session: {
          id: mockCreatedSession.id,
          status: mockCreatedSession.status,
          deadline: mockCreatedSession.deadline,
          total_transactions: mockCreatedSession.total_transactions,
        },
        csv_upload: {
          path: 'batches/pb_new_batch/transactions.csv',
          signed_url: 'https://storage.supabase.co/signed-url',
          records_processed: 2,
          validation_summary: {
            valid_records: 2,
            invalid_records: 0,
            warnings: [],
          },
        },
      },
    })

    // Verify batch creation
    expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
      business_id: mockBusinessId,
      week_number: 3,
      year_number: 2024,
      total_transactions: 2,
      total_amount: 400.00,
      status: 'draft',
      deadline: expect.any(String),
      created_by: mockAdminUserId,
    })

    // Verify session creation
    expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
      payment_batch_id: mockCreatedBatch.id,
      business_id: mockBusinessId,
      status: 'not_started',
      deadline: expect.any(String),
      total_transactions: 2,
    })

    // Verify CSV upload
    expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('verification-files')
    expect(mockSupabaseClient.storage.upload).toHaveBeenCalledWith(
      expect.stringContaining('batches/'),
      expect.any(Object),
      { upsert: false }
    )
  })

  it('should validate required form fields', async () => {
    const formData = testUtils.createMockFormData({
      csv_file: testUtils.createMockCSVFile(mockData.csvContent.valid),
      // Missing business_id, week_number, year_number
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'Missing required fields',
        details: expect.arrayContaining(['business_id', 'week_number', 'year_number']),
      },
    })
  })

  it('should validate CSV file is provided', async () => {
    const formData = testUtils.createMockFormData({
      business_id: mockBusinessId,
      week_number: '3',
      year_number: '2024',
      // Missing csv_file
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'MISSING_CSV_FILE',
        message: 'CSV file is required',
      },
    })
  })

  it('should validate CSV file format', async () => {
    const formData = testUtils.createMockFormData({
      csv_file: new File(['not a csv'], 'test.txt', { type: 'text/plain' }),
      business_id: mockBusinessId,
      week_number: '3',
      year_number: '2024',
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches', {
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
        message: 'Only CSV files are allowed',
      },
    })
  })

  it('should validate CSV content format and data', async () => {
    const formData = testUtils.createMockFormData({
      csv_file: testUtils.createMockCSVFile(mockData.csvContent.invalid),
      business_id: mockBusinessId,
      week_number: '3',
      year_number: '2024',
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_CSV_FORMAT',
        message: 'CSV validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            row: expect.any(Number),
            field: expect.any(String),
            message: expect.any(String),
          }),
        ]),
      },
    })
  })

  it('should validate business exists', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'The result contains 0 rows' },
    })

    const formData = testUtils.createMockFormData({
      csv_file: testUtils.createMockCSVFile(mockData.csvContent.valid),
      business_id: 'invalid_business_id',
      week_number: '3',
      year_number: '2024',
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
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

  it('should validate week and year parameters', async () => {
    const formData = testUtils.createMockFormData({
      csv_file: testUtils.createMockCSVFile(mockData.csvContent.valid),
      business_id: mockBusinessId,
      week_number: '0', // Invalid: must be 1-53
      year_number: '2023', // Invalid: must be 2024 or later
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('INVALID_WEEK_YEAR')
    expect(data.error.message).toContain('Week number must be between 1 and 53')
  })

  it('should check for duplicate batch creation', async () => {
    // Mock existing batch check
    mockSupabaseClient.single
      .mockResolvedValueOnce({
        data: { id: mockBusinessId, name: 'Test Restaurant AB' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: 'existing_batch' },
        error: null,
      })

    const formData = testUtils.createMockFormData({
      csv_file: testUtils.createMockCSVFile(mockData.csvContent.valid),
      business_id: mockBusinessId,
      week_number: '3',
      year_number: '2024',
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'BATCH_ALREADY_EXISTS',
        message: 'Payment batch already exists for this business and week',
        existing_batch_id: 'existing_batch',
      },
    })
  })

  it('should handle file upload errors', async () => {
    mockSupabaseClient.storage.upload.mockResolvedValue({
      data: null,
      error: { message: 'Storage upload failed' },
    })

    const formData = testUtils.createMockFormData({
      csv_file: testUtils.createMockCSVFile(mockData.csvContent.valid),
      business_id: mockBusinessId,
      week_number: '3',
      year_number: '2024',
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'FILE_UPLOAD_ERROR',
        message: 'Failed to upload CSV file to storage',
      },
    })
  })

  it('should handle database creation errors', async () => {
    mockSupabaseClient.insert.mockResolvedValue({
      data: null,
      error: { message: 'Database insertion failed' },
    })

    const formData = testUtils.createMockFormData({
      csv_file: testUtils.createMockCSVFile(mockData.csvContent.valid),
      business_id: mockBusinessId,
      week_number: '3',
      year_number: '2024',
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to create payment batch',
      },
    })
  })

  it('should handle large CSV files efficiently', async () => {
    // Generate a large CSV with 1000 rows
    const headers = 'transaction_id,customer_feedback_id,transaction_date,amount_sek,phone_last4,store_code,quality_score,reward_percentage,reward_amount_sek'
    const rows = Array.from({ length: 1000 }, (_, i) =>
      `VCL-${String(i + 1).padStart(3, '0')},fb_${i + 1},2024-01-08T14:30:00Z,250.00,**34,ABC123,85,5,12.50`
    )
    const largeCsv = [headers, ...rows].join('\n')

    mockSupabaseClient.insert
      .mockResolvedValueOnce({
        data: [{ ...mockCreatedBatch, total_transactions: 1000, total_amount: 250000.00 }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ ...mockCreatedSession, total_transactions: 1000 }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: Array.from({ length: 1000 }, (_, i) => ({ id: `vr_${i + 1}`, transaction_id: `VCL-${String(i + 1).padStart(3, '0')}` })),
        error: null,
      })

    const formData = testUtils.createMockFormData({
      csv_file: testUtils.createMockCSVFile(largeCsv, 'large-batch.csv'),
      business_id: mockBusinessId,
      week_number: '3',
      year_number: '2024',
    })

    const startTime = Date.now()
    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const processingTime = Date.now() - startTime
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.batch.total_transactions).toBe(1000)
    expect(data.data.csv_upload.records_processed).toBe(1000)
    expect(processingTime).toBeLessThan(5000) // Should process under 5 seconds
  })

  it('should calculate deadline correctly (7 days from creation)', async () => {
    mockSupabaseClient.insert.mockResolvedValueOnce({
      data: [mockCreatedBatch],
      error: null,
    })

    const formData = testUtils.createMockFormData({
      csv_file: testUtils.createMockCSVFile(mockData.csvContent.valid),
      business_id: mockBusinessId,
      week_number: '3',
      year_number: '2024',
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(201)

    // Verify deadline is approximately 7 days from now
    const deadline = new Date(data.data.batch.deadline)
    const now = new Date()
    const timeDiff = deadline.getTime() - now.getTime()
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24)

    expect(daysDiff).toBeGreaterThan(6.9)
    expect(daysDiff).toBeLessThan(7.1)
  })

  it('should send notification email to business after batch creation', async () => {
    const notificationClient = {
      rpc: vi.fn().mockResolvedValue({
        data: { message_id: 'email_001' },
        error: null,
      }),
    }

    mockSupabaseClient.insert
      .mockResolvedValueOnce({
        data: [mockCreatedBatch],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [mockCreatedSession],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ id: 'vr_001' }, { id: 'vr_002' }],
        error: null,
      })

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(notificationClient)

    const formData = testUtils.createMockFormData({
      csv_file: testUtils.createMockCSVFile(mockData.csvContent.valid),
      business_id: mockBusinessId,
      week_number: '3',
      year_number: '2024',
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/batches', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data).toHaveProperty('notification_sent')
    expect(data.data.notification_sent.message_id).toBe('email_001')

    // Verify notification was sent
    expect(notificationClient.rpc).toHaveBeenCalledWith('send_batch_notification', {
      business_id: mockBusinessId,
      batch_id: mockCreatedBatch.id,
      notification_type: 'batch_created',
    })
  })
})