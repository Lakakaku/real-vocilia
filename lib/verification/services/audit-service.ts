/**
 * Verification Audit Service
 *
 * Provides comprehensive audit logging and compliance tracking for
 * all verification activities, ensuring full accountability and
 * regulatory compliance.
 */

import type { VerificationAuditLog, VerificationAuditLogInsert } from '@/lib/supabase/types/verification'
import { createClient } from '@/lib/supabase/client'
import { type AuditEventType, type AuditSeverity, type EventCategory, AuditLogger } from '../models/audit-log'

// Activity logging types
export interface LogActivityRequest {
  event_type: AuditEventType
  actor_id: string
  actor_type: 'user' | 'admin' | 'system'
  business_id: string
  category: EventCategory
  severity: AuditSeverity
  description: string
  details?: Record<string, any>
  correlation_id?: string
  ip_address?: string
  user_agent?: string
  session_id?: string
  affected_resource_type?: string
  affected_resource_id?: string
}

// Query types
export interface AuditQueryOptions {
  business_id?: string
  actor_id?: string
  event_type?: AuditEventType
  category?: string
  severity?: AuditSeverity
  start_date?: string
  end_date?: string
  correlation_id?: string
  affected_resource_type?: string
  affected_resource_id?: string
  limit?: number
  offset?: number
  sort_by?: 'activity_timestamp' | 'severity' | 'event_type'
  sort_order?: 'asc' | 'desc'
}

export interface AuditTrail {
  id: string
  event_type: AuditEventType
  actor_id: string
  actor_type: string
  business_id: string
  category: string
  severity: AuditSeverity
  description: string
  details: Record<string, any>
  correlation_id: string
  ip_address: string | null
  user_agent: string | null
  activity_timestamp: string
  created_at: string
}

// Compliance report types
export interface ComplianceReport {
  report_id: string
  business_id: string
  period_start: string
  period_end: string
  generated_at: string
  summary: {
    total_events: number
    by_category: Record<string, number>
    by_severity: Record<string, number>
    critical_incidents: number
    compliance_violations: number
  }
  verification_activities: {
    sessions_started: number
    sessions_completed: number
    sessions_expired: number
    transactions_verified: number
    fraud_cases_detected: number
  }
  security_events: {
    authentication_failures: number
    unauthorized_access_attempts: number
    data_access_violations: number
    suspicious_activities: number
  }
  data_integrity: {
    data_modifications: number
    schema_changes: number
    permission_changes: number
    configuration_changes: number
  }
  recommendations: string[]
}

export interface SecurityAlert {
  id: string
  alert_type: 'fraud_detection' | 'unauthorized_access' | 'data_breach' | 'compliance_violation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  business_id: string
  description: string
  triggered_by: string[]
  first_occurrence: string
  last_occurrence: string
  occurrence_count: number
  status: 'active' | 'investigating' | 'resolved' | 'false_positive'
  response_actions: string[]
}

export class VerificationAuditService {
  private supabase = createClient()
  // AuditLogger is static, no need for instance

  /**
   * Logs an audit activity with full context
   */
  async logActivity(request: LogActivityRequest): Promise<void> {
    try {
      const auditEntry = await AuditLogger.createAuditEntry({
        ...request,
        correlation_id: request.correlation_id || this.generateCorrelationId(),
      })

      const { error } = await this.supabase
        .from('audit_logs')
        .insert(auditEntry)

      if (error) {
        console.error('Failed to log audit activity:', error.message)
        // Don't throw - logging failures shouldn't break the main workflow
      }

      // Check if this event triggers any security alerts
      await this.checkSecurityAlerts(request)
    } catch (error) {
      console.error('Audit logging error:', error)
    }
  }

  /**
   * Logs a batch of activities (for performance)
   */
  async logBatchActivities(requests: LogActivityRequest[]): Promise<void> {
    try {
      const auditEntries = await Promise.all(
      requests.map(async request =>
        await AuditLogger.createAuditEntry({
          ...request,
          correlation_id: request.correlation_id || this.generateCorrelationId(),
        })
      )
    )

      const { error } = await this.supabase
        .from('audit_logs')
        .insert(auditEntries)

      if (error) {
        console.error('Failed to log batch audit activities:', error.message)
      }
    } catch (error) {
      console.error('Batch audit logging error:', error)
    }
  }

