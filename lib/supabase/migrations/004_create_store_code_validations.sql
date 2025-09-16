-- Migration: Create store_code_validations table for audit logging
-- Created: 2025-09-16
-- Purpose: Track validation attempts for security monitoring and rate limiting

-- Create store_code_validations table
CREATE TABLE IF NOT EXISTS store_code_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_code_attempt VARCHAR(10) NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  is_valid BOOLEAN NOT NULL,
  store_id UUID REFERENCES stores(id),
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  error_type VARCHAR(20)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_validations_ip_timestamp
  ON store_code_validations(ip_address, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_validations_store_id
  ON store_code_validations(store_id)
  WHERE store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_validations_attempted_at
  ON store_code_validations(attempted_at DESC);

-- Add comments for documentation
COMMENT ON TABLE store_code_validations IS 'Tracks all store code validation attempts for security monitoring and rate limiting';
COMMENT ON COLUMN store_code_validations.store_code_attempt IS 'The 6-digit code that was attempted (may be invalid)';
COMMENT ON COLUMN store_code_validations.ip_address IS 'Client IP address for rate limiting';
COMMENT ON COLUMN store_code_validations.user_agent IS 'Browser user agent for analytics';
COMMENT ON COLUMN store_code_validations.is_valid IS 'Whether the attempted code was valid';
COMMENT ON COLUMN store_code_validations.store_id IS 'Reference to stores table if code was valid';
COMMENT ON COLUMN store_code_validations.error_type IS 'Type of error: invalid_format, not_found, inactive, rate_limited';

-- Set up automatic cleanup (retain for 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_validation_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM store_code_validations
  WHERE attempted_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;