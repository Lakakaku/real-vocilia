import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkFeedbackRateLimit, getStoreByCode } from '@/lib/stores/service'
import { StoreError } from '@/lib/stores/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/stores/check-rate-limit - Check rate limit for phone number and store
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phoneNumber = searchParams.get('phone_number')
    const storeCode = searchParams.get('store_code')
    const maxPerDay = parseInt(searchParams.get('max_per_day') || '5')

    if (!phoneNumber || !storeCode) {
      return NextResponse.json(
        { error: 'Phone number and store code are required' },
        { status: 400 }
      )
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Validate store code exists
    const storeInfo = await getStoreByCode(storeCode)
    if (!storeInfo) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    if (!storeInfo.is_active) {
      return NextResponse.json(
        { error: 'Store is not active' },
        { status: 400 }
      )
    }

    const rateLimitResult = await checkFeedbackRateLimit(
      phoneNumber,
      storeInfo.store_id,
      maxPerDay
    )

    return NextResponse.json({
      data: {
        ...rateLimitResult,
        store_info: {
          name: storeInfo.name,
          store_code: storeInfo.current_code,
          is_current_code: storeInfo.is_current_code
        }
      },
      message: 'Rate limit check completed'
    })

  } catch (error) {
    console.error('Error checking rate limit:', error)
    
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
 * POST /api/stores/check-rate-limit - Submit feedback and increment rate limit
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone_number, store_code, max_per_day = 5 } = body

    if (!phone_number || !store_code) {
      return NextResponse.json(
        { error: 'Phone number and store code are required' },
        { status: 400 }
      )
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    if (!phoneRegex.test(phone_number.replace(/\s/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Get store information
    const storeInfo = await getStoreByCode(store_code)
    if (!storeInfo) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      )
    }

    if (!storeInfo.is_active) {
      return NextResponse.json(
        { error: 'Store is not active' },
        { status: 400 }
      )
    }

    // Check rate limit before allowing submission
    const rateLimitCheck = await checkFeedbackRateLimit(
      phone_number,
      storeInfo.store_id,
      max_per_day
    )

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          code: 'RATE_LIMIT_EXCEEDED',
          data: {
            current_count: rateLimitCheck.current_count,
            max_per_day: rateLimitCheck.max_per_day,
            resets_at: rateLimitCheck.resets_at
          }
        },
        { status: 429 }
      )
    }

    // In a real implementation, this would be called after successful feedback submission
    // For now, we'll just return the rate limit status
    return NextResponse.json({
      data: {
        allowed: true,
        current_count: rateLimitCheck.current_count,
        max_per_day: rateLimitCheck.max_per_day,
        remaining: rateLimitCheck.max_per_day - rateLimitCheck.current_count,
        resets_at: rateLimitCheck.resets_at,
        store_info: {
          name: storeInfo.name,
          store_code: storeInfo.current_code,
          is_current_code: storeInfo.is_current_code
        }
      },
      message: 'Feedback submission allowed'
    })

  } catch (error) {
    console.error('Error processing feedback rate limit:', error)
    
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