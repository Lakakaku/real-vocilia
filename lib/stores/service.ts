import { createClient } from '@/lib/supabase/server'
import type { 
  Store, 
  CreateStoreData, 
  StoreCodeLookupResult,
  LocationValidationResult,
  RateLimitCheckResult,
  StoreWithStats,
  StoreFilterOptions,
  StoreSortOptions,
  StoreValidationError,
  StoreValidationResult,
  CodeRotationResponse,
  StoreCreationResponse,
  ApiResponse
} from './types'
import { StoreError, RateLimitError, ValidationError, STORE_CODE_LENGTH, MAX_FEEDBACK_PER_DAY } from './types'

/**
 * Create a new store with generated store code
 */
export async function createStore(
  businessId: string, 
  storeData: CreateStoreData
): Promise<StoreCreationResponse> {
  try {
    const supabase = await createClient()
    
    // Validate input data
    const validation = validateStoreData(storeData)
    if (!validation.isValid) {
      throw new ValidationError('Store data validation failed', validation.errors)
    }

    // Generate unique store code
    const { data: codeData, error: codeError } = await supabase
      .rpc('generate_store_code')
    
    if (codeError) {
      throw new StoreError('Failed to generate store code', 'CODE_GENERATION_FAILED', { error: codeError })
    }

    const storeCode = codeData as string

    // Validate location if postal code provided
    let locationValidated = false
    if (storeData.location_postal) {
      const locationValidation = await validateStoreLocation(storeData.location_postal)
      locationValidated = locationValidation.isValid
    }

    // Create store record
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .insert({
        business_id: businessId,
        name: storeData.name,
        store_code: storeCode,
        location_address: storeData.location_address,
        location_city: storeData.location_city,
        location_region: storeData.location_region,
        location_postal: storeData.location_postal,
        location_lat: storeData.location_lat,
        location_lng: storeData.location_lng,
        operating_hours: storeData.operating_hours,
        metadata: storeData.metadata || {},
        location_validated: locationValidated,
        is_active: true
      })
      .select('*')
      .single()

    if (storeError) {
      throw new StoreError('Failed to create store', 'STORE_CREATION_FAILED', { error: storeError })
    }

    // Generate QR code URL (this would point to vocilia.com/{store_code})
    const qrCodeUrl = `https://vocilia.com/${storeCode}`

    // Update store with QR code URL
    const { error: updateError } = await supabase
      .from('stores')
      .update({ qr_code_url: qrCodeUrl })
      .eq('id', store.id)

    if (updateError) {
      console.warn('Failed to update store with QR code URL:', updateError)
    }

    return {
      store: { ...store, qr_code_url: qrCodeUrl },
      store_code: storeCode,
      qr_code_url: qrCodeUrl
    }
  } catch (error) {
    if (error instanceof StoreError) {
      throw error
    }
    throw new StoreError('Unexpected error creating store', 'UNKNOWN_ERROR', { error })
  }
}

/**
 * Get stores for a business with optional filtering and sorting
 */
