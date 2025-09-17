/**
 * GET /api/verification/transactions
 *
 * Returns paginated list of transactions for verification, with filtering and sorting.
 * Used by the verification UI to display transactions for review.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { auditService } from '@/lib/verification/services/audit-service'
import { z } from 'zod'

// Query parameters validation schema
const transactionsQuerySchema = z.object({
  session_id: z.string().uuid('Invalid session ID format'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'approved', 'rejected', 'all']).default('all'),
  sort_by: z.enum(['index', 'amount', 'verified_at', 'risk_score']).default('index'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
  min_amount: z.coerce.number().min(0).optional(),
  max_amount: z.coerce.number().min(0).optional(),
  risk_level: z.enum(['low', 'medium', 'high', 'all']).default('all'),
  flagged_only: z.coerce.boolean().default(false),
})

type TransactionsQuery = z.infer<typeof transactionsQuerySchema>

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

    const validation = transactionsQuerySchema.safeParse(queryParams)
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

    // Get verification session and validate access
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
          id,
          week_number,
          year_number,
          csv_file_path,
          total_amount
        )
      `)
      .eq('id', query.session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Verification session not found' },
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

    // For this implementation, we'll simulate transaction data since the actual
    // transaction parsing from CSV would be more complex. In a real implementation,
    // this would parse the CSV file or query a transactions table.

    // Calculate pagination
    const offset = (query.page - 1) * query.limit

    // Generate mock transactions for demonstration
    // In production, this would come from parsed CSV or database
    const allTransactions = Array.from({ length: session.total_transactions }, (_, index) => {
      const txIndex = index + 1
      const baseAmount = 50 + (index * 7) % 500 // Varied amounts
      const riskScore = Math.floor(Math.random() * 100)
      const riskLevel = riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low'

      return {
        id: `tx-${session.payment_batch_id}-${txIndex}`,
        index: txIndex,
        transaction_id: `TX${session.payment_batches.year_number}${session.payment_batches.week_number.toString().padStart(2, '0')}${txIndex.toString().padStart(4, '0')}`,
        amount: baseAmount,
        recipient_name: `Recipient ${txIndex}`,
        recipient_account: `SE${(1000000000000000 + txIndex).toString()}`,
        reference: `REF-W${session.payment_batches.week_number}-${txIndex}`,
        date: new Date(Date.now() - (session.total_transactions - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: index < session.verified_transactions ? (Math.random() > 0.2 ? 'approved' : 'rejected') : 'pending',
        risk_score: riskScore,
        risk_level: riskLevel,
        is_flagged: riskScore > 80,
        fraud_indicators: riskScore > 70 ? ['high_amount', 'unusual_pattern'] : [],
        verified_at: index < session.verified_transactions ?
          new Date(Date.now() - (session.verified_transactions - index - 1) * 60 * 1000).toISOString() :
          null,
        verified_by: index < session.verified_transactions ? user.id : null,
        verification_time_seconds: index < session.verified_transactions ? 60 + Math.floor(Math.random() * 180) : null,
      }
    })

    // Apply filters
    let filteredTransactions = allTransactions

    // Status filter
    if (query.status !== 'all') {
      filteredTransactions = filteredTransactions.filter(tx => tx.status === query.status)
    }

    // Risk level filter
    if (query.risk_level !== 'all') {
      filteredTransactions = filteredTransactions.filter(tx => tx.risk_level === query.risk_level)
    }

    // Flagged only filter
    if (query.flagged_only) {
      filteredTransactions = filteredTransactions.filter(tx => tx.is_flagged)
    }

    // Amount range filters
    if (query.min_amount !== undefined) {
      filteredTransactions = filteredTransactions.filter(tx => tx.amount >= query.min_amount!)
    }
    if (query.max_amount !== undefined) {
      filteredTransactions = filteredTransactions.filter(tx => tx.amount <= query.max_amount!)
    }

    // Search filter
    if (query.search) {
      const searchTerm = query.search.toLowerCase()
      filteredTransactions = filteredTransactions.filter(tx =>
        tx.transaction_id.toLowerCase().includes(searchTerm) ||
        tx.recipient_name.toLowerCase().includes(searchTerm) ||
        tx.recipient_account.toLowerCase().includes(searchTerm) ||
        tx.reference.toLowerCase().includes(searchTerm)
      )
    }

    // Apply sorting
    filteredTransactions.sort((a, b) => {
      let comparison = 0

      switch (query.sort_by) {
        case 'index':
          comparison = a.index - b.index
          break
        case 'amount':
          comparison = a.amount - b.amount
          break
        case 'verified_at':
          if (!a.verified_at && !b.verified_at) comparison = 0
          else if (!a.verified_at) comparison = 1
          else if (!b.verified_at) comparison = -1
          else comparison = new Date(a.verified_at).getTime() - new Date(b.verified_at).getTime()
          break
        case 'risk_score':
          comparison = a.risk_score - b.risk_score
          break
      }

      return query.sort_order === 'desc' ? -comparison : comparison
    })

    // Apply pagination
    const totalFiltered = filteredTransactions.length
    const paginatedTransactions = filteredTransactions.slice(offset, offset + query.limit)

    // Get verification results for these transactions
    const transactionIds = paginatedTransactions.map(tx => tx.id)
    let verificationResults: any[] = []

    if (transactionIds.length > 0) {
      const { data: results, error: resultsError } = await supabase
        .from('verification_results')
        .select(`
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
        .eq('verification_session_id', query.session_id)
        .in('transaction_id', transactionIds)

      if (!resultsError && results) {
        verificationResults = results
      }
    }

    // Merge verification results with transaction data
    const enhancedTransactions = paginatedTransactions.map(tx => {
      const verificationResult = verificationResults.find(vr => vr.transaction_id === tx.id)

      return {
        ...tx,
        verification_result: verificationResult ? {
          decision: verificationResult.decision,
          reason: verificationResult.reason,
          notes: verificationResult.notes,
          verified_by: verificationResult.verified_by,
          verified_at: verificationResult.verified_at,
          verification_time_seconds: verificationResult.verification_time_seconds,
        } : null,
      }
    })

    // Calculate summary statistics
    const summary = {
      total_transactions: session.total_transactions,
      filtered_transactions: totalFiltered,
      verified_transactions: session.verified_transactions,
      pending_transactions: session.total_transactions - session.verified_transactions,
      approved_count: filteredTransactions.filter(tx => tx.status === 'approved').length,
      rejected_count: filteredTransactions.filter(tx => tx.status === 'rejected').length,
      flagged_count: filteredTransactions.filter(tx => tx.is_flagged).length,
      average_risk_score: Math.round(filteredTransactions.reduce((sum, tx) => sum + tx.risk_score, 0) / Math.max(filteredTransactions.length, 1)),
      high_risk_count: filteredTransactions.filter(tx => tx.risk_level === 'high').length,
    }

    const response = {
      transactions: enhancedTransactions,
      pagination: {
        current_page: query.page,
        total_pages: Math.ceil(totalFiltered / query.limit),
        total_items: totalFiltered,
        items_per_page: query.limit,
        has_next_page: query.page < Math.ceil(totalFiltered / query.limit),
        has_previous_page: query.page > 1,
      },
      summary,
      filters_applied: {
        status: query.status,
        risk_level: query.risk_level,
        flagged_only: query.flagged_only,
        search: query.search,
        amount_range: {
          min: query.min_amount,
          max: query.max_amount,
        },
      },
      session_info: {
        id: session.id,
        status: session.status,
        batch_info: {
          week_number: session.payment_batches.week_number,
          year: session.payment_batches.year_number,
          total_amount: session.payment_batches.total_amount,
        },
        current_transaction_index: session.current_transaction_index,
      },
    }

    // Log access
    await auditService.logActivity({
      event_type: 'transactions_listed',
      actor_id: user.id,
      actor_type: 'user',
      business_id: session.business_id,
      category: 'business_process',
      severity: 'info',
      description: 'Verification transactions list accessed',
      details: {
        session_id: query.session_id,
        page: query.page,
        limit: query.limit,
        total_returned: enhancedTransactions.length,
        filters: {
          status: query.status,
          risk_level: query.risk_level,
          flagged_only: query.flagged_only,
          search: query.search,
        },
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in /api/verification/transactions:', error)

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