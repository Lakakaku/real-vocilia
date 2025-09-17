-- Payment Verification System: Payment Batches Table
-- Weekly transaction collections sent by admin to businesses for verification

-- Custom enum for batch status
CREATE TYPE verification_batch_status AS ENUM (
  'draft',       -- Being prepared by admin
  'pending',     -- Sent to business, awaiting download
  'downloaded',  -- Business downloaded the batch
  'in_progress', -- Business is working on verification
  'submitted',   -- Business uploaded verification results
  'auto_approved', -- Deadline passed, auto-approved
  'completed',   -- Admin processed the results
  'cancelled'    -- Batch cancelled/superseded
);

-- Main payment batches table
CREATE TABLE payment_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Batch identification
  week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 53),
  year INTEGER NOT NULL CHECK (year >= 2024),
  batch_version INTEGER DEFAULT 1, -- For revisions

  -- Deadline management
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deadline TIMESTAMPTZ NOT NULL, -- 7 days from creation
  status verification_batch_status DEFAULT 'draft',

  -- File handling
  file_path TEXT, -- Supabase storage path
  file_size INTEGER, -- Bytes
  file_hash TEXT, -- SHA-256 for integrity

  -- Transaction summary
  total_transactions INTEGER DEFAULT 0 CHECK (total_transactions >= 0),
  total_reward_amount DECIMAL(10,2) DEFAULT 0 CHECK (total_reward_amount >= 0),

  -- Admin metadata
  created_by UUID, -- References admin_users(id) when admin table exists
  notes TEXT,

  -- Constraints
  UNIQUE(business_id, week_number, year),
  CONSTRAINT valid_deadline CHECK (deadline > created_at)
);

-- Performance indexes
CREATE INDEX idx_payment_batches_business_week ON payment_batches(business_id, week_number, year);
CREATE INDEX idx_payment_batches_status ON payment_batches(status, created_at DESC);
CREATE INDEX idx_payment_batches_deadline ON payment_batches(deadline)
  WHERE status IN ('pending', 'downloaded', 'in_progress');

-- Row Level Security
ALTER TABLE payment_batches ENABLE ROW LEVEL SECURITY;

-- Businesses can only see their own batches
CREATE POLICY "Businesses can view own payment batches"
  ON payment_batches FOR SELECT
  USING (business_id = auth.uid());

-- Businesses can update status of their own batches (limited updates)
CREATE POLICY "Businesses can update own batch status"
  ON payment_batches FOR UPDATE
  USING (business_id = auth.uid())
  WITH CHECK (
    business_id = auth.uid() AND
    -- Only allow status transitions that businesses can make
    status IN ('downloaded', 'in_progress', 'submitted')
  );

-- System/Admin can manage all batches (when auth context supports it)
CREATE POLICY "System can manage all payment batches"
  ON payment_batches FOR ALL
  USING (
    -- Allow if service role or admin role
    auth.jwt() ->> 'role' = 'service_role' OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Function to automatically set deadline when batch is created
CREATE OR REPLACE FUNCTION set_payment_batch_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- Set deadline to 7 days from creation if not specified
  IF NEW.deadline IS NULL OR NEW.deadline <= NEW.created_at THEN
    NEW.deadline := NEW.created_at + INTERVAL '7 days';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set deadline
CREATE TRIGGER set_payment_batch_deadline_trigger
  BEFORE INSERT OR UPDATE ON payment_batches
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_batch_deadline();

-- Function to get batches approaching deadline
CREATE OR REPLACE FUNCTION get_batches_approaching_deadline(hours_before INTEGER DEFAULT 24)
RETURNS TABLE (
  batch_id UUID,
  business_id UUID,
  week_number INTEGER,
  year INTEGER,
  deadline TIMESTAMPTZ,
  hours_remaining NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pb.id,
    pb.business_id,
    pb.week_number,
    pb.year,
    pb.deadline,
    ROUND(EXTRACT(EPOCH FROM (pb.deadline - NOW())) / 3600, 2) as hours_remaining
  FROM payment_batches pb
  WHERE
    pb.status IN ('pending', 'downloaded', 'in_progress') AND
    pb.deadline <= NOW() + (hours_before || ' hours')::INTERVAL AND
    pb.deadline > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-approve expired batches
CREATE OR REPLACE FUNCTION auto_approve_expired_batches()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE payment_batches
  SET
    status = 'auto_approved',
    notes = COALESCE(notes || ' | ', '') || 'Auto-approved due to deadline expiration at ' || NOW()
  WHERE
    status IN ('pending', 'downloaded', 'in_progress') AND
    deadline <= NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE payment_batches IS 'Weekly payment batches sent by admin to businesses for transaction verification';
COMMENT ON COLUMN payment_batches.status IS 'Current status of the verification batch workflow';
COMMENT ON COLUMN payment_batches.deadline IS 'Deadline for business to complete verification (7 days from creation)';
COMMENT ON COLUMN payment_batches.file_path IS 'Supabase Storage path to the CSV file containing transaction data';
COMMENT ON FUNCTION get_batches_approaching_deadline IS 'Returns batches that are approaching their deadline for reminder notifications';
COMMENT ON FUNCTION auto_approve_expired_batches IS 'Automatically approves batches that have passed their deadline';

-- Grant permissions
GRANT SELECT ON payment_batches TO authenticated;
GRANT EXECUTE ON FUNCTION get_batches_approaching_deadline TO authenticated;
GRANT EXECUTE ON FUNCTION auto_approve_expired_batches TO service_role;