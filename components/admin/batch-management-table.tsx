'use client'

/**
 * BatchManagementTable - Comprehensive admin table for batch management
 *
 * Features:
 * - Advanced filtering and sorting with real-time search
 * - Bulk operations for efficient batch processing
 * - Inline actions for individual batch management
 * - Status management with workflow controls
 * - Export capabilities for reporting and analysis
 * - Pagination with configurable page sizes
 * - Responsive design with mobile optimization
 * - Integration with verification workflow system
 * - Real-time updates with auto-refresh capabilities
 * - Detailed batch information with expandable rows
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Download,
  Upload,
  Play,
  Pause,
  StopCircle,
  Trash2,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  Users,
  DollarSign,
  Target,
  Loader2,
  FileText,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Import our custom components
import { CountdownTimer } from '@/components/verification/countdown-timer'
import { BatchDownload } from '@/components/verification/batch-download'

interface BatchTableData {
  id: string
  business_id: string
  business_name: string
  status: 'draft' | 'pending_verification' | 'in_progress' | 'completed' | 'failed' | 'expired'
  week_number: number
  year_number: number
  total_transactions: number
  total_amount: number
  deadline: string
  created_at: string
  updated_at: string
  verification_session?: {
    id: string
    status: string
    progress_percentage: number
    verified_transactions: number
    approved_transactions: number
    rejected_transactions: number
    started_at?: string
    completed_at?: string
    verifier_name?: string
  }
  urgency_level: 'low' | 'medium' | 'high' | 'critical'
  time_remaining_hours: number
  is_flagged: boolean
  fraud_score: number
  csv_file_path: string
  notes?: string
  created_by: string
}

interface TableFilters {
  search: string
  business_id: string
  status: string
  urgency: string
  date_range: string
  has_fraud_flags: boolean
  is_overdue: boolean
  created_by: string
}

interface SortConfig {
  field: keyof BatchTableData
  direction: 'asc' | 'desc'
}

interface PaginationConfig {
  page: number
  pageSize: number
  total: number
}

interface BatchManagementTableProps {
  className?: string
  onBatchClick?: (batch: BatchTableData) => void
  onBatchUpdated?: () => void
  showFilters?: boolean
  showBulkActions?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
  pageSize?: number
}

interface TableState {
  isLoading: boolean
  error: string | null
  batches: BatchTableData[]
  selectedBatches: Set<string>
  filters: TableFilters
  sort: SortConfig
  pagination: PaginationConfig
  expandedRows: Set<string>
  lastUpdated: string | null
}

interface BulkActionState {
  isOpen: boolean
  action: string | null
  isProcessing: boolean
}

export function BatchManagementTable({
  className,
  onBatchClick,
  onBatchUpdated,
  showFilters = true,
  showBulkActions = true,
  autoRefresh = true,
  refreshInterval = 30000,
  pageSize = 25
}: BatchManagementTableProps) {
  const [tableState, setTableState] = useState<TableState>({
    isLoading: false,
    error: null,
    batches: [],
    selectedBatches: new Set(),
    filters: {
      search: '',
      business_id: '',
      status: '',
      urgency: '',
      date_range: '7d',
      has_fraud_flags: false,
      is_overdue: false,
      created_by: ''
    },
    sort: {
      field: 'updated_at',
      direction: 'desc'
    },
    pagination: {
      page: 1,
      pageSize: pageSize,
      total: 0
    },
    expandedRows: new Set(),
    lastUpdated: null
  })

  const [bulkActionState, setBulkActionState] = useState<BulkActionState>({
    isOpen: false,
    action: null,
    isProcessing: false
  })

  // Load batches data
  const loadBatches = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setTableState(prev => ({ ...prev, isLoading: true, error: null }))
      }

      // Build query parameters
      const params = new URLSearchParams({
        page: tableState.pagination.page.toString(),
        pageSize: tableState.pagination.pageSize.toString(),
        sortField: tableState.sort.field,
        sortDirection: tableState.sort.direction,
        ...Object.fromEntries(
          Object.entries(tableState.filters).filter(([_, value]) => value && value !== '')
        )
      })

      const response = await fetch(`/api/admin/batches?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load batches: ${response.statusText}`)
      }

      const data = await response.json()

      setTableState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
        batches: data.batches || [],
        pagination: {
          ...prev.pagination,
          total: data.total || 0
        },
        lastUpdated: new Date().toISOString()
      }))

    } catch (error) {
      console.error('Failed to load batches:', error)

      setTableState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load batches'
      }))
    }
  }, [tableState.filters, tableState.sort, tableState.pagination.page, tableState.pagination.pageSize])

  // Auto-refresh effect
  useEffect(() => {
    loadBatches()

    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadBatches(false)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [loadBatches, autoRefresh, refreshInterval])

  // Handle filter changes
  const updateFilter = (key: keyof TableFilters, value: any) => {
    setTableState(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
      pagination: { ...prev.pagination, page: 1 } // Reset to first page
    }))
  }

  // Handle sorting
  const handleSort = (field: keyof BatchTableData) => {
    setTableState(prev => ({
      ...prev,
      sort: {
        field,
        direction: prev.sort.field === field && prev.sort.direction === 'asc' ? 'desc' : 'asc'
      },
      pagination: { ...prev.pagination, page: 1 }
    }))
  }

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setTableState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page: newPage }
    }))
  }

  // Handle batch selection
  const toggleBatchSelection = (batchId: string) => {
    setTableState(prev => {
      const newSelected = new Set(prev.selectedBatches)
      if (newSelected.has(batchId)) {
        newSelected.delete(batchId)
      } else {
        newSelected.add(batchId)
      }
      return { ...prev, selectedBatches: newSelected }
    })
  }

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (tableState.selectedBatches.size === 0) return

    setBulkActionState({ isOpen: false, action, isProcessing: true })

    try {
      const response = await fetch('/api/admin/batches/bulk-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          batch_ids: Array.from(tableState.selectedBatches)
        })
      })

      if (!response.ok) {
        throw new Error(`Bulk action failed: ${response.statusText}`)
      }

      // Clear selections and refresh
      setTableState(prev => ({ ...prev, selectedBatches: new Set() }))
      loadBatches()

      if (onBatchUpdated) {
        onBatchUpdated()
      }

    } catch (error) {
      console.error('Bulk action failed:', error)
      setTableState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Bulk action failed'
      }))
    } finally {
      setBulkActionState({ isOpen: false, action: null, isProcessing: false })
    }
  }

  // Individual batch actions
  const handleBatchAction = async (batchId: string, action: string) => {
    try {
      const response = await fetch(`/api/admin/batches/${batchId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Action failed: ${response.statusText}`)
      }

      loadBatches(false)

      if (onBatchUpdated) {
        onBatchUpdated()
      }

    } catch (error) {
      console.error('Batch action failed:', error)
      setTableState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Action failed'
      }))
    }
  }

  // Get status display
  const getStatusDisplay = (status: BatchTableData['status']) => {
    switch (status) {
      case 'completed':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Completed' }
      case 'failed':
        return { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Failed' }
      case 'expired':
        return { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Expired' }
      case 'in_progress':
        return { color: 'bg-blue-100 text-blue-800', icon: Loader2, label: 'In Progress' }
      case 'pending_verification':
        return { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' }
      case 'draft':
        return { color: 'bg-gray-100 text-gray-800', icon: FileText, label: 'Draft' }
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Unknown' }
    }
  }

  // Get urgency display
  const getUrgencyDisplay = (urgencyLevel: BatchTableData['urgency_level']) => {
    switch (urgencyLevel) {
      case 'critical':
        return { color: 'text-red-600', bg: 'bg-red-50', label: 'Critical' }
      case 'high':
        return { color: 'text-orange-600', bg: 'bg-orange-50', label: 'High' }
      case 'medium':
        return { color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Medium' }
      case 'low':
        return { color: 'text-green-600', bg: 'bg-green-50', label: 'Low' }
      default:
        return { color: 'text-gray-600', bg: 'bg-gray-50', label: 'Unknown' }
    }
  }

  // Render sort indicator
  const renderSortIcon = (field: keyof BatchTableData) => {
    if (tableState.sort.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    }

    return tableState.sort.direction === 'asc' ? (
      <ArrowUp className="h-4 w-4 text-blue-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-blue-600" />
    )
  }

  // Render filters
  const renderFilters = () => {
    if (!showFilters) return null

    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-base">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Business name, batch ID..."
                  value={tableState.filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={tableState.filters.status}
                onValueChange={(value) => updateFilter('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_verification">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Urgency */}
            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select
                value={tableState.filters.urgency}
                onValueChange={(value) => updateFilter('urgency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All urgency levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All urgency levels</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select
                value={tableState.filters.date_range}
                onValueChange={(value) => updateFilter('date_range', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional filters */}
          <div className="flex items-center space-x-6 mt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_fraud_flags"
                checked={tableState.filters.has_fraud_flags}
                onCheckedChange={(checked) => updateFilter('has_fraud_flags', checked)}
              />
              <Label htmlFor="has_fraud_flags">Has fraud flags</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_overdue"
                checked={tableState.filters.is_overdue}
                onCheckedChange={(checked) => updateFilter('is_overdue', checked)}
              />
              <Label htmlFor="is_overdue">Overdue</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render table header
  const renderTableHeader = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-4">
        <h3 className="text-lg font-semibold">
          Batches ({tableState.pagination.total})
        </h3>

        {tableState.lastUpdated && (
          <div className="text-sm text-gray-600">
            Updated: {new Date(tableState.lastUpdated).toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {/* Bulk Actions */}
        {showBulkActions && tableState.selectedBatches.size > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Actions ({tableState.selectedBatches.size})
                <MoreHorizontal className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setBulkActionState({
                isOpen: true,
                action: 'release',
                isProcessing: false
              })}>
                <Play className="h-4 w-4 mr-2" />
                Release Selected
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBulkActionState({
                isOpen: true,
                action: 'pause',
                isProcessing: false
              })}>
                <Pause className="h-4 w-4 mr-2" />
                Pause Selected
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBulkActionState({
                isOpen: true,
                action: 'export',
                isProcessing: false
              })}>
                <Download className="h-4 w-4 mr-2" />
                Export Selected
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => setBulkActionState({
                  isOpen: true,
                  action: 'delete',
                  isProcessing: false
                })}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button variant="outline" size="sm" onClick={() => loadBatches()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  )

  // Render pagination
  const renderPagination = () => {
    const totalPages = Math.ceil(tableState.pagination.total / tableState.pagination.pageSize)
    if (totalPages <= 1) return null

    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing {((tableState.pagination.page - 1) * tableState.pagination.pageSize) + 1} to{' '}
          {Math.min(tableState.pagination.page * tableState.pagination.pageSize, tableState.pagination.total)} of{' '}
          {tableState.pagination.total} results
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(tableState.pagination.page - 1)}
            disabled={tableState.pagination.page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = i + 1
              const isActive = page === tableState.pagination.page

              return (
                <Button
                  key={page}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(page)}
                  className="w-8"
                >
                  {page}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(tableState.pagination.page + 1)}
            disabled={tableState.pagination.page >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {renderFilters()}

      <Card>
        <CardContent className="p-0">
          {renderTableHeader()}

          {/* Error Alert */}
          {tableState.error && (
            <Alert variant="destructive" className="mx-4 mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{tableState.error}</span>
                <Button variant="outline" size="sm" onClick={() => loadBatches()}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {tableState.isLoading && tableState.batches.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                <p className="text-sm text-gray-600">Loading batches...</p>
              </div>
            </div>
          )}

          {/* Table */}
          {!tableState.isLoading || tableState.batches.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          tableState.selectedBatches.size === tableState.batches.length &&
                          tableState.batches.length > 0
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setTableState(prev => ({
                              ...prev,
                              selectedBatches: new Set(prev.batches.map(b => b.id))
                            }))
                          } else {
                            setTableState(prev => ({
                              ...prev,
                              selectedBatches: new Set()
                            }))
                          }
                        }}
                      />
                    </TableHead>

                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleSort('business_name')}
                      >
                        Business
                        {renderSortIcon('business_name')}
                      </Button>
                    </TableHead>

                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleSort('week_number')}
                      >
                        Week/Year
                        {renderSortIcon('week_number')}
                      </Button>
                    </TableHead>

                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleSort('status')}
                      >
                        Status
                        {renderSortIcon('status')}
                      </Button>
                    </TableHead>

                    <TableHead>Progress</TableHead>

                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleSort('total_transactions')}
                      >
                        Transactions
                        {renderSortIcon('total_transactions')}
                      </Button>
                    </TableHead>

                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleSort('total_amount')}
                      >
                        Amount
                        {renderSortIcon('total_amount')}
                      </Button>
                    </TableHead>

                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleSort('deadline')}
                      >
                        Deadline
                        {renderSortIcon('deadline')}
                      </Button>
                    </TableHead>

                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {tableState.batches.map((batch) => {
                    const statusDisplay = getStatusDisplay(batch.status)
                    const urgencyDisplay = getUrgencyDisplay(batch.urgency_level)
                    const StatusIcon = statusDisplay.icon

                    return (
                      <TableRow
                        key={batch.id}
                        className={cn(
                          "cursor-pointer hover:bg-gray-50",
                          batch.is_flagged && "bg-red-50 border-l-4 border-l-red-500"
                        )}
                        onClick={() => onBatchClick?.(batch)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={tableState.selectedBatches.has(batch.id)}
                            onCheckedChange={() => toggleBatchSelection(batch.id)}
                          />
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{batch.business_name}</div>
                            <div className="text-sm text-gray-600 font-mono">
                              {batch.id.slice(0, 8)}...
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            W{batch.week_number}/{batch.year_number}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <Badge className={statusDisplay.color} variant="outline">
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusDisplay.label}
                            </Badge>
                            {batch.is_flagged && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Flagged
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          {batch.verification_session ? (
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {batch.verification_session.progress_percentage}%
                              </div>
                              <div className="text-xs text-gray-600">
                                {batch.verification_session.verified_transactions}/{batch.total_transactions}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Not started</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm font-medium">{batch.total_transactions}</div>
                            {batch.verification_session && (
                              <div className="text-xs text-gray-600">
                                ✓{batch.verification_session.approved_transactions}
                                ✗{batch.verification_session.rejected_transactions}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm font-medium">
                            {batch.total_amount.toLocaleString()} SEK
                          </div>
                        </TableCell>

                        <TableCell>
                          <CountdownTimer
                            deadline={batch.deadline}
                            className="text-sm"
                            showIcon={false}
                            compact
                          />
                        </TableCell>

                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onBatchClick?.(batch)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>

                              {batch.status === 'draft' && (
                                <DropdownMenuItem onClick={() => handleBatchAction(batch.id, 'release')}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Release
                                </DropdownMenuItem>
                              )}

                              {batch.verification_session && batch.status === 'in_progress' && (
                                <DropdownMenuItem onClick={() => handleBatchAction(batch.id, 'pause')}>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pause
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              <BatchDownload
                                batchId={batch.id}
                                sessionId={batch.verification_session?.id}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start p-0"
                              />

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleBatchAction(batch.id, 'delete')}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}

          {/* No Data State */}
          {!tableState.isLoading && tableState.batches.length === 0 && !tableState.error && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Batches Found</h3>
              <p className="text-gray-600">
                No batches match the current filters.
              </p>
            </div>
          )}

          {renderPagination()}
        </CardContent>
      </Card>

      {/* Bulk Action Dialog */}
      <Dialog
        open={bulkActionState.isOpen}
        onOpenChange={(open) => setBulkActionState(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to {bulkActionState.action} {tableState.selectedBatches.size} selected batch(es)?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkActionState({ isOpen: false, action: null, isProcessing: false })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => bulkActionState.action && handleBulkAction(bulkActionState.action)}
              disabled={bulkActionState.isProcessing}
            >
              {bulkActionState.isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Processing Overlay */}
      {bulkActionState.isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <div className="font-medium">Processing bulk action...</div>
            </div>
            <div className="text-sm text-gray-600">
              This may take a few moments depending on the number of batches.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}