/**
 * Contract Test: POST /api/admin/batches/[id]/actions
 *
 * Tests the admin API endpoint for batch management actions like
 * extending deadlines, sending reminders, and forcing completion.
 *
 * This test MUST FAIL initially (TDD approach) until the endpoint is implemented.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest } from 'next/server'
import { POST } from '../../app/api/admin/batches/[id]/actions/route'

// Mock data for testing
const mockAdminUserId = 'admin_123456789'
const mockBatchId = 'pb_123456789'
const mockBusiness = {
  id: 'bus_001',
  name: 'Test Restaurant AB',
  email: 'test@restaurant.se',
  verification_contact_email: 'verification@restaurant.se',
}

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
  businesses: mockBusiness,
  verification_sessions: [
    {
      id: 'vs_001',
      status: 'in_progress',
      verified_transactions: 25,
      approved_count: 20,
      rejected_count: 5,
    },
  ],
}

describe('POST /api/admin/batches/[id]/actions', () => {
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
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
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

    const requestBody = {
      action: 'extend_deadline',
      days: 3,
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}/actions`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockBatchId } })
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
      action: 'extend_deadline',
      days: 3,
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}/actions`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockBatchId } })
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

    const requestBody = {
      action: 'extend_deadline',
      days: 3,
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}/actions`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockBatchId } })
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

  it('should extend deadline successfully', async () => {
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ ...mockPaymentBatch, deadline: '2024-01-18T23:59:59Z' }],
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
      .mockReturnValueOnce(mockSupabaseClient) // For auth and batch fetch
      .mockReturnValueOnce(updateClient) // For deadline update
      .mockReturnValueOnce(auditClient) // For audit log

    const requestBody = {
      action: 'extend_deadline',
      days: 3,
      reason: 'Business requested extension due to technical issues',
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}/actions`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockBatchId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      data: {
        action_performed: 'extend_deadline',
        new_deadline: '2024-01-18T23:59:59Z',
        days_extended: 3,
        reason: 'Business requested extension due to technical issues',
        performed_by: mockAdminUserId,
        performed_at: expect.any(String),
      },
    })

    // Verify deadline was updated
    expect(updateClient.update).toHaveBeenCalledWith({
      deadline: expect.any(String),
      updated_at: expect.any(String),
    })
    expect(updateClient.eq).toHaveBeenCalledWith('id', mockBatchId)

    // Verify audit log was created
    expect(auditClient.insert).toHaveBeenCalledWith({
      batch_id: mockBatchId,
      action_type: 'deadline_extended',
      performed_by: mockAdminUserId,
      reason: 'Business requested extension due to technical issues',
      metadata: {
        days_extended: 3,
        original_deadline: '2024-01-15T23:59:59Z',
        new_deadline: expect.any(String),
      },
    })
  })

  it('should send reminder email successfully', async () => {
    const emailClient = {
      rpc: vi.fn().mockResolvedValue({
        data: { message_id: 'email_001' },
        error: null,
      }),
    }

    const auditClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({
        data: [{ id: 'audit_002' }],
        error: null,
      }),
    }

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient) // For auth and batch fetch
      .mockReturnValueOnce(emailClient) // For sending email
      .mockReturnValueOnce(auditClient) // For audit log

    const requestBody = {
      action: 'send_reminder',
      reminder_type: 'urgent',
      custom_message: 'Please complete verification before deadline',
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}/actions`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockBatchId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      data: {
        action_performed: 'send_reminder',
        reminder_type: 'urgent',
        recipient_email: 'verification@restaurant.se',
        message_id: 'email_001',
        custom_message: 'Please complete verification before deadline',
        performed_by: mockAdminUserId,
        performed_at: expect.any(String),
      },
    })

    // Verify email was sent
    expect(emailClient.rpc).toHaveBeenCalledWith('send_verification_reminder', {
      batch_id: mockBatchId,
      recipient_email: 'verification@restaurant.se',
      reminder_type: 'urgent',
      custom_message: 'Please complete verification before deadline',
    })

    // Verify audit log was created
    expect(auditClient.insert).toHaveBeenCalledWith({
      batch_id: mockBatchId,
      action_type: 'reminder_sent',
      performed_by: mockAdminUserId,
      metadata: {
        reminder_type: 'urgent',
        recipient_email: 'verification@restaurant.se',
        message_id: 'email_001',
        custom_message: 'Please complete verification before deadline',
      },
    })
  })

  it('should force complete batch successfully', async () => {
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ ...mockPaymentBatch, status: 'completed' }],
        error: null,
      }),
    }

    const sessionUpdateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ id: 'vs_001', status: 'force_completed' }],
        error: null,
      }),
    }

    const auditClient = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({
        data: [{ id: 'audit_003' }],
        error: null,
      }),
    }

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient) // For auth and batch fetch
      .mockReturnValueOnce(updateClient) // For batch status update
      .mockReturnValueOnce(sessionUpdateClient) // For session status update
      .mockReturnValueOnce(auditClient) // For audit log

    const requestBody = {
      action: 'force_complete',
      reason: 'Deadline passed, forcing completion for payment processing',
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}/actions`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockBatchId } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      data: {
        action_performed: 'force_complete',
        previous_status: 'pending',
        new_status: 'completed',
        verified_transactions: 25,
        remaining_unverified: 125,
        reason: 'Deadline passed, forcing completion for payment processing',
        performed_by: mockAdminUserId,
        performed_at: expect.any(String),
      },
    })

    // Verify batch status was updated
    expect(updateClient.update).toHaveBeenCalledWith({
      status: 'completed',
      completed_at: expect.any(String),
      updated_at: expect.any(String),
    })

    // Verify session status was updated
    expect(sessionUpdateClient.update).toHaveBeenCalledWith({
      status: 'force_completed',
      completed_at: expect.any(String),
    })
  })

  it('should validate required action parameter', async () => {
    const requestBody = {
      days: 3,
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}/actions`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockBatchId } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_ACTION',
        message: 'Action parameter is required',
      },
    })
  })

  it('should validate action type', async () => {
    const requestBody = {
      action: 'invalid_action',
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}/actions`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockBatchId } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_ACTION',
        message: 'Invalid action type. Allowed: extend_deadline, send_reminder, force_complete',
      },
    })
  })

  it('should validate extend_deadline parameters', async () => {
    const requestBody = {
      action: 'extend_deadline',
      days: 15, // Too many days
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}/actions`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockBatchId } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_PARAMETERS',
        message: 'Days to extend must be between 1 and 14',
      },
    })
  })

  it('should validate send_reminder parameters', async () => {
    const requestBody = {
      action: 'send_reminder',
      reminder_type: 'invalid_type',
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}/actions`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockBatchId } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_PARAMETERS',
        message: 'Invalid reminder type. Allowed: standard, urgent, final',
      },
    })
  })

  it('should handle completed batches appropriately', async () => {
    const completedBatch = {
      ...mockPaymentBatch,
      status: 'completed',
    }

    mockSupabaseClient.single.mockResolvedValue({
      data: completedBatch,
      error: null,
    })

    const requestBody = {
      action: 'extend_deadline',
      days: 3,
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}/actions`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockBatchId } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_BATCH_STATUS',
        message: 'Cannot perform action on completed batch',
      },
    })
  })

  it('should handle database errors gracefully', async () => {
    const updateClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      }),
    }

    vi.mocked(createRouteHandlerClient)
      .mockReturnValueOnce(mockSupabaseClient)
      .mockReturnValueOnce(updateClient)

    const requestBody = {
      action: 'extend_deadline',
      days: 3,
      reason: 'Test extension',
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}/actions`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockBatchId } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to perform batch action',
      },
    })
  })

  it('should require reason for force_complete action', async () => {
    const requestBody = {
      action: 'force_complete',
    }

    mockRequest = new NextRequest(`http://localhost:3000/api/admin/batches/${mockBatchId}/actions`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest, { params: { id: mockBatchId } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_PARAMETERS',
        message: 'Reason is required for force_complete action',
      },
    })
  })
})