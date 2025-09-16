import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rotateStoreCode } from '@/lib/stores/service'
import { StoreError } from '@/lib/stores/types'

export const dynamic = 'force-dynamic'

/**
 * PUT /api/stores/[id]/rotate-code - Rotate store code
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const storeId = params.id

    // Verify store belongs to business
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, business_id, name, store_code')
      .eq('id', storeId)
      .eq('business_id', businessId)
      .single()

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found or access denied' },
        { status: 404 }
      )
    }

    // Check if store is active
    if (!store.is_active) {
      return NextResponse.json(
        { error: 'Cannot rotate code for inactive store' },
        { status: 400 }
      )
    }

    const result = await rotateStoreCode(storeId)

    // Log the code rotation for audit purposes
    console.log(`Store code rotated for store ${store.name} (${storeId}): ${result.old_code} -> ${result.new_code}`)

    return NextResponse.json({
      data: result,
      message: 'Store code rotated successfully'
    })

  } catch (error) {
    console.error('Error rotating store code:', error)
    
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