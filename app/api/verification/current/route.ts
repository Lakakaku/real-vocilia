/**
 * GET /api/verification/current
 *
 * Returns current active verification session for the authenticated business.
 * Includes session details, progress, deadline status, and next transaction to verify.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { workflowService } from '@/lib/verification/services/workflow-service'
import { deadlineService } from '@/lib/verification/services/deadline-service'
import { auditService } from '@/lib/verification/services/audit-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user and business context
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get business ID from user metadata or query parameter
    const url = new URL(request.url)
    const businessId = url.searchParams.get('business_id') || user.user_metadata?.business_id

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

    // Find current active verification session
    const { data: sessions, error: sessionError } = await supabase
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
        notes,
        average_risk_score,
        payment_batches (
          id,
          week_number,
          year_number,
          total_amount,
          csv_file_path,
          created_at
        )
      `)
      .eq('business_id', businessId)
      .in('status', ['not_started', 'in_progress', 'paused'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (sessionError) {
      await auditService.logActivity({
        event_type: 'unauthorized_access_attempt',
        actor_id: user.id,
        actor_type: 'user',
        business_id: businessId,
        category: 'business_process',
        severity: 'error',
        description: 'Failed to fetch current verification session',
        details: { error: sessionError.message },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      })

      return NextResponse.json(
        { error: 'Failed to fetch verification session' },
        { status: 500 }
      )
    }

    // If no active session, return null
    if (!sessions || sessions.length === 0) {
      await auditService.logActivity({
        event_type: 'user_login',
        actor_id: user.id,
        actor_type: 'user',
        business_id: businessId,
        category: 'business_process',
        severity: 'info',
        description: 'No active verification session found',
        details: { has_active_session: false },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      })

      return NextResponse.json({
        session: null,
        has_active_session: false
      })
    }

    const session = sessions[0]
    const batch = Array.isArray(session.payment_batches) ? session.payment_batches[0] : session.payment_batches

    // Get detailed workflow state
    const workflowState = await workflowService.getWorkflowState(session.id)
    if (!workflowState) {
      return NextResponse.json(
        { error: 'Failed to get session state' },
        { status: 500 }
      )
    }

    // Get deadline status with countdown
    const deadlineStatus = await deadlineService.getDeadlineStatus(session.id)

    // Calculate next transaction to verify
    const currentIndex = session.current_transaction_index || 0
    let nextTransaction = null

    if (currentIndex < session.total_transactions) {
      // Get the next transaction from the batch
      // This would typically come from parsed CSV data or transaction records
      nextTransaction = {
        index: currentIndex + 1,
        id: `tx-${session.payment_batch_id}-${currentIndex + 1}`,
        amount: 0, // Would be populated from actual transaction data
        recipient: `recipient-${currentIndex + 1}`, // Would be populated from actual data
        reference: `REF-${currentIndex + 1}`,
      }
    }

    // Calculate progress metrics
    const completionPercentage = session.total_transactions > 0
      ? Math.round((session.verified_transactions / session.total_transactions) * 100)
      : 0

    const estimatedRemainingMinutes = session.total_transactions > 0
      ? Math.round(((session.total_transactions - session.verified_transactions) * 120) / 60) // 2 min avg
      : 0

    // Prepare response
    const response = {
      session: {
        id: session.id,
        batch_id: session.payment_batch_id,
        business_id: session.business_id,
        status: session.status,
        created_at: session.started_at,
        notes: session.notes,
        batch_info: {
          week_number: batch.week_number,
          year: batch.year_number,
          total_amount: batch.total_amount,
          created_at: batch.created_at,
          csv_file_path: batch.csv_file_path,
        },
        progress: {
          total_transactions: session.total_transactions,
          verified_transactions: session.verified_transactions,
          approved_count: session.approved_count,
          rejected_count: session.rejected_count,
          completion_percentage: completionPercentage,
          current_transaction_index: currentIndex,
        },
        deadline: {
          deadline_iso: session.deadline,
          hours_remaining: deadlineStatus.hours_remaining,
          minutes_remaining: deadlineStatus.minutes_remaining,
          is_overdue: deadlineStatus.is_overdue,
          is_critical: deadlineStatus.is_critical,
          is_urgent: deadlineStatus.is_urgent,
          urgency_level: deadlineStatus.urgency_level,
          formatted_time_remaining: deadlineStatus.formatted_time_remaining,
        },
        risk_assessment: {
          average_risk_score: session.average_risk_score || 0,
          requires_review: (session.average_risk_score || 0) > 70,
          high_risk_transactions: session.rejected_count || 0,
        },
        workflow_state: {
          can_pause: workflowState.can_pause,
          can_resume: workflowState.can_resume,
          can_complete: workflowState.can_complete,
          requires_fraud_review: workflowState.requires_fraud_review,
        },
        estimates: {
          estimated_completion_time_minutes: estimatedRemainingMinutes,
          estimated_completion_date: estimatedRemainingMinutes > 0
            ? new Date(Date.now() + estimatedRemainingMinutes * 60 * 1000).toISOString()
            : null,
        },
      },
      next_transaction: nextTransaction,
      has_active_session: true,
      countdown_config: {
        poll_interval_ms: deadlineStatus.is_urgent ? 10000 : deadlineStatus.is_critical ? 30000 : 60000,
        should_poll: !deadlineStatus.is_overdue,
        next_poll_at: new Date(Date.now() + (deadlineStatus.is_urgent ? 10000 : 60000)).toISOString(),
      },
    }

    // Log successful access
    await auditService.logActivity({
      event_type: 'user_login',
      actor_id: user.id,
      actor_type: 'user',
      business_id: businessId,
      category: 'business_process',
      severity: 'info',
      description: 'Current verification session retrieved',
      details: {
        session_id: session.id,
        batch_id: session.payment_batch_id,
        status: session.status,
        completion_percentage: completionPercentage,
        hours_remaining: deadlineStatus.hours_remaining,
        urgency_level: deadlineStatus.urgency_level,
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in /api/verification/current:', error)

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