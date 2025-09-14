/**
 * Context Validation API Route
 * POST /api/context/validate - Validate context completeness and consistency
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { contextValidator } from '@/lib/ai/context-validator'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get request body
    const body = await request.json()
    const { context, field } = body

    // Get business data
    const { data: business } = await supabase
      .from('businesses')
      .select('business_type')
      .eq('id', user.id)
      .single()

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Perform validation
    if (field) {
      // Single field validation
      const result = contextValidator.validateField(
        field,
        context[field],
        business.business_type,
        context
      )

      return NextResponse.json({
        success: true,
        validation: result
      })
    } else {
      // Full context validation
      const result = await contextValidator.validateContext(
        user.id,
        business.business_type,
        context
      )

      return NextResponse.json({
        success: true,
        validation: result
      })
    }

  } catch (error) {
    console.error('Context validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}