export async function getStoresForBusiness(
  businessId: string,
  filters?: StoreFilterOptions,
  sort?: StoreSortOptions
): Promise<StoreWithStats[]> {
  try {
    const supabase = await createClient()
    
    let query = supabase
      .from('stores')
      .select(`
        *,
        feedbacks(count),
        feedbacks!inner(quality_score)
      `)
      .eq('business_id', businessId)

    // Apply filters
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }
    if (filters?.location_city) {
      query = query.eq('location_city', filters.location_city)
    }
    if (filters?.location_region) {
      query = query.eq('location_region', filters.location_region)
    }
    if (filters?.location_validated !== undefined) {
      query = query.eq('location_validated', filters.location_validated)
    }
    if (filters?.created_after) {
      query = query.gte('created_at', filters.created_after)
    }
    if (filters?.created_before) {
      query = query.lte('created_at', filters.created_before)
    }

    // Apply sorting
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data: stores, error } = await query

    if (error) {
      throw new StoreError('Failed to fetch stores', 'FETCH_FAILED', { error })
    }

    // Transform data to include stats
    const storesWithStats: StoreWithStats[] = await Promise.all(
      (stores || []).map(async (store: any) => {
        // Calculate feedback count and average quality score
        const feedbackCount = store.feedbacks?.length || 0
        const qualityScores = store.feedbacks?.map((f: any) => f.quality_score).filter((s: any) => s !== null) || []
        const avgQualityScore = qualityScores.length > 0 
          ? qualityScores.reduce((sum: number, score: number) => sum + score, 0) / qualityScores.length 
          : undefined

        // Get last feedback timestamp
        const { data: lastFeedback } = await supabase
          .from('feedbacks')
          .select('created_at')
          .eq('store_id', store.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Get today's rate limit violations count
        const { data: rateLimitData } = await supabase
          .from('feedback_rate_limits')
          .select('feedback_count')
          .eq('store_id', store.id)
          .eq('feedback_date', new Date().toISOString().split('T')[0])
          .gte('feedback_count', MAX_FEEDBACK_PER_DAY)

        const rateLimitViolations = rateLimitData?.length || 0

        return {
          ...store,
          feedback_count: feedbackCount,
          avg_quality_score: avgQualityScore,
          last_feedback_at: lastFeedback?.created_at,
          rate_limit_violations_today: rateLimitViolations
        }
      })
    )

    return storesWithStats
  } catch (error) {
    if (error instanceof StoreError) {
      throw error
    }
    throw new StoreError('Unexpected error fetching stores', 'UNKNOWN_ERROR', { error })
  }
}

/**
 * Rotate store code and preserve history
 */
export async function rotateStoreCode(storeId: string): Promise<CodeRotationResponse> {
  try {
    const supabase = await createClient()
    
    // Get current store code
    const { data: currentStore, error: fetchError } = await supabase
      .from('stores')
      .select('store_code')
      .eq('id', storeId)
      .single()

    if (fetchError || !currentStore) {
      throw new StoreError('Store not found', 'STORE_NOT_FOUND', { error: fetchError })
    }

    const oldCode = currentStore.store_code

    // Rotate the code using the database function
    const { data: newCode, error: rotateError } = await supabase
      .rpc('rotate_store_code', { store_uuid: storeId })

    if (rotateError) {
      throw new StoreError('Failed to rotate store code', 'CODE_ROTATION_FAILED', { error: rotateError })
    }

    // Update QR code URL
    const newQrCodeUrl = `https://vocilia.com/${newCode}`
    const { error: updateError } = await supabase
      .from('stores')
      .update({ qr_code_url: newQrCodeUrl })
      .eq('id', storeId)

    if (updateError) {
      console.warn('Failed to update QR code URL after rotation:', updateError)
    }

    return {
      old_code: oldCode,
      new_code: newCode as string,
      rotated_at: new Date().toISOString()
    }
  } catch (error) {
    if (error instanceof StoreError) {
      throw error
    }
    throw new StoreError('Unexpected error rotating store code', 'UNKNOWN_ERROR', { error })
  }
}

/**
 * Validate store location (Swedish postal codes)
 */
export async function validateStoreLocation(
  postalCode: string,
  address?: string
): Promise<LocationValidationResult> {
  try {
    const supabase = await createClient()
    
    // Validate postal code format using database function
    const { data: isValidPostal, error } = await supabase
      .rpc('validate_swedish_postal_code', { postal_code: postalCode })

    if (error) {
      return {
        isValid: false,
        message: 'Failed to validate postal code'
      }
    }

    if (!isValidPostal) {
      return {
        isValid: false,
        message: 'Invalid Swedish postal code format. Expected format: 12345 or 123 45'
      }
    }

    // For enhanced validation, you could integrate with Swedish postal service API
    // For now, we'll just validate the format
    const normalizedPostal = postalCode.replace(/\s/g, '').replace(/(\d{3})(\d{2})/, '$1 $2')

    return {
      isValid: true,
      message: 'Valid Swedish postal code',
      normalizedAddress: address ? `${address}, ${normalizedPostal}` : normalizedPostal
    }
  } catch (error) {
    return {
      isValid: false,
      message: 'Error validating location'
    }
  }
}

