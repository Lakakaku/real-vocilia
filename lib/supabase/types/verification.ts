// Generated TypeScript types for Payment Verification System
// Based on Supabase schema migrations 007-012
// Note: These types are for a future verification system that doesn't match current database schema

// Extract verification-related enums from Database (will be available after migrations are applied)
export type VerificationBatchStatus =
  | 'draft'
  | 'pending'
  | 'downloaded'
  | 'in_progress'
  | 'submitted'
  | 'completed'
  | 'auto_approved'
  | 'cancelled'

export type VerificationSessionStatus =
  | 'not_started'
  | 'downloaded'
  | 'in_progress'
  | 'submitted'
  | 'auto_approved'
  | 'completed'

export type VerificationDecisionType =
  | 'approved'
  | 'rejected'
  | 'pending_review'

export type RejectionReasonType =
  | 'not_found'
  | 'amount_mismatch'
  | 'time_mismatch'
  | 'duplicate'
  | 'suspicious_pattern'
  | 'invalid_customer'
  | 'other'

export type RiskLevelType =
  | 'low'
  | 'medium'
  | 'high'

export type AIRecommendationType =
  | 'approve'
  | 'review'
  | 'reject'

export type AuditEventType =
  | 'batch_created'
  | 'batch_released'
  | 'batch_downloaded'
  | 'verification_started'
  | 'transaction_approved'
  | 'transaction_rejected'
  | 'batch_uploaded'
  | 'deadline_reminder_sent'
  | 'auto_approval_triggered'
  | 'fraud_assessment_generated'
  | 'file_upload_failed'
  | 'session_timeout'
  | 'admin_batch_processed'
  | 'verification_completed'

export type ActorTypeEnum =
  | 'business_user'
  | 'admin_user'
  | 'system'
  | 'api_client'

// Table types (will be available after migrations are applied)
export interface PaymentBatch {
  id: string
  business_id: string
  week_number: number
  year_number: number
  file_path: string | null
  file_size: number | null
  file_hash: string | null
  total_transactions: number
  total_amount: number
  deadline: string
  status: VerificationBatchStatus
  admin_notes: string | null
  auto_approved: boolean
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface VerificationSession {
  id: string
  payment_batch_id: string
  business_id: string
  status: VerificationSessionStatus
  started_at: string | null
  downloaded_at: string | null
  submitted_at: string | null
  completed_at: string | null
  total_transactions: number
  verified_transactions: number
  approved_count: number
  rejected_count: number
  result_file_path: string | null
  result_file_size: number | null
  result_file_hash: string | null
  verified_by: string | null
  ip_address: string | null
  user_agent: string | null
  deadline: string
  reminder_sent_at: string[]
  auto_approved: boolean
  created_at: string
  updated_at: string
}

export interface VerificationResult {
  id: string
  verification_session_id: string
  transaction_id: string
  customer_feedback_id: string | null
  transaction_date: string
  amount_sek: number
  phone_last4: string
  store_code: string
  quality_score: number | null
  reward_percentage: number | null
  reward_amount_sek: number | null
  verified: boolean | null
  verification_decision: VerificationDecisionType | null
  rejection_reason: RejectionReasonType | null
  business_notes: string | null
  verified_at: string | null
  verified_by: string | null
  fraud_assessment_id: string | null
  created_at: string
  updated_at: string
}

export interface FraudAssessment {
  id: string
  transaction_id: string
  business_id: string
  risk_score: number
  risk_level: RiskLevelType
  confidence: number
  recommendation: AIRecommendationType
  reasoning: string[]
  risk_factors: Record<string, any> | null
  model_version: string
  assessed_at: string
  assessment_duration_ms: number | null
  business_context_version: number
  fraud_patterns_version: number
  transaction_amount: number | null
  transaction_date: string | null
  store_code: string | null
  quality_score: number | null
  created_at: string
}

export interface VerificationAuditLog {
  id: string
  business_id: string
  verification_session_id: string | null
  payment_batch_id: string | null
  transaction_id: string | null
  event_type: AuditEventType
  event_description: string
  actor_type: ActorTypeEnum
  actor_id: string | null
  actor_email: string | null
  ip_address: string | null
  user_agent: string | null
  before_state: Record<string, any> | null
  after_state: Record<string, any> | null
  metadata: Record<string, any> | null
  created_at: string
  created_at_immutable: string
}

// Insert types
export type PaymentBatchInsert = Omit<PaymentBatch, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
}

