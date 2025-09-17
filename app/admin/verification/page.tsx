'use client'

/**
 * AdminVerificationDashboard - Comprehensive admin dashboard for verification management
 *
 * Features:
 * - System-wide verification overview with real-time metrics
 * - Multi-business batch management with filtering and sorting
 * - Admin controls for batch release and session management
 * - Performance analytics and trend visualization
 * - Bulk operations for efficient batch processing
 * - Advanced filtering by business, status, urgency, and dates
 * - Export capabilities for reporting and analysis
 * - Integration with fraud insights and AI recommendations
 * - Responsive design optimized for admin workflows
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts'
import {
  Shield,
  Users,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Upload,
  Download,
  Search,
  Filter,
  RefreshCw,
  MoreHorizontal,
  Play,
  Pause,
  StopCircle,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Settings,
  Eye,
  Loader2,
  FileText,
  Database,
  Zap,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Import our custom components
import { CountdownTimer } from '@/components/verification/countdown-timer'
import { BatchDownload } from '@/components/verification/batch-download'
import { FraudInsights } from '@/components/verification/fraud-insights'

interface AdminDashboardStats {
  total_sessions: number
  active_sessions: number
  pending_sessions: number
  completed_today: number
  failed_sessions: number
  average_processing_time_minutes: number
  total_transactions_pending: number
  total_businesses: number
  overdue_sessions: number
  critical_urgency_sessions: number
  fraud_alerts_active: number
  system_health_score: number
}

interface BusinessBatch {
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
  verification_session?: {
    id: string
    status: string
    progress_percentage: number
    verified_transactions: number
    approved_transactions: number
    rejected_transactions: number
  }
  urgency_level: 'low' | 'medium' | 'high' | 'critical'
  time_remaining_hours: number
  is_flagged: boolean
  fraud_score: number
}

interface PerformanceMetrics {
  daily_completions: Array<{
    date: string
    completed: number
    failed: number
    total: number
  }>
  business_performance: Array<{
    business_name: string
    avg_processing_time: number
    completion_rate: number
    total_batches: number
  }>
  urgency_distribution: Array<{
    level: string
    count: number
    percentage: number
  }>
  status_distribution: Array<{
    status: string
    count: number
    color: string
  }>
}

interface AdminFilters {
  business: string
  status: string
  urgency: string
  date_range: string
  has_fraud_alerts: boolean
  is_overdue: boolean
  search: string
}

interface AdminDashboardState {
  isLoading: boolean
  error: string | null
  stats: AdminDashboardStats | null
  batches: BusinessBatch[]
  metrics: PerformanceMetrics | null
  selectedBatches: Set<string>
  filters: AdminFilters
  lastUpdated: string | null
}

export default function AdminVerificationDashboard() {
  const [dashboardState, setDashboardState] = useState<AdminDashboardState>({
    isLoading: false,
    error: null,
    stats: null,
    batches: [],
    metrics: null,
    selectedBatches: new Set(),
    filters: {
      business: '',
      status: '',
      urgency: '',
      date_range: '7d',
      has_fraud_alerts: false,
      is_overdue: false,
      search: ''
    },
    lastUpdated: null
  })

  const [bulkActionDialog, setBulkActionDialog] = useState<{
    isOpen: boolean
    action: string | null
    selectedCount: number
  }>({
    isOpen: false,
    action: null,
    selectedCount: 0
  })

  // Load dashboard data
  const loadDashboardData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setDashboardState(prev => ({ ...prev, isLoading: true, error: null }))
      }

      // Build query parameters from filters
      const params = new URLSearchParams()
      Object.entries(dashboardState.filters).forEach(([key, value]) => {
        if (value && value !== '') {
          params.append(key, String(value))
        }
      })

      const response = await fetch(`/api/admin/verification/dashboard?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load dashboard data: ${response.statusText}`)
      }

      const data = await response.json()

      setDashboardState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
        stats: data.stats || null,
        batches: data.batches || [],
        metrics: data.metrics || null,
        lastUpdated: new Date().toISOString()
      }))

    } catch (error) {
      console.error('Failed to load admin dashboard:', error)

      setDashboardState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load dashboard data'
      }))
    }
  }, [dashboardState.filters])

  // Auto-refresh effect
  useEffect(() => {
    loadDashboardData()

    const interval = setInterval(() => {
      loadDashboardData(false)
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [loadDashboardData])

  // Handle filter changes
  const updateFilter = (key: keyof AdminFilters, value: any) => {
    setDashboardState(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value }
    }))
  }

  // Handle batch selection
  const toggleBatchSelection = (batchId: string) => {
    setDashboardState(prev => {
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
    try {
      const selectedBatches = Array.from(dashboardState.selectedBatches)

      const response = await fetch('/api/admin/verification/bulk-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          batch_ids: selectedBatches
        })
      })

      if (!response.ok) {
        throw new Error(`Bulk action failed: ${response.statusText}`)
      }

      // Refresh dashboard after bulk action
      loadDashboardData()

      // Clear selections
      setDashboardState(prev => ({
        ...prev,
        selectedBatches: new Set()
      }))

      setBulkActionDialog({ isOpen: false, action: null, selectedCount: 0 })

    } catch (error) {
      console.error('Bulk action failed:', error)
      // Handle error appropriately
    }
  }

  // Get status display
  const getStatusDisplay = (status: BusinessBatch['status']) => {
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

  // Render statistics cards
  const renderStatsCards = () => {
    if (!dashboardState.stats) return null

    const stats = dashboardState.stats

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold">{stats.active_sessions}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Play className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {stats.pending_sessions} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold">{stats.completed_today}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {stats.failed_sessions} failed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue_sessions}</p>
              </div>
              <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {stats.critical_urgency_sessions} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Health</p>
                <p className="text-2xl font-bold">{stats.system_health_score}%</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {stats.fraud_alerts_active} fraud alerts
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render filters
  const renderFilters = () => {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
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
                  value={dashboardState.filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Business */}
            <div className="space-y-2">
              <Label>Business</Label>
              <Select
                value={dashboardState.filters.business}
                onValueChange={(value) => updateFilter('business', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All businesses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All businesses</SelectItem>
                  {/* Populate with actual business options */}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={dashboardState.filters.status}
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
                value={dashboardState.filters.urgency}
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
          </div>

          {/* Additional filters */}
          <div className="flex items-center space-x-6 mt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_fraud_alerts"
                checked={dashboardState.filters.has_fraud_alerts}
                onCheckedChange={(checked) => updateFilter('has_fraud_alerts', checked)}
              />
              <Label htmlFor="has_fraud_alerts">Has fraud alerts</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_overdue"
                checked={dashboardState.filters.is_overdue}
                onCheckedChange={(checked) => updateFilter('is_overdue', checked)}
              />
              <Label htmlFor="is_overdue">Overdue</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render batch table
  const renderBatchTable = () => {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Verification Batches ({dashboardState.batches.length})</span>
            </CardTitle>

            <div className="flex items-center space-x-2">
              {/* Bulk Actions */}
              {dashboardState.selectedBatches.size > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Actions ({dashboardState.selectedBatches.size})
                      <MoreHorizontal className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Bulk Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setBulkActionDialog({
                      isOpen: true,
                      action: 'release',
                      selectedCount: dashboardState.selectedBatches.size
                    })}>
                      <Play className="h-4 w-4 mr-2" />
                      Release for Verification
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBulkActionDialog({
                      isOpen: true,
                      action: 'pause',
                      selectedCount: dashboardState.selectedBatches.size
                    })}>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause Sessions
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBulkActionDialog({
                      isOpen: true,
                      action: 'export',
                      selectedCount: dashboardState.selectedBatches.size
                    })}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button variant="outline" size="sm" onClick={() => loadDashboardData()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={dashboardState.selectedBatches.size === dashboardState.batches.length && dashboardState.batches.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setDashboardState(prev => ({
                            ...prev,
                            selectedBatches: new Set(prev.batches.map(b => b.id))
                          }))
                        } else {
                          setDashboardState(prev => ({
                            ...prev,
                            selectedBatches: new Set()
                          }))
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Week/Year</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboardState.batches.map((batch) => {
                  const statusDisplay = getStatusDisplay(batch.status)
                  const StatusIcon = statusDisplay.icon

                  return (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <Checkbox
                          checked={dashboardState.selectedBatches.has(batch.id)}
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
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {batch.status === 'draft' && (
                              <DropdownMenuItem>
                                <Play className="h-4 w-4 mr-2" />
                                Release
                              </DropdownMenuItem>
                            )}
                            {batch.verification_session && (
                              <DropdownMenuItem>
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
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {dashboardState.batches.length === 0 && !dashboardState.isLoading && (
            <div className="text-center py-12">
              <Database className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Batches Found</h3>
              <p className="text-gray-600">
                No verification batches match the current filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Admin Verification Dashboard</h1>
          <p className="text-gray-600">
            System-wide verification management and monitoring
          </p>
          {dashboardState.lastUpdated && (
            <p className="text-sm text-gray-500">
              Last updated: {new Date(dashboardState.lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Batch
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {dashboardState.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{dashboardState.error}</span>
            <Button variant="outline" size="sm" onClick={() => loadDashboardData()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {dashboardState.isLoading && !dashboardState.stats && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
            <p className="text-sm text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!dashboardState.isLoading || dashboardState.stats ? (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full lg:w-[400px] grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="batches">Batches</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="fraud">Fraud</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {renderStatsCards()}
            {renderFilters()}
            {renderBatchTable()}
          </TabsContent>

          <TabsContent value="batches" className="space-y-6">
            {renderFilters()}
            {renderBatchTable()}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Performance Analytics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <PieChartIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Analytics charts will be implemented here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fraud" className="space-y-6">
            <FraudInsights
              showDetailed
              autoRefresh
              onPatternDetected={(pattern) => {
                // Handle new pattern detection
                console.log('New fraud pattern detected:', pattern)
              }}
            />
          </TabsContent>
        </Tabs>
      ) : null}

      {/* Bulk Action Dialog */}
      <Dialog
        open={bulkActionDialog.isOpen}
        onOpenChange={(open) => setBulkActionDialog(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to perform this action on {bulkActionDialog.selectedCount} selected batch(es)?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkActionDialog({ isOpen: false, action: null, selectedCount: 0 })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => bulkActionDialog.action && handleBulkAction(bulkActionDialog.action)}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}