/**
 * Check feedback rate limit for phone number
 */
export async function checkFeedbackRateLimit(
  phoneNumber: string,
  storeId: string,
  maxPerDay: number = MAX_FEEDBACK_PER_DAY
): Promise<RateLimitCheckResult> {
  try {
    const supabase = await createClient()
    
    // Check rate limit using database function
    const { data: isAllowed, error } = await supabase
      .rpc('check_rate_limit', {
        p_phone_number: phoneNumber,
        p_store_id: storeId,
        p_max_per_day: maxPerDay
      })

    if (error) {
      throw new StoreError('Failed to check rate limit', 'RATE_LIMIT_CHECK_FAILED', { error })
    }

    // Get current count
    const today = new Date().toISOString().split('T')[0]
    const { data: currentData } = await supabase
      .from('feedback_rate_limits')
      .select('feedback_count')
      .eq('phone_number', phoneNumber)
      .eq('store_id', storeId)
      .eq('feedback_date', today)
      .single()

    const currentCount = currentData?.feedback_count || 0

    // Calculate reset time (midnight next day)
    const resetTime = new Date()
    resetTime.setDate(resetTime.getDate() + 1)
    resetTime.setHours(0, 0, 0, 0)

    return {
      allowed: isAllowed as boolean,
      current_count: currentCount,
      max_per_day: maxPerDay,
      resets_at: resetTime.toISOString()
    }
  } catch (error) {
    if (error instanceof StoreError) {
      throw error
    }
    throw new StoreError('Unexpected error checking rate limit', 'UNKNOWN_ERROR', { error })
  }
}

/**
 * Increment feedback rate limit counter
 */
export async function incrementFeedbackRateLimit(
  phoneNumber: string,
  storeId: string
): Promise<number> {
  try {
    const supabase = await createClient()
    
    const { data: newCount, error } = await supabase
      .rpc('increment_rate_limit', {
        p_phone_number: phoneNumber,
        p_store_id: storeId
      })

    if (error) {
      throw new StoreError('Failed to increment rate limit', 'RATE_LIMIT_INCREMENT_FAILED', { error })
    }

    return newCount as number
  } catch (error) {
    if (error instanceof StoreError) {
      throw error
    }
    throw new StoreError('Unexpected error incrementing rate limit', 'UNKNOWN_ERROR', { error })
  }
}

/**
 * Get store by code (including historical codes)
 */
export async function getStoreByCode(storeCode: string): Promise<StoreCodeLookupResult | null> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .rpc('get_store_by_code', { p_store_code: storeCode })

    if (error) {
      throw new StoreError('Failed to lookup store by code', 'STORE_LOOKUP_FAILED', { error })
    }

    if (!data || data.length === 0) {
      return null
    }

    return data[0] as StoreCodeLookupResult
  } catch (error) {
    if (error instanceof StoreError) {
      throw error
    }
    throw new StoreError('Unexpected error looking up store', 'UNKNOWN_ERROR', { error })
  }
}

/**
 * Update store information
 */
export async function updateStore(
  storeId: string,
  updateData: Partial<CreateStoreData>
): Promise<Store> {
  try {
    const supabase = await createClient()
    
    // Validate input data
    const validation = validateStoreData(updateData, false)
    if (!validation.isValid) {
      throw new ValidationError('Store data validation failed', validation.errors)
    }

    // Validate location if postal code is being updated
    let locationValidated: boolean | undefined
    if (updateData.location_postal) {
      const locationValidation = await validateStoreLocation(updateData.location_postal)
      locationValidated = locationValidation.isValid
    }

    const updatePayload: any = {
      ...updateData,
      updated_at: new Date().toISOString()
    }

    if (locationValidated !== undefined) {
      updatePayload.location_validated = locationValidated
    }

    const { data: store, error } = await supabase
      .from('stores')
      .update(updatePayload)
      .eq('id', storeId)
      .select('*')
      .single()

    if (error) {
      throw new StoreError('Failed to update store', 'STORE_UPDATE_FAILED', { error })
    }

    return store as Store
  } catch (error) {
    if (error instanceof StoreError) {
      throw error
    }
    throw new StoreError('Unexpected error updating store', 'UNKNOWN_ERROR', { error })
  }
}

