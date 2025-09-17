/**
 * GET /api/admin/batches
 *
 * Returns paginated list of payment batches for admin management.
 * Includes filtering, sorting, and batch status overview for administrative operations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PaymentBatchBusinessRules } from '@/lib/verification/models/payment-batch'
import { auditService } from '@/lib/verification/services/audit-service'
import { z } from 'zod'

// Query parameters validation
const adminBatchesQuerySchema = z.object({
  business_id: z.string().uuid('Invalid business ID format').optional(),
  status: z.enum(['all', 'draft', 'pending_verification', 'in_progress', 'completed', 'auto_approved', 'expired']).default('all'),
  week_number: z.coerce.number().int().min(1).max(53).optional(),
  year: z.coerce.number().int().min(2024).max(2030).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
  sort_by: z.enum(['created_at', 'deadline', 'week_number', 'total_amount', 'urgency_score']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  include_verification_data: z.coerce.boolean().default(true),
  include_business_info: z.coerce.boolean().default(false),
  urgency_filter: z.enum(['all', 'critical', 'high', 'medium', 'low']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

type AdminBatchesQuery = z.infer<typeof adminBatchesQuerySchema>

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

    if (adminError || !adminAccess || !['admin', 'manager'].includes(adminAccess.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())

    const validation = adminBatchesQuerySchema.safeParse(queryParams)
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

    // Build base query with business information if requested
    let batchQuery = supabase
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
            status
          ),
        ` : ''}
        ${query.include_verification_data ? `
          verification_sessions (
            id,
            status,
            verified_transactions,
            approved_count,
            rejected_count,
            average_risk_score,
            started_at,
            completed_at
          )
        ` : ''}
      `, { count: 'exact' })

    // Apply filters
    if (query.business_id) {
      batchQuery = batchQuery.eq('business_id', query.business_id)
    }

    if (query.status !== 'all') {
      batchQuery = batchQuery.eq('status', query.status)
    }

    if (query.week_number) {
      batchQuery = batchQuery.eq('week_number', query.week_number)
    }

    if (query.year) {
      batchQuery = batchQuery.eq('year_number', query.year)
    }

    if (query.date_from) {
      batchQuery = batchQuery.gte('created_at', query.date_from)
    }

    if (query.date_to) {
      batchQuery = batchQuery.lte('created_at', query.date_to)
    }

    // Apply sorting
    switch (query.sort_by) {
      case 'created_at':
        batchQuery = batchQuery.order('created_at', { ascending: query.sort_order === 'asc' })
        break
      case 'deadline':
        batchQuery = batchQuery.order('deadline', { ascending: query.sort_order === 'asc' })
        break
      case 'week_number':
        batchQuery = batchQuery.order('year_number', { ascending: query.sort_order === 'asc' })
          .order('week_number', { ascending: query.sort_order === 'asc' })
        break
      case 'total_amount':
        batchQuery = batchQuery.order('total_amount', { ascending: query.sort_order === 'asc' })
        break
      case 'urgency_score':
        // Will sort by urgency in memory after calculating scores
        batchQuery = batchQuery.order('deadline', { ascending: true })
        break
    }

    // Apply pagination
    const offset = (query.page - 1) * query.limit
    batchQuery = batchQuery.range(offset, offset + query.limit - 1)

    const { data: batches, error: batchError, count } = await batchQuery

    if (batchError) {
      await auditService.logActivity({
        event_type: 'unauthorized_access_attempt',
        actor_id: user.id,
        actor_type: 'admin',
        business_id: 'system',
        category: 'data_access',
        severity: 'error',
        description: 'Failed to fetch admin batches list',
        details: { error: batchError.message },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      })

      return NextResponse.json(
        { error: 'Failed to fetch payment batches' },
        { status: 500 }
      )
    }

    // Process and enhance batch data
    const enhancedBatches = (batches || []).map((batch) => {
      const verificationSession = query.include_verification_data && batch.verification_sessions?.length > 0
        ? batch.verification_sessions[0]
        : null

      const businessInfo = query.include_business_info && batch.businesses
        ? (Array.isArray(batch.businesses) ? batch.businesses[0] : batch.businesses)
        : null

      // Calculate urgency score
      const urgencyScore = PaymentBatchBusinessRules.calculateUrgencyScore(batch)
      const urgencyLevel = PaymentBatchBusinessRules.getUrgencyLevel(new Date(batch.deadline))

      // Calculate verification progress
      let verificationProgress = null
      if (verificationSession) {
        const completionPercentage = batch.total_transactions > 0
          ? Math.round((verificationSession.verified_transactions / batch.total_transactions) * 100)
          : 0

        const approvalRate = verificationSession.verified_transactions > 0
          ? Math.round((verificationSession.approved_count / verificationSession.verified_transactions) * 100)
          : 0

        verificationProgress = {
          session_id: verificationSession.id,
          session_status: verificationSession.status,
          completion_percentage: completionPercentage,
          verified_transactions: verificationSession.verified_transactions,
          approved_count: verificationSession.approved_count || 0,
          rejected_count: verificationSession.rejected_count || 0,
          approval_rate_percentage: approvalRate,
          average_risk_score: verificationSession.average_risk_score || 0,
          started_at: verificationSession.started_at,
          completed_at: verificationSession.completed_at,
        }
      }

      // Calculate time metrics
      const now = new Date()
      const deadlineDate = new Date(batch.deadline)
      const hoursRemaining = Math.max(0, (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60))
      const isOverdue = deadlineDate < now

      return {
        id: batch.id,
        business_id: batch.business_id,
        business_info: businessInfo ? {
          name: businessInfo.name,
          contact_email: businessInfo.contact_email,
          phone_number: businessInfo.phone_number,
          status: businessInfo.status,
        } : null,
        batch_details: {
          week_number: batch.week_number,
          year: batch.year_number,
          total_transactions: batch.total_transactions,
          total_amount: batch.total_amount,
          status: batch.status,
          csv_file_path: batch.csv_file_path,
        },
        timeline: {
          created_at: batch.created_at,
          updated_at: batch.updated_at,
          deadline: batch.deadline,
          hours_remaining: Math.floor(hoursRemaining),
          is_overdue: isOverdue,
          deadline_status: isOverdue ? 'overdue' : hoursRemaining < 24 ? 'critical' : hoursRemaining < 72 ? 'urgent' : 'normal',
        },
        urgency: {
          urgency_score: urgencyScore,
          urgency_level: urgencyLevel,
          requires_immediate_attention: urgencyScore >= 90 || isOverdue,
        },
        verification_progress: verificationProgress,
        admin_info: {
          created_by: batch.created_by,
          notes: batch.notes,
          last_updated: batch.updated_at,
        },
        actions_available: {
          can_edit: ['draft', 'pending_verification'].includes(batch.status),
          can_release: batch.status === 'draft',
          can_cancel: ['draft', 'pending_verification', 'in_progress'].includes(batch.status),
          can_extend_deadline: ['pending_verification', 'in_progress'].includes(batch.status),
          can_download_csv: !!batch.csv_file_path,
          can_view_results: verificationSession?.status === 'completed',
        },
      }
    })

    // Apply search filter
    let filteredBatches = enhancedBatches
    if (query.search) {
      const searchTerm = query.search.toLowerCase()
      filteredBatches = enhancedBatches.filter(batch =>
        batch.id.toLowerCase().includes(searchTerm) ||
        batch.business_id.toLowerCase().includes(searchTerm) ||
        batch.batch_details.week_number.toString().includes(searchTerm) ||
        batch.batch_details.year.toString().includes(searchTerm) ||
        (batch.business_info?.name && batch.business_info.name.toLowerCase().includes(searchTerm)) ||
        (batch.admin_info.notes && batch.admin_info.notes.toLowerCase().includes(searchTerm))
      )
    }

    // Apply urgency filter
    if (query.urgency_filter !== 'all') {
      filteredBatches = filteredBatches.filter(batch =>
        batch.urgency.urgency_level === query.urgency_filter
      )
    }

    // Apply memory-based sorting for urgency score
    if (query.sort_by === 'urgency_score') {
      filteredBatches.sort((a, b) => {
        return query.sort_order === 'desc'
          ? b.urgency.urgency_score - a.urgency.urgency_score
          : a.urgency.urgency_score - b.urgency.urgency_score
      })
    }

    // Calculate summary statistics
    const summary = {
      total_batches: count || 0,
      filtered_batches: filteredBatches.length,
      status_breakdown: {
        draft: filteredBatches.filter(b => b.batch_details.status === 'draft').length,
        pending_verification: filteredBatches.filter(b => b.batch_details.status === 'pending_verification').length,
        in_progress: filteredBatches.filter(b => b.batch_details.status === 'in_progress').length,
        completed: filteredBatches.filter(b => b.batch_details.status === 'completed').length,
        auto_approved: filteredBatches.filter(b => b.batch_details.status === 'auto_approved').length,
        expired: filteredBatches.filter(b => b.batch_details.status === 'expired').length,
      },
      urgency_breakdown: {
        critical: filteredBatches.filter(b => b.urgency.urgency_level === 'critical').length,
        high: filteredBatches.filter(b => b.urgency.urgency_level === 'high').length,
        medium: filteredBatches.filter(b => b.urgency.urgency_level === 'medium').length,
        low: filteredBatches.filter(b => b.urgency.urgency_level === 'low').length,
      },
      requires_attention: filteredBatches.filter(b => b.urgency.requires_immediate_attention).length,
      overdue_batches: filteredBatches.filter(b => b.timeline.is_overdue).length,
      total_amount: filteredBatches.reduce((sum, b) => sum + b.batch_details.total_amount, 0),
      total_transactions: filteredBatches.reduce((sum, b) => sum + b.batch_details.total_transactions, 0),
    }

    const response = {
      batches: filteredBatches,
      pagination: {
        current_page: query.page,
        total_pages: Math.ceil((count || 0) / query.limit),
        total_items: count || 0,
        items_per_page: query.limit,
        has_next_page: query.page < Math.ceil((count || 0) / query.limit),
        has_previous_page: query.page > 1,
      },
      summary,
      filters_applied: {
        business_id: query.business_id,
        status: query.status,
        urgency_filter: query.urgency_filter,
        week_number: query.week_number,
        year: query.year,
        date_from: query.date_from,
        date_to: query.date_to,
        search: query.search,
        sort_by: query.sort_by,
        sort_order: query.sort_order,
      },
      generated_at: new Date().toISOString(),
    }

    // Log admin access
    await auditService.logActivity({
      event_type: 'admin_batches_accessed',
      actor_id: user.id,
      actor_type: 'admin',
      business_id: 'system',
      category: 'data_access',
      severity: 'info',
      description: 'Admin payment batches list accessed',
      details: {
        filters: {
          status: query.status,
          urgency_filter: query.urgency_filter,
          business_id: query.business_id,
        },
        batches_returned: filteredBatches.length,
        page: query.page,
        include_verification_data: query.include_verification_data,
        include_business_info: query.include_business_info,
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in /api/admin/batches:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/batches
 *
 * Creates a new payment batch for a business with admin oversight.
 * Used by admin users to manually create batches for businesses.
 */
