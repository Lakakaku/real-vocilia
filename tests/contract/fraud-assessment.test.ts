/**
 * Contract Test: POST /api/fraud/assess
 *
 * Tests the fraud assessment API endpoint that analyzes transaction
 * data using AI to determine risk scores and recommendations.
 *
 * This test MUST FAIL initially (TDD approach) until the endpoint is implemented.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest } from 'next/server'
import { POST } from '../../app/api/fraud/assess/route'

// Mock data for testing
const mockBusinessUserId = 'user_123456789'
const mockBusinessId = 'bus_123456789'
const mockTransactionData = {
  transaction_id: 'VCL-001',
  amount_sek: 250.00,
  transaction_date: '2024-01-08T14:30:00Z',
  phone_last4: '**34',
  store_code: 'ABC123',
  customer_feedback_quality_score: 85,
  historical_data: {
    customer_transaction_count: 15,
    average_transaction_amount: 220.00,
    last_transaction_date: '2024-01-01T12:00:00Z',
    has_previous_issues: false,
  },
  contextual_data: {
    time_of_day: '14:30',
    day_of_week: 'monday',
    location_consistency: true,
    amount_pattern_match: true,
  },
}

const mockFraudAssessment = {
  id: 'fa_123456789',
  transaction_id: 'VCL-001',
  business_id: mockBusinessId,
  risk_score: 25,
  risk_level: 'low',
  confidence: 0.92,
  recommendation: 'approve',
  reasoning: [
    'Transaction amount within normal range',
    'Customer has good transaction history',
    'Time and location patterns are consistent',
  ],
  risk_factors: {
    amount_anomaly: {
      score: 10,
      description: 'Amount is 13.6% above customer average but within acceptable range',
    },
    time_pattern: {
      score: 5,
      description: 'Transaction during regular business hours',
    },
    frequency_pattern: {
      score: 10,
      description: 'Normal transaction frequency for customer',
    },
  },
  assessed_at: '2024-01-08T14:30:00Z',
  created_at: '2024-01-08T14:30:00Z',
}

describe('POST /api/fraud/assess', () => {
  let mockRequest: NextRequest
  let mockSupabaseClient: any

  beforeEach(() => {
    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockBusinessUserId } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: mockBusinessId },
        error: null,
      }),
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }

    // Mock OpenAI response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [
          {
            message: {
              content: JSON.stringify({
                risk_score: 25,
                risk_level: 'low',
                confidence: 0.92,
                recommendation: 'approve',
                reasoning: mockFraudAssessment.reasoning,
                risk_factors: mockFraudAssessment.risk_factors,
              }),
            },
          },
        ],
      }),
    })

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

    mockRequest = new NextRequest('http://localhost:3000/api/fraud/assess', {
      method: 'POST',
      body: JSON.stringify(mockTransactionData),
      headers: { 'content-type': 'application/json' },
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

  it('should return 403 when user is not authorized for business', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'The result contains 0 rows' },
    })

    mockRequest = new NextRequest('http://localhost:3000/api/fraud/assess', {
      method: 'POST',
      body: JSON.stringify(mockTransactionData),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Not authorized to assess transactions for this business',
      },
    })
  })

  it('should successfully assess transaction and return fraud analysis', async () => {
    // Mock successful fraud assessment insertion
    mockSupabaseClient.insert.mockResolvedValue({
      data: [mockFraudAssessment],
      error: null,
    })

    mockRequest = new NextRequest('http://localhost:3000/api/fraud/assess', {
      method: 'POST',
      body: JSON.stringify(mockTransactionData),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      data: {
        assessment_id: mockFraudAssessment.id,
        transaction_id: mockTransactionData.transaction_id,
        risk_score: 25,
        risk_level: 'low',
        confidence: 0.92,
        recommendation: 'approve',
        reasoning: mockFraudAssessment.reasoning,
        risk_factors: mockFraudAssessment.risk_factors,
        assessed_at: mockFraudAssessment.assessed_at,
        processing_time_ms: expect.any(Number),
      },
    })

    // Verify OpenAI API was called
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': expect.stringContaining('Bearer'),
          'Content-Type': 'application/json',
        }),
        body: expect.stringContaining('gpt-4o-mini'),
      })
    )

    // Verify fraud assessment was stored
    expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
      transaction_id: mockTransactionData.transaction_id,
      business_id: mockBusinessId,
      risk_score: 25,
      risk_level: 'low',
      confidence: 0.92,
      recommendation: 'approve',
      reasoning: mockFraudAssessment.reasoning,
      risk_factors: mockFraudAssessment.risk_factors,
      assessed_at: expect.any(String),
    })
  })

  it('should handle high-risk transaction assessment', async () => {
    const highRiskAssessment = {
      risk_score: 85,
      risk_level: 'high',
      confidence: 0.89,
      recommendation: 'reject',
      reasoning: [
        'Amount significantly above customer average',
        'Unusual transaction time pattern',
        'Multiple transactions in short timeframe',
      ],
      risk_factors: {
        amount_anomaly: {
          score: 45,
          description: 'Amount is 300% above customer average',
        },
        time_pattern: {
          score: 25,
          description: 'Transaction outside normal business hours',
        },
        frequency_pattern: {
          score: 15,
          description: 'Multiple transactions detected within 1 hour',
        },
      },
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [
          {
            message: {
              content: JSON.stringify(highRiskAssessment),
            },
          },
        ],
      }),
    })

    mockSupabaseClient.insert.mockResolvedValue({
      data: [{
        ...mockFraudAssessment,
        ...highRiskAssessment,
      }],
      error: null,
    })

    const highRiskTransaction = {
      ...mockTransactionData,
      amount_sek: 750.00, // Much higher than average
      transaction_date: '2024-01-08T02:30:00Z', // Very early morning
    }

    mockRequest = new NextRequest('http://localhost:3000/api/fraud/assess', {
      method: 'POST',
      body: JSON.stringify(highRiskTransaction),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.risk_level).toBe('high')
    expect(data.data.recommendation).toBe('reject')
    expect(data.data.risk_score).toBe(85)
  })

  it('should validate required transaction data', async () => {
    const invalidTransactionData = {
      transaction_id: 'VCL-001',
      // Missing required fields
    }

    mockRequest = new NextRequest('http://localhost:3000/api/fraud/assess', {
      method: 'POST',
      body: JSON.stringify(invalidTransactionData),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_TRANSACTION_DATA',
        message: 'Required transaction data missing',
        details: expect.any(Array),
      },
    })
  })

  it('should validate transaction ID format', async () => {
    const invalidData = {
      ...mockTransactionData,
      transaction_id: 'invalid-format',
    }

    mockRequest = new NextRequest('http://localhost:3000/api/fraud/assess', {
      method: 'POST',
      body: JSON.stringify(invalidData),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_TRANSACTION_ID',
        message: 'Transaction ID must follow VCL-XXX format',
      },
    })
  })

  it('should validate amount is positive', async () => {
    const invalidData = {
      ...mockTransactionData,
      amount_sek: -100.00,
    }

    mockRequest = new NextRequest('http://localhost:3000/api/fraud/assess', {
      method: 'POST',
      body: JSON.stringify(invalidData),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_AMOUNT',
        message: 'Transaction amount must be positive',
      },
    })
  })

  it('should handle OpenAI API errors gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({
        error: { message: 'Rate limit exceeded' },
      }),
    })

    mockRequest = new NextRequest('http://localhost:3000/api/fraud/assess', {
      method: 'POST',
      body: JSON.stringify(mockTransactionData),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'AI_SERVICE_ERROR',
        message: 'Fraud assessment service temporarily unavailable',
      },
    })
  })

  it('should handle invalid OpenAI response format', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [
          {
            message: {
              content: 'invalid json response',
            },
          },
        ],
      }),
    })

    mockRequest = new NextRequest('http://localhost:3000/api/fraud/assess', {
      method: 'POST',
      body: JSON.stringify(mockTransactionData),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'ASSESSMENT_PARSING_ERROR',
        message: 'Failed to parse fraud assessment response',
      },
    })
  })

  it('should handle database storage errors', async () => {
    mockSupabaseClient.insert.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    })

    mockRequest = new NextRequest('http://localhost:3000/api/fraud/assess', {
      method: 'POST',
      body: JSON.stringify(mockTransactionData),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to store fraud assessment',
      },
    })
  })

  it('should include processing time in response', async () => {
    mockSupabaseClient.insert.mockResolvedValue({
      data: [mockFraudAssessment],
      error: null,
    })

    const startTime = Date.now()

    mockRequest = new NextRequest('http://localhost:3000/api/fraud/assess', {
      method: 'POST',
      body: JSON.stringify(mockTransactionData),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.processing_time_ms).toBeGreaterThan(0)
    expect(data.data.processing_time_ms).toBeLessThan(5000) // Should be fast
  })

  it('should handle duplicate transaction assessment', async () => {
    // Mock existing assessment check
    mockSupabaseClient.rpc.mockResolvedValue({
      data: [{ assessment_id: 'fa_existing' }],
      error: null,
    })

    mockRequest = new NextRequest('http://localhost:3000/api/fraud/assess', {
      method: 'POST',
      body: JSON.stringify(mockTransactionData),
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'ASSESSMENT_EXISTS',
        message: 'Fraud assessment already exists for this transaction',
        existing_assessment_id: 'fa_existing',
      },
    })
  })

  it('should include contextual data in AI prompt', async () => {
    mockSupabaseClient.insert.mockResolvedValue({
      data: [mockFraudAssessment],
      error: null,
    })

    mockRequest = new NextRequest('http://localhost:3000/api/fraud/assess', {
      method: 'POST',
      body: JSON.stringify(mockTransactionData),
      headers: { 'content-type': 'application/json' },
    })

    await POST(mockRequest)

    // Verify that the OpenAI request includes contextual data
    const fetchCall = vi.mocked(global.fetch).mock.calls[0]
    const requestBody = JSON.parse(fetchCall[1].body as string)
    const prompt = requestBody.messages[0].content

    expect(prompt).toContain('customer_transaction_count')
    expect(prompt).toContain('time_of_day')
    expect(prompt).toContain('location_consistency')
    expect(prompt).toContain('amount_pattern_match')
  })
})