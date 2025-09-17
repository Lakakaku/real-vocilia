/**
 * Unit tests for deadline calculation logic
 *
 * Tests 7-day verification deadlines, countdown timers, auto-approval triggers,
 * business hours calculations, and timezone handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DeadlineService } from '@/lib/verification/services/deadline-service'
import type { PaymentBatch, VerificationSession } from '@/types/verification'

// Mock Date for consistent testing
const mockDate = new Date('2023-12-15T10:00:00Z')

describe('DeadlineService', () => {
  let deadlineService: DeadlineService

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
    deadlineService = new DeadlineService()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Deadline Calculation', () => {
    it('should calculate 7-day deadline from current time', () => {
      const deadline = deadlineService.calculateDeadline()

      const expectedDeadline = new Date(mockDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      expect(deadline.getTime()).toBe(expectedDeadline.getTime())
    })

    it('should calculate deadline from specific start time', () => {
      const startTime = new Date('2023-12-10T15:30:00Z')
      const deadline = deadlineService.calculateDeadline(startTime)

      const expectedDeadline = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000)
      expect(deadline.getTime()).toBe(expectedDeadline.getTime())
    })

    it('should handle custom deadline duration', () => {
      const customDays = 3
      const deadline = deadlineService.calculateDeadline(mockDate, customDays)

      const expectedDeadline = new Date(mockDate.getTime() + customDays * 24 * 60 * 60 * 1000)
      expect(deadline.getTime()).toBe(expectedDeadline.getTime())
    })

    it('should exclude weekends from business day calculations', () => {
      // Start on Friday
      const fridayDate = new Date('2023-12-15T10:00:00Z') // Friday
      const deadline = deadlineService.calculateBusinessDayDeadline(fridayDate, 5) // 5 business days

      // Should skip weekend and land on Friday of next week
      const expectedDeadline = new Date('2023-12-22T10:00:00Z')
      expect(deadline.getTime()).toBe(expectedDeadline.getTime())
    })

    it('should exclude Swedish holidays from business day calculations', () => {
      // Test around Christmas (December 25, 2023 was a Monday)
      const preChristmas = new Date('2023-12-22T10:00:00Z') // Friday before Christmas
      const deadline = deadlineService.calculateBusinessDayDeadline(preChristmas, 3)

      // Should skip Christmas holidays and land on appropriate business day
      const expectedDeadline = new Date('2023-12-28T10:00:00Z') // Thursday after holidays
      expect(deadline.getTime()).toBe(expectedDeadline.getTime())
    })
  })

  describe('Time Remaining Calculations', () => {
    it('should calculate time remaining until deadline', () => {
      const deadline = new Date(mockDate.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
      const timeRemaining = deadlineService.getTimeRemaining(deadline)

      expect(timeRemaining.days).toBe(3)
      expect(timeRemaining.hours).toBe(0)
      expect(timeRemaining.minutes).toBe(0)
      expect(timeRemaining.seconds).toBe(0)
      expect(timeRemaining.totalMilliseconds).toBe(3 * 24 * 60 * 60 * 1000)
    })

    it('should calculate complex time remaining', () => {
      const deadline = new Date(mockDate.getTime() + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000 + 30 * 60 * 1000 + 45 * 1000)
      const timeRemaining = deadlineService.getTimeRemaining(deadline)

      expect(timeRemaining.days).toBe(2)
      expect(timeRemaining.hours).toBe(5)
      expect(timeRemaining.minutes).toBe(30)
      expect(timeRemaining.seconds).toBe(45)
    })

    it('should handle expired deadlines', () => {
      const expiredDeadline = new Date(mockDate.getTime() - 24 * 60 * 60 * 1000) // 1 day ago
      const timeRemaining = deadlineService.getTimeRemaining(expiredDeadline)

      expect(timeRemaining.days).toBe(0)
      expect(timeRemaining.hours).toBe(0)
      expect(timeRemaining.minutes).toBe(0)
      expect(timeRemaining.seconds).toBe(0)
      expect(timeRemaining.totalMilliseconds).toBe(0)
      expect(timeRemaining.isExpired).toBe(true)
    })

    it('should format time remaining as human-readable string', () => {
      const deadline = new Date(mockDate.getTime() + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000 + 30 * 60 * 1000)
      const formatted = deadlineService.formatTimeRemaining(deadline)

      expect(formatted).toBe('2 days, 5 hours, 30 minutes')
    })

    it('should format short time remaining', () => {
      const deadline = new Date(mockDate.getTime() + 2 * 60 * 60 * 1000 + 15 * 60 * 1000)
      const formatted = deadlineService.formatTimeRemaining(deadline)

      expect(formatted).toBe('2 hours, 15 minutes')
    })

    it('should format very short time remaining', () => {
      const deadline = new Date(mockDate.getTime() + 45 * 60 * 1000)
      const formatted = deadlineService.formatTimeRemaining(deadline)

      expect(formatted).toBe('45 minutes')
    })
  })

  describe('Deadline Status and Urgency', () => {
    it('should identify normal deadline status', () => {
      const deadline = new Date(mockDate.getTime() + 5 * 24 * 60 * 60 * 1000) // 5 days
      const status = deadlineService.getDeadlineStatus(deadline)

      expect(status.urgency).toBe('normal')
      expect(status.isExpired).toBe(false)
      expect(status.isCritical).toBe(false)
      expect(status.hoursRemaining).toBe(120)
    })

    it('should identify warning deadline status', () => {
      const deadline = new Date(mockDate.getTime() + 24 * 60 * 60 * 1000) // 1 day
      const status = deadlineService.getDeadlineStatus(deadline)

      expect(status.urgency).toBe('warning')
      expect(status.isExpired).toBe(false)
      expect(status.isCritical).toBe(false)
      expect(status.hoursRemaining).toBe(24)
    })

    it('should identify critical deadline status', () => {
      const deadline = new Date(mockDate.getTime() + 2 * 60 * 60 * 1000) // 2 hours
      const status = deadlineService.getDeadlineStatus(deadline)

      expect(status.urgency).toBe('critical')
      expect(status.isExpired).toBe(false)
      expect(status.isCritical).toBe(true)
      expect(status.hoursRemaining).toBe(2)
    })

    it('should identify expired deadline status', () => {
      const deadline = new Date(mockDate.getTime() - 60 * 60 * 1000) // 1 hour ago
      const status = deadlineService.getDeadlineStatus(deadline)

      expect(status.urgency).toBe('expired')
      expect(status.isExpired).toBe(true)
      expect(status.isCritical).toBe(true)
      expect(status.hoursRemaining).toBe(0)
    })

    it('should calculate percentage of time elapsed', () => {
      const batchCreated = new Date(mockDate.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      const deadline = new Date(mockDate.getTime() + 4 * 24 * 60 * 60 * 1000) // 4 days from now

      const percentage = deadlineService.getElapsedPercentage(batchCreated, deadline)

      // 3 days out of 7 total = 42.86%
      expect(percentage).toBeCloseTo(42.86, 1)
    })
  })

  describe('Auto-Approval Logic', () => {
    it('should determine if batch is eligible for auto-approval', () => {
      const expiredBatch: PaymentBatch = {
        id: 'batch_001',
        business_id: 'business_001',
        uploaded_by: 'user_001',
        status: 'pending',
        verification_deadline: new Date(mockDate.getTime() - 60 * 60 * 1000).toISOString(), // Expired
        transaction_count: 100,
        total_amount: 25000,
        auto_approval_enabled: true,
        created_at: mockDate.toISOString(),
        updated_at: mockDate.toISOString()
      }

      const isEligible = deadlineService.isEligibleForAutoApproval(expiredBatch)
      expect(isEligible).toBe(true)
    })

    it('should reject auto-approval for batches with disabled auto-approval', () => {
      const expiredBatch: PaymentBatch = {
        id: 'batch_001',
        business_id: 'business_001',
        uploaded_by: 'user_001',
        status: 'pending',
        verification_deadline: new Date(mockDate.getTime() - 60 * 60 * 1000).toISOString(),
        transaction_count: 100,
        total_amount: 25000,
        auto_approval_enabled: false, // Disabled
        created_at: mockDate.toISOString(),
        updated_at: mockDate.toISOString()
      }

      const isEligible = deadlineService.isEligibleForAutoApproval(expiredBatch)
      expect(isEligible).toBe(false)
    })

    it('should reject auto-approval for high-value batches', () => {
      const highValueBatch: PaymentBatch = {
        id: 'batch_001',
        business_id: 'business_001',
        uploaded_by: 'user_001',
        status: 'pending',
        verification_deadline: new Date(mockDate.getTime() - 60 * 60 * 1000).toISOString(),
        transaction_count: 100,
        total_amount: 150000, // Above threshold
        auto_approval_enabled: true,
        created_at: mockDate.toISOString(),
        updated_at: mockDate.toISOString()
      }

      const isEligible = deadlineService.isEligibleForAutoApproval(highValueBatch)
      expect(isEligible).toBe(false)
    })

    it('should reject auto-approval for large transaction count batches', () => {
      const largeBatch: PaymentBatch = {
        id: 'batch_001',
        business_id: 'business_001',
        uploaded_by: 'user_001',
        status: 'pending',
        verification_deadline: new Date(mockDate.getTime() - 60 * 60 * 1000).toISOString(),
        transaction_count: 1500, // Above threshold
        total_amount: 25000,
        auto_approval_enabled: true,
        created_at: mockDate.toISOString(),
        updated_at: mockDate.toISOString()
      }

      const isEligible = deadlineService.isEligibleForAutoApproval(largeBatch)
      expect(isEligible).toBe(false)
    })

    it('should reject auto-approval for non-expired batches', () => {
      const activeBatch: PaymentBatch = {
        id: 'batch_001',
        business_id: 'business_001',
        uploaded_by: 'user_001',
        status: 'pending',
        verification_deadline: new Date(mockDate.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Not expired
        transaction_count: 100,
        total_amount: 25000,
        auto_approval_enabled: true,
        created_at: mockDate.toISOString(),
        updated_at: mockDate.toISOString()
      }

      const isEligible = deadlineService.isEligibleForAutoApproval(activeBatch)
      expect(isEligible).toBe(false)
    })
  })

  describe('Notification Timing', () => {
    it('should schedule deadline warning notifications', () => {
      const deadline = new Date(mockDate.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
      const notifications = deadlineService.getScheduledNotifications(deadline)

      expect(notifications).toHaveLength(4)

      // Check 48-hour warning
      const twoHourWarning = notifications.find(n => n.type === '48_hour_warning')
      expect(twoHourWarning?.scheduledAt).toEqual(
        new Date(deadline.getTime() - 48 * 60 * 60 * 1000)
      )

      // Check 24-hour warning
      const oneDayWarning = notifications.find(n => n.type === '24_hour_warning')
      expect(oneDayWarning?.scheduledAt).toEqual(
        new Date(deadline.getTime() - 24 * 60 * 60 * 1000)
      )

      // Check 4-hour warning
      const fourHourWarning = notifications.find(n => n.type === '4_hour_warning')
      expect(fourHourWarning?.scheduledAt).toEqual(
        new Date(deadline.getTime() - 4 * 60 * 60 * 1000)
      )

      // Check 1-hour warning
      const oneHourWarning = notifications.find(n => n.type === '1_hour_warning')
      expect(oneHourWarning?.scheduledAt).toEqual(
        new Date(deadline.getTime() - 60 * 60 * 1000)
      )
    })

    it('should determine which notifications should be sent now', () => {
      const deadline = new Date(mockDate.getTime() + 23 * 60 * 60 * 1000) // 23 hours from now
      const notifications = deadlineService.getScheduledNotifications(deadline)
      const dueSnotifications = deadlineService.getDueNotifications(notifications, mockDate)

      // Should include 48-hour warning but not 24-hour warning yet
      expect(dueNotifications.some(n => n.type === '48_hour_warning')).toBe(true)
      expect(dueNotifications.some(n => n.type === '24_hour_warning')).toBe(false)
    })

    it('should handle past deadline notifications', () => {
      const pastDeadline = new Date(mockDate.getTime() - 60 * 60 * 1000) // 1 hour ago
      const notifications = deadlineService.getScheduledNotifications(pastDeadline)
      const dueNotifications = deadlineService.getDueNotifications(notifications, mockDate)

      // All notifications should be due for past deadlines
      expect(dueNotifications).toHaveLength(notifications.length)
    })
  })

  describe('Business Hours and Timezone Handling', () => {
    it('should calculate business hours in Swedish timezone', () => {
      const stockholmBusinessHours = deadlineService.getBusinessHours('Europe/Stockholm')

      expect(stockholmBusinessHours.start).toBe('09:00')
      expect(stockholmBusinessHours.end).toBe('17:00')
      expect(stockholmBusinessHours.timezone).toBe('Europe/Stockholm')
    })

    it('should determine if current time is within business hours', () => {
      // Mock current time to 10:00 AM Swedish time on a weekday
      const businessHourTime = new Date('2023-12-15T09:00:00Z') // 10:00 AM CET
      vi.setSystemTime(businessHourTime)

      const isBusinessHours = deadlineService.isWithinBusinessHours('Europe/Stockholm')
      expect(isBusinessHours).toBe(true)
    })

    it('should determine if current time is outside business hours', () => {
      // Mock current time to 6:00 PM Swedish time
      const afterHoursTime = new Date('2023-12-15T17:00:00Z') // 6:00 PM CET
      vi.setSystemTime(afterHoursTime)

      const isBusinessHours = deadlineService.isWithinBusinessHours('Europe/Stockholm')
      expect(isBusinessHours).toBe(false)
    })

    it('should identify weekends correctly', () => {
      // Saturday
      const saturday = new Date('2023-12-16T10:00:00Z')
      vi.setSystemTime(saturday)

      const isBusinessHours = deadlineService.isWithinBusinessHours('Europe/Stockholm')
      expect(isBusinessHours).toBe(false)
    })

    it('should convert deadline to local timezone', () => {
      const utcDeadline = new Date('2023-12-22T15:00:00Z')
      const localDeadline = deadlineService.toLocalTimezone(utcDeadline, 'Europe/Stockholm')

      // Should be 4:00 PM CET (UTC+1 in December)
      expect(localDeadline.getHours()).toBe(16)
    })
  })

  describe('Deadline Extensions', () => {
    it('should calculate extended deadline', () => {
      const originalDeadline = new Date(mockDate.getTime() + 24 * 60 * 60 * 1000) // 1 day
      const extensionHours = 48 // 2 days
      const newDeadline = deadlineService.extendDeadline(originalDeadline, extensionHours)

      const expectedDeadline = new Date(originalDeadline.getTime() + extensionHours * 60 * 60 * 1000)
      expect(newDeadline.getTime()).toBe(expectedDeadline.getTime())
    })

    it('should validate extension requests', () => {
      const expiredDeadline = new Date(mockDate.getTime() - 60 * 60 * 1000) // Already expired
      const isValidExtension = deadlineService.canExtendDeadline(expiredDeadline, 24)

      expect(isValidExtension.canExtend).toBe(false)
      expect(isValidExtension.reason).toBe('Cannot extend expired deadline')
    })

    it('should limit maximum extension duration', () => {
      const activeDeadline = new Date(mockDate.getTime() + 24 * 60 * 60 * 1000)
      const tooLongExtension = deadlineService.canExtendDeadline(activeDeadline, 240) // 10 days

      expect(tooLongExtension.canExtend).toBe(false)
      expect(tooLongExtension.reason).toBe('Extension duration exceeds maximum allowed (168 hours)')
    })

    it('should allow valid extension requests', () => {
      const activeDeadline = new Date(mockDate.getTime() + 24 * 60 * 60 * 1000)
      const validExtension = deadlineService.canExtendDeadline(activeDeadline, 48)

      expect(validExtension.canExtend).toBe(true)
      expect(validExtension.newDeadline).toEqual(
        new Date(activeDeadline.getTime() + 48 * 60 * 60 * 1000)
      )
    })
  })

  describe('Countdown Timer Integration', () => {
    it('should provide real-time countdown data', () => {
      const deadline = new Date(mockDate.getTime() + 2 * 24 * 60 * 60 * 1000) // 2 days
      const countdownData = deadlineService.getCountdownData(deadline)

      expect(countdownData).toMatchObject({
        deadline: deadline.toISOString(),
        timeRemaining: expect.any(Object),
        status: expect.any(Object),
        formattedTime: expect.any(String),
        progressPercentage: expect.any(Number),
        isActive: true
      })
    })

    it('should handle countdown for expired deadline', () => {
      const expiredDeadline = new Date(mockDate.getTime() - 60 * 60 * 1000)
      const countdownData = deadlineService.getCountdownData(expiredDeadline)

      expect(countdownData.isActive).toBe(false)
      expect(countdownData.status.isExpired).toBe(true)
      expect(countdownData.progressPercentage).toBe(100)
    })

    it('should update countdown in real-time', () => {
      const deadline = new Date(mockDate.getTime() + 60 * 60 * 1000) // 1 hour

      // Initial countdown
      const initialCountdown = deadlineService.getCountdownData(deadline)
      expect(initialCountdown.timeRemaining.minutes).toBe(0)
      expect(initialCountdown.timeRemaining.hours).toBe(1)

      // Advance time by 30 minutes
      vi.advanceTimersByTime(30 * 60 * 1000)

      // Updated countdown
      const updatedCountdown = deadlineService.getCountdownData(deadline)
      expect(updatedCountdown.timeRemaining.minutes).toBe(30)
      expect(updatedCountdown.timeRemaining.hours).toBe(0)
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle leap year calculations', () => {
      // Test deadline calculation in a leap year
      const leapYearDate = new Date('2024-02-28T10:00:00Z')
      vi.setSystemTime(leapYearDate)

      const deadline = deadlineService.calculateDeadline(leapYearDate, 7)
      const expectedDeadline = new Date('2024-03-06T10:00:00Z') // Includes Feb 29

      expect(deadline.getTime()).toBe(expectedDeadline.getTime())
    })

    it('should handle daylight saving time transitions', () => {
      // Test around DST transition in Sweden (last Sunday in March)
      const beforeDST = new Date('2024-03-30T10:00:00Z') // Before DST
      const deadline = deadlineService.calculateDeadline(beforeDST, 2)

      // Should properly handle the 1-hour time change
      expect(deadline).toBeInstanceOf(Date)
      expect(deadline.getTime()).toBeGreaterThan(beforeDST.getTime())
    })

    it('should handle very short deadlines efficiently', () => {
      const shortDeadline = new Date(mockDate.getTime() + 1000) // 1 second
      const timeRemaining = deadlineService.getTimeRemaining(shortDeadline)

      expect(timeRemaining.seconds).toBe(1)
      expect(timeRemaining.totalMilliseconds).toBe(1000)
    })

    it('should handle large deadline calculations', () => {
      const longTermDeadline = deadlineService.calculateDeadline(mockDate, 365) // 1 year
      const expectedDeadline = new Date(mockDate.getTime() + 365 * 24 * 60 * 60 * 1000)

      expect(longTermDeadline.getTime()).toBe(expectedDeadline.getTime())
    })
  })
})