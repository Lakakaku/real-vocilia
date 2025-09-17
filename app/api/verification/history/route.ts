/**
 * GET /api/verification/history
 *
 * Returns historical verification sessions and batches with filtering and pagination.
 * Used for analytics, reporting, and historical data analysis.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auditService } from '@/lib/verification/services/audit-service'
import { z } from 'zod'

// Query parameters validation
const historyQuerySchema = z.object({
  business_id: z.string().uuid('Invalid business ID format').optional(),
  status: z.enum(['all', 'completed', 'auto_approved', 'expired', 'cancelled']).default('all'),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  week_number: z.coerce.number().int().min(1).max(53).optional(),
  year: z.coerce.number().int().min(2024).max(2030).optional(),
  search: z.string().max(100).optional(),
  sort_by: z.enum(['completed_at', 'deadline', 'created_at', 'total_amount', 'completion_percentage']).default('completed_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  include_analytics: z.coerce.boolean().default(true),
  include_batch_details: z.coerce.boolean().default(true),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

type HistoryQuery = z.infer<typeof historyQuerySchema>

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())

    const validation = historyQuerySchema.safeParse(queryParams)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const query = validation.data
    const businessId = query.business_id || user.user_metadata?.business_id

    if (!businessId) {
      return NextResponse.json(
        { error: 'Business ID required' },
        { status: 400 }
      )
    }

    // Verify user has access to this business
    const { data: businessAccess, error: accessError } = await supabase
      .from('business_users')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .single()

    if (accessError || !businessAccess) {
      return NextResponse.json(
        { error: 'Access denied to business' },
        { status: 403 }
      )
    }

    // Build base query
    let sessionQuery = supabase
      .from('verification_sessions')
      .select(`
        id,
        payment_batch_id,
        business_id,
        status,
        total_transactions,
        verified_transactions,
        approved_count,
        rejected_count,
        deadline,
        started_at,
        completed_at,
        average_risk_score,
        auto_approval_threshold,
        notes,
        ${query.include_batch_details ? `
          payment_batches (
            id,
            week_number,
            year_number,
            total_amount,
            status,
            csv_file_path,
            created_at,
            created_by
          )
        ` : ''}
      `, { count: 'exact' })
      .eq('business_id', businessId)

    // Apply status filter
    if (query.status !== 'all') {
      sessionQuery = sessionQuery.eq('status', query.status)
    } else {
      // Historical sessions are typically completed, expired, or cancelled
      sessionQuery = sessionQuery.in('status', ['completed', 'auto_approved', 'expired', 'cancelled'])
    }

    // Apply date range filters
    if (query.date_from) {
      sessionQuery = sessionQuery.gte('completed_at', query.date_from)
    }
    if (query.date_to) {
      sessionQuery = sessionQuery.lte('completed_at', query.date_to)
    }

    // Apply week/year filters (through batch relationship)
    if (query.week_number || query.year) {
      let batchFilters: any = {}
      if (query.week_number) batchFilters.week_number = query.week_number
      if (query.year) batchFilters.year_number = query.year

      // This would require a more complex query in production
      // For now, we'll filter after fetching if needed
    }

    // Apply sorting
    switch (query.sort_by) {
      case 'completed_at':
        sessionQuery = sessionQuery.order('completed_at', {
          ascending: query.sort_order === 'asc',
          nullsFirst: false
        })
        break
      case 'deadline':
        sessionQuery = sessionQuery.order('deadline', { ascending: query.sort_order === 'asc' })
        break
      case 'created_at':
        sessionQuery = sessionQuery.order('created_at', { ascending: query.sort_order === 'asc' })
        break
      case 'total_amount':
      case 'completion_percentage':
        // These would need to be sorted in memory after fetching batch data
        sessionQuery = sessionQuery.order('completed_at', { ascending: false })
        break
    }

    // Apply pagination
    const offset = (query.page - 1) * query.limit
    sessionQuery = sessionQuery.range(offset, offset + query.limit - 1)

    const { data: sessions, error: sessionError, count } = await sessionQuery

    if (sessionError) {
      await auditService.logActivity({
        event_type: 'unauthorized_access_attempt',
        actor_id: user.id,
        actor_type: 'user',
        business_id: businessId,
        category: 'business_process',
        severity: 'error',
        description: 'Failed to fetch verification history',
        details: { error: sessionError.message },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      })

      return NextResponse.json(
        { error: 'Failed to fetch verification history' },
        { status: 500 }
      )
    }

    // Process and enhance session data
    let enhancedSessions = (sessions || []).map((session) => {
      const batch = query.include_batch_details
        ? (Array.isArray(session.payment_batches)
          ? session.payment_batches[0]
          : session.payment_batches)
        : null

      // Calculate completion percentage
      const completionPercentage = session.total_transactions > 0
        ? Math.round((session.verified_transactions / session.total_transactions) * 100)
        : 0

      // Calculate session duration
      const startTime = new Date(session.started_at || session.created_at)
      const endTime = new Date(session.completed_at || new Date())
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

      // Calculate approval rate
      const approvalRate = session.verified_transactions > 0
        ? Math.round((session.approved_count / session.verified_transactions) * 100)
        : 0

      // Determine if deadline was met
      const deadlineDate = new Date(session.deadline)
      const completionDate = new Date(session.completed_at || new Date())
      const deadlineMet = session.status === 'completed' && completionDate <= deadlineDate

      return {
        id: session.id,
        batch_id: session.payment_batch_id,
        status: session.status,
        batch_info: batch ? {
          week_number: batch.week_number,
          year: batch.year_number,
          total_amount: batch.total_amount,
          batch_status: batch.status,
          created_at: batch.created_at,
          created_by: batch.created_by,
          csv_file_path: batch.csv_file_path,
        } : null,
        verification_summary: {
          total_transactions: session.total_transactions,
          verified_transactions: session.verified_transactions,
          approved_count: session.approved_count || 0,
          rejected_count: session.rejected_count || 0,
          completion_percentage: completionPercentage,
          approval_rate_percentage: approvalRate,
        },
        timeline: {
          started_at: session.started_at,
          completed_at: session.completed_at,
          deadline: session.deadline,
          duration_minutes: durationMinutes,
          deadline_met: deadlineMet,
        },
        risk_assessment: {
          average_risk_score: session.average_risk_score || 0,
          risk_level: (session.average_risk_score || 0) > 70 ? 'high' :
            (session.average_risk_score || 0) > 40 ? 'medium' : 'low',
          high_risk_transaction_count: session.rejected_count || 0,
          auto_approval_threshold: session.auto_approval_threshold || 30,
        },
        performance_metrics: {
          completion_percentage: completionPercentage,
          approval_rate: approvalRate,
          average_time_per_transaction: session.verified_transactions > 0
            ? Math.round(durationMinutes / session.verified_transactions * 60) // seconds
            : 0,
          deadline_adherence: deadlineMet ? 'met' : session.status === 'expired' ? 'missed' : 'pending',
        },
        notes: session.notes,
      }
    })

    // Apply additional filtering based on week/year if specified
    if (query.week_number || query.year) {
      enhancedSessions = enhancedSessions.filter(session => {
        if (!session.batch_info) return false
        if (query.week_number && session.batch_info.week_number !== query.week_number) return false
        if (query.year && session.batch_info.year !== query.year) return false
        return true
      })
    }

    // Apply search filter
    if (query.search) {
      const searchTerm = query.search.toLowerCase()
      enhancedSessions = enhancedSessions.filter(session =>
        session.id.toLowerCase().includes(searchTerm) ||
        (session.notes && session.notes.toLowerCase().includes(searchTerm)) ||
        (session.batch_info && (
          session.batch_info.week_number.toString().includes(searchTerm) ||
          session.batch_info.year.toString().includes(searchTerm)
        ))
      )
    }

    // Apply memory-based sorting for complex fields
    if (query.sort_by === 'total_amount') {
      enhancedSessions.sort((a, b) => {
        const amountA = a.batch_info?.total_amount || 0
        const amountB = b.batch_info?.total_amount || 0
        return query.sort_order === 'desc' ? amountB - amountA : amountA - amountB
      })
    } else if (query.sort_by === 'completion_percentage') {
      enhancedSessions.sort((a, b) => {
        const compA = a.verification_summary.completion_percentage
        const compB = b.verification_summary.completion_percentage
        return query.sort_order === 'desc' ? compB - compA : compA - compB
      })
    }

    // Calculate analytics if requested
    let analytics: any = null
    if (query.include_analytics && enhancedSessions.length > 0) {
      const completedSessions = enhancedSessions.filter(s => s.status === 'completed')
      const autoApprovedSessions = enhancedSessions.filter(s => s.status === 'auto_approved')
      const expiredSessions = enhancedSessions.filter(s => s.status === 'expired')

      analytics = {
        total_sessions: enhancedSessions.length,
        completed_sessions: completedSessions.length,
        auto_approved_sessions: autoApprovedSessions.length,
        expired_sessions: expiredSessions.length,
        average_completion_percentage: Math.round(
          enhancedSessions.reduce((sum, s) => sum + s.verification_summary.completion_percentage, 0) / enhancedSessions.length
        ),
        average_approval_rate: Math.round(
          enhancedSessions.reduce((sum, s) => sum + s.verification_summary.approval_rate_percentage, 0) / enhancedSessions.length
        ),
        average_duration_minutes: Math.round(
          enhancedSessions.reduce((sum, s) => sum + s.timeline.duration_minutes, 0) / enhancedSessions.length
        ),
        deadline_adherence_rate: Math.round(
          (enhancedSessions.filter(s => s.performance_metrics.deadline_adherence === 'met').length / enhancedSessions.length) * 100
        ),
        total_transactions_processed: enhancedSessions.reduce((sum, s) =>
          sum + s.verification_summary.verified_transactions, 0
        ),
        total_amount_processed: enhancedSessions.reduce((sum, s) =>
          sum + (s.batch_info?.total_amount || 0), 0
        ),
        average_risk_score: Math.round(
          enhancedSessions.reduce((sum, s) => sum + s.risk_assessment.average_risk_score, 0) / enhancedSessions.length
        ),
        high_risk_sessions: enhancedSessions.filter(s => s.risk_assessment.risk_level === 'high').length,
      }
    }

    const response = {
      sessions: enhancedSessions,
      pagination: {
        current_page: query.page,
        total_pages: Math.ceil((count || 0) / query.limit),
        total_items: count || 0,
        items_per_page: query.limit,
        has_next_page: query.page < Math.ceil((count || 0) / query.limit),
        has_previous_page: query.page > 1,
      },
      analytics,
      filters_applied: {
        business_id: businessId,
        status: query.status,
        date_from: query.date_from,
        date_to: query.date_to,
        week_number: query.week_number,
        year: query.year,
        search: query.search,
        sort_by: query.sort_by,
        sort_order: query.sort_order,
      },
      generated_at: new Date().toISOString(),
    }

    // Log successful access
    await auditService.logActivity({
      event_type: 'user_login',
      actor_id: user.id,
      actor_type: 'user',
      business_id: businessId,
      category: 'business_process',
      severity: 'info',
      description: 'Verification history accessed',
      details: {
        status_filter: query.status,
        date_range: query.date_from && query.date_to
          ? { from: query.date_from, to: query.date_to }
          : null,
        sessions_returned: enhancedSessions.length,
        page: query.page,
        include_analytics: query.include_analytics,
        search_term: query.search,
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in /api/verification/history:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  )
}