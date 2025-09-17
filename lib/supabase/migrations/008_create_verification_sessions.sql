-- Payment Verification System: Verification Sessions Table
-- Manages business verification workflow state and progress tracking

-- Custom enum for session status
CREATE TYPE verification_session_status AS ENUM (
  'not_started',  -- Session created but not accessed
  'downloaded',   -- Batch file downloaded
  'in_progress',  -- User is reviewing/marking transactions
  'submitted',    -- Verification results uploaded
  'auto_approved', -- Deadline passed without submission
  'completed'     -- Admin processed results
);

-- Verification sessions table
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
  total_transactions INTEGER DEFAULT 0 CHECK (total_transactions >= 0),
  verified_transactions INTEGER DEFAULT 0 CHECK (verified_transactions >= 0),
  approved_count INTEGER DEFAULT 0 CHECK (approved_count >= 0),
  rejected_count INTEGER DEFAULT 0 CHECK (rejected_count >= 0),

  -- File handling for results
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

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(payment_batch_id), -- One session per batch

  -- Ensure logical state transitions
  CONSTRAINT valid_timestamps CHECK (
    downloaded_at >= started_at AND
    submitted_at >= downloaded_at AND
    completed_at >= submitted_at
  ),

  -- Ensure progress counters are consistent
  CONSTRAINT valid_verification_counts CHECK (
    verified_transactions <= total_transactions AND
    approved_count + rejected_count <= verified_transactions AND
    approved_count >= 0 AND rejected_count >= 0
  )
);

-- Performance indexes
CREATE INDEX idx_verification_sessions_business ON verification_sessions(business_id, created_at DESC);
CREATE INDEX idx_verification_sessions_status ON verification_sessions(status, deadline);
CREATE INDEX idx_verification_sessions_deadline ON verification_sessions(deadline)
  WHERE status IN ('not_started', 'downloaded', 'in_progress');
CREATE INDEX idx_verification_sessions_batch ON verification_sessions(payment_batch_id);

-- Row Level Security
ALTER TABLE verification_sessions ENABLE ROW LEVEL SECURITY;

-- Businesses can manage their own verification sessions
CREATE POLICY "Businesses can manage own verification sessions"
  ON verification_sessions FOR ALL
  USING (business_id = auth.uid());

-- System/Admin can view all sessions
CREATE POLICY "System can view all verification sessions"
  ON verification_sessions FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Function to update timestamp when status changes
CREATE OR REPLACE FUNCTION update_verification_session_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Update updated_at on any change
  NEW.updated_at := NOW();

  -- Set appropriate timestamps based on status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'downloaded' THEN
        NEW.downloaded_at := COALESCE(NEW.downloaded_at, NOW());
        NEW.started_at := COALESCE(NEW.started_at, NOW());

      WHEN 'in_progress' THEN
        NEW.started_at := COALESCE(NEW.started_at, NOW());
        IF OLD.status = 'not_started' THEN
          NEW.downloaded_at := COALESCE(NEW.downloaded_at, NOW());
        END IF;

      WHEN 'submitted' THEN
        NEW.submitted_at := COALESCE(NEW.submitted_at, NOW());

      WHEN 'auto_approved' THEN
        NEW.auto_approved := TRUE;

      WHEN 'completed' THEN
        NEW.completed_at := COALESCE(NEW.completed_at, NOW());
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update timestamps
CREATE TRIGGER update_verification_session_timestamps_trigger
  BEFORE UPDATE ON verification_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_verification_session_timestamps();

-- Function to create verification session from payment batch
CREATE OR REPLACE FUNCTION create_verification_session(batch_id UUID)
RETURNS UUID AS $$
DECLARE
  session_id UUID;
  batch_info RECORD;
BEGIN
  -- Get batch information
  SELECT business_id, deadline, total_transactions
  INTO batch_info
  FROM payment_batches
  WHERE id = batch_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment batch not found: %', batch_id;
  END IF;

  -- Create verification session
  INSERT INTO verification_sessions (
    payment_batch_id,
    business_id,
    deadline,
    total_transactions
  ) VALUES (
    batch_id,
    batch_info.business_id,
    batch_info.deadline,
    batch_info.total_transactions
  ) RETURNING id INTO session_id;

  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get session progress summary
CREATE OR REPLACE FUNCTION get_session_progress(session_id UUID)
RETURNS TABLE (
  completion_percentage NUMERIC,
  transactions_verified INTEGER,
  transactions_pending INTEGER,
  time_remaining_seconds INTEGER,
  status_description TEXT
) AS $$
DECLARE
  session_info RECORD;
BEGIN
  SELECT
    vs.total_transactions,
    vs.verified_transactions,
    vs.approved_count,
    vs.rejected_count,
    vs.deadline,
    vs.status
  INTO session_info
  FROM verification_sessions vs
  WHERE vs.id = session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification session not found: %', session_id;
  END IF;

  RETURN QUERY
  SELECT
    CASE
      WHEN session_info.total_transactions = 0 THEN 0
      ELSE ROUND((session_info.verified_transactions::NUMERIC / session_info.total_transactions) * 100, 2)
    END as completion_percentage,
    session_info.verified_transactions as transactions_verified,
    (session_info.total_transactions - session_info.verified_transactions) as transactions_pending,
    GREATEST(0, EXTRACT(EPOCH FROM (session_info.deadline - NOW()))::INTEGER) as time_remaining_seconds,
    CASE session_info.status
      WHEN 'not_started' THEN 'Verification not yet started'
      WHEN 'downloaded' THEN 'Batch downloaded, ready to begin verification'
      WHEN 'in_progress' THEN 'Verification in progress'
      WHEN 'submitted' THEN 'Verification results submitted'
      WHEN 'auto_approved' THEN 'Auto-approved due to deadline expiration'
      WHEN 'completed' THEN 'Verification completed and processed'
      ELSE 'Unknown status'
    END as status_description;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-approve expired sessions
CREATE OR REPLACE FUNCTION auto_approve_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE verification_sessions
  SET
    status = 'auto_approved',
    auto_approved = TRUE,
    updated_at = NOW()
  WHERE
    status IN ('not_started', 'downloaded', 'in_progress') AND
    deadline <= NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE verification_sessions IS 'Manages business verification workflow state and progress tracking';
COMMENT ON COLUMN verification_sessions.status IS 'Current status of the verification session';
COMMENT ON COLUMN verification_sessions.verified_transactions IS 'Number of transactions that have been verified (approved or rejected)';
COMMENT ON COLUMN verification_sessions.auto_approved IS 'Whether session was auto-approved due to deadline expiration';
COMMENT ON FUNCTION create_verification_session IS 'Creates a new verification session for a payment batch';
COMMENT ON FUNCTION get_session_progress IS 'Returns progress summary for a verification session';
COMMENT ON FUNCTION auto_approve_expired_sessions IS 'Auto-approves verification sessions that have passed their deadline';

-- Grant permissions
GRANT SELECT ON verification_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION create_verification_session TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_progress TO authenticated;
GRANT EXECUTE ON FUNCTION auto_approve_expired_sessions TO service_role;