/**
 * Fraud Patterns API Route
 * GET /api/fraud/patterns - Access fraud pattern analysis
 * POST /api/fraud/patterns - Assess fraud risk for feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fraudDetectionSystem } from '@/lib/ai/fraud-detection'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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

    // Get business type
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

    // Get industry patterns
    const patterns = fraudDetectionSystem.getIndustryPatterns(business.business_type)

    return NextResponse.json({
      success: true,
      patterns
    })

  } catch (error) {
    console.error('Get fraud patterns error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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
    const { feedbackId, feedbackData } = body

    // Get business context
    const { data: context } = await supabase
      .from('business_contexts')
      .select('context_data')
      .eq('business_id', user.id)
      .single()

    // Assess fraud risk
    const assessment = await fraudDetectionSystem.assessFraudRisk(
      feedbackId,
      feedbackData,
      context?.context_data
    )

    // Store assessment in database
    await supabase
      .from('feedbacks')
      .update({
        fraud_risk_score: assessment.riskScore,
        ai_analysis: {
          ...feedbackData.ai_analysis,
          fraud_assessment: assessment
        }
      })
      .eq('id', feedbackId)

    return NextResponse.json({
      success: true,
      assessment
    })

  } catch (error) {
    console.error('Fraud assessment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}