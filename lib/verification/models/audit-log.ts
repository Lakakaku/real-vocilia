/**
 * Verification Audit Log Model and Event Tracking
 *
 * Comprehensive audit system for compliance, security monitoring,
 * and operational tracking of all verification activities.
 */

import { z } from 'zod'
import type { Database } from '@/lib/supabase/types/database'

// Database type references
export type VerificationAuditLogRow = Database['public']['Tables']['audit_logs']['Row']
export type VerificationAuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']
export type VerificationAuditLogUpdate = Database['public']['Tables']['audit_logs']['Update']

// Audit event types for comprehensive tracking
export type AuditEventType =
  // Batch lifecycle events
  | 'batch_created'
  | 'batch_status_changed'
  | 'batch_deadline_updated'
  | 'batch_auto_processed'
  | 'batch_manually_processed'

  // Session lifecycle events
  | 'session_created'
  | 'session_started'
  | 'session_paused'
  | 'session_resumed'
  | 'session_completed'
  | 'session_expired'
  | 'session_cancelled'

  // Verification events
  | 'transaction_verified'
  | 'transaction_approved'
  | 'transaction_rejected'
  | 'verification_decision_changed'
  | 'bulk_verification_processed'

  // Fraud detection events
  | 'fraud_assessment_requested'
  | 'fraud_assessment_completed'
  | 'fraud_pattern_detected'
  | 'fraud_manual_override'
  | 'fraud_investigation_initiated'

  // File and data events
  | 'csv_uploaded'
  | 'csv_processed'
  | 'csv_validation_failed'
  | 'file_download_requested'
  | 'data_export_requested'

  // User and access events
  | 'user_login'
  | 'user_logout'
  | 'permission_granted'
  | 'permission_revoked'
  | 'unauthorized_access_attempt'

  // System events
  | 'auto_approval_applied'
  | 'deadline_reminder_sent'
  | 'notification_sent'
  | 'system_maintenance'
  | 'api_rate_limit_exceeded'

  // Admin and compliance events
  | 'manual_payment_override'
  | 'compliance_export'
  | 'audit_report_generated'
  | 'policy_violation_detected'
  | 'data_retention_policy_applied'

// Actor types for audit events
export type ActorType = 'user' | 'admin' | 'system' | 'api' | 'scheduler' | 'unknown'

// Audit severity levels
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical'

// Event category for filtering and reporting
export type EventCategory =
  | 'data_access'
  | 'data_modification'
  | 'security'
  | 'compliance'
  | 'system_operation'
  | 'user_activity'
  | 'business_process'
  | 'fraud_detection'

// Audit event details interface
export interface AuditEventDetails {
  // Core transaction/batch identification
  batch_id?: string
  session_id?: string
  transaction_id?: string
  business_id?: string

  // Before/after state for modifications
  previous_state?: Record<string, any>
  new_state?: Record<string, any>
  changed_fields?: string[]

  // Request/response context
  request_data?: Record<string, any>
  response_data?: Record<string, any>
  error_details?: {
    error_code: string
    error_message: string
    stack_trace?: string
  }

  // User and session context
  session_info?: {
    session_id: string
    user_agent: string
    ip_address: string
    device_info?: string
  }

  // File operation details
  file_details?: {
    filename: string
    file_size: number
    file_hash?: string
    upload_path?: string
  }

  // Fraud detection specifics
  fraud_details?: {
    risk_score: number
    risk_level: string
    ai_confidence: number
    patterns_detected?: string[]
  }

  // Performance metrics
  performance_metrics?: {
    duration_ms: number
    memory_usage_mb?: number
    cpu_usage_percent?: number
    database_queries?: number
  }

  // Compliance and legal
  compliance_flags?: string[]
  retention_policy?: string
  data_classification?: 'public' | 'internal' | 'confidential' | 'restricted'

  // Additional context
  tags?: string[]
  custom_data?: Record<string, any>
}

