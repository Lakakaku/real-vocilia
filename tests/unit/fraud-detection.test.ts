/**
 * Unit tests for fraud detection algorithms
 *
 * Tests AI-powered fraud detection service with OpenAI integration
 * Covers pattern recognition, risk scoring, and decision logic
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { FraudDetectionService } from '@/lib/ai/fraud-detection-service'
import type { Transaction, FraudAssessment, FraudPattern } from '@/types/verification'

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn()
      }
    }
  }))
}))

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn(),
  then: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient
}))

describe('FraudDetectionService', () => {
  let fraudService: FraudDetectionService
  let mockOpenAI: Mock

  beforeEach(() => {
    vi.clearAllMocks()
    fraudService = new FraudDetectionService()
    mockOpenAI = vi.mocked(require('openai').default)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Transaction Risk Assessment', () => {
    const sampleTransaction: Transaction = {
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
      merchant_category: 'retail',
      location: 'Stockholm',
      verification_status: 'pending',
      created_at: '2023-12-15T14:30:00Z',
      updated_at: '2023-12-15T14:30:00Z'
    }

    it('should calculate basic risk score for normal transaction', async () => {
      const riskScore = await fraudService.calculateRiskScore(sampleTransaction)

      expect(riskScore).toBeGreaterThanOrEqual(0)
      expect(riskScore).toBeLessThanOrEqual(100)
      expect(typeof riskScore).toBe('number')
    })

    it('should identify high-risk transactions with unusual amounts', async () => {
      const highAmountTransaction = {
        ...sampleTransaction,
        amount: 50000.00 // Very high amount
      }

      const riskScore = await fraudService.calculateRiskScore(highAmountTransaction)
      expect(riskScore).toBeGreaterThan(70) // High risk threshold
    })

    it('should flag transactions with suspicious timing patterns', async () => {
      const lateNightTransaction = {
        ...sampleTransaction,
        timestamp: '2023-12-15T02:30:00Z' // 2:30 AM
      }

      const riskScore = await fraudService.calculateRiskScore(lateNightTransaction)
      expect(riskScore).toBeGreaterThan(40) // Moderate risk for off-hours
    })

    it('should detect round number amounts as potential fraud indicator', async () => {
      const roundAmountTransaction = {
        ...sampleTransaction,
        amount: 1000.00 // Round amount
      }

      const riskScore = await fraudService.calculateRiskScore(roundAmountTransaction)
      expect(riskScore).toBeGreaterThan(30)
    })

    it('should handle transactions with missing optional data', async () => {
      const incompleteTransaction = {
        ...sampleTransaction,
        message: null,
        location: null
      }

      const riskScore = await fraudService.calculateRiskScore(incompleteTransaction)
      expect(riskScore).toBeGreaterThanOrEqual(0)
      expect(riskScore).toBeLessThanOrEqual(100)
    })
  })

  describe('Pattern Detection', () => {
    it('should detect velocity fraud patterns', async () => {
      const transactions = Array.from({ length: 10 }, (_, i) => ({
        ...sampleTransaction,
        id: `txn_${i}`,
        timestamp: new Date(Date.now() - i * 60000).toISOString(), // 1 minute apart
        sender_number: '+46709876543' // Same sender
      }))

      const patterns = await fraudService.detectPatterns(transactions)
      expect(patterns).toContain('high_velocity')
    })

    it('should detect amount clustering patterns', async () => {
      const transactions = Array.from({ length: 5 }, (_, i) => ({
        ...sampleTransaction,
        id: `txn_${i}`,
        amount: 999.99, // Just under 1000 threshold
        sender_number: `+4670123456${i}`
      }))

      const patterns = await fraudService.detectPatterns(transactions)
      expect(patterns).toContain('amount_clustering')
    })

    it('should detect time-based clustering', async () => {
      const baseTime = new Date('2023-12-15T14:30:00Z').getTime()
      const transactions = Array.from({ length: 8 }, (_, i) => ({
        ...sampleTransaction,
        id: `txn_${i}`,
        timestamp: new Date(baseTime + i * 30000).toISOString(), // 30 seconds apart
        sender_number: `+4670123456${i}`
      }))

      const patterns = await fraudService.detectPatterns(transactions)
      expect(patterns).toContain('time_clustering')
    })

    it('should not flag normal transaction patterns', async () => {
      const normalTransactions = [
        { ...sampleTransaction, id: 'txn_1', amount: 125.50 },
        { ...sampleTransaction, id: 'txn_2', amount: 89.99 },
        { ...sampleTransaction, id: 'txn_3', amount: 234.75 }
      ]

      const patterns = await fraudService.detectPatterns(normalTransactions)
      expect(patterns).not.toContain('high_velocity')
      expect(patterns).not.toContain('amount_clustering')
    })
  })

  describe('AI-Powered Analysis', () => {
    it('should call OpenAI for complex fraud analysis', async () => {
      const mockCompletion = {
        choices: [{
          message: {
            content: JSON.stringify({
              riskScore: 75,
              fraudIndicators: ['unusual_amount', 'off_hours'],
              confidence: 0.85,
              explanation: 'High amount transaction during off-business hours'
            })
          }
        }]
      }

      mockOpenAI().chat.completions.create.mockResolvedValue(mockCompletion)

      const analysis = await fraudService.analyzeWithAI(sampleTransaction, ['high_velocity'])

      expect(mockOpenAI().chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('fraud detection expert')
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('analyze this transaction')
          })
        ]),
        temperature: 0.1,
        max_tokens: 1000
      })

      expect(analysis.riskScore).toBe(75)
      expect(analysis.fraudIndicators).toEqual(['unusual_amount', 'off_hours'])
      expect(analysis.confidence).toBe(0.85)
    })

    it('should handle OpenAI API errors gracefully', async () => {
      mockOpenAI().chat.completions.create.mockRejectedValue(new Error('API Error'))

      const analysis = await fraudService.analyzeWithAI(sampleTransaction, [])

      expect(analysis.riskScore).toBeGreaterThanOrEqual(0)
      expect(analysis.fraudIndicators).toEqual([])
      expect(analysis.confidence).toBeLessThan(0.5)
    })

    it('should parse AI response correctly', async () => {
      const mockCompletion = {
        choices: [{
          message: {
            content: JSON.stringify({
              riskScore: 25,
              fraudIndicators: [],
              confidence: 0.95,
              explanation: 'Normal transaction pattern'
            })
          }
        }]
      }

      mockOpenAI().chat.completions.create.mockResolvedValue(mockCompletion)

      const analysis = await fraudService.analyzeWithAI(sampleTransaction, [])

      expect(analysis.riskScore).toBe(25)
      expect(analysis.fraudIndicators).toEqual([])
      expect(analysis.confidence).toBe(0.95)
      expect(analysis.explanation).toBe('Normal transaction pattern')
    })
  })

  describe('Comprehensive Fraud Assessment', () => {
    beforeEach(() => {
      // Mock database responses
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: null
      })
      mockSupabaseClient.then.mockResolvedValue({
        data: [],
        error: null
      })
    })

    it('should generate complete fraud assessment', async () => {
      const mockAIResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              riskScore: 45,
              fraudIndicators: ['moderate_amount'],
              confidence: 0.75,
              explanation: 'Moderate risk transaction'
            })
          }
        }]
      }

      mockOpenAI().chat.completions.create.mockResolvedValue(mockAIResponse)

      const assessment = await fraudService.assessTransaction(sampleTransaction)

      expect(assessment).toMatchObject({
        transaction_id: sampleTransaction.id,
        risk_score: expect.any(Number),
        fraud_indicators: expect.any(Array),
        ai_analysis: expect.any(Object),
        confidence_score: expect.any(Number),
        recommendation: expect.any(String),
        patterns_detected: expect.any(Array),
        created_at: expect.any(String)
      })

      expect(assessment.risk_score).toBeGreaterThanOrEqual(0)
      expect(assessment.risk_score).toBeLessThanOrEqual(100)
      expect(['approve', 'review', 'reject']).toContain(assessment.recommendation)
    })

    it('should recommend approval for low-risk transactions', async () => {
      const mockLowRiskResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              riskScore: 15,
              fraudIndicators: [],
              confidence: 0.9,
              explanation: 'Low risk transaction'
            })
          }
        }]
      }

      mockOpenAI().chat.completions.create.mockResolvedValue(mockLowRiskResponse)

      const assessment = await fraudService.assessTransaction(sampleTransaction)
      expect(assessment.recommendation).toBe('approve')
    })

    it('should recommend rejection for high-risk transactions', async () => {
      const mockHighRiskResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              riskScore: 85,
              fraudIndicators: ['unusual_amount', 'velocity_pattern', 'off_hours'],
              confidence: 0.9,
              explanation: 'High risk fraud indicators detected'
            })
          }
        }]
      }

      mockOpenAI().chat.completions.create.mockResolvedValue(mockHighRiskResponse)

      const highRiskTransaction = {
        ...sampleTransaction,
        amount: 45000.00,
        timestamp: '2023-12-15T03:15:00Z'
      }

      const assessment = await fraudService.assessTransaction(highRiskTransaction)
      expect(assessment.recommendation).toBe('reject')
    })

    it('should recommend review for moderate-risk transactions', async () => {
      const mockModerateRiskResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              riskScore: 55,
              fraudIndicators: ['moderate_amount'],
              confidence: 0.7,
              explanation: 'Moderate risk requires human review'
            })
          }
        }]
      }

      mockOpenAI().chat.completions.create.mockResolvedValue(mockModerateRiskResponse)

      const assessment = await fraudService.assessTransaction(sampleTransaction)
      expect(assessment.recommendation).toBe('review')
    })
  })

  describe('Risk Score Calculation Edge Cases', () => {
    it('should handle zero amount transactions', async () => {
      const zeroAmountTransaction = {
        ...sampleTransaction,
        amount: 0
      }

      const riskScore = await fraudService.calculateRiskScore(zeroAmountTransaction)
      expect(riskScore).toBeGreaterThan(80) // Very high risk for zero amount
    })

    it('should handle negative amounts', async () => {
      const negativeAmountTransaction = {
        ...sampleTransaction,
        amount: -100
      }

      const riskScore = await fraudService.calculateRiskScore(negativeAmountTransaction)
      expect(riskScore).toBe(100) // Maximum risk for negative amount
    })

    it('should handle future timestamps', async () => {
      const futureTransaction = {
        ...sampleTransaction,
        timestamp: new Date(Date.now() + 86400000).toISOString() // Tomorrow
      }

      const riskScore = await fraudService.calculateRiskScore(futureTransaction)
      expect(riskScore).toBeGreaterThan(90) // Very high risk for future timestamp
    })

    it('should handle very old timestamps', async () => {
      const oldTransaction = {
        ...sampleTransaction,
        timestamp: '2020-01-01T12:00:00Z' // Very old
      }

      const riskScore = await fraudService.calculateRiskScore(oldTransaction)
      expect(riskScore).toBeGreaterThan(60) // High risk for very old transaction
    })
  })

  describe('Fraud Pattern Persistence', () => {
    it('should save fraud patterns to database', async () => {
      const patterns = ['high_velocity', 'amount_clustering']

      mockSupabaseClient.insert.mockResolvedValue({
        data: { id: 'pattern_001' },
        error: null
      })

      await fraudService.saveFraudPatterns('batch_001', patterns)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('fraud_patterns')
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        batch_id: 'batch_001',
        patterns_detected: patterns,
        detected_at: expect.any(String),
        confidence_score: expect.any(Number)
      })
    })

    it('should retrieve historical fraud patterns', async () => {
      const mockPatterns = [
        { id: 'pattern_001', patterns_detected: ['high_velocity'] },
        { id: 'pattern_002', patterns_detected: ['amount_clustering'] }
      ]

      mockSupabaseClient.then.mockResolvedValue({
        data: mockPatterns,
        error: null
      })

      const patterns = await fraudService.getHistoricalPatterns('business_001')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('fraud_patterns')
      expect(patterns).toEqual(mockPatterns)
    })
  })

  describe('Performance and Optimization', () => {
    it('should process large transaction sets efficiently', async () => {
      const largeTransactionSet = Array.from({ length: 1000 }, (_, i) => ({
        ...sampleTransaction,
        id: `txn_${i}`,
        amount: Math.random() * 10000
      }))

      const startTime = Date.now()
      const patterns = await fraudService.detectPatterns(largeTransactionSet)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
      expect(Array.isArray(patterns)).toBe(true)
    })

    it('should cache AI analysis results', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              riskScore: 30,
              fraudIndicators: [],
              confidence: 0.8
            })
          }
        }]
      }

      mockOpenAI().chat.completions.create.mockResolvedValue(mockResponse)

      // First call
      await fraudService.analyzeWithAI(sampleTransaction, [])

      // Second call with same transaction
      await fraudService.analyzeWithAI(sampleTransaction, [])

      // Should only call OpenAI once due to caching
      expect(mockOpenAI().chat.completions.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('Configuration and Thresholds', () => {
    it('should use configurable risk thresholds', () => {
      const thresholds = fraudService.getRiskThresholds()

      expect(thresholds).toHaveProperty('low_risk_max')
      expect(thresholds).toHaveProperty('high_risk_min')
      expect(thresholds.low_risk_max).toBeLessThan(thresholds.high_risk_min)
    })

    it('should allow threshold customization', () => {
      const customThresholds = {
        low_risk_max: 20,
        high_risk_min: 80,
        amount_threshold: 5000,
        velocity_threshold: 5
      }

      fraudService.updateThresholds(customThresholds)
      const updatedThresholds = fraudService.getRiskThresholds()

      expect(updatedThresholds.low_risk_max).toBe(20)
      expect(updatedThresholds.high_risk_min).toBe(80)
    })
  })
})