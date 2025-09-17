'use client'

/**
 * TransactionList - Paginated list of transactions for verification
 *
 * Features:
 * - Paginated transaction display with filtering and sorting
 * - Real-time status updates and progress tracking
 * - Inline transaction verification actions
 * - Search and filter capabilities
 * - Risk indicators and fraud flags
 * - Responsive design for mobile/desktop
 * - Keyboard navigation support
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Flag,
  TrendingUp,
  DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TransactionCard } from './transaction-card'

interface Transaction {
  id: string
  index: number
  transaction_id: string
  amount: number
  recipient_name: string
  recipient_account: string
  reference: string
  date: string
  status: 'pending' | 'approved' | 'rejected'
  risk_score: number
  risk_level: 'low' | 'medium' | 'high'
  is_flagged: boolean
  fraud_indicators: string[]
  verified_at: string | null
  verified_by: string | null
  verification_time_seconds: number | null
  verification_result?: {
    decision: 'approved' | 'rejected'
    reason?: string
    notes?: string
    verified_by: string
    verified_at: string
    verification_time_seconds: number
  }
}

interface TransactionListProps {
  sessionId: string
  className?: string
  onTransactionVerify?: (transactionId: string, decision: 'approved' | 'rejected') => Promise<void>
  onTransactionView?: (transaction: Transaction) => void
  refreshTrigger?: number // Prop to trigger external refresh
}

interface FilterState {
  status: 'all' | 'pending' | 'approved' | 'rejected'
  risk_level: 'all' | 'low' | 'medium' | 'high'
  flagged_only: boolean
  search: string
  sort_by: 'index' | 'amount' | 'verified_at' | 'risk_score'
  sort_order: 'asc' | 'desc'
}

interface PaginationInfo {
  current_page: number
  total_pages: number
  total_items: number
  items_per_page: number
  has_next_page: boolean
  has_previous_page: boolean
}

export function TransactionList({
  sessionId,
  className,
  onTransactionVerify,
  onTransactionView,
  refreshTrigger
}: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [verifyingTransaction, setVerifyingTransaction] = useState<string | null>(null)

  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    risk_level: 'all',
    flagged_only: false,
    search: '',
    sort_by: 'index',
    sort_order: 'asc'
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)

  // Load transactions with current filters and pagination
  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        session_id: sessionId,
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        status: filters.status,
        risk_level: filters.risk_level,
        flagged_only: filters.flagged_only.toString(),
        sort_by: filters.sort_by,
        sort_order: filters.sort_order
      })

      if (filters.search.trim()) {
        params.append('search', filters.search.trim())
      }

      const response = await fetch(`/api/verification/transactions?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to load transactions: ${response.statusText}`)
      }

      const data = await response.json()

      setTransactions(data.transactions || [])
      setPagination(data.pagination)

    } catch (error) {
      console.error('Error loading transactions:', error)
      setError(error instanceof Error ? error.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [sessionId, currentPage, itemsPerPage, filters])

  // Load transactions on mount and when filters change
  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  // Refresh when external trigger changes
  useEffect(() => {
    if (refreshTrigger) {
      loadTransactions()
    }
  }, [refreshTrigger, loadTransactions])

  // Handle transaction verification
  const handleVerifyTransaction = async (transactionId: string, decision: 'approved' | 'rejected', reason?: string, notes?: string) => {
    try {
      setVerifyingTransaction(transactionId)

      const requestBody = {
        decision,
        reason,
        notes,
        verification_time_seconds: 60 // Default verification time
      }

      const response = await fetch(`/api/verification/transactions/${transactionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || `Verification failed: ${response.statusText}`)
      }

      const result = await response.json()

      // Update local transaction state
      setTransactions(prev =>
        prev.map(t =>
          t.id === transactionId
            ? {
                ...t,
                status: decision,
                verified_at: new Date().toISOString(),
                verification_result: {
                  decision,
                  reason,
                  notes,
                  verified_by: result.transaction.verified_by,
                  verified_at: result.transaction.verified_at,
                  verification_time_seconds: result.transaction.verification_time_seconds
                }
              }
            : t
        )
      )

      // Call external callback if provided
      if (onTransactionVerify) {
        await onTransactionVerify(transactionId, decision)
      }

    } catch (error) {
      console.error('Error verifying transaction:', error)
      setError(error instanceof Error ? error.message : 'Failed to verify transaction')
    } finally {
      setVerifyingTransaction(null)
    }
  }

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  // Handle search
  const handleSearch = (searchTerm: string) => {
    handleFilterChange('search', searchTerm)
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Get status color and icon
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          label: 'Approved'
        }
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: XCircle,
          label: 'Rejected'
        }
      case 'pending':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Clock,
          label: 'Pending'
        }
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Clock,
          label: 'Unknown'
        }
    }
  }

  // Get risk level color
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Transaction Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading transactions...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Transaction Verification</span>
          {pagination && (
            <Badge variant="secondary">
              {pagination.total_items.toLocaleString()} transactions
            </Badge>
          )}
        </CardTitle>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
          <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          {/* Risk Level Filter */}
          <Select value={filters.risk_level} onValueChange={(value) => handleFilterChange('risk_level', value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk</SelectItem>
              <SelectItem value="low">Low Risk</SelectItem>
              <SelectItem value="medium">Medium Risk</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
            </SelectContent>
          </Select>

          {/* Flagged Filter */}
          <Button
            variant={filters.flagged_only ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange('flagged_only', !filters.flagged_only)}
            className="flex items-center space-x-2"
          >
            <Flag className="h-4 w-4" />
            <span>Flagged</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-0">
        {/* Error Alert */}
        {error && (
          <div className="px-6 pb-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Transaction Table */}
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <Search className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Found</h3>
            <p className="text-gray-600">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Index</TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => {
                    const statusDisplay = getStatusDisplay(transaction.status)
                    const StatusIcon = statusDisplay.icon

                    return (
                      <TableRow key={transaction.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm">
                          #{transaction.index}
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{transaction.transaction_id}</div>
                            <div className="text-sm text-gray-600">{transaction.reference}</div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{transaction.recipient_name}</div>
                            <div className="text-sm text-gray-600 font-mono">
                              {transaction.recipient_account}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="font-medium">
                            {transaction.amount.toLocaleString()} SEK
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge className={statusDisplay.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusDisplay.label}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <Badge className={getRiskColor(transaction.risk_level)} variant="outline">
                              {transaction.risk_level.toUpperCase()}
                            </Badge>
                            {transaction.is_flagged && (
                              <div className="flex items-center space-x-1">
                                <Flag className="h-3 w-3 text-red-500" />
                                <span className="text-xs text-red-600">Flagged</span>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={verifyingTransaction === transaction.id}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => onTransactionView?.(transaction)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>

                              {transaction.status === 'pending' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleVerifyTransaction(transaction.id, 'approved')}
                                    disabled={verifyingTransaction === transaction.id}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                    Approve
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => handleVerifyTransaction(transaction.id, 'rejected')}
                                    disabled={verifyingTransaction === transaction.id}
                                  >
                                    <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4 px-6">
              {transactions.map((transaction) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  onVerify={(decision, reason, notes) =>
                    handleVerifyTransaction(transaction.id, decision, reason, notes)
                  }
                  onView={() => onTransactionView?.(transaction)}
                  isVerifying={verifyingTransaction === transaction.id}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, pagination.total_items)} of{' '}
                  {pagination.total_items} transactions
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.has_previous_page}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {pagination.total_pages}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.has_next_page}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}