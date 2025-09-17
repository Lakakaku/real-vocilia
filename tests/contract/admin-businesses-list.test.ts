/**
 * Contract Test: GET /api/admin/businesses
 *
 * Tests the admin API endpoint that returns paginated list of
 * all businesses with basic verification statistics.
 *
 * This test MUST FAIL initially (TDD approach) until the endpoint is implemented.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest } from 'next/server'
import { GET } from '../../app/api/admin/businesses/route'

// Mock data for testing
const mockAdminUserId = 'admin_123456789'
const mockBusinesses = [
  {
    id: 'bus_001',
    name: 'Test Restaurant AB',
    email: 'test@restaurant.se',
    phone_number: '+46701234567',
    address: 'Testgatan 123, Stockholm',
    org_number: '556789-1234',
    subscription_plan: 'premium',
    status: 'active',
    business_category: 'restaurant',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-08T00:00:00Z',
    verification_statistics: {
      total_batches: 5,
      pending_batches: 1,
      overdue_batches: 0,
      current_pending_amount: 15000.00,
      approval_rate: 85.5,
      last_verification_date: '2024-01-08T00:00:00Z',
    },
  },
  {
    id: 'bus_002',
    name: 'Coffee Shop Ltd',
    email: 'info@coffeeshop.se',
    phone_number: '+46701234568',
    address: 'Kaffegatan 456, Göteborg',
    org_number: '556789-5678',
    subscription_plan: 'basic',
    status: 'active',
    business_category: 'cafe',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-07T00:00:00Z',
    verification_statistics: {
      total_batches: 3,
      pending_batches: 0,
      overdue_batches: 1,
      current_pending_amount: 0,
      approval_rate: 92.0,
      last_verification_date: '2024-01-07T00:00:00Z',
    },
  },
  {
    id: 'bus_003',
    name: 'Retail Store Inc',
    email: 'admin@retailstore.se',
    phone_number: '+46701234569',
    address: 'Handelsgatan 789, Malmö',
    org_number: '556789-9012',
    subscription_plan: 'enterprise',
    status: 'suspended',
    business_category: 'retail',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-06T00:00:00Z',
    verification_statistics: {
      total_batches: 0,
      pending_batches: 0,
      overdue_batches: 0,
      current_pending_amount: 0,
      approval_rate: 0,
      last_verification_date: null,
    },
  },
]

describe('GET /api/admin/businesses', () => {
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
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockBusinesses,
        error: null,
        count: 3,
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

    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses')
    const response = await GET(mockRequest)
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

    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses')
    const response = await GET(mockRequest)
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

  it('should return paginated list of businesses with default pagination', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      success: true,
      data: {
        businesses: mockBusinesses.map(business => ({
          id: business.id,
          name: business.name,
          email: business.email,
          phone_number: business.phone_number,
          address: business.address,
          org_number: business.org_number,
          subscription_plan: business.subscription_plan,
          status: business.status,
          business_category: business.business_category,
          created_at: business.created_at,
          updated_at: business.updated_at,
          verification_summary: {
            total_batches: business.verification_statistics.total_batches,
            pending_batches: business.verification_statistics.pending_batches,
            overdue_batches: business.verification_statistics.overdue_batches,
            current_pending_amount: business.verification_statistics.current_pending_amount,
            approval_rate_percentage: business.verification_statistics.approval_rate,
            last_verification_date: business.verification_statistics.last_verification_date,
            status_indicator: expect.any(String),
          },
        })),
        pagination: {
          page: 1,
          limit: 50,
          total: 3,
          pages: 1,
          has_next: false,
          has_prev: false,
        },
        summary: {
          total_businesses: 3,
          active_businesses: 2,
          suspended_businesses: 1,
          businesses_with_pending_batches: 1,
          businesses_with_overdue_batches: 1,
          total_pending_amount: 15000.00,
        },
      },
    })

    // Verify correct database queries
    expect(mockSupabaseClient.select).toHaveBeenCalledWith(`
      id,
      name,
      email,
      phone_number,
      address,
      org_number,
      subscription_plan,
      status,
      business_category,
      created_at,
      updated_at
    `)
    expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(mockSupabaseClient.range).toHaveBeenCalledWith(0, 49)
  })

  it('should handle custom pagination parameters', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses?page=2&limit=10')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 3,
      pages: 1,
      has_next: false,
      has_prev: true,
    })

    expect(mockSupabaseClient.range).toHaveBeenCalledWith(10, 19) // offset 10, limit 10
  })

  it('should filter by business status', async () => {
    mockSupabaseClient.range.mockResolvedValue({
      data: [mockBusinesses[0], mockBusinesses[1]], // Only active businesses
      error: null,
      count: 2,
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses?status=active')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.businesses).toHaveLength(2)
    expect(data.data.businesses.every(b => b.status === 'active')).toBe(true)
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'active')
  })

  it('should filter by subscription plan', async () => {
    mockSupabaseClient.range.mockResolvedValue({
      data: [mockBusinesses[0]], // Only premium businesses
      error: null,
      count: 1,
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses?subscription_plan=premium')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.businesses).toHaveLength(1)
    expect(data.data.businesses[0].subscription_plan).toBe('premium')
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('subscription_plan', 'premium')
  })

  it('should filter by business category', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses?category=restaurant')
    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('business_category', 'restaurant')
  })

  it('should search by business name or email', async () => {
    mockSupabaseClient.range.mockResolvedValue({
      data: [mockBusinesses[0]],
      error: null,
      count: 1,
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses?search=Restaurant')
    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    // Verify that search filtering was applied
    expect(mockSupabaseClient.ilike).toHaveBeenCalled()
  })

  it('should filter businesses with pending batches', async () => {
    mockSupabaseClient.range.mockResolvedValue({
      data: [mockBusinesses[0]], // Only business with pending batches
      error: null,
      count: 1,
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses?has_pending=true')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.businesses).toHaveLength(1)
    expect(data.data.businesses[0].verification_summary.pending_batches).toBeGreaterThan(0)
  })

  it('should filter businesses with overdue batches', async () => {
    mockSupabaseClient.range.mockResolvedValue({
      data: [mockBusinesses[1]], // Only business with overdue batches
      error: null,
      count: 1,
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses?has_overdue=true')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.businesses).toHaveLength(1)
    expect(data.data.businesses[0].verification_summary.overdue_batches).toBeGreaterThan(0)
  })

  it('should sort businesses by multiple criteria', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses?sort_by=name&sort_order=asc')
    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    expect(mockSupabaseClient.order).toHaveBeenCalledWith('name', { ascending: true })
  })

  it('should calculate status indicators correctly', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)

    // Business with pending batches should have 'pending' indicator
    const businessWithPending = data.data.businesses.find(b => b.verification_summary.pending_batches > 0)
    expect(businessWithPending.verification_summary.status_indicator).toBe('pending')

    // Business with overdue batches should have 'overdue' indicator
    const businessWithOverdue = data.data.businesses.find(b => b.verification_summary.overdue_batches > 0)
    expect(businessWithOverdue.verification_summary.status_indicator).toBe('overdue')

    // Business with no activity should have 'inactive' indicator
    const inactiveBusiness = data.data.businesses.find(b => b.verification_summary.total_batches === 0)
    expect(inactiveBusiness.verification_summary.status_indicator).toBe('inactive')
  })

  it('should include summary statistics', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.summary).toEqual({
      total_businesses: 3,
      active_businesses: 2,
      suspended_businesses: 1,
      businesses_with_pending_batches: 1,
      businesses_with_overdue_batches: 1,
      total_pending_amount: 15000.00,
    })
  })

  it('should validate pagination parameters', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses?page=0')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_PAGINATION',
        message: 'Page number must be greater than 0',
      },
    })
  })

  it('should validate limit parameters', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses?limit=101')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'INVALID_PAGINATION',
        message: 'Limit must be between 1 and 100',
      },
    })
  })

  it('should handle empty result set', async () => {
    mockSupabaseClient.range.mockResolvedValue({
      data: [],
      error: null,
      count: 0,
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.businesses).toEqual([])
    expect(data.data.pagination.total).toBe(0)
    expect(data.data.summary.total_businesses).toBe(0)
  })

  it('should handle database errors gracefully', async () => {
    mockSupabaseClient.range.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    })

    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch businesses',
      },
    })
  })

  it('should validate filter parameters', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses?status=invalid_status')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('INVALID_FILTER')
    expect(data.error.message).toContain('Invalid status filter')
  })

  it('should support multiple status filters', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses?status=active,pending')
    const response = await GET(mockRequest)

    expect(response.status).toBe(200)
    // Verify that multiple status filtering was applied
    expect(mockSupabaseClient.in).toHaveBeenCalledWith('status', ['active', 'pending'])
  })

  it('should include verification statistics for each business', async () => {
    mockRequest = new NextRequest('http://localhost:3000/api/admin/businesses')
    const response = await GET(mockRequest)
    const data = await response.json()

    expect(response.status).toBe(200)

    // Verify verification summary is included for each business
    data.data.businesses.forEach(business => {
      expect(business.verification_summary).toBeDefined()
      expect(business.verification_summary).toHaveProperty('total_batches')
      expect(business.verification_summary).toHaveProperty('pending_batches')
      expect(business.verification_summary).toHaveProperty('overdue_batches')
      expect(business.verification_summary).toHaveProperty('current_pending_amount')
      expect(business.verification_summary).toHaveProperty('approval_rate_percentage')
      expect(business.verification_summary).toHaveProperty('status_indicator')
    })
  })
})