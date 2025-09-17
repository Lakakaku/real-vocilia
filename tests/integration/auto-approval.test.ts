/**
 * Integration Test: Deadline Expiration Auto-Approval
 *
 * Tests the complete workflow of automatic approval when verification
 * deadlines expire, including batch processing and notifications.
 *
 * This test MUST FAIL initially (TDD approach) until the workflow is implemented.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { testUtils, mockData } from '../setup'

// Import the auto-approval service that will be implemented
import {
  processExpiredBatches,
  checkDeadlineExpiration,
  executeAutoApproval
} from '../../lib/verification/services/auto-approval-service'

// Mock data for testing
const mockBusinessId = 'bus_123456789'
const mockExpiredBatch = {
  id: 'pb_expired',
  business_id: mockBusinessId,
  week_number: 1,
  year_number: 2024,
  total_transactions: 100,
  total_amount: 25000.00,
  status: 'pending',
  deadline: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
  businesses: {
    id: mockBusinessId,
    name: 'Test Restaurant AB',
    email: 'manager@restaurant.se',
    verification_contact_email: 'verification@restaurant.se',
  },
}

const mockExpiredSession = {
  id: 'vs_expired',
  payment_batch_id: 'pb_expired',
  business_id: mockBusinessId,
  status: 'in_progress',
  verified_transactions: 60, // Only 60% completed
  approved_count: 50,
  rejected_count: 10,
  total_transactions: 100,
  deadline: mockExpiredBatch.deadline,
  started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
}

const mockUnverifiedTransactions = Array.from({ length: 40 }, (_, i) => ({
  id: `vr_unverified_${i + 1}`,
  transaction_id: `VCL-${String(61 + i).padStart(3, '0')}`,
  verification_session_id: 'vs_expired',
  amount_sek: 250.00,
  reward_amount_sek: 12.50,
  verified: null,
  verification_decision: null,
  created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
}))

describe('Deadline Expiration Auto-Approval Integration', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock Supabase client
    mockSupabaseClient = testUtils.createMockSupabaseClient({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    // Mock createRouteHandlerClient
    vi.mocked(createRouteHandlerClient).mockReturnValue(mockSupabaseClient)

    // Mock current time for consistent testing
    testUtils.mockDateTime('2024-01-16T12:00:00Z') // 1 day after deadline
  })

  afterEach(() => {
    testUtils.resetDateTime()
  })

  describe('checkDeadlineExpiration', () => {
    it('should identify expired batches correctly', async () => {
      // Mock expired batches query
      mockSupabaseClient.select.mockResolvedValue({
        data: [mockExpiredBatch],
        error: null,
      })

      const expiredBatches = await checkDeadlineExpiration()

      expect(expiredBatches).toHaveLength(1)
      expect(expiredBatches[0].id).toBe('pb_expired')
      expect(expiredBatches[0].status).toBe('pending')

      // Verify correct query was made
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
          verification_contact_email
        ),
        verification_sessions (
          id,
          status,
          verified_transactions,
          approved_count,
          rejected_count,
          total_transactions,
          started_at
        )
      `)
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'pending')
      expect(mockSupabaseClient.lt).toHaveBeenCalledWith('deadline', expect.any(String))
    })

    it('should exclude already processed batches', async () => {
      const processedBatch = {
        ...mockExpiredBatch,
        id: 'pb_processed',
        status: 'completed',
      }

      mockSupabaseClient.select.mockResolvedValue({
        data: [processedBatch],
        error: null,
      })

      const expiredBatches = await checkDeadlineExpiration()

      expect(expiredBatches).toHaveLength(0)
    })

    it('should handle empty results gracefully', async () => {
      mockSupabaseClient.select.mockResolvedValue({
        data: [],
        error: null,
      })

      const expiredBatches = await checkDeadlineExpiration()

      expect(expiredBatches).toHaveLength(0)
    })
  })

  describe('executeAutoApproval', () => {
    it('should auto-approve unverified transactions for expired batch', async () => {
      // Mock unverified transactions query
      const unverifiedQuery = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: mockUnverifiedTransactions,
          error: null,
        }),
      }

      // Mock batch update
      const batchUpdate = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ ...mockExpiredBatch, status: 'auto_completed' }],
          error: null,
        }),
      }

      // Mock session update
      const sessionUpdate = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ ...mockExpiredSession, status: 'auto_completed', verified_transactions: 100 }],
          error: null,
        }),
      }

      // Mock transaction updates
      const transactionUpdate = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockUnverifiedTransactions.map(t => ({
            ...t,
            verified: true,
            verification_decision: 'auto_approved',
            verified_at: '2024-01-16T12:00:00Z',
          })),
          error: null,
        }),
      }

      vi.mocked(createRouteHandlerClient)
        .mockReturnValueOnce(unverifiedQuery)
        .mockReturnValueOnce(transactionUpdate)
        .mockReturnValueOnce(sessionUpdate)
        .mockReturnValueOnce(batchUpdate)

      const result = await executeAutoApproval(mockExpiredBatch)

      expect(result).toEqual({
        success: true,
        batch_id: 'pb_expired',
        auto_approved_count: 40,
        total_verified_count: 100,
        completion_percentage: 100,
        auto_approval_reason: 'deadline_expired',
        processed_at: '2024-01-16T12:00:00Z',
      })

      // Verify unverified transactions were queried
      expect(unverifiedQuery.select).toHaveBeenCalledWith('*')
      expect(unverifiedQuery.eq).toHaveBeenCalledWith('verification_session_id', 'vs_expired')
      expect(unverifiedQuery.is).toHaveBeenCalledWith('verified', null)

      // Verify transactions were auto-approved
      expect(transactionUpdate.update).toHaveBeenCalledWith({
        verified: true,
        verification_decision: 'auto_approved',
        verified_at: '2024-01-16T12:00:00Z',
        business_notes: 'Auto-approved due to deadline expiration',
      })

      // Verify session was completed
      expect(sessionUpdate.update).toHaveBeenCalledWith({
        status: 'auto_completed',
        verified_transactions: 100,
        approved_count: 90, // 50 + 40 auto-approved
        completed_at: '2024-01-16T12:00:00Z',
      })

      // Verify batch was marked as auto-completed
      expect(batchUpdate.update).toHaveBeenCalledWith({
        status: 'auto_completed',
        completed_at: '2024-01-16T12:00:00Z',
      })
    })

    it('should handle batches with no unverified transactions', async () => {
      // Mock no unverified transactions
      const emptyQuery = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      vi.mocked(createRouteHandlerClient).mockReturnValueOnce(emptyQuery)

      const alreadyCompletedBatch = {
        ...mockExpiredBatch,
        verification_sessions: [{
          ...mockExpiredSession,
          verified_transactions: 100, // Already fully verified
        }],
      }

      const result = await executeAutoApproval(alreadyCompletedBatch)

      expect(result).toEqual({
        success: true,
        batch_id: 'pb_expired',
        auto_approved_count: 0,
        total_verified_count: 100,
        completion_percentage: 100,
        auto_approval_reason: 'already_completed',
        processed_at: '2024-01-16T12:00:00Z',
      })
    })

    it('should handle database errors gracefully', async () => {
      const errorQuery = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      }

      vi.mocked(createRouteHandlerClient).mockReturnValueOnce(errorQuery)

      const result = await executeAutoApproval(mockExpiredBatch)

      expect(result).toEqual({
        success: false,
        batch_id: 'pb_expired',
        error: 'Database connection failed',
      })
    })
  })

  describe('processExpiredBatches', () => {
    it('should process all expired batches and send notifications', async () => {
      // Mock expired batches
      mockSupabaseClient.select.mockResolvedValue({
        data: [mockExpiredBatch],
        error: null,
      })

      // Mock successful auto-approval
      vi.mocked(executeAutoApproval).mockResolvedValue({
        success: true,
        batch_id: 'pb_expired',
        auto_approved_count: 40,
        total_verified_count: 100,
        completion_percentage: 100,
        auto_approval_reason: 'deadline_expired',
        processed_at: '2024-01-16T12:00:00Z',
      })

      // Mock notification sending
      const notificationClient = {
        rpc: vi.fn().mockResolvedValue({
          data: { message_id: 'notification_001' },
          error: null,
        }),
      }

      // Mock audit log creation
      const auditClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({
          data: [{ id: 'audit_001' }],
          error: null,
        }),
      }

      vi.mocked(createRouteHandlerClient)
        .mockReturnValueOnce(mockSupabaseClient) // For expired batches query
        .mockReturnValueOnce(notificationClient) // For notification
        .mockReturnValueOnce(auditClient) // For audit log

      const result = await processExpiredBatches()

      expect(result).toEqual({
        processed_batches: 1,
        successful_approvals: 1,
        failed_approvals: 0,
        total_auto_approved_transactions: 40,
        notifications_sent: 1,
        processing_summary: [
          {
            batch_id: 'pb_expired',
            business_name: 'Test Restaurant AB',
            auto_approved_count: 40,
            completion_percentage: 100,
            notification_sent: true,
          },
        ],
      })

      // Verify notification was sent
      expect(notificationClient.rpc).toHaveBeenCalledWith('send_auto_approval_notification', {
        business_id: mockBusinessId,
        batch_id: 'pb_expired',
        auto_approved_count: 40,
        total_verified_count: 100,
        recipient_email: 'verification@restaurant.se',
      })

      // Verify audit log was created
      expect(auditClient.insert).toHaveBeenCalledWith({
        batch_id: 'pb_expired',
        action_type: 'auto_approval_executed',
        performed_by: 'system',
        metadata: {
          auto_approved_count: 40,
          total_verified_count: 100,
          deadline_expired: mockExpiredBatch.deadline,
          processed_at: '2024-01-16T12:00:00Z',
        },
      })
    })

    it('should handle partial failures gracefully', async () => {
      const multipleBatches = [
        mockExpiredBatch,
        { ...mockExpiredBatch, id: 'pb_expired_2', businesses: { ...mockExpiredBatch.businesses, name: 'Another Restaurant' } },
      ]

      mockSupabaseClient.select.mockResolvedValue({
        data: multipleBatches,
        error: null,
      })

      // Mock one success, one failure
      vi.mocked(executeAutoApproval)
        .mockResolvedValueOnce({
          success: true,
          batch_id: 'pb_expired',
          auto_approved_count: 40,
          total_verified_count: 100,
          completion_percentage: 100,
          auto_approval_reason: 'deadline_expired',
          processed_at: '2024-01-16T12:00:00Z',
        })
        .mockResolvedValueOnce({
          success: false,
          batch_id: 'pb_expired_2',
          error: 'Database error during processing',
        })

      const result = await processExpiredBatches()

      expect(result.processed_batches).toBe(2)
      expect(result.successful_approvals).toBe(1)
      expect(result.failed_approvals).toBe(1)
      expect(result.processing_summary).toHaveLength(2)
      expect(result.processing_summary[1]).toEqual({
        batch_id: 'pb_expired_2',
        business_name: 'Another Restaurant',
        error: 'Database error during processing',
        notification_sent: false,
      })
    })

    it('should skip batches that are not eligible for auto-approval', async () => {
      const recentBatch = {
        ...mockExpiredBatch,
        id: 'pb_recent',
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day in future
      }

      mockSupabaseClient.select.mockResolvedValue({
        data: [recentBatch],
        error: null,
      })

      const result = await processExpiredBatches()

      expect(result.processed_batches).toBe(0)
      expect(result.successful_approvals).toBe(0)
      expect(result.processing_summary).toHaveLength(0)

      // Verify executeAutoApproval was not called
      expect(vi.mocked(executeAutoApproval)).not.toHaveBeenCalled()
    })

    it('should handle notification failures without affecting auto-approval', async () => {
      mockSupabaseClient.select.mockResolvedValue({
        data: [mockExpiredBatch],
        error: null,
      })

      vi.mocked(executeAutoApproval).mockResolvedValue({
        success: true,
        batch_id: 'pb_expired',
        auto_approved_count: 40,
        total_verified_count: 100,
        completion_percentage: 100,
        auto_approval_reason: 'deadline_expired',
        processed_at: '2024-01-16T12:00:00Z',
      })

      // Mock failed notification
      const failedNotificationClient = {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Email service unavailable' },
        }),
      }

      vi.mocked(createRouteHandlerClient)
        .mockReturnValueOnce(mockSupabaseClient)
        .mockReturnValueOnce(failedNotificationClient)
        .mockReturnValueOnce({ from: vi.fn().mockReturnThis(), insert: vi.fn().mockResolvedValue({ data: [{}], error: null }) })

      const result = await processExpiredBatches()

      expect(result.successful_approvals).toBe(1)
      expect(result.notifications_sent).toBe(0)
      expect(result.processing_summary[0].notification_sent).toBe(false)
      expect(result.processing_summary[0].notification_error).toBe('Email service unavailable')
    })

    it('should create comprehensive audit trail', async () => {
      mockSupabaseClient.select.mockResolvedValue({
        data: [mockExpiredBatch],
        error: null,
      })

      vi.mocked(executeAutoApproval).mockResolvedValue({
        success: true,
        batch_id: 'pb_expired',
        auto_approved_count: 40,
        total_verified_count: 100,
        completion_percentage: 100,
        auto_approval_reason: 'deadline_expired',
        processed_at: '2024-01-16T12:00:00Z',
      })

      const auditClient = {
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({
          data: [{ id: 'audit_001' }],
          error: null,
        }),
      }

      vi.mocked(createRouteHandlerClient)
        .mockReturnValueOnce(mockSupabaseClient)
        .mockReturnValueOnce({ rpc: vi.fn().mockResolvedValue({ data: {}, error: null }) })
        .mockReturnValueOnce(auditClient)

      await processExpiredBatches()

      expect(auditClient.insert).toHaveBeenCalledWith({
        batch_id: 'pb_expired',
        action_type: 'auto_approval_executed',
        performed_by: 'system',
        metadata: {
          auto_approved_count: 40,
          total_verified_count: 100,
          deadline_expired: mockExpiredBatch.deadline,
          processed_at: '2024-01-16T12:00:00Z',
        },
      })
    })
  })

  describe('Scheduled Execution', () => {
    it('should be callable from cron job or scheduled task', async () => {
      // This test verifies the function can be called in an automated way
      mockSupabaseClient.select.mockResolvedValue({
        data: [],
        error: null,
      })

      // Should not throw when called without parameters (like from a cron job)
      expect(async () => {
        await processExpiredBatches()
      }).not.toThrow()
    })

    it('should log execution summary for monitoring', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      mockSupabaseClient.select.mockResolvedValue({
        data: [mockExpiredBatch],
        error: null,
      })

      vi.mocked(executeAutoApproval).mockResolvedValue({
        success: true,
        batch_id: 'pb_expired',
        auto_approved_count: 40,
        total_verified_count: 100,
        completion_percentage: 100,
        auto_approval_reason: 'deadline_expired',
        processed_at: '2024-01-16T12:00:00Z',
      })

      await processExpiredBatches()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auto-approval processing completed')
      )

      consoleSpy.mockRestore()
    })
  })
})