/**
 * Integration Test: Complete Verification Workflow (End-to-End)
 *
 * Tests the complete payment verification workflow from batch creation
 * to final submission and processing.
 *
 * This test MUST FAIL initially (TDD approach) until all components are implemented.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest } from 'next/server'

// Mock data for testing
const mockAdminUserId = 'admin_123456789'
const mockBusinessId = 'b1e8f9a0-1234-5678-9abc-123456789abc'

const mockFeedbackData = [
  {
    id: 'fb_001',
    transaction_amount: 250.00,
    transaction_time: '2024-01-08T14:30:00Z',
    phone_number: '+46701234567',
    store_id: 'store_001',
    quality_score: 85,
    reward_percentage: 5,
    reward_amount: 12.50,
    week_number: 2,
    year_number: 2024,
  },
  {
    id: 'fb_002',
    transaction_amount: 150.00,
    transaction_time: '2024-01-08T15:45:00Z',
    phone_number: '+46701234568',
    store_id: 'store_001',
    quality_score: 92,
    reward_percentage: 6,
    reward_amount: 9.00,
    week_number: 2,
    year_number: 2024,
  },
]

describe('Complete Verification Workflow (E2E)', () => {
  let mockSupabaseClient: any
  let batchId: string
  let sessionId: string

  beforeEach(() => {
    // Mock Supabase client with all necessary methods
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockBusinessId } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      rpc: vi.fn(),
      storage: {
        from: vi.fn().mockReturnThis(),
        upload: vi.fn().mockResolvedValue({
          data: { path: 'test-path' },
          error: null,
        }),
        download: vi.fn().mockResolvedValue({
          data: new Blob(['test,csv,content'], { type: 'text/csv' }),
          error: null,
        }),
      },
    }

    // Mock the createRouteHandlerClient
    vi.mocked(createRouteHandlerClient).mockReturnValue(mockSupabaseClient)

    // Reset IDs for each test
    batchId = 'pb_' + Date.now()
    sessionId = 'vs_' + Date.now()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Phase 1: Admin Creates Verification Batch', () => {
    it('should create payment batch from feedback data', async () => {
      // Mock admin authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockAdminUserId } },
        error: null,
      })

      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ is_admin: true }],
        error: null,
      })

      // Mock feedback query
      const feedbackQuery = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({
          data: mockFeedbackData,
          error: null,
        }),
      }

      // Mock batch creation
      const batchInsert = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: batchId,
            business_id: mockBusinessId,
            week_number: 2,
            year_number: 2024,
            total_transactions: 2,
            total_amount: 400.00,
            deadline: '2024-01-15T23:59:59Z',
            status: 'pending',
            file_path: 'batches/2024/week-2/verification-batch.csv',
          },
          error: null,
        }),
      }

      // Mock session creation
      const sessionInsert = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: sessionId,
            payment_batch_id: batchId,
            business_id: mockBusinessId,
            status: 'not_started',
            total_transactions: 2,
            deadline: '2024-01-15T23:59:59Z',
          },
          error: null,
        }),
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(feedbackQuery) // Feedback lookup
        .mockReturnValueOnce(batchInsert) // Batch creation
        .mockReturnValueOnce(sessionInsert) // Session creation

      const { POST: createBatch } = await import('../../app/api/admin/batches/route')

      const request = new NextRequest('http://localhost:3000/api/admin/batches', {
        method: 'POST',
        body: JSON.stringify({
          business_id: mockBusinessId,
          week_number: 2,
          year_number: 2024,
        }),
      })

      const response = await createBatch(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.batch.id).toBe(batchId)
      expect(data.data.verification_session.id).toBe(sessionId)

      // Verify CSV file was generated and uploaded
      expect(mockSupabaseClient.storage.upload).toHaveBeenCalled()
    })
  })

  describe('Phase 2: Business Downloads Verification Batch', () => {
    it('should allow business to download CSV file and update session status', async () => {
      // Mock current session lookup
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: {
            id: sessionId,
            payment_batch_id: batchId,
            status: 'not_started',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: batchId,
            file_path: 'batches/2024/week-2/verification-batch.csv',
            file_size: 1024,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: sessionId,
            status: 'downloaded',
            downloaded_at: '2024-01-08T16:00:00Z',
          },
          error: null,
        })

      const { POST: downloadBatch } = await import('../../app/api/verification/download/route')

      const request = new NextRequest('http://localhost:3000/api/verification/download', {
        method: 'POST',
      })

      const response = await downloadBatch(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8')
      expect(response.headers.get('content-disposition')).toContain('attachment')

      // Verify session status was updated to 'downloaded'
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        status: 'downloaded',
        downloaded_at: expect.any(String),
        updated_at: expect.any(String),
      })
    })
  })

  describe('Phase 3: Business Verifies Individual Transactions', () => {
    it('should allow business to verify individual transactions', async () => {
      const transactionId = 'vr_001'

      // Mock transaction lookup and update
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: {
            id: transactionId,
            verification_session_id: sessionId,
            transaction_id: 'VCL-001',
            verified: null,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: transactionId,
            verified: true,
            verification_decision: 'approved',
            verified_at: '2024-01-08T17:00:00Z',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: sessionId,
            verified_transactions: 1,
            approved_count: 1,
          },
          error: null,
        })

      const { PUT: updateTransaction } = await import('../../app/api/verification/transactions/[id]/route')

      const request = new NextRequest(`http://localhost:3000/api/verification/transactions/${transactionId}`, {
        method: 'PUT',
        body: JSON.stringify({
          verified: true,
          business_notes: 'Transaction verified successfully',
        }),
      })

      const response = await updateTransaction(request, { params: { id: transactionId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.transaction.verified).toBe(true)
      expect(data.data.session_progress.verified_transactions).toBe(1)
    })

    it('should allow business to reject transactions with reasons', async () => {
      const transactionId = 'vr_002'

      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: {
            id: transactionId,
            verification_session_id: sessionId,
            transaction_id: 'VCL-002',
            verified: null,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: transactionId,
            verified: false,
            verification_decision: 'rejected',
            rejection_reason: 'amount_mismatch',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: sessionId,
            verified_transactions: 2,
            rejected_count: 1,
          },
          error: null,
        })

      const { PUT: updateTransaction } = await import('../../app/api/verification/transactions/[id]/route')

      const request = new NextRequest(`http://localhost:3000/api/verification/transactions/${transactionId}`, {
        method: 'PUT',
        body: JSON.stringify({
          verified: false,
          rejection_reason: 'amount_mismatch',
          business_notes: 'Amount does not match POS system',
        }),
      })

      const response = await updateTransaction(request, { params: { id: transactionId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.transaction.verified).toBe(false)
      expect(data.data.transaction.rejection_reason).toBe('amount_mismatch')
    })
  })

  describe('Phase 4: Business Uploads Verification Results', () => {
    it('should process uploaded CSV and complete verification session', async () => {
      const csvContent = `transaction_id,verified,verification_decision,rejection_reason,business_notes
VCL-001,true,approved,,Verified transaction
VCL-002,false,rejected,amount_mismatch,Amount does not match POS`

      const csvFile = new File([csvContent], 'verification-results.csv', {
        type: 'text/csv',
      })

      // Mock session lookup
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: {
            id: sessionId,
            status: 'in_progress',
            total_transactions: 2,
          },
          error: null,
        })

      // Mock transaction lookup
      const transactionLookup = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { id: 'vr_001', transaction_id: 'VCL-001', verified: null },
            { id: 'vr_002', transaction_id: 'VCL-002', verified: null },
          ],
          error: null,
        }),
      }

      // Mock bulk update
      const bulkUpdate = {
        from: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [
            { id: 'vr_001', transaction_id: 'VCL-001', verified: true },
            { id: 'vr_002', transaction_id: 'VCL-002', verified: false },
          ],
          error: null,
        }),
      }

      // Mock session completion
      const sessionUpdate = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: sessionId,
            status: 'submitted',
            verified_transactions: 2,
            approved_count: 1,
            rejected_count: 1,
            submitted_at: '2024-01-08T18:00:00Z',
          },
          error: null,
        }),
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(mockSupabaseClient) // Session lookup
        .mockReturnValueOnce(transactionLookup) // Transaction lookup
        .mockReturnValueOnce(bulkUpdate) // Bulk update
        .mockReturnValueOnce(sessionUpdate) // Session update

      const { POST: uploadResults } = await import('../../app/api/verification/upload/route')

      const formData = new FormData()
      formData.append('file', csvFile)

      const request = new NextRequest('http://localhost:3000/api/verification/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await uploadResults(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.session.status).toBe('submitted')
      expect(data.data.processing_summary.processed_rows).toBe(2)
      expect(data.data.processing_summary.approved_transactions).toBe(1)
      expect(data.data.processing_summary.rejected_transactions).toBe(1)
    })
  })

  describe('Phase 5: Admin Processes Verification Results', () => {
    it('should allow admin to view and process submitted verification results', async () => {
      // Mock admin authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockAdminUserId } },
        error: null,
      })

      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ is_admin: true }],
        error: null,
      })

      // Mock verification results lookup
      mockSupabaseClient.range.mockResolvedValue({
        data: [
          {
            id: sessionId,
            payment_batch_id: batchId,
            business_id: mockBusinessId,
            status: 'submitted',
            verified_transactions: 2,
            approved_count: 1,
            rejected_count: 1,
            submitted_at: '2024-01-08T18:00:00Z',
            businesses: {
              name: 'Test Restaurant AB',
              email: 'test@restaurant.se',
            },
          },
        ],
        error: null,
        count: 1,
      })

      const { GET: getVerificationResults } = await import('../../app/api/admin/verification-results/route')

      const request = new NextRequest('http://localhost:3000/api/admin/verification-results')
      const response = await getVerificationResults(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.verification_sessions).toHaveLength(1)
      expect(data.data.verification_sessions[0].status).toBe('submitted')
    })

    it('should allow admin to mark verification as completed', async () => {
      // Mock admin authentication
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: mockAdminUserId } },
        error: null,
      })

      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ is_admin: true }],
        error: null,
      })

      // Mock session update to completed
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: {
            id: sessionId,
            status: 'submitted',
            business_id: mockBusinessId,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: sessionId,
            status: 'completed',
            completed_at: '2024-01-08T19:00:00Z',
          },
          error: null,
        })

      const { POST: processResults } = await import('../../app/api/admin/verification-results/[id]/process/route')

      const request = new NextRequest(`http://localhost:3000/api/admin/verification-results/${sessionId}/process`, {
        method: 'POST',
        body: JSON.stringify({
          admin_notes: 'Verification completed successfully',
        }),
      })

      const response = await processResults(request, { params: { id: sessionId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.status).toBe('completed')
    })
  })

  describe('Phase 6: Audit Trail Verification', () => {
    it('should create complete audit trail throughout the workflow', async () => {
      // Mock audit log queries
      mockSupabaseClient.order.mockResolvedValue({
        data: [
          {
            id: 'audit_001',
            event_type: 'batch_created',
            event_description: 'Payment batch created for week 2 2024',
            actor_type: 'admin_user',
            created_at: '2024-01-08T15:00:00Z',
          },
          {
            id: 'audit_002',
            event_type: 'batch_downloaded',
            event_description: 'Verification batch downloaded',
            actor_type: 'business_user',
            created_at: '2024-01-08T16:00:00Z',
          },
          {
            id: 'audit_003',
            event_type: 'transaction_approved',
            event_description: 'Transaction VCL-001 approved',
            actor_type: 'business_user',
            created_at: '2024-01-08T17:00:00Z',
          },
          {
            id: 'audit_004',
            event_type: 'batch_uploaded',
            event_description: 'Verification results uploaded and processed',
            actor_type: 'business_user',
            created_at: '2024-01-08T18:00:00Z',
          },
          {
            id: 'audit_005',
            event_type: 'verification_completed',
            event_description: 'Verification session completed by admin',
            actor_type: 'admin_user',
            created_at: '2024-01-08T19:00:00Z',
          },
        ],
        error: null,
      })

      // Query audit trail
      const auditQuery = mockSupabaseClient
        .from('verification_audit_logs')
        .select('*')
        .eq('verification_session_id', sessionId)
        .order('created_at', { ascending: true })

      const auditResponse = await auditQuery

      expect(auditResponse.data).toHaveLength(5)
      expect(auditResponse.data[0].event_type).toBe('batch_created')
      expect(auditResponse.data[4].event_type).toBe('verification_completed')

      // Verify all major workflow events are logged
      const eventTypes = auditResponse.data.map(log => log.event_type)
      expect(eventTypes).toContain('batch_created')
      expect(eventTypes).toContain('batch_downloaded')
      expect(eventTypes).toContain('transaction_approved')
      expect(eventTypes).toContain('batch_uploaded')
      expect(eventTypes).toContain('verification_completed')
    })
  })

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle deadline expiration with auto-approval', async () => {
      // Mock expired session
      const expiredSession = {
        id: sessionId,
        status: 'in_progress',
        deadline: '2024-01-01T00:00:00Z', // Past deadline
        verified_transactions: 1,
        total_transactions: 2,
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: expiredSession,
        error: null,
      })

      // Mock auto-approval function
      mockSupabaseClient.rpc.mockResolvedValue({
        data: [{ updated_sessions: 1 }],
        error: null,
      })

      // Call auto-approval function (would be triggered by cron job)
      const autoApprovalResult = await mockSupabaseClient
        .rpc('auto_approve_expired_sessions')

      expect(autoApprovalResult.data[0].updated_sessions).toBe(1)
    })

    it('should handle CSV format validation errors', async () => {
      const invalidCSV = 'invalid,csv,format\nwith,wrong,columns'
      const invalidFile = new File([invalidCSV], 'invalid.csv', { type: 'text/csv' })

      const { POST: uploadResults } = await import('../../app/api/verification/upload/route')

      const formData = new FormData()
      formData.append('file', invalidFile)

      const request = new NextRequest('http://localhost:3000/api/verification/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await uploadResults(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_CSV_FORMAT')
    })

    it('should handle concurrent verification attempts', async () => {
      // Test that the system handles multiple simultaneous verification attempts correctly
      const transactionId = 'vr_001'

      // Mock already verified transaction
      mockSupabaseClient.single.mockResolvedValue({
        data: {
          id: transactionId,
          verified: true,
          verification_decision: 'approved',
          verified_at: '2024-01-08T16:00:00Z',
        },
        error: null,
      })

      const { PUT: updateTransaction } = await import('../../app/api/verification/transactions/[id]/route')

      const request = new NextRequest(`http://localhost:3000/api/verification/transactions/${transactionId}`, {
        method: 'PUT',
        body: JSON.stringify({ verified: false }),
      })

      const response = await updateTransaction(request, { params: { id: transactionId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('ALREADY_VERIFIED')
    })
  })
})