  /**
   * Queries audit trail with flexible filtering
   */
  async queryAuditTrail(options: AuditQueryOptions = {}): Promise<{
    data: AuditTrail[]
    total: number
    hasMore: boolean
  }> {
    let query = this.supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })

    // Apply filters
    if (options.business_id) {
      query = query.eq('business_id', options.business_id)
    }
    if (options.actor_id) {
      query = query.eq('user_id', options.actor_id)
    }
    if (options.event_type) {
      query = query.eq('operation', options.event_type)
    }
    if (options.severity) {
      query = query.eq('severity', options.severity)
    }
    if (options.start_date) {
      query = query.gte('activity_timestamp', options.start_date)
    }
    if (options.end_date) {
      query = query.lte('activity_timestamp', options.end_date)
    }
    if (options.correlation_id) {
      query = query.eq('new_values->correlation_id', options.correlation_id)
    }

    // Apply sorting
    const sortBy = options.sort_by || 'activity_timestamp'
    const sortOrder = options.sort_order || 'desc'
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const limit = Math.min(options.limit || 50, 100)
    const offset = options.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Failed to query audit trail: ${error.message}`)
    }

    const auditTrail = (data || []).map(this.transformAuditLogToTrail)

    return {
      data: auditTrail,
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    }
  }

  /**
   * Gets audit trail for a specific verification session
   */
  async getSessionAuditTrail(sessionId: string): Promise<AuditTrail[]> {
    const { data } = await this.queryAuditTrail({
      affected_resource_type: 'verification_session',
      affected_resource_id: sessionId,
      sort_by: 'activity_timestamp',
      sort_order: 'asc',
      limit: 100,
    })

    return data
  }

  /**
   * Gets audit trail for a payment batch
   */
  async getBatchAuditTrail(batchId: string): Promise<AuditTrail[]> {
    const { data } = await this.queryAuditTrail({
      affected_resource_type: 'payment_batch',
      affected_resource_id: batchId,
      sort_by: 'activity_timestamp',
      sort_order: 'asc',
      limit: 100,
    })

    return data
  }

  /**
   * Generates a comprehensive compliance report
   */
  async generateComplianceReport(
    businessId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<ComplianceReport> {
    const reportId = this.generateCorrelationId()

    // Query all activities in the period
    const { data: activities } = await this.queryAuditTrail({
      business_id: businessId,
      start_date: periodStart,
      end_date: periodEnd,
      limit: 10000, // Get all activities
    })

    // Analyze activities
    const summary = this.analyzeActivitiesForCompliance(activities)
    const verificationActivities = this.analyzeVerificationActivities(activities)
    const securityEvents = this.analyzeSecurityEvents(activities)
    const dataIntegrity = this.analyzeDataIntegrity(activities)
    const recommendations = this.generateComplianceRecommendations(activities)

    const report: ComplianceReport = {
      report_id: reportId,
      business_id: businessId,
      period_start: periodStart,
      period_end: periodEnd,
      generated_at: new Date().toISOString(),
      summary,
      verification_activities: verificationActivities,
      security_events: securityEvents,
      data_integrity: dataIntegrity,
      recommendations,
    }

    // Log report generation
    await this.logActivity({
      event_type: 'report_generated',
      actor_id: 'system',
      actor_type: 'system',
      business_id: businessId,
      category: 'system',
      severity: 'info',
      description: 'Compliance report generated',
      details: {
        report_id: reportId,
        period_start: periodStart,
        period_end: periodEnd,
        total_events_analyzed: activities.length,
      },
    })

    return report
  }

  /**
   * Detects and analyzes security patterns
   */
  async detectSecurityAlerts(businessId: string, lookbackHours: number = 24): Promise<SecurityAlert[]> {
    const startDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString()

    const { data: recentActivities } = await this.queryAuditTrail({
      business_id: businessId,
      start_date: startDate,
      limit: 1000,
    })

    return this.analyzeSecurityPatterns(recentActivities)
  }

  /**
   * Exports audit data for external compliance systems
   */
  async exportAuditData(
    businessId: string,
    startDate: string,
    endDate: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<{
    data: string
    filename: string
    contentType: string
  }> {
    const { data: auditData } = await this.queryAuditTrail({
      business_id: businessId,
      start_date: startDate,
      end_date: endDate,
      limit: 10000,
    })

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `audit-export-${businessId}-${timestamp}.${format}`

    if (format === 'csv') {
      const csvData = this.convertToCSV(auditData)
      return {
        data: csvData,
        filename,
        contentType: 'text/csv',
      }
    }

    return {
      data: JSON.stringify(auditData, null, 2),
      filename,
      contentType: 'application/json',
    }
  }

  /**
   * Validates audit trail integrity
   */
  async validateAuditIntegrity(
    businessId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    valid: boolean
    issues: string[]
    totalRecords: number
    validatedRecords: number
  }> {
    const { data: auditData } = await this.queryAuditTrail({
      business_id: businessId,
      start_date: startDate,
      end_date: endDate,
      limit: 10000,
    })

    const issues: string[] = []
    let validatedRecords = 0

    for (const record of auditData) {
      const validation = this.validateAuditRecord(record)
      if (validation.valid) {
        validatedRecords++
      } else {
        issues.push(...validation.errors.map(e => `Record ${record.id}: ${e}`))
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      totalRecords: auditData.length,
      validatedRecords,
    }
  }

  // Private helper methods

  private generateCorrelationId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private async checkSecurityAlerts(request: LogActivityRequest): Promise<void> {
    // Check for high-severity events
    if (request.severity === 'critical' || request.severity === 'error') {
      // Could implement real-time alerting here
      console.warn('High-severity audit event detected:', {
        event_type: request.event_type,
        business_id: request.business_id,
        description: request.description,
      })
    }

    // Check for fraud indicators
    if (request.event_type === 'fraud_detected' || request.event_type === 'high_risk_transaction') {
      // Could trigger fraud investigation workflow
      console.warn('Fraud indicator detected:', request)
    }
  }

  private transformAuditLogToTrail(log: any): AuditTrail {
    return {
      id: log.id,
      event_type: log.operation,
      actor_id: log.user_id,
      actor_type: log.new_values?.actor_type || 'user',
      business_id: log.business_id,
      category: log.new_values?.category || 'system',
      severity: log.severity,
      description: log.new_values?.description || '',
      details: log.new_values?.details || {},
      correlation_id: log.new_values?.correlation_id || '',
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      activity_timestamp: log.activity_timestamp,
      created_at: log.created_at,
    }
  }

  private analyzeActivitiesForCompliance(activities: AuditTrail[]) {
    const totalEvents = activities.length
    const byCategory: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}
    let criticalIncidents = 0
    let complianceViolations = 0

    activities.forEach(activity => {
      byCategory[activity.category] = (byCategory[activity.category] || 0) + 1
      bySeverity[activity.severity] = (bySeverity[activity.severity] || 0) + 1

      if (activity.severity === 'critical') {
        criticalIncidents++
      }

      if (activity.event_type.includes('violation') || activity.event_type.includes('unauthorized')) {
        complianceViolations++
      }
    })

    return {
      total_events: totalEvents,
      by_category: byCategory,
      by_severity: bySeverity,
      critical_incidents: criticalIncidents,
      compliance_violations: complianceViolations,
    }
  }

  private analyzeVerificationActivities(activities: AuditTrail[]) {
    return {
      sessions_started: activities.filter(a => a.event_type === 'verification_started').length,
      sessions_completed: activities.filter(a => a.event_type === 'session_completed').length,
      sessions_expired: activities.filter(a => a.event_type === 'session_expired').length,
      transactions_verified: activities.filter(a => a.event_type === 'transaction_verified').length,
      fraud_cases_detected: activities.filter(a => a.event_type === 'fraud_detected').length,
    }
  }

  private analyzeSecurityEvents(activities: AuditTrail[]) {
    return {
      authentication_failures: activities.filter(a => a.event_type === 'login_failed').length,
      unauthorized_access_attempts: activities.filter(a => a.event_type === 'unauthorized_access').length,
      data_access_violations: activities.filter(a => a.event_type.includes('access_violation')).length,
      suspicious_activities: activities.filter(a => a.severity === 'warning' && a.category === 'verification').length,
    }
  }

  private analyzeDataIntegrity(activities: AuditTrail[]) {
    return {
      data_modifications: activities.filter(a => a.event_type.includes('update') || a.event_type.includes('delete')).length,
      schema_changes: activities.filter(a => a.event_type.includes('schema')).length,
      permission_changes: activities.filter(a => a.event_type.includes('permission')).length,
      configuration_changes: activities.filter(a => a.event_type.includes('config')).length,
    }
  }

  private generateComplianceRecommendations(activities: AuditTrail[]): string[] {
    const recommendations: string[] = []

    const criticalEvents = activities.filter(a => a.severity === 'critical').length
    if (criticalEvents > 0) {
      recommendations.push(`Review ${criticalEvents} critical security events and ensure proper incident response`)
    }

    const fraudEvents = activities.filter(a => a.event_type === 'fraud_detected').length
    if (fraudEvents > 5) {
      recommendations.push('Consider strengthening fraud detection thresholds due to high fraud activity')
    }

    const failedAuth = activities.filter(a => a.event_type === 'login_failed').length
    if (failedAuth > 10) {
      recommendations.push('High number of authentication failures detected - consider implementing account lockout policies')
    }

    if (recommendations.length === 0) {
      recommendations.push('No compliance issues detected in this period')
    }

    return recommendations
  }

  private analyzeSecurityPatterns(activities: AuditTrail[]): SecurityAlert[] {
    const alerts: SecurityAlert[] = []

    // Pattern 1: Multiple failed authentications
    const authFailures = activities.filter(a => a.event_type === 'login_failed')
    if (authFailures.length > 5) {
      alerts.push({
        id: `alert-${Date.now()}-auth`,
        alert_type: 'unauthorized_access',
        severity: 'high',
        business_id: authFailures[0].business_id,
        description: `${authFailures.length} authentication failures detected`,
        triggered_by: authFailures.map(a => a.event_type),
        first_occurrence: authFailures[authFailures.length - 1].activity_timestamp,
        last_occurrence: authFailures[0].activity_timestamp,
        occurrence_count: authFailures.length,
        status: 'active',
        response_actions: ['Review authentication logs', 'Check for brute force attacks', 'Consider implementing account lockout'],
      })
    }

    // Pattern 2: High fraud detection rate
    const fraudEvents = activities.filter(a => a.event_type === 'fraud_detected')
    if (fraudEvents.length > 3) {
      alerts.push({
        id: `alert-${Date.now()}-fraud`,
        alert_type: 'fraud_detection',
        severity: 'critical',
        business_id: fraudEvents[0].business_id,
        description: `${fraudEvents.length} fraud cases detected`,
        triggered_by: fraudEvents.map(a => a.event_type),
        first_occurrence: fraudEvents[fraudEvents.length - 1].activity_timestamp,
        last_occurrence: fraudEvents[0].activity_timestamp,
        occurrence_count: fraudEvents.length,
        status: 'active',
        response_actions: ['Investigate fraud patterns', 'Review verification processes', 'Consider tightening approval criteria'],
      })
    }

    return alerts
  }

  private convertToCSV(data: AuditTrail[]): string {
    const headers = [
      'id', 'event_type', 'actor_id', 'business_id', 'category', 'severity',
      'description', 'correlation_id', 'activity_timestamp', 'created_at'
    ]

    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = (row as any)[header] || ''
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(','))
    ]

    return csvRows.join('\n')
  }

  private validateAuditRecord(record: AuditTrail): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!record.id) errors.push('Missing record ID')
    if (!record.event_type) errors.push('Missing event type')
    if (!record.business_id) errors.push('Missing business ID')
    if (!record.activity_timestamp) errors.push('Missing activity timestamp')

    // Validate timestamp format
    if (record.activity_timestamp && isNaN(Date.parse(record.activity_timestamp))) {
      errors.push('Invalid activity timestamp format')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

// Export singleton instance
export const auditService = new VerificationAuditService()

// Export convenience functions
export const AuditUtils = {
  /**
   * Creates a correlation ID for linking related events
   */
  createCorrelationId(prefix: string = 'audit'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },

  /**
   * Formats audit event for display
   */
  formatAuditEvent(event: AuditTrail): string {
    const timestamp = new Date(event.activity_timestamp).toLocaleString()
    return `${timestamp} - ${event.event_type}: ${event.description}`
  },

  /**
   * Gets severity color for UI display
   */
  getSeverityColor(severity: AuditSeverity): string {
    const colors = {
      debug: 'text-gray-500',
      info: 'text-blue-600',
      warning: 'text-yellow-600',
      error: 'text-orange-600',
      critical: 'text-red-600',
    }
    return colors[severity] || 'text-gray-600'
  },

  /**
   * Checks if event requires immediate attention
   */
  requiresAttention(event: AuditTrail): boolean {
    return event.severity === 'critical' || event.severity === 'error' ||
           event.event_type.includes('fraud') || event.event_type.includes('violation')
  },
}