/**
 * Deactivate store (soft delete)
 */
export async function deactivateStore(storeId: string): Promise<void> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('stores')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', storeId)

    if (error) {
      throw new StoreError('Failed to deactivate store', 'STORE_DEACTIVATION_FAILED', { error })
    }
  } catch (error) {
    if (error instanceof StoreError) {
      throw error
    }
    throw new StoreError('Unexpected error deactivating store', 'UNKNOWN_ERROR', { error })
  }
}

/**
 * Validate store data
 */
function validateStoreData(
  data: Partial<CreateStoreData>, 
  requireRequired: boolean = true
): StoreValidationResult {
  const errors: StoreValidationError[] = []

  // Required field validation
  if (requireRequired) {
    if (!data.name || data.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Store name is required' })
    }
  }

  // Name validation
  if (data.name !== undefined) {
    if (data.name.length > 255) {
      errors.push({ field: 'name', message: 'Store name must be 255 characters or less' })
    }
    if (data.name.trim().length < 2) {
      errors.push({ field: 'name', message: 'Store name must be at least 2 characters' })
    }
  }

  // Postal code validation
  if (data.location_postal !== undefined && data.location_postal.length > 0) {
    const postalRegex = /^[0-9]{3}\s?[0-9]{2}$/
    if (!postalRegex.test(data.location_postal)) {
      errors.push({ 
        field: 'location_postal', 
        message: 'Invalid Swedish postal code format. Expected: 12345 or 123 45' 
      })
    }
  }

  // Coordinate validation
  if (data.location_lat !== undefined) {
    if (data.location_lat < -90 || data.location_lat > 90) {
      errors.push({ field: 'location_lat', message: 'Latitude must be between -90 and 90' })
    }
  }

  if (data.location_lng !== undefined) {
    if (data.location_lng < -180 || data.location_lng > 180) {
      errors.push({ field: 'location_lng', message: 'Longitude must be between -180 and 180' })
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Generate QR code URL for store
 */
export function generateQRCodeUrl(storeCode: string): string {
  return `https://vocilia.com/${storeCode}`
}

/**
 * Get store statistics
 */
export async function getStoreStatistics(storeId: string): Promise<{
  total_feedback: number
  avg_quality_score: number
  feedback_this_week: number
  feedback_this_month: number
  rate_limit_violations_today: number
  last_feedback_at?: string
}> {
  try {
    const supabase = await createClient()
    
    // Get all feedback stats
    const { data: allFeedback } = await supabase
      .from('feedbacks')
      .select('quality_score, created_at')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const totalFeedback = allFeedback?.length || 0
    const qualityScores = allFeedback?.map(f => f.quality_score).filter(s => s !== null) || []
    const avgQualityScore = qualityScores.length > 0 
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
      : 0

    const feedbackThisWeek = allFeedback?.filter(f => 
      new Date(f.created_at) >= weekAgo
    ).length || 0

    const feedbackThisMonth = allFeedback?.filter(f => 
      new Date(f.created_at) >= monthAgo
    ).length || 0

    const lastFeedbackAt = allFeedback?.[0]?.created_at

    // Get today's rate limit violations
    const today = new Date().toISOString().split('T')[0]
    const { data: rateLimitData } = await supabase
      .from('feedback_rate_limits')
      .select('feedback_count')
      .eq('store_id', storeId)
      .eq('feedback_date', today)
      .gte('feedback_count', MAX_FEEDBACK_PER_DAY)

    const rateLimitViolationsToday = rateLimitData?.length || 0

    return {
      total_feedback: totalFeedback,
      avg_quality_score: avgQualityScore,
      feedback_this_week: feedbackThisWeek,
      feedback_this_month: feedbackThisMonth,
      rate_limit_violations_today: rateLimitViolationsToday,
      last_feedback_at: lastFeedbackAt
    }
  } catch (error) {
    throw new StoreError('Failed to get store statistics', 'STATS_FETCH_FAILED', { error })
  }
}