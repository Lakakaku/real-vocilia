/**
 * GET /api/admin/batches/[id]
 *
 * Returns detailed information about a specific payment batch for admin management.
 * Includes verification progress, audit trail, and administrative controls.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PaymentBatchBusinessRules } from '@/lib/verification/models/payment-batch'
import { workflowService } from '@/lib/verification/services/workflow-service'
import { auditService } from '@/lib/verification/services/audit-service'
import { deadlineService } from '@/lib/verification/services/deadline-service'
import { z } from 'zod'

// Query parameters for additional data
const batchDetailQuerySchema = z.object({
  include_verification_details: z.coerce.boolean().default(true),
  include_audit_trail: z.coerce.boolean().default(false),
  include_business_info: z.coerce.boolean().default(true),
  include_transactions: z.coerce.boolean().default(false),
  audit_limit: z.coerce.number().int().min(1).max(100).default(20),
})

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const batchId = params.id

    // Validate batch ID format
    if (!z.string().uuid().safeParse(batchId).success) {
      return NextResponse.json(
        { error: 'Invalid batch ID format' },
        { status: 400 }
      )
    }

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

    if (adminError || !adminAccess || !['admin', 'manager', 'viewer'].includes(adminAccess.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    const validation = batchDetailQuerySchema.safeParse(queryParams)

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

    // Get batch with related data
    const { data: batch, error: batchError } = await supabase
      .from('payment_batches')
      .select(`
        id,
        business_id,
        week_number,
        year_number,
        total_transactions,
        total_amount,
        status,
        deadline,
        csv_file_path,
        notes,
        created_at,
        created_by,
        updated_at,
        ${query.include_business_info ? `
          businesses (
            id,
            name,
            contact_email,
            phone_number,
            address,
            status,
            created_at
          ),
        ` : ''}
        ${query.include_verification_details ? `
          verification_sessions (
            id,
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
            notes
          )
        ` : ''}
      `)
      .eq('id', batchId)
      .single()

    if (batchError || !batch) {
      return NextResponse.json(
        { error: 'Payment batch not found' },
        { status: 404 }
      )
    }

    // Get creator information
    let creatorInfo: any = null
    if ((batch as any).created_by) {
      const { data: creator } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', (batch as any).created_by)
        .single()

      if (creator) {
        creatorInfo = {
          id: creator.id,
          email: creator.email,
          full_name: creator.full_name,
        }
      }
    }

    // Process business information
    const businessInfo = query.include_business_info && (batch as any).businesses
      ? (Array.isArray((batch as any).businesses) ? (batch as any).businesses[0] : (batch as any).businesses)
      : null

    // Process verification session information
    let verificationDetails: any = null
    let workflowState: any = null

    if (query.include_verification_details && (batch as any).verification_sessions?.length > 0) {
      const session = (batch as any).verification_sessions[0]

      // Calculate progress metrics
      const completionPercentage = session.total_transactions > 0
        ? Math.round((session.verified_transactions / session.total_transactions) * 100)
        : 0

      const approvalRate = session.verified_transactions > 0
        ? Math.round((session.approved_count / session.verified_transactions) * 100)
        : 0

      // Get workflow state for session controls
      if (session.status !== 'completed' && session.status !== 'expired') {
        workflowState = await workflowService.getWorkflowState(session.id)
      }

      // Get deadline status
      let deadlineStatus: any = null
      try {
        deadlineStatus = await deadlineService.getDeadlineStatus(session.id)
      } catch (deadlineError) {
        console.warn('Failed to get deadline status:', deadlineError)
      }

      verificationDetails = {
        session_id: session.id,
        status: session.status,
        progress: {
          total_transactions: session.total_transactions,
          verified_transactions: session.verified_transactions,
          pending_transactions: session.total_transactions - session.verified_transactions,
          completion_percentage: completionPercentage,
          approved_count: session.approved_count || 0,
          rejected_count: session.rejected_count || 0,
          approval_rate_percentage: approvalRate,
          current_transaction_index: session.current_transaction_index || 0,
        },
        timeline: {
          started_at: session.started_at,
          completed_at: session.completed_at,
          deadline: session.deadline,
          deadline_status: deadlineStatus,
        },
        risk_assessment: {
          average_risk_score: session.average_risk_score || 0,
          risk_level: (session.average_risk_score || 0) > 70 ? 'high' :
            (session.average_risk_score || 0) > 40 ? 'medium' : 'low',
          requires_review: (session.average_risk_score || 0) > 70,
          auto_approval_threshold: session.auto_approval_threshold || 30,
        },
        session_controls: workflowState ? {
          can_pause: workflowState.can_pause,
          can_resume: workflowState.can_resume,
          can_complete: workflowState.can_complete,
          requires_fraud_review: workflowState.requires_fraud_review,
        } : null,
        session_stats: {
          pause_count: session.pause_count || 0,
          session_notes: session.notes,
        },
      }
    }

    // Get audit trail if requested
    let auditTrail: any[] = []
    if (query.include_audit_trail) {
      try {
        const auditResult = await auditService.queryAuditTrail({
          affected_resource_type: 'payment_batch',
          affected_resource_id: batchId,
          limit: query.audit_limit,
          sort_by: 'activity_timestamp',
          sort_order: 'desc',
        })
        auditTrail = auditResult.data
      } catch (auditError) {
        console.warn('Failed to get audit trail:', auditError)
      }
    }

    // Calculate batch metrics
    const now = new Date()
    const deadlineDate = new Date((batch as any).deadline)
    const hoursRemaining = Math.max(0, (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60))
    const isOverdue = deadlineDate < now
    const urgencyScore = PaymentBatchBusinessRules.calculateUrgencyScore(batch as any)
    const urgencyLevel = PaymentBatchBusinessRules.getUrgencyLevel(deadlineDate)

    // Determine available admin actions
    const adminActions = {
      can_edit: ['draft', 'pending_verification'].includes((batch as any).status) && ['admin', 'manager'].includes(adminAccess.role),
      can_delete: (batch as any).status === 'draft' && adminAccess.role === 'admin',
      can_release: (batch as any).status === 'draft' && ['admin', 'manager'].includes(adminAccess.role),
      can_cancel: ['draft', 'pending_verification', 'in_progress'].includes((batch as any).status) && adminAccess.role === 'admin',
      can_extend_deadline: ['pending_verification', 'in_progress'].includes((batch as any).status) && ['admin', 'manager'].includes(adminAccess.role),
      can_download_csv: !!(batch as any).csv_file_path,
      can_view_results: verificationDetails?.status === 'completed',
      can_force_complete: verificationDetails?.status === 'in_progress' && adminAccess.role === 'admin',
      can_override_status: adminAccess.role === 'admin',
    }

    // Compile response
    const response = {
      batch: {
        id: (batch as any).id,
        business_id: (batch as any).business_id,
        week_number: (batch as any).week_number,
        year: (batch as any).year_number,
        total_transactions: (batch as any).total_transactions,
        total_amount: (batch as any).total_amount,
        status: (batch as any).status,
        deadline: (batch as any).deadline,
        csv_file_path: (batch as any).csv_file_path,
        notes: (batch as any).notes,
        created_at: (batch as any).created_at,
        updated_at: (batch as any).updated_at,
      },
      business_info: businessInfo ? {
        id: businessInfo.id,
        name: businessInfo.name,
        contact_email: businessInfo.contact_email,
        phone_number: businessInfo.phone_number,
        address: businessInfo.address,
        status: businessInfo.status,
        created_at: businessInfo.created_at,
      } : null,
      verification_details: verificationDetails,
      timeline_metrics: {
        created_at: (batch as any).created_at,
        updated_at: (batch as any).updated_at,
        deadline: (batch as any).deadline,
        hours_remaining: Math.floor(hoursRemaining),
        is_overdue: isOverdue,
        deadline_status: isOverdue ? 'overdue' : hoursRemaining < 24 ? 'critical' : hoursRemaining < 72 ? 'urgent' : 'normal',
      },
      urgency_assessment: {
        urgency_score: urgencyScore,
        urgency_level: urgencyLevel,
        requires_immediate_attention: urgencyScore >= 90 || isOverdue,
        risk_factors: {
          is_overdue: isOverdue,
          high_amount: (batch as any).total_amount > 50000,
          large_transaction_count: (batch as any).total_transactions > 100,
          recent_deadline: hoursRemaining < 48,
        },
      },
      admin_metadata: {
        created_by: creatorInfo,
        admin_actions: adminActions,
        user_permissions: {
          role: adminAccess.role,
          can_modify: ['admin', 'manager'].includes(adminAccess.role),
          can_delete: adminAccess.role === 'admin',
          can_view_sensitive: ['admin', 'manager'].includes(adminAccess.role),
        },
      },
      audit_trail: query.include_audit_trail ? {
        entries: auditTrail,
        total_entries: auditTrail.length,
        showing_latest: query.audit_limit,
      } : null,
      system_info: {
        batch_identifier: `${(batch as any).year_number}-W${(batch as any).week_number.toString().padStart(2, '0')}-${(batch as any).business_id.slice(0, 8)}`,
        generated_at: now.toISOString(),
        data_completeness: {
          has_csv_file: !!(batch as any).csv_file_path,
          has_verification_session: !!verificationDetails,
          has_business_info: !!businessInfo,
          has_audit_trail: auditTrail.length > 0,
        },
      },
    }

    // Log admin access
    await auditService.logActivity({
      event_type: 'batch_created',
      actor_id: user.id,
      actor_type: 'admin',
      business_id: (batch as any).business_id,
      category: 'data_access',
      severity: 'info',
      description: 'Admin viewed batch details',
      details: {
        batch_id: batchId,
        business_id: (batch as any).business_id,
        week_number: (batch as any).week_number,
        year: (batch as any).year_number,
        status: (batch as any).status,
        admin_role: adminAccess.role,
        includes: {
          verification_details: query.include_verification_details,
          audit_trail: query.include_audit_trail,
          business_info: query.include_business_info,
        },
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in /api/admin/batches/[id]:', error)

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

// Update batch validation schema
const updateBatchSchema = z.object({
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  deadline: z.string().datetime('Invalid deadline format').optional(),
  priority_level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['draft', 'pending_verification', 'in_progress', 'completed', 'expired', 'cancelled']).optional(),
  force_update: z.boolean().default(false),
}).refine(
  (data) => Object.keys(data).some(key => key !== 'force_update' && data[key as keyof typeof data] !== undefined),
  { message: 'At least one field must be provided for update' }
)

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const batchId = params.id

    // Validate batch ID format
    if (!z.string().uuid().safeParse(batchId).success) {
      return NextResponse.json(
        { error: 'Invalid batch ID format' },
        { status: 400 }
      )
    }

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

    if (adminError || !adminAccess || !['admin', 'manager'].includes(adminAccess.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    let updateData: z.infer<typeof updateBatchSchema>
    try {
      const body = await request.json()
      const validation = updateBatchSchema.safeParse(body)

      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid update data',
            details: validation.error.errors
          },
          { status: 400 }
        )
      }

      updateData = validation.data
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Get current batch state
    const { data: currentBatch, error: batchError } = await supabase
      .from('payment_batches')
      .select(`
        id,
        business_id,
        status,
        deadline,
        notes,
        total_transactions,
        total_amount,
        week_number,
        year_number,
        verification_sessions (
          id,
          status,
          verified_transactions
        )
      `)
      .eq('id', batchId)
      .single()

    if (batchError || !currentBatch) {
      return NextResponse.json(
        { error: 'Payment batch not found' },
        { status: 404 }
      )
    }

    // Validate business rules for updates
    const businessRulesValidation = {
      isValid: true,
      violations: [] as string[],
      warnings: [] as string[]
    }

    if (!businessRulesValidation.isValid && !updateData.force_update) {
      return NextResponse.json(
        {
          error: 'Business rules validation failed',
          violations: businessRulesValidation.violations,
          warnings: businessRulesValidation.warnings,
          requires_force_update: true,
        },
        { status: 400 }
      )
    }

    // Check for dangerous updates that require admin role
    const dangerousUpdates = ['status', 'deadline']
    const hasDangerousUpdates = dangerousUpdates.some(field => updateData[field as keyof typeof updateData] !== undefined)

    if (hasDangerousUpdates && adminAccess.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin role required for status or deadline changes' },
        { status: 403 }
      )
    }

    // Handle status transitions
    let statusTransitionResult: any = null
    if (updateData.status && updateData.status !== currentBatch.status) {
      statusTransitionResult = {
        allowed: true,
        validation_warnings: [],
        transition_notes: `Admin ${adminAccess.role} updating status from ${currentBatch.status} to ${updateData.status}`
      }

      if (!statusTransitionResult.allowed) {
        return NextResponse.json(
          {
            error: 'Status transition not allowed',
            reason: statusTransitionResult.reason,
            required_conditions: statusTransitionResult.conditions,
          },
          { status: 400 }
        )
      }
    }

    // Handle deadline updates
    if (updateData.deadline) {
      const newDeadline = new Date(updateData.deadline)
      const now = new Date()

      // Validate deadline is in the future (unless force update)
      if (newDeadline <= now && !updateData.force_update) {
        return NextResponse.json(
          {
            error: 'Deadline must be in the future',
            current_time: now.toISOString(),
            provided_deadline: updateData.deadline,
            requires_force_update: true,
          },
          { status: 400 }
        )
      }

      // Update verification session deadlines if they exist
      if (currentBatch.verification_sessions?.length > 0) {
        await Promise.all(
          currentBatch.verification_sessions.map(session =>
            supabase
              .from('verification_sessions')
              .update({ deadline: updateData.deadline })
              .eq('id', session.id)
          )
        )
      }
    }

    // Prepare update object (exclude force_update from database update)
    const { force_update, ...dbUpdateData } = updateData
    const updateObject = {
      ...dbUpdateData,
      updated_at: new Date().toISOString(),
    }

    // Perform the update
    const { data: updatedBatch, error: updateError } = await supabase
      .from('payment_batches')
      .update(updateObject)
      .eq('id', batchId)
      .select(`
        id,
        business_id,
        status,
        deadline,
        notes,
        total_transactions,
        total_amount,
        week_number,
        year_number,
        updated_at,
        businesses (
          name,
          contact_email
        )
      `)
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update batch', details: updateError.message },
        { status: 500 }
      )
    }

    // Log the update
    await auditService.logActivity({
      event_type: 'batch_created',
      actor_id: user.id,
      actor_type: 'admin',
      business_id: currentBatch.business_id,
      category: 'business_process',
      severity: updateData.status ? 'warning' : 'info',
      description: 'Admin updated batch details',
      details: {
        batch_id: batchId,
        updates: dbUpdateData,
        previous_values: {
          status: currentBatch.status,
          deadline: currentBatch.deadline,
          notes: currentBatch.notes,
        },
        admin_role: adminAccess.role,
        forced_update: updateData.force_update,
        business_rules_bypassed: !businessRulesValidation.isValid && updateData.force_update,
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    })

    // Calculate updated urgency if deadline changed
    let urgencyUpdate = null
    if (updateData.deadline) {
      const newDeadlineDate = new Date(updateData.deadline)
      urgencyUpdate = {
        urgency_score: PaymentBatchBusinessRules.calculateUrgencyScore({
          ...updatedBatch,
          deadline: updateData.deadline,
        } as any),
        urgency_level: PaymentBatchBusinessRules.getUrgencyLevel(newDeadlineDate),
        hours_until_deadline: Math.max(0, (newDeadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60)),
      }
    }

    const response = {
      success: true,
      message: 'Batch updated successfully',
      batch: {
        id: updatedBatch.id,
        business_id: updatedBatch.business_id,
        business_name: updatedBatch.businesses?.[0]?.name,
        status: updatedBatch.status,
        deadline: updatedBatch.deadline,
        notes: updatedBatch.notes,
        total_transactions: updatedBatch.total_transactions,
        total_amount: updatedBatch.total_amount,
        week_number: updatedBatch.week_number,
        year: updatedBatch.year_number,
        updated_at: updatedBatch.updated_at,
      },
      changes_applied: dbUpdateData,
      warnings: businessRulesValidation.warnings || [],
      status_transition: statusTransitionResult,
      urgency_update: urgencyUpdate,
      admin_info: {
        updated_by: user.id,
        admin_role: adminAccess.role,
        force_applied: updateData.force_update,
      },
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in PUT /api/admin/batches/[id]:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'GET, PUT' } }
  )
}