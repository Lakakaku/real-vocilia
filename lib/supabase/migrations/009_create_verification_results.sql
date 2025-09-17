-- Payment Verification System: Verification Results Table
-- Individual transaction verification decisions made by businesses

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

-- Verification results table
CREATE TABLE verification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_session_id UUID NOT NULL REFERENCES verification_sessions(id) ON DELETE CASCADE,

  -- Transaction identification
  transaction_id TEXT NOT NULL, -- Format: VCL-{number}
  customer_feedback_id UUID, -- Reference to original feedback

  -- Transaction details (copied from batch for auditing)
  transaction_date TIMESTAMPTZ NOT NULL,
  amount_sek DECIMAL(10,2) NOT NULL CHECK (amount_sek > 0),
  phone_last4 TEXT NOT NULL CHECK (phone_last4 ~ '^\*\*\d{2}$'),
  store_code TEXT NOT NULL CHECK (store_code ~ '^[A-Z0-9]{6}$'),
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  reward_percentage INTEGER CHECK (reward_percentage >= 3 AND reward_percentage <= 15),
  reward_amount_sek DECIMAL(10,2) CHECK (reward_amount_sek >= 0),

  -- Verification decision
  verified BOOLEAN, -- NULL = not yet verified
  verification_decision verification_decision_type,
  rejection_reason rejection_reason_type,
  business_notes TEXT,

  -- Timing
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),

  -- Fraud assessment reference
  fraud_assessment_id UUID, -- Will reference fraud_assessments(id) when that table exists

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(verification_session_id, transaction_id),

  -- Ensure verification decision consistency
  CONSTRAINT valid_verification CHECK (
    (verified = TRUE AND verification_decision = 'approved') OR
    (verified = FALSE AND verification_decision = 'rejected' AND rejection_reason IS NOT NULL) OR
    (verified IS NULL AND verification_decision IS NULL)
  ),

  -- Ensure transaction_id follows correct format
  CONSTRAINT valid_transaction_id CHECK (transaction_id ~ '^VCL-\d+$'),

  -- If rejection_reason is 'other', business_notes is required
  CONSTRAINT rejection_reason_notes CHECK (
    rejection_reason != 'other' OR
    (rejection_reason = 'other' AND business_notes IS NOT NULL AND LENGTH(TRIM(business_notes)) > 0)
  )
);

-- Performance indexes
CREATE INDEX idx_verification_results_session ON verification_results(verification_session_id);
CREATE INDEX idx_verification_results_transaction ON verification_results(transaction_id);
CREATE INDEX idx_verification_results_verified ON verification_results(verified, verified_at DESC);
CREATE INDEX idx_verification_results_date ON verification_results(transaction_date);
CREATE INDEX idx_verification_results_rejection ON verification_results(rejection_reason) WHERE rejection_reason IS NOT NULL;

-- Row Level Security
ALTER TABLE verification_results ENABLE ROW LEVEL SECURITY;

-- Businesses can manage verification results for their own sessions
CREATE POLICY "Businesses can manage verification results for own sessions"
  ON verification_results FOR ALL
  USING (
    verification_session_id IN (
      SELECT id FROM verification_sessions WHERE business_id = auth.uid()
    )
  );

-- System/Admin can view all verification results
CREATE POLICY "System can view all verification results"
  ON verification_results FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Function to update verification result
CREATE OR REPLACE FUNCTION update_verification_result(
  result_id UUID,
  p_verified BOOLEAN,
  p_rejection_reason rejection_reason_type DEFAULT NULL,
  p_business_notes TEXT DEFAULT NULL,
  p_verified_by UUID DEFAULT NULL
)
RETURNS verification_results AS $$
DECLARE
  result_record verification_results;
  session_id UUID;
BEGIN
  -- Get current result and session ID
  SELECT verification_session_id INTO session_id
  FROM verification_results
  WHERE id = result_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification result not found: %', result_id;
  END IF;

  -- Update the verification result
  UPDATE verification_results
  SET
    verified = p_verified,
    verification_decision = CASE
      WHEN p_verified = TRUE THEN 'approved'
      WHEN p_verified = FALSE THEN 'rejected'
      ELSE NULL
    END,
    rejection_reason = CASE
      WHEN p_verified = FALSE THEN p_rejection_reason
      ELSE NULL
    END,
    business_notes = p_business_notes,
    verified_at = CASE
      WHEN p_verified IS NOT NULL THEN NOW()
      ELSE verified_at
    END,
    verified_by = COALESCE(p_verified_by, auth.uid()),
    updated_at = NOW()
  WHERE id = result_id
  RETURNING * INTO result_record;

  -- Update session progress counters
  PERFORM update_verification_session_counters(session_id);

  RETURN result_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update session counters when results change