export type VerificationSessionInsert = Omit<VerificationSession, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
}

export type VerificationResultInsert = Omit<VerificationResult, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
}

export type FraudAssessmentInsert = Omit<FraudAssessment, 'id' | 'created_at'> & {
  id?: string
  created_at?: string
}

export type VerificationAuditLogInsert = Omit<VerificationAuditLog, 'id' | 'created_at' | 'created_at_immutable'> & {
  id?: string
  created_at?: string
  created_at_immutable?: string
}

// Update types
export type PaymentBatchUpdate = Partial<Omit<PaymentBatch, 'id' | 'created_at'>>
export type VerificationSessionUpdate = Partial<Omit<VerificationSession, 'id' | 'created_at'>>
export type VerificationResultUpdate = Partial<Omit<VerificationResult, 'id' | 'created_at'>>
export type FraudAssessmentUpdate = Partial<Omit<FraudAssessment, 'id' | 'created_at'>>
export type VerificationAuditLogUpdate = Partial<Omit<VerificationAuditLog, 'id' | 'created_at' | 'created_at_immutable'>>

// Function return types
export interface VerificationDashboardSummary {
  current_batch_id: string | null
  current_session_id: string | null
  batch_status: VerificationBatchStatus | null
  session_status: VerificationSessionStatus | null
  deadline: string | null
  time_remaining_seconds: number | null
  total_transactions: number | null
  verified_transactions: number | null
  high_risk_transactions: number | null
  completion_percentage: number | null
}

export interface BusinessVerificationStats {
  total_batches: number
  completed_batches: number
  auto_approved_batches: number
  avg_completion_time_hours: number | null
  total_transactions_verified: number
  approval_rate_percentage: number | null
  fraud_detection_rate_percentage: number | null
  on_time_completion_rate_percentage: number | null
}

export interface PendingDeadlineNotification {
  business_id: string
  batch_id: string
  session_id: string
  deadline: string
  hours_remaining: number
  last_reminder_sent: string | null
  should_send_reminder: boolean
}

export interface FraudStatistics {
  total_assessments: number
  high_risk_count: number
  medium_risk_count: number
  low_risk_count: number
  avg_risk_score: number | null
  avg_confidence: number | null
  recommendation_breakdown: Record<string, number>
  top_risk_factors: Array<{
    factor: string
    count: number
    avg_impact: number
  }>
}

export interface HighRiskTransaction {
  transaction_id: string
  business_id: string
  risk_score: number
  risk_level: RiskLevelType
  recommendation: AIRecommendationType
  reasoning: string[]
  transaction_amount: number | null
  transaction_date: string | null
  assessed_at: string
}

export interface VerificationSummary {
  total_transactions: number
  verified_transactions: number
  approved_transactions: number
  rejected_transactions: number
  pending_transactions: number
  rejection_breakdown: Record<string, number>
}

export interface SessionProgress {
  completion_percentage: number
  transactions_verified: number
  transactions_pending: number
  time_remaining_seconds: number
  status_description: string
}

// CSV processing types
export interface CSVTransaction {
  transaction_id: string
  customer_feedback_id?: string
  transaction_date: string
  amount_sek: number
  phone_last4: string
  store_code: string
  quality_score?: number
  reward_percentage?: number
  reward_amount_sek?: number
}

export interface VerificationCSVRow extends CSVTransaction {
  verified?: boolean
  verification_decision?: VerificationDecisionType
  rejection_reason?: RejectionReasonType
  business_notes?: string
}

// Error types
export interface VerificationError {
  code: string
  message: string
  details?: Record<string, any>
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: VerificationError
  metadata?: {
    total?: number
    page?: number
    limit?: number
    has_more?: boolean
  }
}

export type VerificationApiResponse<T = any> = ApiResponse<T>

// Utility types
export type Nullable<T> = T | null
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// Filter types for queries
export interface VerificationFilters {
  business_id?: string
  week_number?: number
  year_number?: number
  status?: VerificationBatchStatus | VerificationSessionStatus
  deadline_before?: string
  deadline_after?: string
  created_after?: string
  created_before?: string
  risk_level?: RiskLevelType
  verified?: boolean
}

// Pagination types
export interface PaginationParams {
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    has_next: boolean
    has_prev: boolean
  }
}