/**
 * Context Discovery API Route
 * GET /api/context/discovery - Get proactive context suggestions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { contextDiscoveryService } from '@/lib/ai/context-discovery'

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

    // Get business data
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select(`
        id,
        business_type,
        business_contexts(*)
      `)
      .eq('id', user.id)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    // Analyze context gaps and get discovery suggestions
    let contextData;
    if (business.business_contexts) {
      if (Array.isArray(business.business_contexts)) {
        contextData = business.business_contexts[0]?.context_data;
      } else if (typeof business.business_contexts === 'object') {
        contextData = (business.business_contexts as any).context_data;
      }
    }

    const discoveryResult = await contextDiscoveryService.analyzeContextGaps(
      business.id,
      business.business_type,
      contextData
    )

    // Get improvement suggestions
    const suggestions = await contextDiscoveryService.getSuggestionsForImprovement(
      business.id,
      business.business_type,
      contextData
    )

    return NextResponse.json({
      success: true,
      discovery: {
        gaps: discoveryResult.gaps,
        completenessScore: discoveryResult.completenessScore,
        nextSteps: discoveryResult.nextSteps,
        proactiveQuestions: discoveryResult.proactiveQuestions,
        industryComparison: discoveryResult.industryComparison,
        suggestions
      }
    })

  } catch (error) {
    console.error('Context discovery error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}