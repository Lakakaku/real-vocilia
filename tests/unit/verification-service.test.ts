/**
 * Unit tests for verification state transitions
 *
 * Tests verification workflow state management, session lifecycle,
 * transaction status updates, and audit trail generation
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { VerificationWorkflowService } from '@/lib/verification/services/workflow-service'
import type {
  VerificationSession,
  PaymentBatch,
  Transaction,
  VerificationResult,
  VerificationAuditLog
} from '@/types/verification'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn(),
  then: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient
}))

// Mock audit service
const mockAuditService = {
  logAction: vi.fn(),
  logStateTransition: vi.fn(),
  logError: vi.fn()
}

vi.mock('@/lib/verification/services/audit-service', () => ({
  AuditService: vi.fn().mockImplementation(() => mockAuditService)
}))

describe('VerificationWorkflowService', () => {
  let workflowService: VerificationWorkflowService
  const mockDate = new Date('2023-12-15T10:00:00Z')

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
    vi.clearAllMocks()
    workflowService = new VerificationWorkflowService()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Session Creation and Initialization', () => {
    it('should create new verification session', async () => {
      const batch: PaymentBatch = {
        id: 'batch_001',
        business_id: 'business_001',
        uploaded_by: 'user_001',
        status: 'pending',
        verification_deadline: '2023-12-22T10:00:00Z',
        transaction_count: 100,
        total_amount: 25000,
        created_at: '2023-12-15T10:00:00Z',
        updated_at: '2023-12-15T10:00:00Z'
      }

      const mockSession = {
        id: 'session_001',
        batch_id: 'batch_001',
        verifier_id: 'user_002',
        status: 'active',
        started_at: mockDate.toISOString(),
        created_at: mockDate.toISOString(),
        updated_at: mockDate.toISOString()
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: mockSession,
        error: null
      })

      const session = await workflowService.createSession(batch, 'user_002')

      expect(session).toMatchObject({
        batch_id: 'batch_001',
        verifier_id: 'user_002',
        status: 'active',
        started_at: expect.any(String)
      })

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('verification_sessions')
      expect(mockSupabaseClient.insert).toHaveBeenCalled()
      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        'user_002',
        'session_created',
        expect.any(Object)
      )
    })

    it('should prevent multiple active sessions for same batch', async () => {
      const batch: PaymentBatch = {
        id: 'batch_001',
        business_id: 'business_001',
        uploaded_by: 'user_001',
        status: 'in_progress', // Already has active session
        verification_deadline: '2023-12-22T10:00:00Z',
        transaction_count: 100,
        total_amount: 25000,
        created_at: '2023-12-15T10:00:00Z',
        updated_at: '2023-12-15T10:00:00Z'
      }

      mockSupabaseClient.then.mockResolvedValue({
        data: [{ id: 'existing_session', status: 'active' }],
        error: null
      })

      await expect(workflowService.createSession(batch, 'user_002'))
        .rejects.toThrow('Batch already has an active verification session')
    })

    it('should initialize session with correct transaction states', async () => {
      const mockTransactions = [
        { id: 'txn_001', verification_status: 'pending' },
        { id: 'txn_002', verification_status: 'pending' }
      ]

      mockSupabaseClient.then.mockResolvedValue({
        data: mockTransactions,
        error: null
      })

      const sessionData = await workflowService.initializeSessionData('session_001')

      expect(sessionData).toMatchObject({
        sessionId: 'session_001',
        totalTransactions: 2,
        pendingTransactions: 2,
        verifiedTransactions: 0,
        progressPercentage: 0
      })
    })
  })

  describe('Transaction Verification State Transitions', () => {
    const mockTransaction: Transaction = {
      id: 'txn_001',
      batch_id: 'batch_001',
      swish_reference: 'SW123456789',
      amount: 250.00,
      currency: 'SEK',
      recipient_name: 'Test Business AB',
      recipient_number: '+46701234567',
      sender_name: 'John Doe',
      sender_number: '+46709876543',
      message: 'Payment for services',
      timestamp: '2023-12-15T14:30:00Z',
      status: 'completed',
      verification_status: 'pending',
      created_at: '2023-12-15T14:30:00Z',
      updated_at: '2023-12-15T14:30:00Z'
    }

    it('should transition transaction from pending to approved', async () => {
      const mockUpdatedTransaction = {
        ...mockTransaction,
        verification_status: 'approved',
        verified_at: mockDate.toISOString(),
        verified_by: 'user_002'
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: mockUpdatedTransaction,
        error: null
      })

      const result = await workflowService.verifyTransaction(
        'txn_001',
        'user_002',
        'approved',
        'Transaction verified successfully'
      )

      expect(result.verification_status).toBe('approved')
      expect(result.verified_by).toBe('user_002')
      expect(result.verified_at).toBe(mockDate.toISOString())

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transactions')
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        verification_status: 'approved',
        verified_by: 'user_002',
        verified_at: mockDate.toISOString(),
        verification_reason: 'Transaction verified successfully'
      })

      expect(mockAuditService.logStateTransition).toHaveBeenCalledWith(
        'user_002',
        'transaction_verified',
        'txn_001',
        'pending',
        'approved',
        expect.any(Object)
      )
    })

    it('should transition transaction from pending to rejected', async () => {
      const mockRejectedTransaction = {
        ...mockTransaction,
        verification_status: 'rejected',
        verified_at: mockDate.toISOString(),
        verified_by: 'user_002',
        verification_reason: 'Suspicious transaction pattern'
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: mockRejectedTransaction,
        error: null
      })

      const result = await workflowService.verifyTransaction(
        'txn_001',
        'user_002',
        'rejected',
        'Suspicious transaction pattern'
      )

      expect(result.verification_status).toBe('rejected')
      expect(result.verification_reason).toBe('Suspicious transaction pattern')
    })

    it('should prevent invalid state transitions', async () => {
      const completedTransaction = {
        ...mockTransaction,
        verification_status: 'approved' // Already verified
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: completedTransaction,
        error: null
      })

      await expect(workflowService.verifyTransaction(
        'txn_001',
        'user_002',
        'rejected',
        'Attempting to change approved transaction'
      )).rejects.toThrow('Cannot change verification status of already verified transaction')
    })

    it('should handle batch verification of multiple transactions', async () => {
      const transactionIds = ['txn_001', 'txn_002', 'txn_003']
      const verificationDecisions = [
        { id: 'txn_001', status: 'approved', reason: 'Valid transaction' },
        { id: 'txn_002', status: 'rejected', reason: 'Suspicious amount' },
        { id: 'txn_003', status: 'approved', reason: 'Valid transaction' }
      ]

      mockSupabaseClient.then.mockResolvedValue({
        data: transactionIds.map((id, index) => ({
          id,
          verification_status: verificationDecisions[index].status,
          verified_at: mockDate.toISOString(),
          verified_by: 'user_002'
        })),
        error: null
      })

      const results = await workflowService.verifyTransactionBatch(
        'user_002',
        verificationDecisions
      )

      expect(results).toHaveLength(3)
      expect(results[0].verification_status).toBe('approved')
      expect(results[1].verification_status).toBe('rejected')
      expect(results[2].verification_status).toBe('approved')

      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        'user_002',
        'batch_verification',
        expect.objectContaining({
          transactionCount: 3,
          approvedCount: 2,
          rejectedCount: 1
        })
      )
    })
  })

  describe('Session State Management', () => {
    const mockSession: VerificationSession = {
      id: 'session_001',
      batch_id: 'batch_001',
      verifier_id: 'user_002',
      status: 'active',
      started_at: '2023-12-15T10:00:00Z',
      progress_percentage: 0,
      transactions_verified: 0,
      transactions_approved: 0,
      transactions_rejected: 0,
      created_at: '2023-12-15T10:00:00Z',
      updated_at: '2023-12-15T10:00:00Z'
    }

    it('should update session progress when transaction is verified', async () => {
      mockSupabaseClient.then.mockResolvedValueOnce({
        data: [
          { verification_status: 'approved' },
          { verification_status: 'rejected' },
          { verification_status: 'pending' },
          { verification_status: 'pending' }
        ],
        error: null
      })

      const updatedSession = {
        ...mockSession,
        progress_percentage: 50, // 2 out of 4 verified
        transactions_verified: 2,
        transactions_approved: 1,
        transactions_rejected: 1
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedSession,
        error: null
      })

      const result = await workflowService.updateSessionProgress('session_001')

      expect(result.progress_percentage).toBe(50)
      expect(result.transactions_verified).toBe(2)
      expect(result.transactions_approved).toBe(1)
      expect(result.transactions_rejected).toBe(1)
    })

    it('should complete session when all transactions are verified', async () => {
      mockSupabaseClient.then.mockResolvedValueOnce({
        data: [
          { verification_status: 'approved' },
          { verification_status: 'approved' },
          { verification_status: 'rejected' }
        ],
        error: null
      })

      const completedSession = {
        ...mockSession,
        status: 'completed',
        completed_at: mockDate.toISOString(),
        progress_percentage: 100,
        transactions_verified: 3,
        transactions_approved: 2,
        transactions_rejected: 1
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: completedSession,
        error: null
      })

      const result = await workflowService.updateSessionProgress('session_001')

      expect(result.status).toBe('completed')
      expect(result.completed_at).toBe(mockDate.toISOString())
      expect(result.progress_percentage).toBe(100)

      expect(mockAuditService.logStateTransition).toHaveBeenCalledWith(
        'system',
        'session_completed',
        'session_001',
        'active',
        'completed',
        expect.any(Object)
      )
    })

    it('should pause active session', async () => {
      const pausedSession = {
        ...mockSession,
        status: 'paused',
        paused_at: mockDate.toISOString()
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: pausedSession,
        error: null
      })

      const result = await workflowService.pauseSession('session_001', 'user_002')

      expect(result.status).toBe('paused')
      expect(result.paused_at).toBe(mockDate.toISOString())

      expect(mockAuditService.logStateTransition).toHaveBeenCalledWith(
        'user_002',
        'session_paused',
        'session_001',
        'active',
        'paused',
        expect.any(Object)
      )
    })

    it('should resume paused session', async () => {
      const resumedSession = {
        ...mockSession,
        status: 'active',
        resumed_at: mockDate.toISOString()
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: resumedSession,
        error: null
      })

      const result = await workflowService.resumeSession('session_001', 'user_002')

      expect(result.status).toBe('active')
      expect(result.resumed_at).toBe(mockDate.toISOString())
    })

    it('should abandon session with proper cleanup', async () => {
      const abandonedSession = {
        ...mockSession,
        status: 'abandoned',
        abandoned_at: mockDate.toISOString(),
        abandonment_reason: 'User requested cancellation'
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: abandonedSession,
        error: null
      })

      const result = await workflowService.abandonSession(
        'session_001',
        'user_002',
        'User requested cancellation'
      )

      expect(result.status).toBe('abandoned')
      expect(result.abandonment_reason).toBe('User requested cancellation')

      expect(mockAuditService.logStateTransition).toHaveBeenCalledWith(
        'user_002',
        'session_abandoned',
        'session_001',
        'active',
        'abandoned',
        expect.objectContaining({
          reason: 'User requested cancellation'
        })
      )
    })
  })

  describe('Batch State Management', () => {
    const mockBatch: PaymentBatch = {
      id: 'batch_001',
      business_id: 'business_001',
      uploaded_by: 'user_001',
      status: 'pending',
      verification_deadline: '2023-12-22T10:00:00Z',
      transaction_count: 100,
      total_amount: 25000,
      created_at: '2023-12-15T10:00:00Z',
      updated_at: '2023-12-15T10:00:00Z'
    }

    it('should transition batch from pending to in_progress', async () => {
      const inProgressBatch = {
        ...mockBatch,
        status: 'in_progress',
        verification_started_at: mockDate.toISOString()
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: inProgressBatch,
        error: null
      })

      const result = await workflowService.updateBatchStatus(
        'batch_001',
        'in_progress',
        'user_002'
      )

      expect(result.status).toBe('in_progress')
      expect(result.verification_started_at).toBe(mockDate.toISOString())
    })

    it('should complete batch when all sessions are finished', async () => {
      const completedBatch = {
        ...mockBatch,
        status: 'completed',
        verification_completed_at: mockDate.toISOString(),
        final_approval_rate: 85.5
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: completedBatch,
        error: null
      })

      const result = await workflowService.completeBatch('batch_001', 'user_002')

      expect(result.status).toBe('completed')
      expect(result.verification_completed_at).toBe(mockDate.toISOString())
      expect(result.final_approval_rate).toBe(85.5)
    })

    it('should handle auto-approval of expired batches', async () => {
      const expiredBatch = {
        ...mockBatch,
        status: 'auto_approved',
        verification_completed_at: mockDate.toISOString(),
        auto_approved: true,
        auto_approval_reason: 'Deadline expired'
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: expiredBatch,
        error: null
      })

      const result = await workflowService.autoApproveBatch(
        'batch_001',
        'Deadline expired'
      )

      expect(result.status).toBe('auto_approved')
      expect(result.auto_approved).toBe(true)
      expect(result.auto_approval_reason).toBe('Deadline expired')

      expect(mockAuditService.logAction).toHaveBeenCalledWith(
        'system',
        'batch_auto_approved',
        expect.objectContaining({
          batchId: 'batch_001',
          reason: 'Deadline expired'
        })
      )
    })
  })

  describe('Verification Result Generation', () => {
    it('should generate verification result for completed session', async () => {
      const mockResult: VerificationResult = {
        id: 'result_001',
        session_id: 'session_001',
        batch_id: 'batch_001',
        verifier_id: 'user_002',
        total_transactions: 100,
        approved_transactions: 85,
        rejected_transactions: 15,
        approval_rate: 85.0,
        verification_duration: 7200, // 2 hours in seconds
        created_at: mockDate.toISOString(),
        updated_at: mockDate.toISOString()
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: mockResult,
        error: null
      })

      const result = await workflowService.generateVerificationResult('session_001')

      expect(result).toMatchObject({
        session_id: 'session_001',
        total_transactions: 100,
        approved_transactions: 85,
        rejected_transactions: 15,
        approval_rate: 85.0
      })

      expect(result.verification_duration).toBeGreaterThan(0)
    })

    it('should calculate accurate verification metrics', () => {
      const transactions = [
        { verification_status: 'approved' },
        { verification_status: 'approved' },
        { verification_status: 'approved' },
        { verification_status: 'rejected' },
        { verification_status: 'rejected' }
      ]

      const metrics = workflowService.calculateVerificationMetrics(transactions)

      expect(metrics).toEqual({
        totalTransactions: 5,
        approvedTransactions: 3,
        rejectedTransactions: 2,
        approvalRate: 60.0,
        rejectionRate: 40.0
      })
    })

    it('should handle edge case of no transactions', () => {
      const metrics = workflowService.calculateVerificationMetrics([])

      expect(metrics).toEqual({
        totalTransactions: 0,
        approvedTransactions: 0,
        rejectedTransactions: 0,
        approvalRate: 0,
        rejectionRate: 0
      })
    })
  })

  describe('State Validation and Constraints', () => {
    it('should validate state transition rules', () => {
      // Valid transitions
      expect(workflowService.isValidStateTransition('pending', 'in_progress')).toBe(true)
      expect(workflowService.isValidStateTransition('in_progress', 'completed')).toBe(true)
      expect(workflowService.isValidStateTransition('active', 'paused')).toBe(true)
      expect(workflowService.isValidStateTransition('paused', 'active')).toBe(true)

      // Invalid transitions
      expect(workflowService.isValidStateTransition('completed', 'pending')).toBe(false)
      expect(workflowService.isValidStateTransition('abandoned', 'active')).toBe(false)
      expect(workflowService.isValidStateTransition('auto_approved', 'in_progress')).toBe(false)
    })

    it('should enforce business rules for state changes', async () => {
      // Cannot complete session with pending transactions
      mockSupabaseClient.then.mockResolvedValue({
        data: [
          { verification_status: 'approved' },
          { verification_status: 'pending' } // Still has pending
        ],
        error: null
      })

      await expect(workflowService.completeSession('session_001', 'user_002'))
        .rejects.toThrow('Cannot complete session with pending transactions')
    })

    it('should validate user permissions for state changes', async () => {
      // User cannot abandon another user's session
      const sessionWithDifferentUser = {
        id: 'session_001',
        verifier_id: 'user_001', // Different user
        status: 'active'
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: sessionWithDifferentUser,
        error: null
      })

      await expect(workflowService.abandonSession(
        'session_001',
        'user_002', // Different user trying to abandon
        'Test reason'
      )).rejects.toThrow('User does not have permission to modify this session')
    })
  })

  describe('Concurrency and Race Conditions', () => {
    it('should handle concurrent transaction verification attempts', async () => {
      // Simulate optimistic locking by checking updated_at
      const transaction = {
        id: 'txn_001',
        verification_status: 'pending',
        updated_at: '2023-12-15T10:00:00Z'
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: null, // No rows updated due to version mismatch
        error: null
      })

      await expect(workflowService.verifyTransaction(
        'txn_001',
        'user_002',
        'approved',
        'Test reason',
        '2023-12-15T09:59:00Z' // Stale version
      )).rejects.toThrow('Transaction was modified by another user')
    })

    it('should prevent race conditions in session completion', async () => {
      // Mock scenario where session is completed by another process
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { status: 'completed' }, // Already completed
        error: null
      })

      await expect(workflowService.updateSessionProgress('session_001'))
        .rejects.toThrow('Session is already completed')
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      })

      await expect(workflowService.verifyTransaction(
        'txn_001',
        'user_002',
        'approved',
        'Test reason'
      )).rejects.toThrow('Database connection failed')

      expect(mockAuditService.logError).toHaveBeenCalledWith(
        'user_002',
        'transaction_verification_failed',
        expect.any(Object)
      )
    })

    it('should rollback partial changes on failure', async () => {
      // Mock scenario where batch update partially succeeds
      mockSupabaseClient.then.mockResolvedValueOnce({
        data: [{ id: 'txn_001' }], // Only one transaction updated
        error: { message: 'Partial failure' }
      })

      await expect(workflowService.verifyTransactionBatch(
        'user_002',
        [
          { id: 'txn_001', status: 'approved', reason: 'Valid' },
          { id: 'txn_002', status: 'approved', reason: 'Valid' }
        ]
      )).rejects.toThrow()

      // Should attempt rollback
      expect(mockAuditService.logError).toHaveBeenCalledWith(
        'user_002',
        'batch_verification_rollback',
        expect.any(Object)
      )
    })
  })

  describe('Performance and Optimization', () => {
    it('should batch database operations efficiently', async () => {
      const largeTransactionSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `txn_${i}`,
        status: 'approved',
        reason: 'Bulk approval'
      }))

      mockSupabaseClient.then.mockResolvedValue({
        data: largeTransactionSet.map(t => ({ id: t.id, verification_status: t.status })),
        error: null
      })

      const startTime = Date.now()
      await workflowService.verifyTransactionBatch('user_002', largeTransactionSet)
      const endTime = Date.now()

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000)

      // Should use batch operations, not individual updates
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(1)
    })

    it('should cache frequently accessed session data', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: 'session_001', status: 'active' },
        error: null
      })

      // First call
      await workflowService.getSessionStatus('session_001')

      // Second call should use cache
      await workflowService.getSessionStatus('session_001')

      // Should only hit database once
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(1)
    })
  })
})