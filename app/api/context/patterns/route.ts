/**
 * Pattern Recognition API Route
 * GET /api/context/patterns - Retrieve identified patterns from feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { patternRecognitionEngine } from '@/lib/ai/pattern-recognition'

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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7')

    // Analyze patterns from recent feedback
    const patterns = await patternRecognitionEngine.analyzeFeedbackPatterns(
      user.id,
      {
        start: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        end: new Date()
      }
    )

    return NextResponse.json({
      success: true,
      patterns: patterns.patterns,
      clusters: patterns.clusters,
      trends: patterns.trends,
      anomalies: patterns.anomalies
    })

  } catch (error) {
    console.error('Pattern recognition error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}