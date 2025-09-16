import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createStore,
  getStoresForBusiness,
  validateStoreLocation
} from '@/lib/stores/service'
import type {
  CreateStoreData,
  StoreFilterOptions,
  StoreSortOptions,
  ApiResponse
} from '@/lib/stores/types'
import { StoreError, ValidationError } from '@/lib/stores/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/stores - Get stores for authenticated business
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const businessId = user.id
    const { searchParams } = new URL(request.url)

    // Parse filters
    const filters: StoreFilterOptions = {}
    if (searchParams.get('is_active') !== null) {
      filters.is_active = searchParams.get('is_active') === 'true'
    }
    if (searchParams.get('location_city')) {
      filters.location_city = searchParams.get('location_city')!
    }
    if (searchParams.get('location_region')) {
      filters.location_region = searchParams.get('location_region')!
    }
    if (searchParams.get('location_validated') !== null) {
      filters.location_validated = searchParams.get('location_validated') === 'true'
    }
    if (searchParams.get('created_after')) {
      filters.created_after = searchParams.get('created_after')!
    }
    if (searchParams.get('created_before')) {
      filters.created_before = searchParams.get('created_before')!
    }

    // Parse sorting
    let sort: StoreSortOptions | undefined
    const sortField = searchParams.get('sort_field')
    const sortDirection = searchParams.get('sort_direction')
    
    if (sortField && ['name', 'created_at', 'updated_at', 'feedback_count', 'avg_quality_score'].includes(sortField)) {
      sort = {
        field: sortField as any,
        direction: sortDirection === 'desc' ? 'desc' : 'asc'
      }
    }

    const stores = await getStoresForBusiness(businessId, filters, sort)

    return NextResponse.json({
      data: stores,
      message: 'Stores retrieved successfully'
    })

  } catch (error) {
    console.error('Error fetching stores:', error)
    
    if (error instanceof StoreError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/stores - Create new store
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const businessId = user.id
    const body = await request.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Store name is required' },
        { status: 400 }
      )
    }

    const storeData: CreateStoreData = {
      name: body.name.trim(),
      location_address: body.location_address?.trim(),
      location_city: body.location_city?.trim(),
      location_region: body.location_region?.trim(),
      location_postal: body.location_postal?.trim(),
      location_lat: body.location_lat ? parseFloat(body.location_lat) : undefined,
      location_lng: body.location_lng ? parseFloat(body.location_lng) : undefined,
      operating_hours: body.operating_hours || {},
      metadata: body.metadata || {}
    }

    // Validate coordinates if provided
    if (storeData.location_lat !== undefined && (isNaN(storeData.location_lat) || storeData.location_lat < -90 || storeData.location_lat > 90)) {
      return NextResponse.json(
        { error: 'Invalid latitude. Must be between -90 and 90' },
        { status: 400 }
      )
    }

    if (storeData.location_lng !== undefined && (isNaN(storeData.location_lng) || storeData.location_lng < -180 || storeData.location_lng > 180)) {
      return NextResponse.json(
        { error: 'Invalid longitude. Must be between -180 and 180' },
        { status: 400 }
      )
    }

    const result = await createStore(businessId, storeData)

    return NextResponse.json({
      data: result,
      message: 'Store created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating store:', error)
    
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { 
          error: error.message, 
          code: error.code,
          validation_errors: error.validationErrors
        },
        { status: 400 }
      )
    }

    if (error instanceof StoreError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}