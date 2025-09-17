'use client'

/**
 * CountdownTimer - Real-time countdown for verification deadlines
 *
 * Features:
 * - Live countdown with seconds precision
 * - Dynamic urgency indicators based on remaining time
 * - Visual status changes as deadline approaches
 * - Automatic updates every second
 * - Handles timezone considerations
 * - Responsive design for mobile/desktop
 */

import { useState, useEffect } from 'react'
import { Clock, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface CountdownTimerProps {
  deadline: string // ISO 8601 datetime string
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'expired' | 'cancelled'
  className?: string
  showIcon?: boolean
  compact?: boolean
  onExpired?: () => void // Callback when timer expires
  onUrgencyChange?: (level: 'normal' | 'warning' | 'critical' | 'expired') => void
}

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalHours: number
  totalMinutes: number
  totalSeconds: number
  isExpired: boolean
  isOverdue: boolean
}

export function CountdownTimer({
  deadline,
  status,
  className,
  showIcon = true,
  compact = false,
  onExpired,
  onUrgencyChange
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null)
  const [mounted, setMounted] = useState(false)

  // Calculate time remaining
  const calculateTimeRemaining = (deadlineStr: string): TimeRemaining => {
    const now = new Date().getTime()
    const deadlineTime = new Date(deadlineStr).getTime()
    const difference = deadlineTime - now

    const isExpired = difference <= 0
    const isOverdue = isExpired && status !== 'completed'

    if (isExpired) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalHours: 0,
        totalMinutes: 0,
        totalSeconds: 0,
        isExpired: true,
        isOverdue
      }
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24))
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((difference % (1000 * 60)) / 1000)

    const totalHours = Math.floor(difference / (1000 * 60 * 60))
    const totalMinutes = Math.floor(difference / (1000 * 60))
    const totalSeconds = Math.floor(difference / 1000)

    return {
      days,
      hours,
      minutes,
      seconds,
      totalHours,
      totalMinutes,
      totalSeconds,
      isExpired: false,
      isOverdue: false
    }
  }

  // Get urgency level based on time remaining
  const getUrgencyLevel = (time: TimeRemaining): 'normal' | 'warning' | 'critical' | 'expired' => {
    if (time.isExpired) return 'expired'
    if (time.totalHours < 1) return 'critical' // Less than 1 hour
    if (time.totalHours < 24) return 'warning' // Less than 24 hours
    return 'normal'
  }

  // Get display colors based on urgency and status
  const getDisplayColors = (urgency: 'normal' | 'warning' | 'critical' | 'expired') => {
    if (status === 'completed') {
      return {
        badge: 'bg-green-100 text-green-800 border-green-200',
        text: 'text-green-700',
        icon: CheckCircle
      }
    }

    if (status === 'paused') {
      return {
        badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        text: 'text-yellow-700',
        icon: AlertTriangle
      }
    }

    switch (urgency) {
      case 'expired':
        return {
          badge: 'bg-red-100 text-red-800 border-red-200',
          text: 'text-red-700',
          icon: AlertCircle
        }
      case 'critical':
        return {
          badge: 'bg-red-100 text-red-800 border-red-200 animate-pulse',
          text: 'text-red-700',
          icon: AlertTriangle
        }
      case 'warning':
        return {
          badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          text: 'text-yellow-700',
          icon: AlertTriangle
        }
      default:
        return {
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          text: 'text-blue-700',
          icon: Clock
        }
    }
  }

  // Format time display
  const formatTimeDisplay = (time: TimeRemaining, urgency: string) => {
    if (status === 'completed') {
      return 'Completed'
    }

    if (time.isExpired) {
      if (status === 'cancelled') return 'Cancelled'
      if (status === 'expired') return 'Expired'
      return 'Overdue'
    }

    if (status === 'paused') {
      return 'Paused'
    }

    // Show different precision based on urgency
    if (urgency === 'critical') {
      // Show hours, minutes, seconds
      if (time.totalHours > 0) {
        return `${time.hours}h ${time.minutes}m ${time.seconds}s`
      }
      return `${time.minutes}m ${time.seconds}s`
    }

    if (urgency === 'warning') {
      // Show hours and minutes
      if (time.totalHours > 0) {
        return `${time.hours}h ${time.minutes}m`
      }
      return `${time.minutes}m`
    }

    // Normal urgency - show days and hours
    if (time.days > 0) {
      return `${time.days}d ${time.hours}h`
    }
    return `${time.hours}h ${time.minutes}m`
  }

  // Update timer every second
  useEffect(() => {
    setMounted(true)

    const updateTimer = () => {
      const newTime = calculateTimeRemaining(deadline)
      setTimeRemaining(newTime)

      const urgency = getUrgencyLevel(newTime)

      // Call urgency change callback if provided
      if (onUrgencyChange) {
        onUrgencyChange(urgency)
      }

      // Call expired callback if just expired
      if (newTime.isExpired && onExpired && !timeRemaining?.isExpired) {
        onExpired()
      }
    }

    // Initial update
    updateTimer()

    // Set up interval for updates
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [deadline, status, onExpired, onUrgencyChange, timeRemaining])

  // Don't render on server-side to avoid hydration mismatch
  if (!mounted || !timeRemaining) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <div className="animate-pulse bg-gray-200 h-6 w-32 rounded"></div>
      </div>
    )
  }

  const urgency = getUrgencyLevel(timeRemaining)
  const colors = getDisplayColors(urgency)
  const timeDisplay = formatTimeDisplay(timeRemaining, urgency)
  const IconComponent = colors.icon

  if (compact) {
    return (
      <Badge className={cn(colors.badge, className)}>
        <div className="flex items-center space-x-1">
          {showIcon && <IconComponent className="h-3 w-3" />}
          <span className="text-sm font-medium">{timeDisplay}</span>
        </div>
      </Badge>
    )
  }

  return (
    <div className={cn('flex items-center justify-between p-3 rounded-lg border', colors.badge, className)}>
      <div className="flex items-center space-x-3">
        {showIcon && <IconComponent className="h-5 w-5" />}

        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">
              {status === 'completed' ? 'Completed' : 'Time Remaining'}
            </span>
            {urgency === 'critical' && !timeRemaining.isExpired && (
              <Badge variant="destructive" className="text-xs">
                URGENT
              </Badge>
            )}
          </div>

          <div className="text-lg font-bold">
            {timeDisplay}
          </div>

          {!timeRemaining.isExpired && status !== 'completed' && status !== 'paused' && (
            <div className="text-xs opacity-75">
              Deadline: {new Date(deadline).toLocaleDateString()} at{' '}
              {new Date(deadline).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>
      </div>

      {/* Progress indicator for critical urgency */}
      {urgency === 'critical' && !timeRemaining.isExpired && (
        <div className="text-right space-y-1">
          <div className="text-xs opacity-75">Critical</div>
          <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
        </div>
      )}

      {/* Overdue indicator */}
      {timeRemaining.isOverdue && (
        <div className="text-right space-y-1">
          <div className="text-xs font-medium">Overdue</div>
          <div className="text-xs opacity-75">
            {Math.floor((new Date().getTime() - new Date(deadline).getTime()) / (1000 * 60 * 60))}h ago
          </div>
        </div>
      )}
    </div>
  )
}

// Utility hook for using the countdown timer in other components
export function useCountdown(deadline: string) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null)

  useEffect(() => {
    const calculateTime = (deadlineStr: string): TimeRemaining => {
      const now = new Date().getTime()
      const deadlineTime = new Date(deadlineStr).getTime()
      const difference = deadlineTime - now

      const isExpired = difference <= 0
      const isOverdue = isExpired

      if (isExpired) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalHours: 0,
          totalMinutes: 0,
          totalSeconds: 0,
          isExpired: true,
          isOverdue
        }
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      const totalHours = Math.floor(difference / (1000 * 60 * 60))
      const totalMinutes = Math.floor(difference / (1000 * 60))
      const totalSeconds = Math.floor(difference / 1000)

      return {
        days,
        hours,
        minutes,
        seconds,
        totalHours,
        totalMinutes,
        totalSeconds,
        isExpired: false,
        isOverdue: false
      }
    }

    const updateTimer = () => {
      setTimeRemaining(calculateTime(deadline))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [deadline])

  return timeRemaining
}