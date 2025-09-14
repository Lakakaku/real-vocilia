/**
 * Weekly Insights API Route
 * GET /api/context/weekly-insights - Get weekly improvement suggestions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { weeklySuggestionsGenerator } from '@/lib/ai/weekly-suggestions'

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

    // Get current week/year
    const now = new Date()
    const weekNumber = Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
    const yearNumber = now.getFullYear()

    // Generate weekly suggestions
    const result = await weeklySuggestionsGenerator.generateWeeklySuggestions(
      user.id,
      weekNumber,
      yearNumber
    )

    return NextResponse.json({
      success: true,
      suggestions: result.suggestions,
      insights: result.insights,
      previousEffectiveness: result.previousEffectiveness
    })

  } catch (error) {
    console.error('Weekly insights error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update suggestion status
export async function PUT(request: NextRequest) {
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
    const { suggestionId, status, feedback } = body

    // Update suggestion status
    await weeklySuggestionsGenerator.updateSuggestionStatus(
      suggestionId,
      status,
      feedback
    )

    return NextResponse.json({
      success: true,
      message: 'Suggestion status updated'
    })

  } catch (error) {
    console.error('Update suggestion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}