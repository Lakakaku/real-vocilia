# Data Model: Payment Verification Dashboard System

**Feature**: Payment Verification Dashboard System
**Branch**: 003-7-1-verification
**Date**: 2025-09-16

## Entity Overview

The payment verification system introduces five core entities that manage the weekly verification workflow between admin and business users:

1. **PaymentBatch** - Weekly transaction collections from admin
2. **VerificationSession** - Business verification workflow management
3. **VerificationResult** - Individual transaction verification decisions
4. **FraudAssessment** - AI-generated risk analysis
5. **VerificationAuditLog** - Complete activity tracking

---

## Entity Definitions

### 1. PaymentBatch

**Purpose**: Represents a weekly collection of transactions sent by admin to businesses for verification.

```sql
CREATE TABLE payment_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Batch identification
  week_number INTEGER NOT NULL, -- 1-53
  year INTEGER NOT NULL,
  batch_version INTEGER DEFAULT 1, -- For revisions

  -- Deadline management
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deadline TIMESTAMPTZ NOT NULL, -- 7 days from creation
  status verification_batch_status DEFAULT 'pending',

  -- File handling
  file_path TEXT, -- Supabase storage path
  file_size INTEGER, -- Bytes
  file_hash TEXT, -- SHA-256 for integrity

  -- Transaction summary
  total_transactions INTEGER DEFAULT 0,
  total_reward_amount DECIMAL(10,2) DEFAULT 0,

  -- Admin metadata
  created_by UUID REFERENCES admin_users(id),
  notes TEXT,

  UNIQUE(business_id, week_number, year),

  -- Ensure deadline is always in future when created
  CONSTRAINT valid_deadline CHECK (deadline > created_at)
);

-- Custom enum for batch status
CREATE TYPE verification_batch_status AS ENUM (
  'pending',     -- Sent to business, awaiting download
  'downloaded',  -- Business downloaded the batch
  'in_progress', -- Business is working on verification
  'submitted',   -- Business uploaded verification results
  'auto_approved', -- Deadline passed, auto-approved
  'completed',   -- Admin processed the results
  'cancelled'    -- Batch cancelled/superseded
);
```

**Validation Rules**:
- Week number must be between 1-53
- Year must be current or future year
- Deadline must be exactly 7 days from creation
- File path must exist in Supabase storage when status != 'pending'

**Relationships**:
- Belongs to one Business
- Has many VerificationResults through VerificationSession
- Has one VerificationSession

---

### 2. VerificationSession

**Purpose**: Manages the business verification workflow state and progress tracking.

```sql
CREATE TABLE verification_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_batch_id UUID NOT NULL REFERENCES payment_batches(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Session state
  status verification_session_status DEFAULT 'not_started',
  started_at TIMESTAMPTZ,
  downloaded_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Progress tracking
  total_transactions INTEGER DEFAULT 0,
  verified_transactions INTEGER DEFAULT 0,
  approved_count INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0,

  -- File handling
  result_file_path TEXT, -- Path to uploaded verification results
  result_file_size INTEGER,
  result_file_hash TEXT,

  -- User context
  verified_by UUID REFERENCES auth.users(id), -- Business user who performed verification
  ip_address INET,
  user_agent TEXT,

  -- Deadline tracking
  deadline TIMESTAMPTZ NOT NULL,
  reminder_sent_at TIMESTAMPTZ[],
  auto_approved BOOLEAN DEFAULT FALSE,

  UNIQUE(payment_batch_id), -- One session per batch

  -- Ensure logical state transitions
  CONSTRAINT valid_timestamps CHECK (
    downloaded_at >= started_at AND
    submitted_at >= downloaded_at AND
    completed_at >= submitted_at
  )
);

-- Custom enum for session status
CREATE TYPE verification_session_status AS ENUM (
  'not_started',  -- Session created but not accessed
  'downloaded',   -- Batch file downloaded
  'in_progress',  -- User is reviewing/marking transactions
  'submitted',    -- Verification results uploaded
  'auto_approved', -- Deadline passed without submission
  'completed'     -- Admin processed results
);
```

**Validation Rules**:
- Status transitions must follow logical order
- All timestamps must be chronologically ordered
- Verified_transactions must not exceed total_transactions
- Approved_count + rejected_count must equal verified_transactions

**Relationships**:
- Belongs to one PaymentBatch
- Belongs to one Business
- Has many VerificationResults
- Has many VerificationAuditLogs

---

### 3. VerificationResult

**Purpose**: Stores individual transaction verification decisions made by businesses.

