'use client'

/**
 * VerificationResultsViewer - Comprehensive results viewer for completed verification sessions
 *
 * Features:
 * - Detailed verification session summary with key metrics
 * - Transaction-level results with filtering and search
 * - AI fraud insights and pattern analysis
 * - Performance analytics and timing data
 * - Export capabilities for reporting and compliance
 * - Audit trail with complete verification history
 * - Interactive charts and visualizations
 * - Compliance reporting features
 * - Comparative analysis with historical data
 * - Detailed verifier performance metrics
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
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Download,
  Search,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Timer,
  Shield,
  Brain,
  FileText,
  Calendar,
  Zap,
  Info,
  RefreshCw,
  Loader2,
  Award,
  Flag
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Import our custom components
import { BatchDownload } from '@/components/verification/batch-download'

interface VerificationSession {
  id: string
  batch_id: string
  business_id: string
  business_name: string
  status: 'completed' | 'failed' | 'expired'
  week_number: number
  year_number: number
  total_transactions: number
  verified_transactions: number
  approved_transactions: number
  rejected_transactions: number
  progress_percentage: number
  started_at: string
  completed_at: string
  deadline: string
  total_verification_time_seconds: number
  average_verification_time_seconds: number
  verifiers: Array<{
    user_id: string
    name: string
    verified_count: number
    avg_time_seconds: number
    accuracy_score: number
  }>
  fraud_patterns_detected: number
  high_risk_transactions: number
  total_amount: number
  approved_amount: number
  rejected_amount: number
  compliance_score: number
  notes?: string
}

interface TransactionResult {
  id: string
  transaction_id: string
  index: number
  amount: number
  recipient_name: string
  recipient_account: string
  reference: string
  status: 'approved' | 'rejected'
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  risk_score: number
  fraud_indicators: string[]
  is_flagged: boolean
  verified_by: string
  verified_at: string
  verification_time_seconds: number
  reason?: string
  notes?: string
}

interface AuditEntry {
  id: string
  timestamp: string
  action: string
  user_name: string
  details: string
  metadata?: any
}

interface AnalyticsData {
  verification_timeline: Array<{
    timestamp: string
    cumulative_verified: number
    rate_per_minute: number
  }>
  decision_distribution: Array<{
    decision: string
    count: number
    percentage: number
    amount: number
  }>
  risk_analysis: Array<{
    risk_level: string
    count: number
    approved: number
    rejected: number
    avg_amount: number
  }>
  verifier_performance: Array<{
    verifier: string
    transactions: number
    accuracy: number
    avg_time: number
    approval_rate: number
  }>
  fraud_insights: Array<{
    pattern_type: string
    occurrences: number
    risk_score: number
    false_positives: number
  }>
}

interface ResultsViewerProps {
  sessionId: string
  className?: string
  onClose?: () => void
  showExportOptions?: boolean
  showAuditTrail?: boolean
  showAnalytics?: boolean
}

interface ViewerState {
  isLoading: boolean
  error: string | null
  session: VerificationSession | null
  transactions: TransactionResult[]
  auditEntries: AuditEntry[]
  analytics: AnalyticsData | null
  filters: {
    search: string
    status: string
    risk_level: string
    verifier: string
  }
  selectedTransaction: TransactionResult | null
}

export function VerificationResultsViewer({
  sessionId,
  className,
  onClose,
  showExportOptions = true,
  showAuditTrail = true,
  showAnalytics = true
}: ResultsViewerProps) {
  const [viewerState, setViewerState] = useState<ViewerState>({
    isLoading: false,
    error: null,
    session: null,
    transactions: [],
    auditEntries: [],
    analytics: null,
    filters: {
      search: '',
      status: '',
      risk_level: '',
      verifier: ''
    },
    selectedTransaction: null
  })

  // Load verification results
  const loadResults = useCallback(async () => {
    try {
      setViewerState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await fetch(`/api/admin/verification-results/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load results: ${response.statusText}`)
      }

      const data = await response.json()

      setViewerState(prev => ({
        ...prev,
        isLoading: false,
        session: data.session,
        transactions: data.transactions || [],
        auditEntries: data.audit_entries || [],
        analytics: data.analytics || null
      }))

    } catch (error) {
      console.error('Failed to load verification results:', error)
      setViewerState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load results'
      }))
    }
  }, [sessionId])

  useEffect(() => {
    loadResults()
  }, [loadResults])

  // Filter transactions
  const filteredTransactions = viewerState.transactions.filter((transaction) => {
    const matchesSearch = !viewerState.filters.search ||
      transaction.recipient_name.toLowerCase().includes(viewerState.filters.search.toLowerCase()) ||
      transaction.transaction_id.toLowerCase().includes(viewerState.filters.search.toLowerCase()) ||
      transaction.reference.toLowerCase().includes(viewerState.filters.search.toLowerCase())

    const matchesStatus = !viewerState.filters.status || transaction.status === viewerState.filters.status
    const matchesRisk = !viewerState.filters.risk_level || transaction.risk_level === viewerState.filters.risk_level
    const matchesVerifier = !viewerState.filters.verifier || transaction.verified_by === viewerState.filters.verifier

    return matchesSearch && matchesStatus && matchesRisk && matchesVerifier
  })

  // Update filter
  const updateFilter = (key: keyof ViewerState['filters'], value: string) => {
    setViewerState(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: value }
    }))
  }

  // Get status display
  const getStatusDisplay = (status: 'approved' | 'rejected') => {
    return status === 'approved'
      ? { color: 'bg-green-100 text-green-800', icon: CheckCircle }
      : { color: 'bg-red-100 text-red-800', icon: XCircle }
  }

  // Get risk display
  const getRiskDisplay = (riskLevel: 'low' | 'medium' | 'high' | 'critical') => {
    switch (riskLevel) {
      case 'critical':
        return { color: 'bg-red-100 text-red-800', label: 'Critical' }
      case 'high':
        return { color: 'bg-orange-100 text-orange-800', label: 'High' }
      case 'medium':
        return { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' }
      case 'low':
        return { color: 'bg-green-100 text-green-800', label: 'Low' }
    }
  }

  // Render session summary
  const renderSessionSummary = () => {
    if (!viewerState.session) return null

    const session = viewerState.session
    const completionTime = session.total_verification_time_seconds
    const hours = Math.floor(completionTime / 3600)
    const minutes = Math.floor((completionTime % 3600) / 60)

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold">{session.total_transactions}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs text-gray-600">
              <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
              {session.approved_transactions} approved
              <XCircle className="h-3 w-3 ml-2 mr-1 text-red-500" />
              {session.rejected_transactions} rejected
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold">{session.total_amount.toLocaleString()} SEK</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {Math.round((session.approved_amount / session.total_amount) * 100)}% approved
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Time</p>
                <p className="text-2xl font-bold">{hours}h {minutes}m</p>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Timer className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Avg: {Math.round(session.average_verification_time_seconds)}s per transaction
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compliance Score</p>
                <p className="text-2xl font-bold">{session.compliance_score}%</p>
              </div>
              <div className="h-8 w-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Shield className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-600">
              {session.fraud_patterns_detected} fraud patterns detected
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render analytics charts
  const renderAnalytics = () => {
    if (!showAnalytics || !viewerState.analytics) return null

    const analytics = viewerState.analytics

    return (
      <div className="space-y-6">
        {/* Verification Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Verification Progress Over Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.verification_timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative_verified"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  name="Cumulative Verified"
                />
                <Line
                  type="monotone"
                  dataKey="rate_per_minute"
                  stroke="#10b981"
                  name="Rate/Min"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Decision Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChartIcon className="h-5 w-5" />
                <span>Decision Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analytics.decision_distribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                  >
                    {analytics.decision_distribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.decision === 'approved' ? '#10b981' : '#ef4444'}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Risk Level Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.risk_analysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="risk_level" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="approved" fill="#10b981" name="Approved" />
                  <Bar dataKey="rejected" fill="#ef4444" name="Rejected" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Verifier Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Verifier Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Verifier</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Avg Time</TableHead>
                    <TableHead>Approval Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.verifier_performance.map((verifier, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{verifier.verifier}</TableCell>
                      <TableCell>{verifier.transactions}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {verifier.accuracy}%
                        </Badge>
                      </TableCell>
                      <TableCell>{verifier.avg_time}s</TableCell>
                      <TableCell>{verifier.approval_rate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render transaction results table
  const renderTransactionResults = () => {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Transaction Results ({filteredTransactions.length})</span>
            </CardTitle>

            {/* Filters */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={viewerState.filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10 w-64"
                />
              </div>

              <Select value={viewerState.filters.status} onValueChange={(value) => updateFilter('status', value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={viewerState.filters.risk_level} onValueChange={(value) => updateFilter('risk_level', value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Index</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Verifier</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => {
                  const statusDisplay = getStatusDisplay(transaction.status)
                  const riskDisplay = getRiskDisplay(transaction.risk_level)
                  const StatusIcon = statusDisplay.icon

                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono">#{transaction.index}</span>
                          {transaction.is_flagged && (
                            <Flag className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {transaction.amount.toLocaleString()} SEK
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{transaction.recipient_name}</div>
                          <div className="text-sm text-gray-600 font-mono">
                            {transaction.recipient_account}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusDisplay.color} variant="outline">
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={riskDisplay.color} variant="outline">
                          {riskDisplay.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{transaction.verified_by}</TableCell>
                      <TableCell className="text-sm">
                        {transaction.verification_time_seconds}s
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewerState(prev => ({
                                ...prev,
                                selectedTransaction: transaction
                              }))}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Transaction Details</DialogTitle>
                              <DialogDescription>
                                Transaction #{transaction.index} - {transaction.transaction_id}
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Amount</Label>
                                  <div className="font-mono text-lg">{transaction.amount.toLocaleString()} SEK</div>
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <Badge className={statusDisplay.color}>
                                    <StatusIcon className="h-3 w-3 mr-1" />
                                    {transaction.status}
                                  </Badge>
                                </div>
                              </div>

                              <div>
                                <Label>Recipient</Label>
                                <div className="space-y-1">
                                  <div className="font-medium">{transaction.recipient_name}</div>
                                  <div className="font-mono text-sm text-gray-600">{transaction.recipient_account}</div>
                                </div>
                              </div>

                              <div>
                                <Label>Reference</Label>
                                <div className="text-sm">{transaction.reference}</div>
                              </div>

                              {transaction.fraud_indicators.length > 0 && (
                                <div>
                                  <Label>Fraud Indicators</Label>
                                  <div className="space-y-1">
                                    {transaction.fraud_indicators.map((indicator, idx) => (
                                      <Badge key={idx} variant="destructive" className="mr-1">
                                        {indicator}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {transaction.reason && (
                                <div>
                                  <Label>Verification Reason</Label>
                                  <div className="text-sm">{transaction.reason}</div>
                                </div>
                              )}

                              {transaction.notes && (
                                <div>
                                  <Label>Notes</Label>
                                  <div className="text-sm">{transaction.notes}</div>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                <div>
                                  <Label>Verified By</Label>
                                  <div>{transaction.verified_by}</div>
                                </div>
                                <div>
                                  <Label>Verification Time</Label>
                                  <div>{transaction.verification_time_seconds}s</div>
                                </div>
                                <div>
                                  <Label>Verified At</Label>
                                  <div>{new Date(transaction.verified_at).toLocaleString()}</div>
                                </div>
                                <div>
                                  <Label>Risk Score</Label>
                                  <div>{transaction.risk_score}/100</div>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Found</h3>
              <p className="text-gray-600">
                No transactions match the current filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Render audit trail
  const renderAuditTrail = () => {
    if (!showAuditTrail) return null

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Audit Trail</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {viewerState.auditEntries.map((entry) => (
              <div key={entry.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{entry.action}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{entry.details}</div>
                  <div className="text-xs text-gray-500">by {entry.user_name}</div>
                </div>
              </div>
            ))}
          </div>

          {viewerState.auditEntries.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600">No audit entries available</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Verification Results</h2>
          {viewerState.session && (
            <p className="text-gray-600">
              {viewerState.session.business_name} - Week {viewerState.session.week_number}/{viewerState.session.year_number}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {showExportOptions && viewerState.session && (
            <BatchDownload
              sessionId={viewerState.session.id}
              batchId={viewerState.session.batch_id}
            />
          )}

          <Button variant="outline" onClick={() => loadResults()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {viewerState.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{viewerState.error}</span>
            <Button variant="outline" size="sm" onClick={() => loadResults()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {viewerState.isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
            <p className="text-sm text-gray-600">Loading verification results...</p>
          </div>
        </div>
      )}

      {/* Content */}
      {!viewerState.isLoading && viewerState.session && (
        <>
          {renderSessionSummary()}

          <Tabs defaultValue="transactions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="audit">Audit Trail</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions">
              {renderTransactionResults()}
            </TabsContent>

            <TabsContent value="analytics">
              {renderAnalytics()}
            </TabsContent>

            <TabsContent value="audit">
              {renderAuditTrail()}
            </TabsContent>

            <TabsContent value="summary">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5" />
                    <span>Verification Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {viewerState.session && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold">Session Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Session ID:</span>
                            <code className="text-xs">{viewerState.session.id}</code>
                          </div>
                          <div className="flex justify-between">
                            <span>Business:</span>
                            <span>{viewerState.session.business_name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Week/Year:</span>
                            <span>W{viewerState.session.week_number}/{viewerState.session.year_number}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Started:</span>
                            <span>{new Date(viewerState.session.started_at).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Completed:</span>
                            <span>{new Date(viewerState.session.completed_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold">Performance Metrics</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Total Time:</span>
                            <span>{Math.floor(viewerState.session.total_verification_time_seconds / 3600)}h {Math.floor((viewerState.session.total_verification_time_seconds % 3600) / 60)}m</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Avg per Transaction:</span>
                            <span>{Math.round(viewerState.session.average_verification_time_seconds)}s</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Compliance Score:</span>
                            <span className="font-medium">{viewerState.session.compliance_score}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fraud Patterns:</span>
                            <span>{viewerState.session.fraud_patterns_detected}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {viewerState.session?.notes && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Session Notes</h4>
                      <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded-lg">
                        {viewerState.session.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}