export async function POST(request: NextRequest) {
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

    if (adminError || !adminAccess || !['admin', 'manager'].includes(adminAccess.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse request body
    const requestBody = await request.json()

    // Validation schema for batch creation
    const createBatchSchema = z.object({
      business_id: z.string().uuid('Invalid business ID format'),
      week_number: z.number().int().min(1).max(53),
      year: z.number().int().min(2024).max(2030),
      total_transactions: z.number().int().min(1),
      total_amount: z.number().min(0.01),
      status: z.enum(['draft', 'pending_verification']).default('draft'),
      notes: z.string().max(1000).optional(),
      custom_deadline: z.string().datetime().optional(),
      auto_create_session: z.boolean().default(false),
    })

    const validation = createBatchSchema.safeParse(requestBody)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const batchData = validation.data

    // Verify business exists and is active
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, status')
      .eq('id', batchData.business_id)
      .single()

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    if (business.status !== 'active') {
      return NextResponse.json(
        { error: 'Business is not active' },
        { status: 400 }
      )
    }

    // Check for existing batch
    const { data: existingBatches } = await supabase
      .from('payment_batches')
      .select('id, status')
      .eq('business_id', batchData.business_id)
      .eq('week_number', batchData.week_number)
      .eq('year_number', batchData.year)

    const batchValidation = PaymentBatchBusinessRules.validateBatchCreation({
      business_id: batchData.business_id,
      week_number: batchData.week_number,
      year: batchData.year,
      existing_batches: existingBatches || [],
    })

    if (!batchValidation.valid) {
      return NextResponse.json(
        {
          error: 'Batch creation validation failed',
          details: batchValidation.errors
        },
        { status: 400 }
      )
    }

    // Calculate deadline
    const deadline = batchData.custom_deadline
      ? new Date(batchData.custom_deadline)
      : PaymentBatchBusinessRules.calculateDeadline()

    // Create the payment batch
    const { data: batch, error: batchError } = await supabase
      .from('payment_batches')
      .insert({
        business_id: batchData.business_id,
        week_number: batchData.week_number,
        year_number: batchData.year,
        total_transactions: batchData.total_transactions,
        total_amount: batchData.total_amount,
        status: batchData.status,
        deadline: deadline.toISOString(),
        notes: batchData.notes,
        created_by: user.id,
      })
      .select()
      .single()

    if (batchError) {
      await auditService.logActivity({
        event_type: 'batch_creation_failed',
        actor_id: user.id,
        actor_type: 'admin',
        business_id: batchData.business_id,
        category: 'data_access',
        severity: 'error',
        description: 'Failed to create payment batch via admin',
        details: {
          business_id: batchData.business_id,
          week_number: batchData.week_number,
          year: batchData.year,
          error: batchError.message,
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      })

      return NextResponse.json(
        { error: 'Failed to create payment batch' },
        { status: 500 }
      )
    }

    // Auto-create verification session if requested
    let sessionId: string | null = null
    if (batchData.auto_create_session && batchData.status === 'pending_verification') {
      try {
        const { data: session, error: sessionError } = await supabase
          .from('verification_sessions')
          .insert({
            payment_batch_id: batch.id,
            business_id: batchData.business_id,
            status: 'not_started',
            total_transactions: batchData.total_transactions,
            verified_transactions: 0,
            approved_count: 0,
            rejected_count: 0,
            current_transaction_index: 0,
            deadline: deadline.toISOString(),
            auto_approval_threshold: 30,
          })
          .select('id')
          .single()

        if (!sessionError && session) {
          sessionId = session.id
        }
      } catch (sessionError) {
        console.warn('Failed to auto-create verification session:', sessionError)
        // Continue - batch created successfully
      }
    }

    // Log successful creation
    await auditService.logActivity({
      event_type: 'batch_created',
      actor_id: user.id,
      actor_type: 'admin',
      business_id: batchData.business_id,
      category: 'data_access',
      severity: 'info',
      description: 'Payment batch created by admin',
      details: {
        batch_id: batch.id,
        business_id: batchData.business_id,
        business_name: business.name,
        week_number: batchData.week_number,
        year: batchData.year,
        total_transactions: batchData.total_transactions,
        total_amount: batchData.total_amount,
        status: batchData.status,
        deadline: deadline.toISOString(),
        auto_create_session: batchData.auto_create_session,
        session_id: sessionId,
        custom_deadline: !!batchData.custom_deadline,
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    })

    const response = {
      success: true,
      message: 'Payment batch created successfully',
      batch: {
        id: batch.id,
        business_id: batch.business_id,
        business_name: business.name,
        week_number: batch.week_number,
        year: batch.year_number,
        total_transactions: batch.total_transactions,
        total_amount: batch.total_amount,
        status: batch.status,
        deadline: batch.deadline,
        created_at: batch.created_at,
        created_by: batch.created_by,
        notes: batch.notes,
      },
      verification_session: sessionId ? {
        id: sessionId,
        status: 'not_started',
        auto_created: true,
      } : null,
      urgency_info: {
        urgency_score: PaymentBatchBusinessRules.calculateUrgencyScore(batch),
        urgency_level: PaymentBatchBusinessRules.getUrgencyLevel(deadline),
        hours_until_deadline: Math.floor((deadline.getTime() - Date.now()) / (1000 * 60 * 60)),
      },
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/admin/batches:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'GET, POST' } }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'GET, POST' } }
  )
}