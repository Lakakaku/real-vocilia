export interface Store {
  id: string
  business_id: string
  name: string
  store_code: string
  location_address?: string
  location_city?: string
  location_region?: string
  location_postal?: string
  location_lat?: number
  location_lng?: number
  qr_code_url?: string
  is_active: boolean
  operating_hours?: Record<string, any>
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  // New enhanced fields
  previous_store_codes?: PreviousStoreCode[]
  code_rotated_at?: string
  location_validated?: boolean
}

export interface PreviousStoreCode {
  code: string
  rotated_at: string
}

export interface CreateStoreData {
  name: string
  location_address?: string
  location_city?: string
  location_region?: string
  location_postal?: string
  location_lat?: number
  location_lng?: number
  operating_hours?: Record<string, any>
  metadata?: Record<string, any>
}

export interface FeedbackRateLimit {
  id: string
  phone_number: string
  store_id: string
  feedback_date: string
  feedback_count: number
  created_at: string
  updated_at: string
}

export interface StoreCodeLookupResult {
  store_id: string
  business_id: string
  name: string
  current_code: string
  is_current_code: boolean
  is_active: boolean
}

export interface LocationValidationResult {
  isValid: boolean
  message: string
  normalizedAddress?: string
  coordinates?: {
    lat: number
    lng: number
  }
}

export interface RateLimitCheckResult {
  allowed: boolean
  current_count: number
  max_per_day: number
  resets_at: string
}

export interface StoreWithStats extends Store {
  feedback_count: number
  avg_quality_score?: number
  last_feedback_at?: string
  rate_limit_violations_today: number
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface StoreCreationResponse {
  store: Store
  store_code: string
  qr_code_url?: string
}

export interface CodeRotationResponse {
  old_code: string
  new_code: string
  rotated_at: string
}

// Validation types
export interface StoreValidationError {
  field: string
  message: string
}

export interface StoreValidationResult {
  isValid: boolean
  errors: StoreValidationError[]
}

// Search and filter types
export interface StoreFilterOptions {
  is_active?: boolean
  location_city?: string
  location_region?: string
  location_validated?: boolean
  created_after?: string
  created_before?: string
}

export interface StoreSortOptions {
  field: 'name' | 'created_at' | 'updated_at' | 'feedback_count' | 'avg_quality_score'
  direction: 'asc' | 'desc'
}

// Constants
export const STORE_CODE_LENGTH = 6
export const MAX_FEEDBACK_PER_DAY = 5
export const STORE_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

// Error types
export class StoreError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'StoreError'
  }
}

export class RateLimitError extends StoreError {
  constructor(message: string, public retryAfter?: Date) {
    super(message, 'RATE_LIMIT_EXCEEDED')
    this.name = 'RateLimitError'
  }
}

export class ValidationError extends StoreError {
  constructor(
    message: string,
    public validationErrors: StoreValidationError[]
  ) {
    super(message, 'VALIDATION_FAILED', { validationErrors })
    this.name = 'ValidationError'
  }
}

// Helper type guards
export function isStore(obj: any): obj is Store {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.business_id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.store_code === 'string' &&
    typeof obj.is_active === 'boolean'
  )
}

export function isStoreCodeLookupResult(obj: any): obj is StoreCodeLookupResult {
  return (
    obj &&
    typeof obj.store_id === 'string' &&
    typeof obj.business_id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.current_code === 'string' &&
    typeof obj.is_current_code === 'boolean' &&
    typeof obj.is_active === 'boolean'
  )
}