/**
 * PUT /api/verification/transactions/[id]
 *
 * Verifies a single transaction with approve/reject decision.
 * Updates verification session progress and handles workflow state transitions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { workflowService } from '@/lib/verification/services/workflow-service'
import { aiService } from '@/lib/ai/fraud-detection-service'
import { auditService } from '@/lib/verification/services/audit-service'
import { z } from 'zod'

// Request validation schema
const verifyTransactionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().max(500, 'Reason cannot exceed 500 characters').optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  verification_time_seconds: z.number().int().min(1).max(3600).optional(),
  force_decision: z.boolean().default(false), // Override high-risk warnings
})

type VerifyTransactionRequest = z.infer<typeof verifyTransactionSchema>

interface RouteParams {
  params: {
    id: string
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = createClient()
    const transactionId = params.id

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    let requestData: VerifyTransactionRequest
    try {
      const body = await request.json()
      const validation = verifyTransactionSchema.safeParse(body)

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

    // Get session information from transaction ID pattern
    // In a real system, you'd have a transactions table with session_id
    // For now, we extract from the transaction ID format: tx-{batch_id}-{index}
    const transactionPattern = transactionId.match(/^tx-([a-f0-9-]{36})-(\d+)$/)
    if (!transactionPattern) {
      return NextResponse.json(
        { error: 'Invalid transaction ID format' },
        { status: 400 }
      )
    }

    const [, batchId, transactionIndex] = transactionPattern

    // Get the verification session for this batch
    const { data: session, error: sessionError } = await supabase
      .from('verification_sessions')
      .select(`
        id,
        business_id,
        payment_batch_id,
        status,
        total_transactions,
        verified_transactions,
        current_transaction_index,
        payment_batches (
          week_number,
          year_number,
          total_amount
        )
      `)
      .eq('payment_batch_id', batchId)
      .in('status', ['in_progress', 'paused'])
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'No active verification session found for this transaction' },
        { status: 404 }
      )
    }

    // Verify user has access to this business
    const { data: businessAccess, error: accessError } = await supabase
      .from('business_users')
      .select('role')
      .eq('business_id', session.business_id)
      .eq('user_id', user.id)
      .single()

    if (accessError || !businessAccess) {
      return NextResponse.json(
        { error: 'Access denied to business' },
        { status: 403 }
      )
    }

    // Check if session is in a state that allows verification
    if (session.status !== 'in_progress') {
      return NextResponse.json(
        {
          error: 'Session is not active for verification',
          current_status: session.status
        },
        { status: 400 }
      )
    }

    // Check if transaction has already been verified
    const { data: existingResult, error: existingError } = await supabase
      .from('verification_results')
      .select('id, decision, verified_at')
      .eq('verification_session_id', session.id)
      .eq('transaction_id', transactionId)
      .single()

    if (!existingError && existingResult) {
      return NextResponse.json(
        {
          error: 'Transaction has already been verified',
          existing_decision: existingResult.decision,
          verified_at: existingResult.verified_at
        },
        { status: 409 }
      )
    }

    // Create mock transaction data (in production, this would come from parsed CSV or database)
    const txIndex = parseInt(transactionIndex)
    const mockTransaction = {
      id: transactionId,
      index: txIndex,
      amount: 50 + (txIndex * 7) % 500, // Varied amounts
      recipient_name: `Recipient ${txIndex}`,
      recipient_account: `SE${(1000000000000000 + txIndex).toString()}`,
      reference: `REF-W${session.payment_batches.week_number}-${txIndex}`,
      description: `Payment for week ${session.payment_batches.week_number}`,
    }

    // Run AI fraud assessment if rejecting or if it's a high-value transaction
    let fraudAssessment: any = null
    let riskWarnings: string[] = []

    if (requestData.decision === 'rejected' || mockTransaction.amount > 1000) {
      try {
        const assessmentResult = await aiService.assessTransaction({
          transaction: {
            id: transactionId,
            amount: mockTransaction.amount,
            recipient: mockTransaction.recipient_name,
            account_number: mockTransaction.recipient_account,
            reference: mockTransaction.reference,
            description: mockTransaction.description,
          },
          context: {
            business_id: session.business_id,
            session_id: session.id,
            batch_info: {
              week_number: session.payment_batches.week_number,
              year: session.payment_batches.year_number,
              total_amount: session.payment_batches.total_amount,
            },
            verifier_decision: requestData.decision,
            verification_time_seconds: requestData.verification_time_seconds || 60,
          },
        })

        fraudAssessment = assessmentResult

        // Check for risk warnings
        if (assessmentResult.risk_level === 'high' && requestData.decision === 'approved' && !requestData.force_decision) {
          riskWarnings.push('High fraud risk detected - consider rejecting this transaction')
        }

        if (assessmentResult.confidence > 0.8 && assessmentResult.recommendation !== requestData.decision) {
          riskWarnings.push(`AI recommends ${assessmentResult.recommendation} but you selected ${requestData.decision}`)
        }

      } catch (aiError) {
        console.warn('AI fraud assessment failed:', aiError)
        // Continue without blocking the verification
      }
    }

    // If there are risk warnings and force_decision is false, return warnings
    if (riskWarnings.length > 0 && !requestData.force_decision) {
      return NextResponse.json(
        {
          error: 'Risk warnings detected',
          warnings: riskWarnings,
          fraud_assessment: fraudAssessment,
          requires_force_decision: true,
          transaction: mockTransaction,
        },
        { status: 400 }
      )
    }

    // Use workflow service to verify the transaction
    const workflowResult = await workflowService.verifyTransaction({
      session_id: session.id,
      transaction_id: transactionId,
      decision: requestData.decision,
      reason: requestData.reason,
      notes: requestData.notes,
      verifier_id: user.id,
      verification_time_seconds: requestData.verification_time_seconds || 60,
    })

    if (!workflowResult.success) {
      return NextResponse.json(
        {
          error: workflowResult.message,
          details: workflowResult.errors,
        },
        { status: 400 }
      )
    }

    // Store fraud assessment if available
    if (fraudAssessment) {
      try {
        await supabase
          .from('fraud_assessments')
          .insert({
            verification_session_id: session.id,
            transaction_id: transactionId,
            risk_level: fraudAssessment.risk_level,
            risk_score: fraudAssessment.risk_score,
            confidence: fraudAssessment.confidence,
            fraud_indicators: fraudAssessment.fraud_indicators,
            ai_recommendation: fraudAssessment.recommendation,
            ai_reasoning: fraudAssessment.reasoning,
            patterns_detected: fraudAssessment.patterns_detected,
            assessed_at: new Date().toISOString(),
          })
      } catch (assessmentError) {
        console.warn('Failed to store fraud assessment:', assessmentError)
        // Don't block the verification process
      }
    }

    // Get updated session state
    const updatedState = await workflowService.getWorkflowState(session.id)

    // Calculate next transaction
    let nextTransaction = null
    if (updatedState && updatedState.progress.verified_transactions < updatedState.progress.total_transactions) {
      const nextIndex = updatedState.progress.verified_transactions + 1
      nextTransaction = {
        id: `tx-${batchId}-${nextIndex}`,
        index: nextIndex,
        amount: 50 + (nextIndex * 7) % 500,
        recipient_name: `Recipient ${nextIndex}`,
        reference: `REF-W${session.payment_batches.week_number}-${nextIndex}`,
      }
    }

    const response = {
      success: true,
      message: `Transaction ${requestData.decision} successfully`,
      transaction: {
        id: transactionId,
        decision: requestData.decision,
        reason: requestData.reason,
        notes: requestData.notes,
        verified_at: new Date().toISOString(),
        verified_by: user.id,
        verification_time_seconds: requestData.verification_time_seconds || 60,
      },
      fraud_assessment: fraudAssessment,
      session_progress: updatedState ? {
        verified_transactions: updatedState.progress.verified_transactions,
        total_transactions: updatedState.progress.total_transactions,
        completion_percentage: updatedState.progress.completion_percentage,
        approved_count: updatedState.progress.approved_count,
        rejected_count: updatedState.progress.rejected_count,
        is_completed: updatedState.progress.current_status === 'completed',
      } : null,
      next_transaction: nextTransaction,
      warnings: riskWarnings.length > 0 ? riskWarnings : undefined,
    }

    // Enhanced audit logging
    await auditService.logActivity({
      event_type: 'transaction_verified',
      actor_id: user.id,
      actor_type: 'user',
      business_id: session.business_id,
      category: 'verification',
      severity: requestData.decision === 'rejected' ? 'warning' : 'info',
      description: `Transaction ${requestData.decision} by user`,
      details: {
        session_id: session.id,
        transaction_id: transactionId,
        decision: requestData.decision,
        reason: requestData.reason,
        notes: requestData.notes,
        verification_time_seconds: requestData.verification_time_seconds || 60,
        transaction_amount: mockTransaction.amount,
        risk_warnings: riskWarnings,
        forced_decision: requestData.force_decision,
        ai_assessment: fraudAssessment ? {
          risk_level: fraudAssessment.risk_level,
          risk_score: fraudAssessment.risk_score,
          confidence: fraudAssessment.confidence,
          recommendation: fraudAssessment.recommendation,
        } : null,
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in /api/verification/transactions/[id]:', error)

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
    { status: 405, headers: { Allow: 'PUT' } }
  )
}

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'PUT' } }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405, headers: { Allow: 'PUT' } }
  )
}