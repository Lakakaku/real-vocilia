import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateStoreLocation } from '@/lib/stores/service'
import { StoreError } from '@/lib/stores/types'

export const dynamic = 'force-dynamic'

/**
 * POST /api/stores/validate-location - Validate store location
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

    const body = await request.json()

    if (!body.postal_code || typeof body.postal_code !== 'string') {
      return NextResponse.json(
        { error: 'Postal code is required' },
        { status: 400 }
      )
    }

    const postalCode = body.postal_code.trim()
    const address = body.address?.trim()

    if (postalCode.length === 0) {
      return NextResponse.json(
        { error: 'Postal code cannot be empty' },
        { status: 400 }
      )
    }

    const validationResult = await validateStoreLocation(postalCode, address)

    return NextResponse.json({
      data: validationResult,
      message: 'Location validation completed'
    })

  } catch (error) {
    console.error('Error validating location:', error)
    
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