// Validation schemas
export const VerificationAuditLogValidation = {
  // Create audit log entry
  create: z.object({
    event_type: z.enum([
      'batch_created', 'batch_status_changed', 'batch_deadline_updated', 'batch_auto_processed', 'batch_manually_processed',
      'session_created', 'session_started', 'session_paused', 'session_resumed', 'session_completed', 'session_expired', 'session_cancelled',
      'transaction_verified', 'transaction_approved', 'transaction_rejected', 'verification_decision_changed', 'bulk_verification_processed',
      'fraud_assessment_requested', 'fraud_assessment_completed', 'fraud_pattern_detected', 'fraud_manual_override', 'fraud_investigation_initiated',
      'csv_uploaded', 'csv_processed', 'csv_validation_failed', 'file_download_requested', 'data_export_requested',
      'user_login', 'user_logout', 'permission_granted', 'permission_revoked', 'unauthorized_access_attempt',
      'auto_approval_applied', 'deadline_reminder_sent', 'notification_sent', 'system_maintenance', 'api_rate_limit_exceeded',
      'manual_payment_override', 'compliance_export', 'audit_report_generated', 'policy_violation_detected', 'data_retention_policy_applied'
    ]),
    actor_id: z.string().max(255, 'Actor ID too long').optional(),
    actor_type: z.enum(['user', 'admin', 'system', 'api', 'scheduler', 'unknown']),
    business_id: z.string().uuid('Invalid business ID').optional(),
    severity: z.enum(['info', 'warning', 'error', 'critical']).default('info'),
    category: z.enum(['data_access', 'data_modification', 'security', 'compliance', 'system_operation', 'user_activity', 'business_process', 'fraud_detection']),
    description: z.string()
      .min(1, 'Description is required')
      .max(1000, 'Description too long'),
    details: z.record(z.any()).optional(),
    ip_address: z.string().ip().optional(),
    user_agent: z.string().max(500).optional(),
    correlation_id: z.string().uuid().optional(), // For tracking related events
  }),

  // Query audit logs
  query: z.object({
    business_id: z.string().uuid().optional(),
    event_type: z.enum([
      'batch_created', 'batch_status_changed', 'batch_deadline_updated', 'batch_auto_processed', 'batch_manually_processed',
      'session_created', 'session_started', 'session_paused', 'session_resumed', 'session_completed', 'session_expired', 'session_cancelled',
      'transaction_verified', 'transaction_approved', 'transaction_rejected', 'verification_decision_changed', 'bulk_verification_processed',
      'fraud_assessment_requested', 'fraud_assessment_completed', 'fraud_pattern_detected', 'fraud_manual_override', 'fraud_investigation_initiated',
      'csv_uploaded', 'csv_processed', 'csv_validation_failed', 'file_download_requested', 'data_export_requested',
      'user_login', 'user_logout', 'permission_granted', 'permission_revoked', 'unauthorized_access_attempt',
      'auto_approval_applied', 'deadline_reminder_sent', 'notification_sent', 'system_maintenance', 'api_rate_limit_exceeded',
      'manual_payment_override', 'compliance_export', 'audit_report_generated', 'policy_violation_detected', 'data_retention_policy_applied'
    ]).optional(),
    actor_id: z.string().optional(),
    actor_type: z.enum(['user', 'admin', 'system', 'api', 'scheduler', 'unknown']).optional(),
    severity: z.enum(['info', 'warning', 'error', 'critical']).optional(),
    category: z.enum(['data_access', 'data_modification', 'security', 'compliance', 'system_operation', 'user_activity', 'business_process', 'fraud_detection']).optional(),
    from_date: z.string().datetime().optional(),
    to_date: z.string().datetime().optional(),
    search_term: z.string().max(100).optional(), // Search in description
    correlation_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(1000).default(100),
    offset: z.number().int().min(0).default(0),
    sort_by: z.enum(['timestamp', 'severity', 'event_type']).default('timestamp'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
  }),

  // Compliance export parameters
  compliance_export: z.object({
    business_id: z.string().uuid().optional(),
    from_date: z.string().datetime('Invalid from date'),
    to_date: z.string().datetime('Invalid to date'),
    event_types: z.array(z.string()).optional(),
    include_sensitive_data: z.boolean().default(false),
    export_format: z.enum(['json', 'csv', 'pdf']).default('csv'),
    requester_id: z.string().uuid('Invalid requester ID'),
    export_reason: z.string()
      .min(10, 'Export reason must be at least 10 characters')
      .max(500, 'Export reason too long'),
  }),
}

// Audit logging service
export class AuditLogger {
  /**
   * Creates a standardized audit log entry
   */
  static async createAuditEntry(params: {
    event_type: AuditEventType
    actor_id?: string
    actor_type: ActorType
    business_id?: string
    description: string
    details?: AuditEventDetails
    severity?: AuditSeverity
    category: EventCategory
    ip_address?: string
    user_agent?: string
    correlation_id?: string
  }): Promise<VerificationAuditLogInsert> {
    const timestamp = new Date().toISOString()

    return {
      operation: params.event_type,
      user_id: params.actor_id,
      business_id: params.business_id,
      severity: params.severity || 'info',
      new_values: {
        category: params.category,
        description: params.description,
        details: params.details || {},
        correlation_id: params.correlation_id || crypto.randomUUID(),
        actor_type: params.actor_type
      } as any,
      ip_address: params.ip_address,
      user_agent: params.user_agent,
      activity_timestamp: timestamp,
      created_at: timestamp,
    }
  }

  /**
   * Creates a batch operation audit entry
   */
  static createBatchAudit(params: {
    event_type: 'batch_created' | 'batch_status_changed' | 'batch_auto_processed'
    batch_id: string
    business_id: string
    actor_id?: string
    actor_type: ActorType
    previous_state?: any
    new_state?: any
    description: string
  }): VerificationAuditLogInsert {
    return this.createAuditEntry({
      event_type: params.event_type,
      actor_id: params.actor_id,
      actor_type: params.actor_type,
      business_id: params.business_id,
      description: params.description,
      category: 'business_process',
      severity: 'info',
      details: {
        batch_id: params.batch_id,
        business_id: params.business_id,
        previous_state: params.previous_state,
        new_state: params.new_state,
      },
    }) as VerificationAuditLogInsert
  }

  /**
   * Creates a verification decision audit entry
   */
  static createVerificationAudit(params: {
    event_type: 'transaction_verified' | 'transaction_approved' | 'transaction_rejected'
    transaction_id: string
    session_id: string
    business_id: string
    reviewer_id?: string
    decision: string
    rejection_reason?: string
    verification_time_seconds?: number
  }): VerificationAuditLogInsert {
    return this.createAuditEntry({
      event_type: params.event_type,
      actor_id: params.reviewer_id,
      actor_type: params.reviewer_id ? 'user' : 'system',
      business_id: params.business_id,
      description: `Transaction ${params.transaction_id} ${params.decision}`,
      category: 'data_modification',
      severity: 'info',
      details: {
        transaction_id: params.transaction_id,
        session_id: params.session_id,
        business_id: params.business_id,
        new_state: {
          decision: params.decision,
          rejection_reason: params.rejection_reason,
          verification_time_seconds: params.verification_time_seconds,
        },
      },
    }) as VerificationAuditLogInsert
  }

  /**
   * Creates a fraud detection audit entry
   */
  static createFraudAudit(params: {
    event_type: 'fraud_assessment_completed' | 'fraud_pattern_detected' | 'fraud_manual_override'
    transaction_id: string
    business_id: string
    risk_score: number
    risk_level: string
    ai_confidence?: number
    patterns_detected?: string[]
    override_reason?: string
  }): VerificationAuditLogInsert {
    const severity: AuditSeverity =
      params.risk_level === 'critical' ? 'critical' :
      params.risk_level === 'high' ? 'error' :
      params.risk_level === 'medium' ? 'warning' : 'info'

    return this.createAuditEntry({
      event_type: params.event_type,
      actor_type: 'system',
      business_id: params.business_id,
      description: `Fraud assessment: ${params.risk_level} risk (${params.risk_score}/100) for transaction ${params.transaction_id}`,
      category: 'fraud_detection',
      severity,
      details: {
        transaction_id: params.transaction_id,
        business_id: params.business_id,
        fraud_details: {
          risk_score: params.risk_score,
          risk_level: params.risk_level,
          ai_confidence: params.ai_confidence || 0,
          patterns_detected: params.patterns_detected,
        },
        custom_data: {
          override_reason: params.override_reason,
        },
      },
    }) as VerificationAuditLogInsert
  }

  /**
   * Creates a security-related audit entry
   */
  static createSecurityAudit(params: {
    event_type: 'unauthorized_access_attempt' | 'permission_granted' | 'permission_revoked'
    actor_id?: string
    description: string
    ip_address?: string
    user_agent?: string
    resource_accessed?: string
    failure_reason?: string
  }): VerificationAuditLogInsert {
    return this.createAuditEntry({
      event_type: params.event_type,
      actor_id: params.actor_id,
      actor_type: 'user',
      description: params.description,
      category: 'security',
      severity: params.event_type === 'unauthorized_access_attempt' ? 'error' : 'info',
      ip_address: params.ip_address,
      user_agent: params.user_agent,
      details: {
        session_info: {
          ip_address: params.ip_address || '',
          user_agent: params.user_agent || '',
          session_id: crypto.randomUUID(),
        },
        custom_data: {
          resource_accessed: params.resource_accessed,
          failure_reason: params.failure_reason,
        },
      },
    }) as VerificationAuditLogInsert
  }
}

// Audit analysis and reporting
export class AuditAnalytics {
  /**
   * Analyzes audit logs for suspicious patterns
   */
  static analyzeSuspiciousActivity(logs: VerificationAuditLogRow[]): {
    risk_indicators: Array<{
      type: string
      description: string
      severity: AuditSeverity
      affected_entries: number
      time_span_hours: number
    }>
    recommendations: string[]
  } {
    const indicators: any[] = []
    const recommendations: string[] = []

    // Detect rapid failed login attempts
    const failedLogins = logs.filter(log =>
      log.operation === 'unauthorized_access_attempt' &&
      log.severity === 'error'
    )

    if (failedLogins.length >= 5) {
      const timeSpan = this.calculateTimeSpan(failedLogins)
      if (timeSpan <= 1) { // Within 1 hour
        indicators.push({
          type: 'rapid_failed_logins',
          description: `${failedLogins.length} failed login attempts within ${timeSpan.toFixed(1)} hours`,
          severity: 'critical' as AuditSeverity,
          affected_entries: failedLogins.length,
          time_span_hours: timeSpan,
        })
        recommendations.push('Consider implementing IP-based rate limiting')
        recommendations.push('Review and strengthen authentication requirements')
      }
    }

    // Detect unusual data access patterns
    const dataAccess = logs.filter(log => {
      const newValues = log.new_values as any
      return newValues?.category === 'data_access'
    })
    const accessByUser = new Map<string, VerificationAuditLogRow[]>()

    dataAccess.forEach(log => {
      const userId = log.user_id || 'unknown'
      if (!accessByUser.has(userId)) accessByUser.set(userId, [])
      accessByUser.get(userId)!.push(log)
    })

    accessByUser.forEach((userLogs, userId) => {
      if (userLogs.length >= 50) { // Heavy data access
        const timeSpan = this.calculateTimeSpan(userLogs)
        indicators.push({
          type: 'heavy_data_access',
          description: `User ${userId} accessed data ${userLogs.length} times in ${timeSpan.toFixed(1)} hours`,
          severity: 'warning' as AuditSeverity,
          affected_entries: userLogs.length,
          time_span_hours: timeSpan,
        })
        recommendations.push('Review data access permissions for heavy users')
      }
    })

    return { risk_indicators: indicators, recommendations }
  }

  /**
   * Generates compliance report summary
   */
  static generateComplianceReport(logs: VerificationAuditLogRow[], period: {
    from: Date
    to: Date
  }): {
    period: { from: string; to: string }
    total_events: number
    events_by_category: Record<EventCategory, number>
    events_by_severity: Record<AuditSeverity, number>
    security_incidents: number
    data_modifications: number
    system_operations: number
    compliance_flags: string[]
    retention_notices: string[]
  } {
    const eventsByCategory = {} as Record<EventCategory, number>
    const eventsBySeverity = {} as Record<AuditSeverity, number>
    const complianceFlags: string[] = []
    const retentionNotices: string[] = []

    logs.forEach(log => {
      // Count by category
      const newValues = log.new_values as any
      const category = newValues?.category || 'unknown'
      eventsByCategory[category as EventCategory] =
        (eventsByCategory[category as EventCategory] || 0) + 1

      // Count by severity
      eventsBySeverity[log.severity as AuditSeverity] =
        (eventsBySeverity[log.severity as AuditSeverity] || 0) + 1

      // Extract compliance flags
      const details = (log.new_values as any)?.details as AuditEventDetails
      if (details?.compliance_flags) {
        complianceFlags.push(...details.compliance_flags)
      }

      // Check retention requirements
      const logAge = (new Date().getTime() - new Date(log.activity_timestamp || log.created_at || new Date()).getTime()) / (1000 * 60 * 60 * 24)
      if (logAge > 2555) { // > 7 years (GDPR requirement)
        retentionNotices.push(`Log ${log.id} exceeds 7-year retention period`)
      }
    })

    return {
      period: {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
      },
      total_events: logs.length,
      events_by_category: eventsByCategory,
      events_by_severity: eventsBySeverity,
      security_incidents: (eventsByCategory.security || 0),
      data_modifications: (eventsByCategory.data_modification || 0),
      system_operations: (eventsByCategory.system_operation || 0),
      compliance_flags: Array.from(new Set(complianceFlags)),
      retention_notices: retentionNotices,
    }
  }

  /**
   * Calculates time span for log entries
   */
  private static calculateTimeSpan(logs: VerificationAuditLogRow[]): number {
    if (logs.length < 2) return 0

    const times = logs.map(log => new Date(log.activity_timestamp || log.created_at || new Date()).getTime()).sort()
    return (times[times.length - 1] - times[0]) / (1000 * 60 * 60) // hours
  }
}

// Utility functions
export class AuditLogUtils {
  /**
   * Formats audit log for display
   */
  static formatAuditEntry(log: VerificationAuditLogRow): string {
    const timestamp = new Date(log.activity_timestamp || log.created_at || new Date()).toLocaleString()
    const newValues = log.new_values as any
    const actor = log.user_id ? `user:${log.user_id}` : (newValues?.actor_type || 'system')
    return `[${timestamp}] ${(log.severity || 'info').toUpperCase()} - ${actor} - ${newValues?.description || log.operation || 'Unknown operation'}`
  }

  /**
   * Extracts correlation chain for related events
   */
  static extractCorrelationChain(logs: VerificationAuditLogRow[], correlationId: string): VerificationAuditLogRow[] {
    return logs
      .filter(log => {
        const newValues = log.new_values as any
        return newValues?.correlation_id === correlationId
      })
      .sort((a, b) => {
        const aTime = new Date(a.activity_timestamp || a.created_at || new Date()).getTime()
        const bTime = new Date(b.activity_timestamp || b.created_at || new Date()).getTime()
        return aTime - bTime
      })
  }

  /**
   * Sanitizes sensitive data for export
   */
  static sanitizeForExport(log: VerificationAuditLogRow, includeSensitive: boolean = false): any {
    if (!includeSensitive) {
      // Remove sensitive fields using destructuring
      const { ip_address, user_agent, ...sanitized } = log
      
      // Sanitize details in new_values
      if (sanitized.new_values && typeof sanitized.new_values === 'object') {
        const newValues = sanitized.new_values as any
        if (newValues.details) {
          const { session_info, ...cleanDetails } = newValues.details
          if (cleanDetails.file_details) {
            const { file_hash, ...cleanFileDetails } = cleanDetails.file_details
            sanitized.new_values = { 
              ...newValues, 
              details: { ...cleanDetails, file_details: cleanFileDetails }
            }
          } else {
            sanitized.new_values = { ...newValues, details: cleanDetails }
          }
        }
      }
      
      return sanitized
    }

    return { ...log }
  }

  /**
   * Validates audit log retention requirements
   */
  static validateRetentionCompliance(log: VerificationAuditLogRow): {
    compliant: boolean
    retention_period_days: number
    expires_at: string
    action_required?: string
  } {
    const logDate = new Date(log.activity_timestamp || log.created_at || new Date())
    const retentionDays = this.getRetentionPeriod(log)
    const expiresAt = new Date(logDate.getTime() + retentionDays * 24 * 60 * 60 * 1000)
    const now = new Date()

    const compliant = now < expiresAt

    return {
      compliant,
      retention_period_days: retentionDays,
      expires_at: expiresAt.toISOString(),
      action_required: compliant ? undefined : 'Archive or delete expired log',
    }
  }

  /**
   * Gets retention period based on event type and severity
   */
  private static getRetentionPeriod(log: VerificationAuditLogRow): number {
    const newValues = log.new_values as any
    const category = newValues?.category
    
    // Security and fraud events: 7 years
    if (category === 'security' || category === 'fraud_detection') {
      return 2555 // 7 years
    }

    // Compliance events: 7 years
    if (category === 'compliance') {
      return 2555 // 7 years
    }

    // Critical/error events: 3 years
    if (log.severity === 'critical' || log.severity === 'error') {
      return 1095 // 3 years
    }

    // Business process events: 1 year
    if (category === 'business_process' || category === 'data_modification') {
      return 365 // 1 year
    }

    // System operations: 6 months
    return 180 // 6 months
  }
}

// Export validation functions
export const validateAuditLogCreate = (data: unknown) =>
  VerificationAuditLogValidation.create.safeParse(data)

export const validateAuditLogQuery = (data: unknown) =>
  VerificationAuditLogValidation.query.safeParse(data)

export const validateComplianceExport = (data: unknown) =>
  VerificationAuditLogValidation.compliance_export.safeParse(data)