/**
 * POST /api/verification/upload
 *
 * Handles CSV batch file uploads for verification processing.
 * Validates, processes, and creates payment batches from uploaded CSV files.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { csvService } from '@/lib/verification/services/csv-service'
import { storageService } from '@/lib/verification/services/storage-service'
import { PaymentBatchBusinessRules } from '@/lib/verification/models/payment-batch'
import { auditService } from '@/lib/verification/services/audit-service'
import { z } from 'zod'

// Form data validation
const uploadFormSchema = z.object({
  week_number: z.coerce.number().int().min(1).max(53),
  year: z.coerce.number().int().min(2024).max(2030),
  business_id: z.string().uuid('Invalid business ID format'),
  notes: z.string().max(1000).optional(),
  auto_create_session: z.coerce.boolean().default(false),
})

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

    // Parse multipart form data
    const formData = await request.formData()
    const csvFile = formData.get('csv_file') as File
    const formFields = Object.fromEntries(
      Array.from(formData.entries()).filter(([key]) => key !== 'csv_file')
    )

    // Validate form fields
    const validation = uploadFormSchema.safeParse(formFields)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid form data',
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { week_number, year, business_id, notes, auto_create_session } = validation.data

    // Validate CSV file
    if (!csvFile || csvFile.type !== 'text/csv') {
      return NextResponse.json(
        { error: 'CSV file is required' },
        { status: 400 }
      )
    }

    if (csvFile.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Verify user has access to this business
    const { data: businessAccess, error: accessError } = await supabase
      .from('business_users')
      .select('role')
      .eq('business_id', business_id)
      .eq('user_id', user.id)
      .single()

    if (accessError || !businessAccess || !['admin', 'manager'].includes(businessAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for batch upload' },
        { status: 403 }
      )
    }

    // Check if batch already exists for this business/week/year
    const { data: existingBatches } = await supabase
      .from('payment_batches')
      .select('id, status, created_at')
      .eq('business_id', business_id)
      .eq('week_number', week_number)
      .eq('year_number', year)

    const batchValidation = PaymentBatchBusinessRules.validateBatchCreation({
      business_id,
      week_number,
      year,
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

    // Read and validate CSV content
    const csvContent = await csvFile.text()
    let csvValidation: any

    try {
      csvValidation = await csvService.parseTransactionCSV(csvContent, {
        strict: true,
        validate_business_rules: true,
        business_id,
      })
    } catch (csvError) {
      await auditService.logActivity({
        event_type: 'csv_upload_failed',
        actor_id: user.id,
        actor_type: 'user',
        business_id,
        category: 'data_access',
        severity: 'error',
        description: 'CSV file validation failed during upload',
        details: {
          week_number,
          year,
          filename: csvFile.name,
          file_size: csvFile.size,
          error: csvError instanceof Error ? csvError.message : 'Unknown error',
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      })

      return NextResponse.json(
        {
          error: 'CSV validation failed',
          message: csvError instanceof Error ? csvError.message : 'Invalid CSV format'
        },
        { status: 400 }
      )
    }

    if (!csvValidation.valid) {
      await auditService.logActivity({
        event_type: 'csv_upload_failed',
        actor_id: user.id,
        actor_type: 'user',
        business_id,
        category: 'data_access',
        severity: 'error',
        description: 'CSV file contains validation errors',
        details: {
          week_number,
          year,
          filename: csvFile.name,
          file_size: csvFile.size,
          validation_errors: csvValidation.errors,
          parsed_transactions: csvValidation.parsed_transactions?.length || 0,
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      })

      return NextResponse.json(
        {
          error: 'CSV contains validation errors',
          validation_errors: csvValidation.errors,
          parsed_transactions: csvValidation.parsed_transactions?.length || 0,
          summary: csvValidation.summary,
        },
        { status: 400 }
      )
    }

    // Calculate batch totals
    const totalTransactions = csvValidation.parsed_transactions.length
    const totalAmount = csvValidation.summary.total_amount

    // Upload CSV file to storage
    let uploadResult: any
    try {
      uploadResult = await storageService.uploadBatchCSV({
        businessId: business_id,
        batchId: 'temp', // Will be updated after batch creation
        file: csvFile,
        filename: `batch-${year}-W${week_number.toString().padStart(2, '0')}.csv`,
      })
    } catch (uploadError) {
      await auditService.logActivity({
        event_type: 'csv_upload_failed',
        actor_id: user.id,
        actor_type: 'user',
        business_id,
        category: 'data_access',
        severity: 'error',
        description: 'Failed to upload CSV file to storage',
        details: {
          week_number,
          year,
          filename: csvFile.name,
          file_size: csvFile.size,
          error: uploadError instanceof Error ? uploadError.message : 'Storage error',
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      })

      return NextResponse.json(
        { error: 'Failed to upload CSV file' },
        { status: 500 }
      )
    }

    // Calculate deadline (7 days from now)
    const deadline = PaymentBatchBusinessRules.calculateDeadline()

    // Create payment batch
    const { data: batch, error: batchError } = await supabase
      .from('payment_batches')
      .insert({
        business_id,
        week_number,
        year_number: year,
        csv_file_path: uploadResult.file_path,
        total_transactions: totalTransactions,
        total_amount: totalAmount,
        status: 'pending_verification',
        deadline: deadline.toISOString(),
        notes,
        created_by: user.id,
      })
      .select()
      .single()

    if (batchError) {
      // Clean up uploaded file on batch creation failure
      try {
        await storageService.deleteBatchFile({
          businessId: business_id,
          batchId: 'temp',
          filePath: uploadResult.file_path,
        })
      } catch (cleanupError) {
        console.warn('Failed to clean up uploaded file:', cleanupError)
      }

      await auditService.logActivity({
        event_type: 'batch_creation_failed',
        actor_id: user.id,
        actor_type: 'user',
        business_id,
        category: 'business_process',
        severity: 'error',
        description: 'Failed to create payment batch after successful CSV upload',
        details: {
          week_number,
          year,
          total_transactions: totalTransactions,
          total_amount: totalAmount,
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

    // Update file path with actual batch ID
    const finalFilePath = uploadResult.file_path.replace('temp', batch.id)
    try {
      await storageService.moveBatchFile({
        businessId: business_id,
        oldPath: uploadResult.file_path,
        newPath: finalFilePath,
      })

      // Update batch with correct file path
      await supabase
        .from('payment_batches')
        .update({ csv_file_path: finalFilePath })
        .eq('id', batch.id)

    } catch (moveError) {
      console.warn('Failed to move uploaded file to final location:', moveError)
      // Continue - the batch is created, just with a temp file path
    }

    // Auto-create verification session if requested
    let sessionId: string | null = null
    if (auto_create_session) {
      try {
        const { data: session, error: sessionError } = await supabase
          .from('verification_sessions')
          .insert({
            payment_batch_id: batch.id,
            business_id,
            status: 'not_started',
            total_transactions: totalTransactions,
            verified_transactions: 0,
            approved_count: 0,
            rejected_count: 0,
            current_transaction_index: 0,
            deadline: deadline.toISOString(),
            auto_approval_threshold: 30, // 30% default threshold
          })
          .select('id')
          .single()

        if (!sessionError && session) {
          sessionId = session.id
        }
      } catch (sessionError) {
        console.warn('Failed to auto-create verification session:', sessionError)
        // Continue - batch is created successfully
      }
    }

    // Log successful upload
    await auditService.logActivity({
      event_type: 'batch_created',
      actor_id: user.id,
      actor_type: 'user',
      business_id,
      category: 'business_process',
      severity: 'info',
      description: 'Payment batch created from CSV upload',
      details: {
        batch_id: batch.id,
        week_number,
        year,
        filename: csvFile.name,
        file_size: csvFile.size,
        total_transactions: totalTransactions,
        total_amount: totalAmount,
        csv_file_path: finalFilePath,
        deadline: deadline.toISOString(),
        auto_create_session,
        session_id: sessionId,
        validation_summary: csvValidation.summary,
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
        week_number: batch.week_number,
        year: batch.year_number,
        status: batch.status,
        total_transactions: batch.total_transactions,
        total_amount: batch.total_amount,
        deadline: batch.deadline,
        created_at: batch.created_at,
        csv_file_path: finalFilePath,
        notes: batch.notes,
      },
      verification_session: sessionId ? {
        id: sessionId,
        status: 'not_started',
        auto_created: true,
      } : null,
      csv_validation: {
        total_transactions: totalTransactions,
        total_amount: totalAmount,
        validation_summary: csvValidation.summary,
        sample_transactions: csvValidation.parsed_transactions.slice(0, 3), // First 3 for preview
      },
      upload_info: {
        filename: csvFile.name,
        file_size: csvFile.size,
        storage_path: finalFilePath,
        upload_timestamp: new Date().toISOString(),
      },
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Error in /api/verification/upload:', error)

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
    { error: 'Method not allowed. Use POST to upload CSV files.' },
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