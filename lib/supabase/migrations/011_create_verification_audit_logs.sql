-- Payment Verification System: Verification Audit Logs Table
-- Complete audit trail of all verification activities for compliance and debugging

-- Custom enums for audit logging
CREATE TYPE audit_event_type AS ENUM (
  'batch_created',
  'batch_released',
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
  'admin_batch_processed',
  'verification_completed'
);

CREATE TYPE actor_type_enum AS ENUM (
  'business_user',
  'admin_user',
  'system',
  'api_client'
);

-- Verification audit logs table
CREATE TABLE verification_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context identification
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  verification_session_id UUID REFERENCES verification_sessions(id) ON DELETE CASCADE,
  payment_batch_id UUID REFERENCES payment_batches(id) ON DELETE CASCADE,
  transaction_id TEXT, -- May be NULL for session-level events

  -- Event details
  event_type audit_event_type NOT NULL,
  event_description TEXT NOT NULL CHECK (LENGTH(TRIM(event_description)) > 0),

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

  -- Immutable timestamp for audit integrity
  created_at_immutable TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_audit_logs_business_date ON verification_audit_logs(business_id, created_at DESC);
CREATE INDEX idx_audit_logs_session ON verification_audit_logs(verification_session_id, created_at DESC);
CREATE INDEX idx_audit_logs_batch ON verification_audit_logs(payment_batch_id, created_at DESC);
CREATE INDEX idx_audit_logs_event_type ON verification_audit_logs(event_type, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON verification_audit_logs(actor_type, actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_transaction ON verification_audit_logs(transaction_id) WHERE transaction_id IS NOT NULL;

-- GIN indexes for JSONB queries
CREATE INDEX idx_audit_logs_metadata ON verification_audit_logs USING gin(metadata);
CREATE INDEX idx_audit_logs_before_state ON verification_audit_logs USING gin(before_state);
CREATE INDEX idx_audit_logs_after_state ON verification_audit_logs USING gin(after_state);

-- Row Level Security
ALTER TABLE verification_audit_logs ENABLE ROW LEVEL SECURITY;

-- Businesses can view their own audit logs
CREATE POLICY "Businesses can view own audit logs"
  ON verification_audit_logs FOR SELECT
  USING (business_id = auth.uid());

-- System can create audit logs
CREATE POLICY "System can create audit logs"
  ON verification_audit_logs FOR INSERT
  WITH CHECK (true);

-- Prevent audit log modifications (immutable)
CREATE POLICY "Audit logs are immutable"
  ON verification_audit_logs FOR UPDATE
  USING (FALSE);

CREATE POLICY "Audit logs cannot be deleted"
  ON verification_audit_logs FOR DELETE
  USING (FALSE);

-- Admin can view all audit logs
CREATE POLICY "Admin can view all audit logs"
  ON verification_audit_logs FOR SELECT
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_business_id UUID,
  p_event_type audit_event_type,
  p_event_description TEXT,
  p_actor_type actor_type_enum,
  p_verification_session_id UUID DEFAULT NULL,
  p_payment_batch_id UUID DEFAULT NULL,
  p_transaction_id TEXT DEFAULT NULL,
  p_actor_id UUID DEFAULT NULL,
  p_actor_email TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO verification_audit_logs (
    business_id,
    verification_session_id,
    payment_batch_id,
    transaction_id,
    event_type,
    event_description,
    actor_type,
    actor_id,
    actor_email,
    ip_address,
    user_agent,
    before_state,
    after_state,
    metadata
  ) VALUES (
    p_business_id,
    p_verification_session_id,
    p_payment_batch_id,
    p_transaction_id,
    p_event_type,
    p_event_description,
    p_actor_type,
    COALESCE(p_actor_id, auth.uid()),
    p_actor_email,
    p_ip_address,
    p_user_agent,
    p_before_state,
    p_after_state,
    p_metadata
  ) RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit trail for a verification session
CREATE OR REPLACE FUNCTION get_session_audit_trail(session_id UUID)
RETURNS TABLE (
  log_id UUID,
  event_type audit_event_type,
  event_description TEXT,
  actor_type actor_type_enum,
  actor_email TEXT,
  transaction_id TEXT,
  created_at TIMESTAMPTZ,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    val.id,
    val.event_type,
    val.event_description,
    val.actor_type,
    val.actor_email,
    val.transaction_id,
    val.created_at,
    val.metadata
  FROM verification_audit_logs val
  WHERE val.verification_session_id = session_id
  ORDER BY val.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit trail for a transaction
CREATE OR REPLACE FUNCTION get_transaction_audit_trail(p_transaction_id TEXT)
RETURNS TABLE (
  log_id UUID,
  event_type audit_event_type,
  event_description TEXT,
  actor_type actor_type_enum,
  actor_email TEXT,
  before_state JSONB,
  after_state JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    val.id,
    val.event_type,
    val.event_description,
    val.actor_type,
    val.actor_email,
    val.before_state,
    val.after_state,
    val.created_at
  FROM verification_audit_logs val
  WHERE val.transaction_id = p_transaction_id
  ORDER BY val.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create batch event audit log
CREATE OR REPLACE FUNCTION audit_batch_event(
  batch_id UUID,
  p_event_type audit_event_type,
  p_event_description TEXT,
  p_actor_type actor_type_enum DEFAULT 'system',
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  business_id_val UUID;
  audit_id UUID;
BEGIN
  -- Get business_id from batch
  SELECT business_id INTO business_id_val
  FROM payment_batches
  WHERE id = batch_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment batch not found: %', batch_id;
  END IF;

  -- Create audit log
  SELECT create_audit_log(
    business_id_val,
    p_event_type,
    p_event_description,
    p_actor_type,
    NULL, -- verification_session_id
    batch_id,
    NULL, -- transaction_id
    auth.uid(),
    NULL, -- actor_email (will be populated by trigger if needed)
    NULL, -- ip_address
    NULL, -- user_agent
    NULL, -- before_state
    NULL, -- after_state
    p_metadata
  ) INTO audit_id;

  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create verification event audit log
CREATE OR REPLACE FUNCTION audit_verification_event(
  session_id UUID,
  p_event_type audit_event_type,
  p_event_description TEXT,
  p_transaction_id TEXT DEFAULT NULL,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  business_id_val UUID;
  batch_id_val UUID;
  audit_id UUID;
BEGIN
  -- Get business_id and batch_id from session
  SELECT vs.business_id, vs.payment_batch_id
  INTO business_id_val, batch_id_val
  FROM verification_sessions vs
  WHERE vs.id = session_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verification session not found: %', session_id;
  END IF;

  -- Create audit log
  SELECT create_audit_log(
    business_id_val,
    p_event_type,
    p_event_description,
    'business_user',
    session_id,
    batch_id_val,
    p_transaction_id,
    auth.uid(),
    NULL, -- actor_email
    NULL, -- ip_address
    NULL, -- user_agent
    p_before_state,
    p_after_state,
    p_metadata
  ) INTO audit_id;

  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically audit verification result changes
CREATE OR REPLACE FUNCTION audit_verification_result_changes()
RETURNS TRIGGER AS $$
DECLARE
  event_desc TEXT;
  event_type_val audit_event_type;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New verification result created
    PERFORM audit_verification_event(
      NEW.verification_session_id,
      'verification_started',
      'Transaction ' || NEW.transaction_id || ' added to verification session',
      NEW.transaction_id,
      NULL,
      row_to_json(NEW)::jsonb,
      jsonb_build_object('operation', 'INSERT')
    );

  ELSIF TG_OP = 'UPDATE' THEN
    -- Verification decision made
    IF OLD.verified IS DISTINCT FROM NEW.verified AND NEW.verified IS NOT NULL THEN
      IF NEW.verified = TRUE THEN
        event_type_val := 'transaction_approved';
        event_desc := 'Transaction ' || NEW.transaction_id || ' approved';
      ELSE
        event_type_val := 'transaction_rejected';
        event_desc := 'Transaction ' || NEW.transaction_id || ' rejected';
        IF NEW.rejection_reason IS NOT NULL THEN
          event_desc := event_desc || ' (reason: ' || NEW.rejection_reason || ')';
        END IF;
      END IF;

      PERFORM audit_verification_event(
        NEW.verification_session_id,
        event_type_val,
        event_desc,
        NEW.transaction_id,
        row_to_json(OLD)::jsonb,
        row_to_json(NEW)::jsonb,
        jsonb_build_object(
          'operation', 'UPDATE',
          'verified', NEW.verified,
          'rejection_reason', NEW.rejection_reason,
          'business_notes', NEW.business_notes
        )
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_verification_result_changes_trigger
  AFTER INSERT OR UPDATE ON verification_results
  FOR EACH ROW
  EXECUTE FUNCTION audit_verification_result_changes();

-- Function to clean up old audit logs (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM verification_audit_logs
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE verification_audit_logs IS 'Complete audit trail of all verification activities for compliance and debugging';
COMMENT ON COLUMN verification_audit_logs.event_type IS 'Type of audit event that occurred';
COMMENT ON COLUMN verification_audit_logs.actor_type IS 'Type of actor who performed the action';
COMMENT ON COLUMN verification_audit_logs.before_state IS 'State of the object before the action was performed';
COMMENT ON COLUMN verification_audit_logs.after_state IS 'State of the object after the action was performed';
COMMENT ON COLUMN verification_audit_logs.created_at_immutable IS 'Immutable timestamp for audit integrity verification';
COMMENT ON FUNCTION create_audit_log IS 'Creates a new audit log entry with all context information';
COMMENT ON FUNCTION get_session_audit_trail IS 'Returns complete audit trail for a verification session';
COMMENT ON FUNCTION get_transaction_audit_trail IS 'Returns audit trail for a specific transaction';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Removes audit logs older than specified number of days (for maintenance)';

-- Grant permissions
GRANT SELECT ON verification_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION create_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_audit_trail TO authenticated;
GRANT EXECUTE ON FUNCTION get_transaction_audit_trail TO authenticated;
GRANT EXECUTE ON FUNCTION audit_batch_event TO authenticated;
GRANT EXECUTE ON FUNCTION audit_verification_event TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs TO service_role;