```sql
CREATE TABLE verification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_session_id UUID NOT NULL REFERENCES verification_sessions(id) ON DELETE CASCADE,

  -- Transaction identification
  transaction_id TEXT NOT NULL, -- Format: VCL-{number}
  customer_feedback_id UUID, -- Reference to original feedback

  -- Transaction details (copied from batch for auditing)
  transaction_date TIMESTAMPTZ NOT NULL,
  amount_sek DECIMAL(10,2) NOT NULL,
  phone_last4 TEXT NOT NULL,
  store_code TEXT NOT NULL,
  quality_score INTEGER,
  reward_percentage INTEGER,
  reward_amount_sek DECIMAL(10,2),

  -- Verification decision
  verified BOOLEAN, -- NULL = not yet verified
  verification_decision verification_decision_type,
  rejection_reason rejection_reason_type,
  business_notes TEXT,

  -- Timing
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),

  -- Fraud assessment reference
  fraud_assessment_id UUID REFERENCES fraud_assessments(id),

  UNIQUE(verification_session_id, transaction_id),

  -- Ensure verification decision consistency
  CONSTRAINT valid_verification CHECK (
    (verified = TRUE AND verification_decision = 'approved') OR
    (verified = FALSE AND verification_decision = 'rejected' AND rejection_reason IS NOT NULL) OR
    (verified IS NULL AND verification_decision IS NULL)
  )
);

-- Custom enums for verification decisions
CREATE TYPE verification_decision_type AS ENUM (
  'approved',
  'rejected',
  'pending_review'
);

CREATE TYPE rejection_reason_type AS ENUM (
  'not_found',          -- No matching transaction in POS
  'amount_mismatch',    -- Transaction amount doesn't match
  'time_mismatch',      -- Transaction time doesn't match
  'duplicate',          -- Duplicate transaction
  'suspicious_pattern', -- Fraud indicators detected
  'invalid_customer',   -- Customer phone number issues
  'other'              -- Other reason (requires business_notes)
);
```

**Validation Rules**:
- Transaction_id must follow VCL-{number} format
- Amount must be positive
- Phone_last4 must be exactly 4 characters with **XX format
- Quality_score must be 0-100
- Reward_percentage must be 3-15
- If rejection_reason is 'other', business_notes is required

**Relationships**:
- Belongs to one VerificationSession
- May reference one FraudAssessment
- May reference original customer feedback record

---

### 4. FraudAssessment

**Purpose**: Stores AI-generated fraud detection analysis for transactions.

```sql
CREATE TABLE fraud_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Risk scoring
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level risk_level_type NOT NULL,
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),

  -- AI recommendation
  recommendation ai_recommendation_type NOT NULL,
  reasoning TEXT[], -- Array of reasoning points
  risk_factors JSONB, -- Structured risk factor details

  -- Assessment metadata
  model_version TEXT DEFAULT 'gpt-4o-mini-v1',
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  assessment_duration_ms INTEGER,

  -- Context used
  business_context_version INTEGER, -- Track which context version was used
  fraud_patterns_version INTEGER,   -- Track fraud detection rule version

  UNIQUE(transaction_id, business_id)
);

-- Custom enums for fraud assessment
CREATE TYPE risk_level_type AS ENUM (
  'low',    -- 0-30
  'medium', -- 31-60
  'high'    -- 61-100
);

CREATE TYPE ai_recommendation_type AS ENUM (
  'approve',
  'review',
  'reject'
);
```

**Validation Rules**:
- Risk_score must match risk_level ranges
- Confidence must be between 0.0 and 1.0
- Reasoning array must contain at least one element
- Risk_factors JSONB must follow defined schema

**Relationships**:
- Belongs to one Business
- May be referenced by VerificationResults

---

### 5. VerificationAuditLog

**Purpose**: Complete audit trail of all verification activities for compliance and debugging.