CREATE OR REPLACE FUNCTION update_verification_session_counters(session_id UUID)
RETURNS VOID AS $$
DECLARE
  counters RECORD;
BEGIN
  -- Calculate current verification counts
  SELECT
    COUNT(*) as total_verified,
    COUNT(*) FILTER (WHERE verified = TRUE) as approved,
    COUNT(*) FILTER (WHERE verified = FALSE) as rejected
  INTO counters
  FROM verification_results
  WHERE verification_session_id = session_id AND verified IS NOT NULL;

  -- Update session with new counters
  UPDATE verification_sessions
  SET
    verified_transactions = counters.total_verified,
    approved_count = counters.approved,
    rejected_count = counters.rejected,
    updated_at = NOW()
  WHERE id = session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update session counters
CREATE OR REPLACE FUNCTION trigger_update_session_counters()
RETURNS TRIGGER AS $$
BEGIN
  -- Update session counters whenever verification results change
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_verification_session_counters(NEW.verification_session_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_verification_session_counters(OLD.verification_session_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_counters_trigger
  AFTER INSERT OR UPDATE OR DELETE ON verification_results
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_session_counters();

-- Function to bulk verify multiple results
CREATE OR REPLACE FUNCTION bulk_verify_results(
  result_ids UUID[],
  p_verified BOOLEAN,
  p_rejection_reason rejection_reason_type DEFAULT NULL,
  p_business_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
  session_ids UUID[];
BEGIN
  -- Update all specified results
  UPDATE verification_results
  SET
    verified = p_verified,
    verification_decision = CASE
      WHEN p_verified = TRUE THEN 'approved'
      WHEN p_verified = FALSE THEN 'rejected'
      ELSE verification_decision
    END,
    rejection_reason = CASE
      WHEN p_verified = FALSE THEN p_rejection_reason
      ELSE NULL
    END,
    business_notes = COALESCE(p_business_notes, business_notes),
    verified_at = NOW(),
    verified_by = auth.uid(),
    updated_at = NOW()
  WHERE id = ANY(result_ids);

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Get affected session IDs and update their counters
  SELECT ARRAY_AGG(DISTINCT verification_session_id)
  INTO session_ids
  FROM verification_results
  WHERE id = ANY(result_ids);

  -- Update counters for all affected sessions
  PERFORM update_verification_session_counters(session_id)
  FROM UNNEST(session_ids) AS session_id;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get verification summary for a session
CREATE OR REPLACE FUNCTION get_verification_summary(session_id UUID)
RETURNS TABLE (
  total_transactions BIGINT,
  verified_transactions BIGINT,
  approved_transactions BIGINT,
  rejected_transactions BIGINT,
  pending_transactions BIGINT,
  rejection_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_transactions,
    COUNT(*) FILTER (WHERE verified IS NOT NULL) as verified_transactions,
    COUNT(*) FILTER (WHERE verified = TRUE) as approved_transactions,
    COUNT(*) FILTER (WHERE verified = FALSE) as rejected_transactions,
    COUNT(*) FILTER (WHERE verified IS NULL) as pending_transactions,
    COALESCE(
      jsonb_object_agg(
        rejection_reason,
        rejection_count
      ) FILTER (WHERE rejection_reason IS NOT NULL),
      '{}'::jsonb
    ) as rejection_breakdown
  FROM verification_results vr
  LEFT JOIN (
    SELECT
      rejection_reason,
      COUNT(*) as rejection_count
    FROM verification_results
    WHERE verification_session_id = session_id AND verified = FALSE
    GROUP BY rejection_reason
  ) rejection_counts ON TRUE
  WHERE vr.verification_session_id = session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE verification_results IS 'Individual transaction verification decisions made by businesses';
COMMENT ON COLUMN verification_results.transaction_id IS 'Unique transaction identifier in format VCL-{number}';
COMMENT ON COLUMN verification_results.verified IS 'NULL = not verified, TRUE = approved, FALSE = rejected';
COMMENT ON COLUMN verification_results.phone_last4 IS 'Last 4 digits of customer phone number in **XX format for privacy';
COMMENT ON FUNCTION update_verification_result IS 'Updates a single verification result and recalculates session counters';
COMMENT ON FUNCTION bulk_verify_results IS 'Updates multiple verification results in a single transaction';
COMMENT ON FUNCTION get_verification_summary IS 'Returns verification summary statistics for a session';

-- Grant permissions
GRANT SELECT ON verification_results TO authenticated;
GRANT EXECUTE ON FUNCTION update_verification_result TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_verify_results TO authenticated;
GRANT EXECUTE ON FUNCTION get_verification_summary TO authenticated;