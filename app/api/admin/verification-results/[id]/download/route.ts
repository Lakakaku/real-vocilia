/**
 * GET /api/admin/verification-results/[id]/download
 *
 * Downloads verification results for a specific session as CSV or JSON.
 * Includes comprehensive audit information and admin metadata.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { csvService } from '@/lib/verification/services/csv-service'
import { auditService } from '@/lib/verification/services/audit-service'
import { z } from 'zod'

// Query parameters validation schema
const downloadQuerySchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
  include_metadata: z.coerce.boolean().default(true),
  include_fraud_assessment: z.coerce.boolean().default(true),
  include_audit_trail: z.coerce.boolean().default(false),
  include_timing_data: z.coerce.boolean().default(true),
  compression: z.enum(['none', 'gzip']).default('none'),
  audit_limit: z.coerce.number().int().min(1).max(500).default(100),
})

type DownloadQuery = z.infer<typeof downloadQuerySchema>

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
    const sessionId = params.id

    // Validate session ID format
    if (!z.string().uuid().safeParse(sessionId).success) {
      return NextResponse.json(
        { error: 'Invalid session ID format' },
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

    if (adminError || !adminAccess) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    const validation = downloadQuerySchema.safeParse(queryParams)

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

    // Get verification session with complete details
    const { data: session, error: sessionError } = await supabase
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
          status as batch_status,
          notes as batch_notes,
          created_by,
          created_at as batch_created_at
        ),
        businesses (
          id,
          name,
          contact_email,
          phone_number,
          address,
          status as business_status,
          created_at as business_created_at
        )
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Verification session not found' },
        { status: 404 }
      )
    }

    // Check admin access to this business (unless admin role has global access)
    if (adminAccess.role !== 'admin') {
      const { data: businessAccess, error: accessError } = await supabase
        .from('business_users')
        .select('role')
        .eq('business_id', (session as any).business_id)
        .eq('user_id', user.id)
        .single()

      if (accessError || !businessAccess) {
        return NextResponse.json(
          { error: 'Access denied to this business verification data' },
          { status: 403 }
        )
      }
    }

    // Get verification results
    const { data: results, error: resultsError } = await supabase
      .from('verification_results')
      .select(`
        id,
        transaction_id,
        decision,
        reason,
        notes,
        verified_by,
        verified_at,
        verification_time_seconds,
        is_flagged,
        risk_score,
        fraud_indicators,
        created_at,
        updated_at
      `)
      .eq('verification_session_id', sessionId)
      .order('verified_at', { ascending: true })

    if (resultsError) {
      return NextResponse.json(
        { error: 'Failed to fetch verification results', details: resultsError.message },
        { status: 500 }
      )
    }

    // Get fraud assessments if requested
    let fraudAssessments: any[] = []
    if (query.include_fraud_assessment && results) {
      const { data: assessments, error: assessmentsError } = await supabase
        .from('fraud_assessments')
        .select(`
          id,
          transaction_id,
          risk_level,
          risk_score,
          confidence,
          fraud_indicators,
          ai_recommendation,
          ai_reasoning,
          patterns_detected,
          assessed_at
        `)
        .eq('verification_session_id', sessionId)
        .in('transaction_id', results.map(r => r.transaction_id))

      if (!assessmentsError && assessments) {
        fraudAssessments = assessments
      }
    }

    // Get audit trail if requested
    let auditTrail: any[] = []
    if (query.include_audit_trail) {
      try {
        const auditResult = await auditService.queryAuditTrail({
          affected_resource_type: 'verification_session',
          affected_resource_id: sessionId,
          limit: query.audit_limit,
          sort_by: 'activity_timestamp',
          sort_order: 'desc',
        })
        auditTrail = auditResult.data
      } catch (auditError) {
        console.warn('Failed to get audit trail:', auditError)
        // Continue without audit trail
      }
    }

    // Get verifier information for results
    const verifierIds = Array.from(new Set(results?.map(r => r.verified_by).filter(Boolean) || []))
    let verifiers: Record<string, any> = {}

    if (verifierIds.length > 0) {
      const { data: verifierData } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', verifierIds)

      if (verifierData) {
        verifiers = verifierData.reduce((acc, v) => ({
          ...acc,
          [v.id]: {
            id: v.id,
            email: v.email,
            full_name: v.full_name,
          }
        }), {})
      }
    }

    // Prepare comprehensive data for export
    const exportData = {
      session_metadata: {
        session_id: (session as any).id,
        business: {
          id: (session as any).business_id,
          name: (session as any).businesses?.name,
          contact_email: (session as any).businesses?.contact_email,
          phone_number: (session as any).businesses?.phone_number,
          address: (session as any).businesses?.address,
          status: (session as any).businesses?.business_status,
          created_at: (session as any).businesses?.business_created_at,
        },
        batch: {
          id: (session as any).payment_batch_id,
          week_number: (session as any).payment_batches?.week_number,
          year: (session as any).payment_batches?.year_number,
          total_amount: (session as any).payment_batches?.total_amount,
          csv_file_path: (session as any).payment_batches?.csv_file_path,
          status: (session as any).payment_batches?.batch_status,
          notes: (session as any).payment_batches?.batch_notes,
          created_by: (session as any).payment_batches?.created_by,
          created_at: (session as any).payment_batches?.batch_created_at,
        },
        verification: {
          status: (session as any).status,
          total_transactions: (session as any).total_transactions,
          verified_transactions: (session as any).verified_transactions,
          approved_count: (session as any).approved_count || 0,
          rejected_count: (session as any).rejected_count || 0,
          completion_rate: (session as any).total_transactions > 0
            ? Math.round(((session as any).verified_transactions / (session as any).total_transactions) * 100)
            : 0,
          approval_rate: (session as any).verified_transactions > 0
            ? Math.round((((session as any).approved_count || 0) / (session as any).verified_transactions) * 100)
            : 0,
          current_transaction_index: (session as any).current_transaction_index || 0,
          deadline: (session as any).deadline,
          started_at: (session as any).started_at,
          completed_at: (session as any).completed_at,
          average_risk_score: (session as any).average_risk_score || 0,
          auto_approval_threshold: (session as any).auto_approval_threshold || 30,
          pause_count: session.pause_count || 0,
          notes: session.notes,
          created_at: session.created_at,
          updated_at: session.updated_at,
        },
        export_metadata: {
          exported_by: user.id,
          exported_by_email: user.email,
          exported_at: new Date().toISOString(),
          admin_role: adminAccess.role,
          format: query.format,
          includes: {
            metadata: query.include_metadata,
            fraud_assessment: query.include_fraud_assessment,
            audit_trail: query.include_audit_trail,
            timing_data: query.include_timing_data,
          },
          total_results: results?.length || 0,
          total_fraud_assessments: fraudAssessments.length,
          total_audit_entries: auditTrail.length,
        },
      },
      verification_results: results?.map(result => {
        const fraudAssessment = fraudAssessments.find(fa => fa.transaction_id === result.transaction_id)
        const verifier = result.verified_by ? verifiers[result.verified_by] : null

        return {
          // Core verification data
          id: result.id,
          transaction_id: result.transaction_id,
          decision: result.decision,
          reason: result.reason || '',
          notes: result.notes || '',

          // Verifier information
          verified_by: result.verified_by,
          verifier_email: verifier?.email || 'Unknown',
          verifier_name: verifier?.full_name || 'Unknown',
          verified_at: result.verified_at,

          // Timing data (if requested)
          ...(query.include_timing_data && {
            verification_time_seconds: result.verification_time_seconds || 0,
            verification_time_minutes: result.verification_time_seconds
              ? Math.round((result.verification_time_seconds / 60) * 100) / 100
              : 0,
          }),

          // Risk and fraud data
          is_flagged: result.is_flagged ? 'Yes' : 'No',
          risk_score: result.risk_score || 0,
          fraud_indicators: Array.isArray(result.fraud_indicators)
            ? result.fraud_indicators.join('; ')
            : '',

          // AI fraud assessment (if available and requested)
          ...(query.include_fraud_assessment && fraudAssessment && {
            ai_risk_level: fraudAssessment.risk_level,
            ai_risk_score: fraudAssessment.risk_score,
            ai_confidence: fraudAssessment.confidence,
            ai_recommendation: fraudAssessment.ai_recommendation,
            ai_reasoning: fraudAssessment.ai_reasoning || '',
            ai_patterns_detected: Array.isArray(fraudAssessment.patterns_detected)
              ? fraudAssessment.patterns_detected.join('; ')
              : '',
            ai_assessed_at: fraudAssessment.assessed_at,
          }),

          // Metadata timestamps
          created_at: result.created_at,
          updated_at: result.updated_at,
        }
      }) || [],

      ...(query.include_audit_trail && {
        audit_trail: auditTrail.map(entry => ({
          id: entry.id,
          event_type: entry.event_type,
          actor_id: entry.actor_id,
          actor_type: entry.actor_type,
          description: entry.description,
          category: entry.category,
          severity: entry.severity,
          details: entry.details,
          activity_timestamp: entry.activity_timestamp,
          ip_address: entry.ip_address,
          user_agent: entry.user_agent,
        }))
      }),
    }

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0]
    const businessName = session.businesses?.name?.replace(/[^a-zA-Z0-9]/g, '-') || 'unknown'
    const batchId = `W${session.payment_batches?.week_number}-${session.payment_batches?.year_number}`
    const filename = `verification-results-${businessName}-${batchId}-${timestamp}.${query.format}`

    let content: string
    let contentType: string

    if (query.format === 'json') {
      content = JSON.stringify(exportData, null, 2)
      contentType = 'application/json'
    } else {
      // CSV format - flatten the verification results
      if (query.include_metadata) {
        const metadata = [
          '# Verification Results Export',
          `# Session ID: ${session.id}`,
          `# Business: ${session.businesses?.name}`,
          `# Batch: Week ${session.payment_batches?.week_number}, ${session.payment_batches?.year_number}`,
          `# Total Transactions: ${session.total_transactions}`,
          `# Verified Transactions: ${session.verified_transactions}`,
          `# Completion Rate: ${exportData.session_metadata.verification.completion_rate}%`,
          `# Approval Rate: ${exportData.session_metadata.verification.approval_rate}%`,
          `# Export Date: ${new Date().toISOString()}`,
          `# Exported By: ${user.email || user.id}`,
          `# Admin Role: ${adminAccess.role}`,
          '#',
        ].join('\n') + '\n\n'

        content = metadata + csvService.convertToCSV(exportData.verification_results)
      } else {
        content = csvService.convertToCSV(exportData.verification_results)
      }
      contentType = 'text/csv'
    }

    // Log the download
    await auditService.logActivity({
      event_type: 'verification_results_downloaded',
      actor_id: user.id,
      actor_type: 'admin',
      business_id: session.business_id,
      category: 'data_access',
      severity: 'warning', // Sensitive data access
      description: 'Admin downloaded verification results',
      details: {
        session_id: sessionId,
        business_name: session.businesses?.name,
        batch_id: session.payment_batch_id,
        week_number: session.payment_batches?.week_number,
        year_number: session.payment_batches?.year_number,
        total_results: results?.length || 0,
        export_format: query.format,
        admin_role: adminAccess.role,
        includes: {
          metadata: query.include_metadata,
          fraud_assessment: query.include_fraud_assessment,
          audit_trail: query.include_audit_trail,
          timing_data: query.include_timing_data,
        },
        file_size_bytes: Buffer.byteLength(content, 'utf8'),
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    })

    // Return the file content with appropriate headers
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(content, 'utf8').toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Export-Metadata': JSON.stringify({
          session_id: sessionId,
          business_id: session.business_id,
          format: query.format,
          exported_at: new Date().toISOString(),
          results_count: results?.length || 0,
        }),
      },
    })

  } catch (error) {
    console.error('Error in GET /api/admin/verification-results/[id]/download:', error)

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