/**
 * POST /api/verification/download
 *
 * Downloads verification results as CSV or gets verification batch CSV.
 * Supports both downloading original batch CSV and exporting verification results.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { storageService } from '@/lib/verification/services/storage-service'
import { csvService } from '@/lib/verification/services/csv-service'
import { auditService } from '@/lib/verification/services/audit-service'
import { z } from 'zod'

// Request validation schema
const downloadRequestSchema = z.object({
  type: z.enum(['batch_csv', 'verification_results']),
  batch_id: z.string().uuid('Invalid batch ID format').optional(),
  session_id: z.string().uuid('Invalid session ID format').optional(),
  format: z.enum(['csv']).default('csv'),
  include_metadata: z.boolean().default(true),
  date_range: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional(),
  }).optional(),
})

type DownloadRequest = z.infer<typeof downloadRequestSchema>

export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    let requestData: DownloadRequest
    try {
      const body = await request.json()
      const validation = downloadRequestSchema.safeParse(body)

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

    // Determine business ID based on batch_id or session_id
    let businessId: string
    let batchInfo: any = null
    let sessionInfo: any = null

    if (requestData.batch_id) {
      const { data: batch, error: batchError } = await supabase
        .from('payment_batches')
        .select('business_id, week_number, year_number, csv_file_path, total_transactions, total_amount')
        .eq('id', requestData.batch_id)
        .single()

      if (batchError || !batch) {
        return NextResponse.json(
          { error: 'Payment batch not found' },
          { status: 404 }
        )
      }

      businessId = batch.business_id
      batchInfo = batch
    } else if (requestData.session_id) {
      const { data: session, error: sessionError } = await supabase
        .from('verification_sessions')
        .select(`
          business_id,
          payment_batch_id,
          status,
          verified_transactions,
          total_transactions,
          payment_batches (
            week_number,
            year_number,
            csv_file_path,
            total_amount
          )
        `)
        .eq('id', requestData.session_id)
        .single()

      if (sessionError || !session) {
        return NextResponse.json(
          { error: 'Verification session not found' },
          { status: 404 }
        )
      }

      businessId = session.business_id
      sessionInfo = session
      batchInfo = session.payment_batches
      requestData.batch_id = session.payment_batch_id
    } else {
      return NextResponse.json(
        { error: 'Either batch_id or session_id is required' },
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

    let downloadResult: { content: string; filename: string; contentType: string }

    if (requestData.type === 'batch_csv') {
      // Download original batch CSV
      if (!batchInfo.csv_file_path) {
        return NextResponse.json(
          { error: 'No CSV file associated with this batch' },
          { status: 404 }
        )
      }

      try {
        const fileResult = await storageService.downloadBatchCSV({
          businessId,
          batchId: requestData.batch_id!,
          filePath: batchInfo.csv_file_path,
        })

        downloadResult = {
          content: fileResult.content,
          filename: `batch-${batchInfo.week_number}-${batchInfo.year_number}.csv`,
          contentType: 'text/csv',
        }

        await auditService.logActivity({
          event_type: 'batch_csv_downloaded',
          actor_id: user.id,
          actor_type: 'user',
          business_id: businessId,
          category: 'data_access',
          severity: 'info',
          description: 'Batch CSV file downloaded',
          details: {
            batch_id: requestData.batch_id,
            week_number: batchInfo.week_number,
            year_number: batchInfo.year_number,
            file_path: batchInfo.csv_file_path,
            download_type: 'batch_csv',
          },
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
        })

      } catch (storageError) {
        await auditService.logActivity({
          event_type: 'download_failed',
          actor_id: user.id,
          actor_type: 'user',
          business_id: businessId,
          category: 'data_access',
          severity: 'error',
          description: 'Failed to download batch CSV',
          details: {
            batch_id: requestData.batch_id,
            error: storageError instanceof Error ? storageError.message : 'Unknown error',
            download_type: 'batch_csv',
          },
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
        })

        return NextResponse.json(
          { error: 'Failed to download batch CSV file' },
          { status: 500 }
        )
      }

    } else if (requestData.type === 'verification_results') {
      // Export verification results
      if (!requestData.session_id) {
        return NextResponse.json(
          { error: 'session_id is required for verification results export' },
          { status: 400 }
        )
      }

      try {
        // Get verification results for the session
        const { data: verificationResults, error: resultsError } = await supabase
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
            fraud_indicators
          `)
          .eq('verification_session_id', requestData.session_id)
          .order('verified_at', { ascending: true })

        if (resultsError) {
          throw new Error(`Failed to fetch verification results: ${resultsError.message}`)
        }

        // Prepare data for CSV export
        const exportData = verificationResults?.map(result => ({
          transaction_id: result.transaction_id,
          decision: result.decision,
          reason: result.reason || '',
          notes: result.notes || '',
          verified_by: result.verified_by || '',
          verified_at: result.verified_at,
          verification_time_seconds: result.verification_time_seconds || 0,
          is_flagged: result.is_flagged ? 'Yes' : 'No',
          risk_score: result.risk_score || 0,
          fraud_indicators: Array.isArray(result.fraud_indicators)
            ? result.fraud_indicators.join('; ')
            : '',
        })) || []

        // Add metadata if requested
        let csvContent: string
        if (requestData.include_metadata && sessionInfo) {
          const metadata = [
            '# Verification Results Export',
            `# Session ID: ${requestData.session_id}`,
            `# Batch: Week ${batchInfo.week_number}, ${batchInfo.year_number}`,
            `# Total Transactions: ${sessionInfo.total_transactions}`,
            `# Verified Transactions: ${sessionInfo.verified_transactions}`,
            `# Export Date: ${new Date().toISOString()}`,
            `# Exported By: ${user.email || user.id}`,
            '#',
          ].join('\n') + '\n\n'

          csvContent = metadata + csvService.convertToCSV(exportData)
        } else {
          csvContent = csvService.convertToCSV(exportData)
        }

        const filename = `verification-results-${batchInfo.week_number}-${batchInfo.year_number}-${new Date().toISOString().split('T')[0]}.csv`

        downloadResult = {
          content: csvContent,
          filename,
          contentType: 'text/csv',
        }

        await auditService.logActivity({
          event_type: 'verification_results_exported',
          actor_id: user.id,
          actor_type: 'user',
          business_id: businessId,
          category: 'data_access',
          severity: 'info',
          description: 'Verification results exported to CSV',
          details: {
            session_id: requestData.session_id,
            batch_id: requestData.batch_id,
            week_number: batchInfo.week_number,
            year_number: batchInfo.year_number,
            total_results: exportData.length,
            include_metadata: requestData.include_metadata,
            download_type: 'verification_results',
          },
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
        })

      } catch (exportError) {
        await auditService.logActivity({
          event_type: 'download_failed',
          actor_id: user.id,
          actor_type: 'user',
          business_id: businessId,
          category: 'data_access',
          severity: 'error',
          description: 'Failed to export verification results',
          details: {
            session_id: requestData.session_id,
            batch_id: requestData.batch_id,
            error: exportError instanceof Error ? exportError.message : 'Unknown error',
            download_type: 'verification_results',
          },
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
        })

        return NextResponse.json(
          { error: 'Failed to export verification results' },
          { status: 500 }
        )
      }
    }

    // Return the file content with appropriate headers
    return new NextResponse(downloadResult.content, {
      status: 200,
      headers: {
        'Content-Type': downloadResult.contentType,
        'Content-Disposition': `attachment; filename="${downloadResult.filename}"`,
        'Content-Length': Buffer.byteLength(downloadResult.content, 'utf8').toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })

  } catch (error) {
    console.error('Error in /api/verification/download:', error)

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
    { error: 'Method not allowed. Use POST to download files.' },
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