```sql
CREATE TABLE verification_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context identification
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  verification_session_id UUID REFERENCES verification_sessions(id) ON DELETE CASCADE,
  transaction_id TEXT, -- May be NULL for session-level events

  -- Event details
  event_type audit_event_type NOT NULL,
  event_description TEXT NOT NULL,

  -- Actor information
  actor_type actor_type_enum NOT NULL,
  actor_id UUID, -- May be user_id, admin_id, or NULL for system
  actor_email TEXT,
  ip_address INET,
  user_agent TEXT,

  -- Event data
  before_state JSONB, -- State before the action
  after_state JSONB,  -- State after the action
  metadata JSONB,     -- Additional event-specific data

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure audit log integrity
  created_at_immutable TIMESTAMPTZ DEFAULT NOW()
);

-- Custom enums for audit logging
CREATE TYPE audit_event_type AS ENUM (
  'batch_downloaded',
  'verification_started',
  'transaction_approved',
  'transaction_rejected',
  'batch_uploaded',
  'deadline_reminder_sent',
  'auto_approval_triggered',
  'fraud_assessment_generated',
  'file_upload_failed',
  'session_timeout',
  'admin_batch_created',
  'admin_batch_released'
);

CREATE TYPE actor_type_enum AS ENUM (
  'business_user',
  'admin_user',
  'system',
  'api_client'
);

-- Prevent audit log modifications
CREATE POLICY "Audit logs are immutable"
ON verification_audit_logs FOR UPDATE
USING (FALSE);

CREATE POLICY "Audit logs cannot be deleted"
ON verification_audit_logs FOR DELETE
USING (FALSE);
```

**Validation Rules**:
- Event_description must not be empty
- Actor_id must correspond to valid user when actor_type is 'business_user' or 'admin_user'
- Before_state and after_state must be valid JSON
- Created_at_immutable ensures audit log integrity

**Relationships**:
- Belongs to one Business
- May belong to one VerificationSession
- References various system actors

---

## Database Indexes

```sql
-- Performance indexes for common queries
CREATE INDEX idx_payment_batches_business_week ON payment_batches(business_id, week_number, year);
CREATE INDEX idx_payment_batches_deadline ON payment_batches(deadline) WHERE status IN ('pending', 'downloaded', 'in_progress');
CREATE INDEX idx_verification_sessions_deadline ON verification_sessions(deadline) WHERE status != 'completed';
CREATE INDEX idx_verification_results_session ON verification_results(verification_session_id);
CREATE INDEX idx_fraud_assessments_risk ON fraud_assessments(business_id, risk_level, assessed_at DESC);
CREATE INDEX idx_audit_logs_business_date ON verification_audit_logs(business_id, created_at DESC);

-- Composite indexes for dashboard queries
CREATE INDEX idx_batches_status_business ON payment_batches(status, business_id, created_at DESC);
CREATE INDEX idx_sessions_business_status ON verification_sessions(business_id, status, deadline);
```

---

## Row Level Security Policies

```sql
-- PaymentBatches: Businesses can only see their own batches
CREATE POLICY "Businesses can view own payment batches"
ON payment_batches FOR SELECT
USING (business_id = auth.uid());

CREATE POLICY "Admins can manage all payment batches"
ON payment_batches FOR ALL
USING (auth.jwt() ->> 'role' = 'admin');

-- VerificationSessions: Businesses can manage their own sessions
CREATE POLICY "Businesses can manage own verification sessions"
ON verification_sessions FOR ALL
USING (business_id = auth.uid());

-- VerificationResults: Tied to session ownership
CREATE POLICY "Businesses can manage verification results for own sessions"
ON verification_results FOR ALL
USING (
  verification_session_id IN (
    SELECT id FROM verification_sessions WHERE business_id = auth.uid()
  )
);

-- FraudAssessments: Businesses can view assessments for their transactions
CREATE POLICY "Businesses can view own fraud assessments"
ON fraud_assessments FOR SELECT
USING (business_id = auth.uid());

-- AuditLogs: Businesses can view their own audit logs
CREATE POLICY "Businesses can view own audit logs"
ON verification_audit_logs FOR SELECT
USING (business_id = auth.uid());
```

---

## Data Migration Strategy

### Phase 1: Core Tables
1. Create enum types
2. Create payment_batches table
3. Create verification_sessions table
4. Add indexes and RLS policies

### Phase 2: Verification Data
1. Create verification_results table
2. Create fraud_assessments table
3. Add foreign key constraints

### Phase 3: Audit System
1. Create verification_audit_logs table
2. Add audit triggers for state changes
3. Test audit log immutability

### Phase 4: Performance Optimization
1. Add performance indexes
2. Create materialized views for dashboard queries
3. Set up automated cleanup procedures

---

## Storage Requirements

**Estimated Storage per Business per Week**:
- PaymentBatch: ~1KB
- VerificationSession: ~2KB
- VerificationResults: ~500B × transactions (~50) = ~25KB
- FraudAssessments: ~1KB × transactions (~50) = ~50KB
- AuditLogs: ~2KB × events (~200) = ~400KB

**Total per business per week**: ~478KB
**Annual storage for 100 businesses**: ~2.4GB
**5-year retention**: ~12GB

---

**Phase 1a Complete** - Ready for API Contracts Generation