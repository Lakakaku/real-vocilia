/**
 * GET /api/verification/status
 *
 * Returns verification status and progress for multiple sessions or batches.
 * Used for dashboard overview and status monitoring across business operations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deadlineService } from '@/lib/verification/services/deadline-service'
import { workflowService } from '@/lib/verification/services/workflow-service'
import { auditService } from '@/lib/verification/services/audit-service'
import { z } from 'zod'

// Query parameters validation
const statusQuerySchema = z.object({
  business_id: z.string().uuid('Invalid business ID format').optional(),
  status_filter: z.enum(['all', 'active', 'completed', 'overdue', 'critical']).default('all'),
  include_completed: z.coerce.boolean().default(false),
  date_range: z.enum(['today', 'week', 'month', 'all']).default('week'),
  sort_by: z.enum(['deadline', 'priority', 'progress', 'created_at']).default('deadline'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

type StatusQuery = z.infer<typeof statusQuerySchema>

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

    const validation = statusQuerySchema.safeParse(queryParams)
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

    // Calculate date range filter
    let dateFilter: string | null = null
    const now = new Date()

    switch (query.date_range) {
      case 'today':
        dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        break
      case 'week':
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        dateFilter = weekStart.toISOString()
        break
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        dateFilter = monthStart.toISOString()
        break
      case 'all':
      default:
        dateFilter = null
        break
    }

    // Build status filter
    let statusConditions: string[] = []
    switch (query.status_filter) {
      case 'active':
        statusConditions = ['not_started', 'in_progress', 'paused']
        break
      case 'completed':
        statusConditions = ['completed', 'auto_approved']
        break
      case 'overdue':
      case 'critical':
        statusConditions = ['not_started', 'in_progress', 'paused'] // Will filter by deadline later
        break
      case 'all':
      default:
        statusConditions = query.include_completed
          ? ['not_started', 'in_progress', 'paused', 'completed', 'auto_approved', 'expired']
          : ['not_started', 'in_progress', 'paused', 'expired']
        break
    }

    // Query verification sessions with batch information
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
        current_transaction_index,
        deadline,
        started_at,
        completed_at,
        average_risk_score,
        auto_approval_threshold,
        notes,
        payment_batches (
          id,
          week_number,
          year_number,
          total_amount,
          status,
          created_at
        )
      `)
      .eq('business_id', businessId)
      .in('status', statusConditions)

    if (dateFilter) {
      sessionQuery = sessionQuery.gte('created_at', dateFilter)
    }

    // Apply sorting
    switch (query.sort_by) {
      case 'deadline':
        sessionQuery = sessionQuery.order('deadline', { ascending: query.sort_order === 'asc' })
        break
      case 'progress':
        // Sort by completion percentage (calculated field, so we'll sort in memory)
        sessionQuery = sessionQuery.order('verified_transactions', { ascending: query.sort_order === 'asc' })
        break
      case 'created_at':
        sessionQuery = sessionQuery.order('created_at', { ascending: query.sort_order === 'asc' })
        break
      case 'priority':
        sessionQuery = sessionQuery.order('deadline', { ascending: true }) // Priority by urgency
        break
    }

    sessionQuery = sessionQuery.limit(query.limit)

    const { data: sessions, error: sessionError } = await sessionQuery

    if (sessionError) {
      await auditService.logActivity({
        event_type: 'unauthorized_access_attempt',
        actor_id: user.id,
        actor_type: 'user',
        business_id: businessId,
        category: 'business_process',
        severity: 'error',
        description: 'Failed to fetch verification status',
        details: { error: sessionError.message },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      })

      return NextResponse.json(
        { error: 'Failed to fetch verification status' },
        { status: 500 }
      )
    }

    // Process sessions and calculate enhanced status information
    const enhancedSessions = await Promise.all(
      (sessions || []).map(async (session) => {
        const batch = Array.isArray(session.payment_batches)
          ? session.payment_batches[0]
          : session.payment_batches

        // Calculate deadline status
        const deadlineDate = new Date(session.deadline)
        const hoursRemaining = Math.max(0, (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60))
        const isOverdue = deadlineDate < now
        const isCritical = hoursRemaining < 24 && !isOverdue
        const isUrgent = hoursRemaining < 6 && !isOverdue

        // Determine urgency level
        let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
        if (isOverdue) urgencyLevel = 'critical'
        else if (isUrgent) urgencyLevel = 'critical'
        else if (isCritical) urgencyLevel = 'high'
        else if (hoursRemaining < 72) urgencyLevel = 'medium'

        // Calculate progress metrics
        const completionPercentage = session.total_transactions > 0
          ? Math.round((session.verified_transactions / session.total_transactions) * 100)
          : 0

        const estimatedRemainingMinutes = session.total_transactions > 0
          ? Math.round(((session.total_transactions - session.verified_transactions) * 120) / 60)
          : 0

        // Calculate risk metrics
        const avgRiskScore = session.average_risk_score || 0
        const highRiskTransactionCount = session.rejected_count || 0
        const riskLevel = avgRiskScore > 70 ? 'high' : avgRiskScore > 40 ? 'medium' : 'low'

        return {
          id: session.id,
          batch_id: session.payment_batch_id,
          status: session.status,
          batch_info: {
            week_number: batch.week_number,
            year: batch.year_number,
            total_amount: batch.total_amount,
            batch_status: batch.status,
            created_at: batch.created_at,
          },
          progress: {
            total_transactions: session.total_transactions,
            verified_transactions: session.verified_transactions,
            pending_transactions: session.total_transactions - session.verified_transactions,
            completion_percentage: completionPercentage,
            approved_count: session.approved_count || 0,
            rejected_count: session.rejected_count || 0,
            current_index: session.current_transaction_index || 0,
          },
          deadline: {
            deadline_iso: session.deadline,
            hours_remaining: Math.floor(hoursRemaining),
            minutes_remaining: Math.floor((hoursRemaining % 1) * 60),
            is_overdue: isOverdue,
            is_critical: isCritical,
            is_urgent: isUrgent,
            urgency_level: urgencyLevel,
            formatted_time: isOverdue
              ? `${Math.floor((now.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60))}h overdue`
              : hoursRemaining >= 24
                ? `${Math.floor(hoursRemaining / 24)}d ${Math.floor(hoursRemaining % 24)}h`
                : `${Math.floor(hoursRemaining)}h ${Math.floor((hoursRemaining % 1) * 60)}m`,
          },
          risk_assessment: {
            average_risk_score: avgRiskScore,
            risk_level: riskLevel,
            high_risk_transaction_count: highRiskTransactionCount,
            requires_review: avgRiskScore > 70 || highRiskTransactionCount > 5,
            auto_approval_threshold: session.auto_approval_threshold || 30,
          },
          timeline: {
            started_at: session.started_at,
            completed_at: session.completed_at,
            estimated_completion_minutes: session.status === 'in_progress' ? estimatedRemainingMinutes : null,
            estimated_completion_date: session.status === 'in_progress' && estimatedRemainingMinutes > 0
              ? new Date(now.getTime() + estimatedRemainingMinutes * 60 * 1000).toISOString()
              : null,
          },
          notes: session.notes,
        }
      })
    )

    // Apply additional filtering for overdue/critical sessions
    let filteredSessions = enhancedSessions
    if (query.status_filter === 'overdue') {
      filteredSessions = enhancedSessions.filter(s => s.deadline.is_overdue)
    } else if (query.status_filter === 'critical') {
      filteredSessions = enhancedSessions.filter(s =>
        s.deadline.is_critical || s.deadline.is_urgent || s.deadline.is_overdue
      )
    }

    // Get urgency statistics using deadline service
    const urgencyStats = await deadlineService.getUrgencyStatistics(businessId)

    // Calculate overall business metrics
    const overallMetrics = {
      total_active_sessions: filteredSessions.filter(s =>
        ['not_started', 'in_progress', 'paused'].includes(s.status)
      ).length,
      total_completed_sessions: filteredSessions.filter(s =>
        ['completed', 'auto_approved'].includes(s.status)
      ).length,
      total_overdue_sessions: filteredSessions.filter(s => s.deadline.is_overdue).length,
      total_critical_sessions: filteredSessions.filter(s =>
        s.deadline.urgency_level === 'critical'
      ).length,
      average_completion_percentage: filteredSessions.length > 0
        ? Math.round(filteredSessions.reduce((sum, s) => sum + s.progress.completion_percentage, 0) / filteredSessions.length)
        : 0,
      total_pending_transactions: filteredSessions.reduce((sum, s) =>
        sum + s.progress.pending_transactions, 0
      ),
      high_risk_sessions: filteredSessions.filter(s => s.risk_assessment.risk_level === 'high').length,
    }

    const response = {
      sessions: filteredSessions,
      summary: {
        total_sessions: filteredSessions.length,
        urgency_breakdown: {
          critical: filteredSessions.filter(s => s.deadline.urgency_level === 'critical').length,
          high: filteredSessions.filter(s => s.deadline.urgency_level === 'high').length,
          medium: filteredSessions.filter(s => s.deadline.urgency_level === 'medium').length,
          low: filteredSessions.filter(s => s.deadline.urgency_level === 'low').length,
        },
        status_breakdown: {
          not_started: filteredSessions.filter(s => s.status === 'not_started').length,
          in_progress: filteredSessions.filter(s => s.status === 'in_progress').length,
          paused: filteredSessions.filter(s => s.status === 'paused').length,
          completed: filteredSessions.filter(s => s.status === 'completed').length,
          auto_approved: filteredSessions.filter(s => s.status === 'auto_approved').length,
          expired: filteredSessions.filter(s => s.status === 'expired').length,
        },
        overall_metrics: overallMetrics,
        urgency_statistics: urgencyStats,
      },
      filters_applied: {
        business_id: businessId,
        status_filter: query.status_filter,
        date_range: query.date_range,
        include_completed: query.include_completed,
        sort_by: query.sort_by,
        sort_order: query.sort_order,
      },
      generated_at: now.toISOString(),
      next_urgent_deadline: filteredSessions
        .filter(s => ['not_started', 'in_progress', 'paused'].includes(s.status))
        .sort((a, b) => new Date(a.deadline.deadline_iso).getTime() - new Date(b.deadline.deadline_iso).getTime())
        [0]?.deadline.deadline_iso || null,
    }

    // Log successful access
    await auditService.logActivity({
      event_type: 'user_login',
      actor_id: user.id,
      actor_type: 'user',
      business_id: businessId,
      category: 'business_process',
      severity: 'info',
      description: 'Verification status overview accessed',
      details: {
        status_filter: query.status_filter,
        date_range: query.date_range,
        sessions_returned: filteredSessions.length,
        active_sessions: overallMetrics.total_active_sessions,
        overdue_sessions: overallMetrics.total_overdue_sessions,
        critical_sessions: overallMetrics.total_critical_sessions,
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in /api/verification/status:', error)

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