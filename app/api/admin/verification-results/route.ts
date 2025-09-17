/**
 * GET /api/admin/verification-results
 *
 * Returns comprehensive overview of verification results for admin management.
 * Supports filtering by business, date range, status, and risk levels.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PaymentBatchBusinessRules } from '@/lib/verification/models/payment-batch'
import { auditService } from '@/lib/verification/services/audit-service'
import { z } from 'zod'

// Query parameters validation schema
const resultsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  business_id: z.string().uuid('Invalid business ID format').optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'expired', 'cancelled', 'all']).default('all'),
  date_range: z.enum(['today', 'week', 'month', 'quarter', 'year', 'custom']).default('month'),
  start_date: z.string().datetime('Invalid start date').optional(),
  end_date: z.string().datetime('Invalid end date').optional(),
  risk_level: z.enum(['low', 'medium', 'high', 'critical', 'all']).default('all'),
  sort_by: z.enum(['created_at', 'deadline', 'completion_rate', 'urgency_score', 'total_amount']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  include_detailed_stats: z.coerce.boolean().default(false),
  flagged_only: z.coerce.boolean().default(false),
  overdue_only: z.coerce.boolean().default(false),
  search: z.string().max(100, 'Search term too long').optional(),
})

type ResultsQuery = z.infer<typeof resultsQuerySchema>

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

    // Verify admin permissions
    const { data: adminAccess, error: adminError } = await supabase
      .from('admin_users')
      .select('role, permissions')
      .eq('user_id', user.id)
      .single()

    if (adminError || !adminAccess) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    const validation = resultsQuerySchema.safeParse(queryParams)

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

    // Calculate date range
    let startDate: Date
    let endDate: Date = new Date()

    if (query.date_range === 'custom') {
      if (!query.start_date || !query.end_date) {
        return NextResponse.json(
          { error: 'start_date and end_date required for custom date range' },
          { status: 400 }
        )
      }
      startDate = new Date(query.start_date)
      endDate = new Date(query.end_date)
    } else {
      const now = new Date()
      switch (query.date_range) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000))
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'quarter':
          const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
          startDate = new Date(now.getFullYear(), quarterStartMonth, 1)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
      }
    }

    // Build base query for verification sessions with results
    let baseQuery = supabase
      .from('verification_sessions')
      .select(`
        id,
        business_id,
        payment_batch_id,
        status,
        total_transactions,
        verified_transactions,
        approved_count,
        rejected_count,
        current_transaction_index,
        deadline,
        started_at,
        completed_at,
        average_risk_score,
        auto_approval_threshold,
        pause_count,
        notes,
        created_at,
        updated_at,
        payment_batches (
          id,
          week_number,
          year_number,
          total_amount,
          csv_file_path,
          status as batch_status
        ),
        businesses (
          id,
          name,
          contact_email,
          status as business_status
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Apply filters
    if (query.business_id) {
      baseQuery = baseQuery.eq('business_id', query.business_id)
    }

    if (query.status !== 'all') {
      baseQuery = baseQuery.eq('status', query.status)
    }

    if (query.overdue_only) {
      baseQuery = baseQuery.lt('deadline', new Date().toISOString())
    }

    // Execute query with pagination
    const offset = (query.page - 1) * query.limit
    const { data: sessions, error: sessionsError, count } = await baseQuery
      .order(query.sort_by, { ascending: query.sort_order === 'asc' })
      .range(offset, offset + query.limit - 1)

    if (sessionsError) {
      return NextResponse.json(
        { error: 'Failed to fetch verification sessions', details: sessionsError.message },
        { status: 500 }
      )
    }

    if (!sessions) {
      return NextResponse.json({
        verification_sessions: [],
        pagination: {
          current_page: query.page,
          total_pages: 0,
          total_items: 0,
          items_per_page: query.limit,
          has_next_page: false,
          has_previous_page: false,
        },
        summary: {
          total_sessions: 0,
          active_sessions: 0,
          completed_sessions: 0,
          overdue_sessions: 0,
          total_transactions_processed: 0,
          total_amount_processed: 0,
          average_completion_rate: 0,
          average_approval_rate: 0,
        }
      })
    }

    // Process and enhance session data
    const now = new Date()
    const enhancedSessions = sessions.map(session => {
      const deadlineDate = new Date((session as any).deadline)
      const isOverdue = deadlineDate < now
      const hoursRemaining = Math.max(0, (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60))

      // Calculate progress metrics
      const completionRate = (session as any).total_transactions > 0
        ? Math.round(((session as any).verified_transactions / (session as any).total_transactions) * 100)
        : 0

      const approvalRate = (session as any).verified_transactions > 0
        ? Math.round((((session as any).approved_count || 0) / (session as any).verified_transactions) * 100)
        : 0

      // Calculate urgency score using business rules
      const batchData = {
        ...(session as any).payment_batches,
        deadline: (session as any).deadline,
        status: (session as any).status,
        total_amount: (session as any).payment_batches?.total_amount || 0,
        total_transactions: (session as any).total_transactions,
      }

      const urgencyScore = PaymentBatchBusinessRules.calculateUrgencyScore(batchData)
      const urgencyLevel = PaymentBatchBusinessRules.getUrgencyLevel(deadlineDate)

      // Determine risk level based on average risk score
      const riskLevel = ((session as any).average_risk_score || 0) > 70 ? 'high' :
        ((session as any).average_risk_score || 0) > 40 ? 'medium' : 'low'

      return {
        session_id: (session as any).id,
        business: {
          id: (session as any).business_id,
          name: (session as any).businesses?.name,
          contact_email: (session as any).businesses?.contact_email,
          status: (session as any).businesses?.business_status,
        },
        batch: {
          id: (session as any).payment_batch_id,
          week_number: (session as any).payment_batches?.week_number,
          year: (session as any).payment_batches?.year_number,
          total_amount: (session as any).payment_batches?.total_amount,
          status: (session as any).payment_batches?.batch_status,
          has_csv: !!(session as any).payment_batches?.csv_file_path,
        },
        verification: {
          status: (session as any).status,
          total_transactions: (session as any).total_transactions,
          verified_transactions: (session as any).verified_transactions,
          approved_count: (session as any).approved_count || 0,
          rejected_count: (session as any).rejected_count || 0,
          completion_rate_percentage: completionRate,
          approval_rate_percentage: approvalRate,
          current_transaction_index: (session as any).current_transaction_index || 0,
        },
        timeline: {
          created_at: (session as any).created_at,
          started_at: (session as any).started_at,
          completed_at: (session as any).completed_at,
          deadline: (session as any).deadline,
          is_overdue: isOverdue,
          hours_remaining: Math.floor(hoursRemaining),
          deadline_status: isOverdue ? 'overdue' :
            hoursRemaining < 24 ? 'critical' :
            hoursRemaining < 72 ? 'urgent' : 'normal',
        },
        risk_assessment: {
          average_risk_score: (session as any).average_risk_score || 0,
          risk_level: riskLevel,
          urgency_score: urgencyScore,
          urgency_level: urgencyLevel,
          requires_attention: urgencyScore >= 90 || isOverdue,
          auto_approval_threshold: (session as any).auto_approval_threshold || 30,
        },
        operational: {
          pause_count: (session as any).pause_count || 0,
          notes: (session as any).notes,
          updated_at: (session as any).updated_at,
        },
      }
    })

    // Apply post-processing filters
    let filteredSessions = enhancedSessions

    if (query.risk_level !== 'all') {
      filteredSessions = filteredSessions.filter(s => s.risk_assessment.risk_level === query.risk_level)
    }

    if (query.flagged_only) {
      filteredSessions = filteredSessions.filter(s => s.risk_assessment.requires_attention)
    }

    if (query.search) {
      const searchTerm = query.search.toLowerCase()
      filteredSessions = filteredSessions.filter(s =>
        s.business.name?.toLowerCase().includes(searchTerm) ||
        s.business.contact_email?.toLowerCase().includes(searchTerm) ||
        s.session_id.toLowerCase().includes(searchTerm) ||
        s.batch.id?.toLowerCase().includes(searchTerm)
      )
    }

    // Calculate summary statistics
    const summary = {
      total_sessions: sessions.length,
      active_sessions: sessions.filter(s => ['in_progress', 'paused'].includes((s as any).status)).length,
      completed_sessions: sessions.filter(s => (s as any).status === 'completed').length,
      overdue_sessions: enhancedSessions.filter(s => s.timeline.is_overdue).length,
      expired_sessions: sessions.filter(s => (s as any).status === 'expired').length,
      cancelled_sessions: sessions.filter(s => (s as any).status === 'cancelled').length,
      total_transactions_processed: sessions.reduce((sum, s) => sum + ((s as any).verified_transactions || 0), 0),
      total_amount_processed: sessions.reduce((sum, s) => sum + ((s as any).payment_batches?.total_amount || 0), 0),
      average_completion_rate: sessions.length > 0
        ? Math.round(enhancedSessions.reduce((sum, s) => sum + s.verification.completion_rate_percentage, 0) / sessions.length)
        : 0,
      average_approval_rate: sessions.length > 0
        ? Math.round(enhancedSessions.reduce((sum, s) => sum + s.verification.approval_rate_percentage, 0) / sessions.length)
        : 0,
      high_risk_sessions: enhancedSessions.filter(s => s.risk_assessment.risk_level === 'high').length,
      critical_urgency_sessions: enhancedSessions.filter(s => s.risk_assessment.urgency_level === 'critical').length,
    }

    // Get detailed statistics if requested
    let detailedStats = null
    if (query.include_detailed_stats) {
      const statsQuery = await supabase
        .from('verification_results')
        .select(`
          verification_session_id,
          decision,
          verification_time_seconds,
          is_flagged,
          risk_score,
          fraud_indicators
        `)
        .in('verification_session_id', sessions.map(s => (s as any).id))

      if (statsQuery.data) {
        const avgVerificationTime = statsQuery.data.reduce((sum, r) => sum + (r.verification_time_seconds || 0), 0) / Math.max(statsQuery.data.length, 1)
        const flaggedCount = statsQuery.data.filter(r => r.is_flagged).length
        const highRiskCount = statsQuery.data.filter(r => (r.risk_score || 0) > 70).length

        detailedStats = {
          total_individual_results: statsQuery.data.length,
          average_verification_time_seconds: Math.round(avgVerificationTime),
          flagged_transactions: flaggedCount,
          high_risk_transactions: highRiskCount,
          fraud_indicators_frequency: statsQuery.data
            .filter(r => r.fraud_indicators && Array.isArray(r.fraud_indicators))
            .flatMap(r => r.fraud_indicators)
            .reduce((acc, indicator) => {
              acc[indicator] = (acc[indicator] || 0) + 1
              return acc
            }, {} as Record<string, number>),
        }
      }
    }

    const totalPages = Math.ceil((count || 0) / query.limit)

    const response = {
      verification_sessions: filteredSessions,
      pagination: {
        current_page: query.page,
        total_pages: totalPages,
        total_items: count || 0,
        items_per_page: query.limit,
        has_next_page: query.page < totalPages,
        has_previous_page: query.page > 1,
      },
      summary,
      detailed_stats: detailedStats,
      filters_applied: {
        date_range: query.date_range,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        business_id: query.business_id,
        status: query.status,
        risk_level: query.risk_level,
        flagged_only: query.flagged_only,
        overdue_only: query.overdue_only,
        search: query.search,
      },
      admin_context: {
        user_role: adminAccess.role,
        can_manage_all: adminAccess.role === 'admin',
        can_view_sensitive: ['admin', 'manager'].includes(adminAccess.role),
        generated_at: new Date().toISOString(),
      },
    }

    // Log admin access
    await auditService.logActivity({
      event_type: 'data_export_requested',
      actor_id: user.id,
      actor_type: 'admin',
      business_id: query.business_id || null,
      category: 'data_access',
      severity: 'info',
      description: 'Admin viewed verification results overview',
      details: {
        filters: {
          date_range: query.date_range,
          business_id: query.business_id,
          status: query.status,
          risk_level: query.risk_level,
          flagged_only: query.flagged_only,
          overdue_only: query.overdue_only,
        },
        results_count: filteredSessions.length,
        admin_role: adminAccess.role,
        include_detailed_stats: query.include_detailed_stats,
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in GET /api/admin/verification-results:', error)

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