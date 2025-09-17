'use client'

/**
 * VerificationDashboard - Main verification interface for businesses
 *
 * Features:
 * - Active verification sessions overview
 * - Real-time countdown timers for deadlines
 * - CSV batch upload functionality
 * - Transaction verification interface
 * - Progress tracking and analytics
 * - Download capabilities for results
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Clock,
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  Activity,
  DollarSign
} from 'lucide-react'

// Import custom verification components (to be created in subsequent tasks)
import { CountdownTimer } from '@/components/verification/countdown-timer'
import { VerificationUpload } from '@/components/verification/verification-upload'
import { ProgressTracker } from '@/components/verification/progress-tracker'
import { BatchDownload } from '@/components/verification/batch-download'

interface VerificationSession {
  id: string
  business_id: string
  payment_batch_id: string
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'expired' | 'cancelled'
  total_transactions: number
  verified_transactions: number
  approved_count: number
  rejected_count: number
  deadline: string
  started_at: string | null
  completed_at: string | null
  average_risk_score: number
  batch_info: {
    week_number: number
    year_number: number
    total_amount: number
    csv_file_path: string | null
  }
}

interface VerificationStats {
  total_sessions: number
  active_sessions: number
  completed_sessions: number
  pending_verification: number
  total_transactions_processed: number
  average_completion_rate: number
  overdue_sessions: number
}

export default function VerificationDashboard() {
  const router = useRouter()
  const [sessions, setSessions] = useState<VerificationSession[]>([])
  const [stats, setStats] = useState<VerificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Initialize Supabase client
  const supabase = createClient()

  // Load verification data on component mount
  useEffect(() => {
    loadVerificationData()

    // Set up auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      refreshData()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const loadVerificationData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load verification status (from our API endpoint T045)
      const response = await fetch('/api/verification/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error(`Failed to load verification data: ${response.statusText}`)
      }

      const data = await response.json()

      setSessions(data.active_sessions || [])
      setStats(data.dashboard_summary || null)

      // Select first active session by default
      if (data.active_sessions?.length > 0 && !selectedSession) {
        setSelectedSession(data.active_sessions[0].id)
      }

    } catch (error) {
      console.error('Error loading verification data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load verification data')
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    if (refreshing) return

    try {
      setRefreshing(true)
      await loadVerificationData()
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />
      case 'in_progress':
        return <Activity className="h-4 w-4" />
      case 'paused':
        return <AlertTriangle className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'expired':
        return <XCircle className="h-4 w-4" />
      case 'cancelled':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const calculateCompletionRate = (session: VerificationSession) => {
    if (session.total_transactions === 0) return 0
    return Math.round((session.verified_transactions / session.total_transactions) * 100)
  }

  const calculateApprovalRate = (session: VerificationSession) => {
    if (session.verified_transactions === 0) return 0
    return Math.round((session.approved_count / session.verified_transactions) * 100)
  }

  const handleStartVerification = (sessionId: string) => {
    router.push(`/dashboard/verification/session/${sessionId}`)
  }

  const handleUploadSuccess = () => {
    // Refresh data after successful upload
    loadVerificationData()
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading verification dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Verification</h1>
          <p className="text-gray-600 mt-1">
            Manage and verify payment batches with AI-powered fraud detection
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center space-x-2"
          >
            <Activity className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Dashboard Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_sessions}</div>
              <p className="text-xs text-gray-600">
                {stats.pending_verification} pending verification
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed_sessions}</div>
              <p className="text-xs text-gray-600">
                Total sessions: {stats.total_sessions}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <FileText className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_transactions_processed.toLocaleString()}
              </div>
              <p className="text-xs text-gray-600">
                Avg completion: {stats.average_completion_rate}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdue_sessions}</div>
              <p className="text-xs text-gray-600">
                Require immediate attention
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">Active Sessions</TabsTrigger>
          <TabsTrigger value="upload">Upload Batch</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Active Sessions Tab */}
        <TabsContent value="active" className="space-y-6">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Active Verification Sessions
                </h3>
                <p className="text-gray-600 mb-6">
                  Upload a payment batch CSV to start the verification process
                </p>
                <Button onClick={() => {
                  const tabsList = document.querySelector('[role="tablist"]')
                  const uploadTab = tabsList?.querySelector('[value="upload"]') as HTMLElement
                  uploadTab?.click()
                }}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Batch
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sessions.map((session) => (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Week {session.batch_info.week_number}, {session.batch_info.year_number}
                      </CardTitle>
                      <Badge className={getStatusColor(session.status)}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(session.status)}
                          <span className="capitalize">{session.status}</span>
                        </div>
                      </Badge>
                    </div>
                    <CardDescription>
                      {session.total_transactions.toLocaleString()} transactions •
                      {session.batch_info.total_amount.toLocaleString()} SEK
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Progress Tracker */}
                    <ProgressTracker session={session} />

                    {/* Countdown Timer (for active sessions) */}
                    {['in_progress', 'paused', 'pending'].includes(session.status) && (
                      <CountdownTimer
                        deadline={session.deadline}
                        status={session.status}
                      />
                    )}

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Progress</span>
                        <span>{calculateCompletionRate(session)}%</span>
                      </div>
                      <Progress value={calculateCompletionRate(session)} className="h-2" />
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-gray-600">Verified</p>
                        <p className="font-medium">
                          {session.verified_transactions} / {session.total_transactions}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-600">Approval Rate</p>
                        <p className="font-medium">{calculateApprovalRate(session)}%</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-3 pt-4">
                      {session.status === 'in_progress' && (
                        <Button
                          onClick={() => handleStartVerification(session.id)}
                          className="flex-1"
                        >
                          <Activity className="h-4 w-4 mr-2" />
                          Continue Verification
                        </Button>
                      )}

                      {session.status === 'pending' && (
                        <Button
                          onClick={() => handleStartVerification(session.id)}
                          className="flex-1"
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Start Verification
                        </Button>
                      )}

                      {session.status === 'completed' && (
                        <BatchDownload
                          sessionId={session.id}
                          batchId={session.payment_batch_id}
                          className="flex-1"
                        />
                      )}

                      {session.batch_info.csv_file_path && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Download original CSV functionality
                            window.open(`/api/verification/download?type=batch_csv&batch_id=${session.payment_batch_id}`, '_blank')
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Upload Batch Tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Payment Batch</CardTitle>
              <CardDescription>
                Upload a CSV file containing payment transactions for verification.
                The file must follow the required format with all necessary columns.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VerificationUpload
                onUploadSuccess={handleUploadSuccess}
                maxFileSize={10 * 1024 * 1024} // 10MB
                acceptedFileTypes={['.csv']}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Verification History</CardTitle>
              <CardDescription>
                View completed and past verification sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>History view will be implemented with detailed session records</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}