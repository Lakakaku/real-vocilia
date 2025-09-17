/**
 * POST /api/admin/batches/[id]/release
 *
 * Releases a draft batch for verification.
 * Creates verification session and transitions batch to pending_verification status.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PaymentBatchBusinessRules } from '@/lib/verification/models/payment-batch'
import { workflowService } from '@/lib/verification/services/workflow-service'
import { auditService } from '@/lib/verification/services/audit-service'
import { deadlineService } from '@/lib/verification/services/deadline-service'
import { z } from 'zod'

// Request validation schema
const releaseBatchSchema = z.object({
  verification_deadline: z.string().datetime('Invalid deadline format').optional(),
  auto_start_verification: z.boolean().default(true),
  verification_priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
  force_release: z.boolean().default(false),
})

type ReleaseBatchRequest = z.infer<typeof releaseBatchSchema>

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(
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
    let requestData: ReleaseBatchRequest
    try {
      const body = await request.json()
      const validation = releaseBatchSchema.safeParse(body)

      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Invalid request data',
            details: validation.error.errors
          },
          { status: 400 }
        )
      }

      requestData = validation.data
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Get batch with current state and related info
    const { data: batch, error: batchError } = await supabase
      .from('payment_batches')
      .select(`
        id,
        business_id,
        status,
        deadline,
        total_transactions,
        total_amount,
        csv_file_path,
        week_number,
        year_number,
        notes,
        created_by,
        businesses (
          id,
          name,
          contact_email,
          status
        ),
        verification_sessions (
          id,
          status
        )
      `)
      .eq('id', batchId)
      .single()

    if (batchError || !batch) {
      return NextResponse.json(
        { error: 'Payment batch not found' },
        { status: 404 }
      )
    }

    // Validate batch can be released
    if (batch.status !== 'draft') {
      return NextResponse.json(
        {
          error: 'Batch cannot be released',
          reason: `Batch status is '${batch.status}', expected 'draft'`,
          current_status: batch.status,
        },
        { status: 400 }
      )
    }

    // Check if batch already has a verification session
    if (batch.verification_sessions && batch.verification_sessions.length > 0) {
      return NextResponse.json(
        {
          error: 'Batch already has verification session',
          session_id: batch.verification_sessions[0].id,
          session_status: batch.verification_sessions[0].status,
        },
        { status: 409 }
      )
    }

    // Validate business rules for release
    const releaseValidation = PaymentBatchBusinessRules.validateBatchRelease(
      batch,
      requestData,
      adminAccess.role
    )

    if (!releaseValidation.isValid && !requestData.force_release) {
      return NextResponse.json(
        {
          error: 'Release validation failed',
          violations: releaseValidation.violations,
          warnings: releaseValidation.warnings,
          requirements: releaseValidation.requirements,
          requires_force_release: true,
        },
        { status: 400 }
      )
    }

    // Verify business is active
    if (batch.businesses?.status !== 'active') {
      return NextResponse.json(
        {
          error: 'Cannot release batch for inactive business',
          business_status: batch.businesses?.status,
          business_id: batch.business_id,
        },
        { status: 400 }
      )
    }

    // Calculate verification deadline
    let verificationDeadline: string
    if (requestData.verification_deadline) {
      verificationDeadline = requestData.verification_deadline

      // Validate custom deadline is reasonable
      const customDeadline = new Date(verificationDeadline)
      const now = new Date()
      const maxAllowedDeadline = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)) // 30 days

      if (customDeadline <= now && !requestData.force_release) {
        return NextResponse.json(
          {
            error: 'Verification deadline must be in the future',
            provided_deadline: verificationDeadline,
            current_time: now.toISOString(),
            requires_force_release: true,
          },
          { status: 400 }
        )
      }

      if (customDeadline > maxAllowedDeadline && !requestData.force_release) {
        return NextResponse.json(
          {
            error: 'Verification deadline too far in future',
            provided_deadline: verificationDeadline,
            max_allowed: maxAllowedDeadline.toISOString(),
            requires_force_release: true,
          },
          { status: 400 }
        )
      }
    } else {
      // Use business rules to calculate default deadline
      verificationDeadline = deadlineService.calculateVerificationDeadline({
        batch_amount: batch.total_amount,
        transaction_count: batch.total_transactions,
        business_tier: 'standard',
        priority: requestData.verification_priority,
      })
    }

    // Start database transaction for atomic release
    const { data: releaseResult, error: releaseError } = await supabase.rpc('release_batch_for_verification', {
      p_batch_id: batchId,
      p_verification_deadline: verificationDeadline,
      p_auto_start: requestData.auto_start_verification,
      p_priority: requestData.verification_priority,
      p_admin_notes: requestData.notes || null,
      p_released_by: user.id,
    })

    if (releaseError || !releaseResult) {
      return NextResponse.json(
        {
          error: 'Failed to release batch',
          details: releaseError?.message || 'Unknown database error',
        },
        { status: 500 }
      )
    }

    const { session_id, batch_status } = releaseResult

    // Initialize workflow state if auto-start is enabled
    let workflowState = null
    if (requestData.auto_start_verification) {
      try {
        workflowState = await workflowService.initializeVerificationSession({
          session_id,
          batch_id: batchId,
          business_id: batch.business_id,
          auto_start: true,
        })
      } catch (workflowError) {
        console.warn('Failed to initialize workflow:', workflowError)
        // Don't fail the release, just log warning
      }
    }

    // Calculate urgency metrics for the released batch
    const urgencyScore = PaymentBatchBusinessRules.calculateUrgencyScore({
      ...batch,
      deadline: verificationDeadline,
      status: batch_status,
    })

    const urgencyLevel = PaymentBatchBusinessRules.getUrgencyLevel(new Date(verificationDeadline))

    // Log the release
    await auditService.logActivity({
      event_type: 'batch_released',
      actor_id: user.id,
      actor_type: 'admin',
      business_id: batch.business_id,
      category: 'business_process',
      severity: 'warning', // Important business operation
      description: 'Admin released batch for verification',
      details: {
        batch_id: batchId,
        business_name: batch.businesses?.name,
        week_number: batch.week_number,
        year_number: batch.year_number,
        total_transactions: batch.total_transactions,
        total_amount: batch.total_amount,
        verification_deadline: verificationDeadline,
        verification_priority: requestData.verification_priority,
        auto_start_verification: requestData.auto_start_verification,
        session_id,
        admin_role: adminAccess.role,
        forced_release: requestData.force_release,
        business_rules_bypassed: !releaseValidation.isValid && requestData.force_release,
        urgency_score: urgencyScore,
        urgency_level: urgencyLevel,
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    })

    const response = {
      success: true,
      message: 'Batch released for verification successfully',
      batch: {
        id: batchId,
        business_id: batch.business_id,
        business_name: batch.businesses?.name,
        status: batch_status,
        verification_deadline: verificationDeadline,
        total_transactions: batch.total_transactions,
        total_amount: batch.total_amount,
        week_number: batch.week_number,
        year: batch.year_number,
      },
      verification_session: {
        id: session_id,
        status: requestData.auto_start_verification ? 'in_progress' : 'pending',
        deadline: verificationDeadline,
        priority: requestData.verification_priority,
        auto_started: requestData.auto_start_verification,
      },
      urgency_assessment: {
        urgency_score: urgencyScore,
        urgency_level: urgencyLevel,
        hours_until_deadline: Math.max(0, (new Date(verificationDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60)),
        requires_immediate_attention: urgencyScore >= 90,
      },
      workflow_state: workflowState,
      warnings: releaseValidation.warnings || [],
      release_info: {
        released_by: user.id,
        released_at: new Date().toISOString(),
        admin_role: adminAccess.role,
        force_applied: requestData.force_release,
        custom_deadline_used: !!requestData.verification_deadline,
      },
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in POST /api/admin/batches/[id]/release:', error)

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
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'POST' } }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'POST' } }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'POST' } }
  )
}