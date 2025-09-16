-- Migration: Ensure optimal indexes for store code validation performance
-- Created: 2025-09-16
-- Purpose: Verify and create indexes for fast store code lookup and rate limiting

-- Ensure unique index on stores.store_code (critical for O(1) lookup)
CREATE UNIQUE INDEX IF NOT EXISTS idx_stores_store_code
  ON stores(store_code);

-- Ensure index on stores.is_active for filtering active stores
CREATE INDEX IF NOT EXISTS idx_stores_is_active
  ON stores(is_active)
  WHERE is_active = true;

-- Compound index for business stores lookup (if business_users table exists)
CREATE INDEX IF NOT EXISTS idx_stores_business_active
  ON stores(business_id, is_active)
  WHERE is_active = true;

-- Additional validation table indexes (already created in 004 but ensuring they exist)
CREATE INDEX IF NOT EXISTS idx_validations_ip_timestamp
  ON store_code_validations(ip_address, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_validations_store_id
  ON store_code_validations(store_id)
  WHERE store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_validations_attempted_at
  ON store_code_validations(attempted_at DESC);

-- Index for rate limiting queries (last N minutes per IP)
CREATE INDEX IF NOT EXISTS idx_validations_rate_limiting
  ON store_code_validations(ip_address, attempted_at)
  WHERE attempted_at > NOW() - INTERVAL '1 hour';

-- Partial index for failed attempts (for security monitoring)
CREATE INDEX IF NOT EXISTS idx_validations_failed_attempts
  ON store_code_validations(ip_address, attempted_at DESC)
  WHERE is_valid = false;

-- Index for cleanup operations (error type analysis)
CREATE INDEX IF NOT EXISTS idx_validations_error_type
  ON store_code_validations(error_type, attempted_at DESC)
  WHERE error_type IS NOT NULL;

-- Analyze tables for query optimization
ANALYZE stores;
ANALYZE store_code_validations;

-- Create helper function to check rate limiting
CREATE OR REPLACE FUNCTION check_rate_limit(client_ip INET, window_minutes INTEGER DEFAULT 1, max_attempts INTEGER DEFAULT 5)
RETURNS BOOLEAN AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO attempt_count
  FROM store_code_validations
  WHERE ip_address = client_ip
    AND attempted_at > NOW() - (window_minutes || ' minutes')::INTERVAL;

  RETURN attempt_count < max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on rate limit function
GRANT EXECUTE ON FUNCTION check_rate_limit(INET, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION check_rate_limit(INET, INTEGER, INTEGER) TO authenticated;

-- Log performance information
DO $$
BEGIN
  RAISE NOTICE 'Store code validation indexes created successfully';
  RAISE NOTICE 'Performance optimizations:';
  RAISE NOTICE '- O(1) store code lookup via unique index';
  RAISE NOTICE '- Rate limiting queries optimized with compound index';
  RAISE NOTICE '- Partial indexes for failed attempts and cleanup';
END $$;