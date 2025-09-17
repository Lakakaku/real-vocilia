'use client'

/**
 * ProgressTracker - Visual progress indicator for verification sessions
 *
 * Features:
 * - Real-time session progress tracking
 * - Visual progress bars with status indicators
 * - Timeline view of verification milestones
 * - Responsive design for mobile and desktop
 * - Status-based color coding and animations
 * - Integration with verification workflow states
 * - Accessibility support with ARIA labels
 * - Auto-refresh with configurable intervals
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Upload,
  FileCheck,
  Users,
  TrendingUp,
  Loader2,
  RefreshCw,
  Eye,
  Calendar,
  Timer,
  BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface VerificationSession {
  id: string
  batch_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired'
  total_transactions: number
  verified_transactions: number
  pending_transactions: number
  approved_transactions: number
  rejected_transactions: number
  progress_percentage: number
  deadline: string
  created_at: string
  started_at: string | null
  completed_at: string | null
  business_name?: string
  week_number: number
  year_number: number
  urgency_level: 'low' | 'medium' | 'high' | 'critical'
  estimated_completion_time: string | null
  verification_rate_per_minute: number | null
  current_verifier?: string
  time_remaining_hours: number
}

interface ProgressMilestone {
  id: string
  label: string
  status: 'completed' | 'current' | 'pending'
  timestamp?: string
  description?: string
  icon: React.ComponentType<any>
}

interface ProgressTrackerProps {
  sessionId?: string
  sessions?: VerificationSession[]
  showTimeline?: boolean
  showEstimatedCompletion?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
  compact?: boolean
  className?: string
  onSessionClick?: (session: VerificationSession) => void
  onRefresh?: () => void
}

interface SessionProgressState {
  isLoading: boolean
  error: string | null
  lastUpdated: string | null
  sessions: VerificationSession[]
}

export function ProgressTracker({
  sessionId,
  sessions: initialSessions = [],
  showTimeline = true,
  showEstimatedCompletion = true,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  compact = false,
  className,
  onSessionClick,
  onRefresh
}: ProgressTrackerProps) {
  const [progressState, setProgressState] = useState<SessionProgressState>({
    isLoading: false,
    error: null,
    lastUpdated: null,
    sessions: initialSessions
  })

  // Load session progress data
  const loadProgress = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setProgressState(prev => ({ ...prev, isLoading: true, error: null }))
      }

      let url = '/api/verification/progress'
      if (sessionId) {
        url += `?session_id=${sessionId}`
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load progress: ${response.statusText}`)
      }

      const data = await response.json()

      setProgressState({
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
        sessions: data.sessions || []
      })

      if (onRefresh) {
        onRefresh()
      }

    } catch (error) {
      console.error('Failed to load verification progress:', error)

      setProgressState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load progress data'
      }))
    }
  }, [sessionId, onRefresh])

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return

    // Initial load
    loadProgress()

    // Set up interval for auto-refresh
    const interval = setInterval(() => {
      loadProgress(false) // Don't show loading spinner for background refreshes
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, loadProgress])

  // Get status display properties
  const getStatusDisplay = (status: VerificationSession['status']) => {
    switch (status) {
      case 'completed':
        return {
          color: 'bg-green-50 border-green-200',
          badgeColor: 'bg-green-100 text-green-800',
          icon: CheckCircle,
          iconColor: 'text-green-600',
          label: 'Completed'
        }
      case 'failed':
        return {
          color: 'bg-red-50 border-red-200',
          badgeColor: 'bg-red-100 text-red-800',
          icon: XCircle,
          iconColor: 'text-red-600',
          label: 'Failed'
        }
      case 'expired':
        return {
          color: 'bg-gray-50 border-gray-200',
          badgeColor: 'bg-gray-100 text-gray-800',
          icon: Clock,
          iconColor: 'text-gray-600',
          label: 'Expired'
        }
      case 'in_progress':
        return {
          color: 'bg-blue-50 border-blue-200',
          badgeColor: 'bg-blue-100 text-blue-800',
          icon: Loader2,
          iconColor: 'text-blue-600 animate-spin',
          label: 'In Progress'
        }
      case 'pending':
        return {
          color: 'bg-yellow-50 border-yellow-200',
          badgeColor: 'bg-yellow-100 text-yellow-800',
          icon: Clock,
          iconColor: 'text-yellow-600',
          label: 'Pending'
        }
      default:
        return {
          color: 'bg-gray-50 border-gray-200',
          badgeColor: 'bg-gray-100 text-gray-800',
          icon: Clock,
          iconColor: 'text-gray-600',
          label: 'Unknown'
        }
    }
  }

  // Get urgency display
  const getUrgencyDisplay = (urgencyLevel: VerificationSession['urgency_level'], hoursRemaining: number) => {
    if (hoursRemaining <= 0) {
      return { color: 'text-red-600', label: 'Expired', severity: 'critical' }
    }

    switch (urgencyLevel) {
      case 'critical':
        return { color: 'text-red-600', label: 'Critical', severity: 'critical' }
      case 'high':
        return { color: 'text-orange-600', label: 'High', severity: 'high' }
      case 'medium':
        return { color: 'text-yellow-600', label: 'Medium', severity: 'medium' }
      case 'low':
        return { color: 'text-green-600', label: 'Low', severity: 'low' }
      default:
        return { color: 'text-gray-600', label: 'Unknown', severity: 'low' }
    }
  }

  // Generate progress milestones for timeline view
  const generateMilestones = (session: VerificationSession): ProgressMilestone[] => {
    const milestones: ProgressMilestone[] = [
      {
        id: 'uploaded',
        label: 'Batch Uploaded',
        status: 'completed',
        timestamp: session.created_at,
        description: 'CSV file processed and validated',
        icon: Upload
      },
      {
        id: 'validated',
        label: 'Validation Complete',
        status: 'completed',
        timestamp: session.created_at,
        description: 'All transactions validated successfully',
        icon: FileCheck
      },
      {
        id: 'started',
        label: 'Verification Started',
        status: session.started_at ? 'completed' : (session.status === 'in_progress' ? 'current' : 'pending'),
        timestamp: session.started_at || undefined,
        description: 'Verification process initiated',
        icon: Users
      },
      {
        id: 'completed',
        label: 'Verification Complete',
        status: session.completed_at ? 'completed' : (session.status === 'completed' ? 'completed' : 'pending'),
        timestamp: session.completed_at || undefined,
        description: 'All transactions verified',
        icon: CheckCircle
      }
    ]

    return milestones
  }

  // Format time remaining
  const formatTimeRemaining = (hours: number) => {
    if (hours <= 0) return 'Expired'
    if (hours < 1) return `${Math.round(hours * 60)}m remaining`
    if (hours < 24) return `${Math.round(hours)}h remaining`
    const days = Math.floor(hours / 24)
    const remainingHours = Math.round(hours % 24)
    return `${days}d ${remainingHours}h remaining`
  }

  // Render individual session progress
  const renderSessionProgress = (session: VerificationSession) => {
    const statusDisplay = getStatusDisplay(session.status)
    const urgencyDisplay = getUrgencyDisplay(session.urgency_level, session.time_remaining_hours)
    const StatusIcon = statusDisplay.icon
    const milestones = generateMilestones(session)

    return (
      <Card
        key={session.id}
        className={cn(
          'transition-all duration-200 hover:shadow-md cursor-pointer',
          statusDisplay.color,
          urgencyDisplay.severity === 'critical' && 'ring-2 ring-red-200 animate-pulse',
          className
        )}
        onClick={() => onSessionClick?.(session)}
      >
        <CardHeader className={cn('pb-3', compact && 'pb-2')}>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <StatusIcon className={cn("h-4 w-4", statusDisplay.iconColor)} />
                <CardTitle className="text-sm font-medium">
                  {session.business_name || 'Unknown Business'}
                </CardTitle>
              </div>
              <div className="text-xs text-gray-600">
                Week {session.week_number}, {session.year_number}
              </div>
            </div>

            <div className="flex flex-col items-end space-y-1">
              <Badge className={statusDisplay.badgeColor} variant="outline">
                {statusDisplay.label}
              </Badge>
              <div className={cn("text-xs font-medium", urgencyDisplay.color)}>
                {urgencyDisplay.label}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className={cn('space-y-4', compact && 'space-y-2')}>
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{Math.round(session.progress_percentage)}%</span>
            </div>
            <Progress
              value={session.progress_percentage}
              className="h-2"
              // Use different colors based on status
              style={{
                '--progress-background': statusDisplay.color,
                '--progress-foreground': statusDisplay.iconColor?.includes('green') ? 'rgb(34, 197, 94)' :
                                        statusDisplay.iconColor?.includes('red') ? 'rgb(239, 68, 68)' :
                                        statusDisplay.iconColor?.includes('blue') ? 'rgb(59, 130, 246)' :
                                        'rgb(107, 114, 128)'
              } as React.CSSProperties}
            />
          </div>

          {/* Transaction Counts */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center">
              <div className="font-bold text-green-600">{session.approved_transactions}</div>
              <div className="text-xs text-gray-600">Approved</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-red-600">{session.rejected_transactions}</div>
              <div className="text-xs text-gray-600">Rejected</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-gray-600">{session.pending_transactions}</div>
              <div className="text-xs text-gray-600">Pending</div>
            </div>
          </div>

          {/* Time and Estimates */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center space-x-1 text-gray-600">
                <Timer className="h-4 w-4" />
                <span>Time Remaining</span>
              </span>
              <span className={cn("font-medium", urgencyDisplay.color)}>
                {formatTimeRemaining(session.time_remaining_hours)}
              </span>
            </div>

            {showEstimatedCompletion && session.estimated_completion_time && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center space-x-1 text-gray-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>Est. Completion</span>
                </span>
                <span className="font-medium">
                  {new Date(session.estimated_completion_time).toLocaleString()}
                </span>
              </div>
            )}

            {session.verification_rate_per_minute && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center space-x-1 text-gray-600">
                  <BarChart3 className="h-4 w-4" />
                  <span>Rate</span>
                </span>
                <span className="font-medium">
                  {Math.round(session.verification_rate_per_minute)}/min
                </span>
              </div>
            )}
          </div>

          {/* Timeline */}
          {showTimeline && !compact && (
            <div className="border-t pt-3">
              <div className="text-xs font-medium text-gray-700 mb-2">Verification Timeline</div>
              <div className="space-y-2">
                {milestones.map((milestone, index) => {
                  const MilestoneIcon = milestone.icon

                  return (
                    <div key={milestone.id} className="flex items-center space-x-3">
                      <div className={cn(
                        "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
                        milestone.status === 'completed' && "bg-green-100",
                        milestone.status === 'current' && "bg-blue-100 ring-2 ring-blue-200",
                        milestone.status === 'pending' && "bg-gray-100"
                      )}>
                        <MilestoneIcon className={cn(
                          "h-3 w-3",
                          milestone.status === 'completed' && "text-green-600",
                          milestone.status === 'current' && "text-blue-600",
                          milestone.status === 'pending' && "text-gray-400"
                        )} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "text-xs font-medium",
                          milestone.status === 'completed' && "text-green-700",
                          milestone.status === 'current' && "text-blue-700",
                          milestone.status === 'pending' && "text-gray-500"
                        )}>
                          {milestone.label}
                        </div>
                        {milestone.timestamp && (
                          <div className="text-xs text-gray-500">
                            {new Date(milestone.timestamp).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Current Verifier */}
          {session.current_verifier && (
            <div className="flex items-center space-x-2 text-sm text-gray-600 border-t pt-2">
              <Eye className="h-4 w-4" />
              <span>Current verifier: {session.current_verifier}</span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Verification Progress</h3>
          {progressState.lastUpdated && (
            <p className="text-sm text-gray-600">
              Last updated: {new Date(progressState.lastUpdated).toLocaleTimeString()}
            </p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadProgress()}
          disabled={progressState.isLoading}
        >
          {progressState.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {progressState.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{progressState.error}</span>
            <Button variant="outline" size="sm" onClick={() => loadProgress()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {progressState.isLoading && progressState.sessions.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
            <p className="text-sm text-gray-600">Loading verification progress...</p>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!progressState.isLoading && progressState.sessions.length === 0 && !progressState.error && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Sessions</h3>
          <p className="text-gray-600">
            There are no verification sessions in progress at the moment.
          </p>
        </div>
      )}

      {/* Session Progress Cards */}
      <div className="space-y-4">
        {progressState.sessions.map(renderSessionProgress)}
      </div>
    </div>
  )
}