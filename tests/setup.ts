/**
 * Test Setup Configuration
 *
 * Global setup for Vitest tests including mocks, utilities, and shared configuration.
 */

import { vi } from 'vitest'

// Mock Supabase Auth Helpers
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(),
  createServerComponentClient: vi.fn(),
  createBrowserSupabaseClient: vi.fn(),
}))

// Mock Next.js Router
vi.mock('next/router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  })),
}))

// Mock Next.js Navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  })),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
}))

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  risk_score: 25,
                  risk_level: 'low',
                  confidence: 0.92,
                  recommendation: 'approve',
                  reasoning: ['Normal transaction pattern'],
                }),
              },
            },
          ],
        }),
      },
    },
  })),
}))

// Mock File and Blob APIs for browser environment
global.File = class File extends Blob {
  constructor(chunks: BlobPart[], filename: string, options?: FilePropertyBag) {
    super(chunks, options)
    this.name = filename
    this.lastModified = Date.now()
  }
  name: string
  lastModified: number
} as any

global.FormData = class FormData {
  private data = new Map<string, any>()

  append(name: string, value: any) {
    this.data.set(name, value)
  }

  get(name: string) {
    return this.data.get(name)
  }

  has(name: string) {
    return this.data.has(name)
  }

  delete(name: string) {
    this.data.delete(name)
  }

  entries() {
    return this.data.entries()
  }
} as any

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    getRandomValues: (arr: any) => arr.map(() => Math.floor(Math.random() * 256)),
  },
  writable: true,
})

// Mock fetch for file operations
global.fetch = vi.fn()

// Set system time for consistent testing
vi.setSystemTime(new Date('2024-01-08T12:00:00Z'))

// Shared test utilities
export const testUtils = {
  createMockRequest: (url: string, options: RequestInit = {}) => {
    return new Request(url, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        ...options.headers,
      },
      ...options,
    })
  },

  createMockFormData: (files: Record<string, File>) => {
    const formData = new FormData()
    Object.entries(files).forEach(([key, file]) => {
      formData.append(key, file)
    })
    return formData
  },

  createMockCSVFile: (content: string, filename = 'test.csv') => {
    return new File([content], filename, { type: 'text/csv' })
  },

  createMockSupabaseClient: (overrides: any = {}) => {
    const defaultClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      containedBy: vi.fn().mockReturnThis(),
      rangeGt: vi.fn().mockReturnThis(),
      rangeGte: vi.fn().mockReturnThis(),
      rangeLt: vi.fn().mockReturnThis(),
      rangeLte: vi.fn().mockReturnThis(),
      rangeAdjacent: vi.fn().mockReturnThis(),
      overlaps: vi.fn().mockReturnThis(),
      textSearch: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      abortSignal: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      csv: vi.fn().mockResolvedValue({ data: '', error: null }),
      explain: vi.fn().mockReturnThis(),
      rollback: vi.fn().mockReturnThis(),
      returns: vi.fn().mockReturnThis(),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      storage: {
        from: vi.fn().mockReturnThis(),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(['test']), error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
        move: vi.fn().mockResolvedValue({ data: [], error: null }),
        copy: vi.fn().mockResolvedValue({ data: [], error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://test-url.com' },
          error: null
        }),
        createSignedUrls: vi.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://test-url.com' }
        }),
      },
    }

    return { ...defaultClient, ...overrides }
  },

  mockDateTime: (date: string) => {
    vi.setSystemTime(new Date(date))
  },

  resetDateTime: () => {
    vi.setSystemTime(new Date('2024-01-08T12:00:00Z'))
  },
}

// Export common mock data
export const mockData = {
  businessId: 'b1e8f9a0-1234-5678-9abc-123456789abc',
  adminUserId: 'admin_123456789',

  paymentBatch: {
    id: 'pb_123456789',
    business_id: 'b1e8f9a0-1234-5678-9abc-123456789abc',
    week_number: 2,
    year_number: 2024,
    total_transactions: 150,
    total_amount: 15000.00,
    status: 'pending',
    deadline: '2024-01-15T23:59:59Z',
    created_at: '2024-01-08T00:00:00Z',
  },

  verificationSession: {
    id: 'vs_123456789',
    payment_batch_id: 'pb_123456789',
    business_id: 'b1e8f9a0-1234-5678-9abc-123456789abc',
    status: 'not_started',
    deadline: '2024-01-15T23:59:59Z',
    total_transactions: 150,
    verified_transactions: 0,
    approved_count: 0,
    rejected_count: 0,
    created_at: '2024-01-08T00:00:00Z',
  },

  verificationResult: {
    id: 'vr_123456789',
    verification_session_id: 'vs_123456789',
    transaction_id: 'VCL-001',
    transaction_date: '2024-01-08T14:30:00Z',
    amount_sek: 250.00,
    phone_last4: '**34',
    store_code: 'ABC123',
    quality_score: 85,
    reward_percentage: 5,
    reward_amount_sek: 12.50,
    verified: null,
    verification_decision: null,
    rejection_reason: null,
    business_notes: null,
    created_at: '2024-01-08T00:00:00Z',
  },

  fraudAssessment: {
    id: 'fa_123456789',
    transaction_id: 'VCL-001',
    business_id: 'b1e8f9a0-1234-5678-9abc-123456789abc',
    risk_score: 25,
    risk_level: 'low',
    confidence: 0.92,
    recommendation: 'approve',
    reasoning: ['Normal transaction pattern', 'Customer has good history'],
    risk_factors: {
      amount_anomaly: { score: 10, description: 'Normal amount' },
      time_pattern: { score: 15, description: 'Regular business hours' },
    },
    assessed_at: '2024-01-08T14:30:00Z',
    created_at: '2024-01-08T14:30:00Z',
  },

  csvContent: {
    valid: `transaction_id,customer_feedback_id,transaction_date,amount_sek,phone_last4,store_code,quality_score,reward_percentage,reward_amount_sek
VCL-001,fb_001,2024-01-08T14:30:00Z,250.00,**34,ABC123,85,5,12.50
VCL-002,fb_002,2024-01-08T15:45:00Z,150.00,**67,ABC123,92,6,9.00`,

    verificationResults: `transaction_id,verified,verification_decision,rejection_reason,business_notes
VCL-001,true,approved,,Verified transaction
VCL-002,false,rejected,amount_mismatch,Amount does not match POS`,

    invalid: `invalid,csv,format
missing,required,columns`,
  },
}

// Console suppression for cleaner test output
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeEach(() => {
  // Suppress expected console errors in tests
  console.error = vi.fn()
  console.warn = vi.fn()
})

afterEach(() => {
  // Restore console functions
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})