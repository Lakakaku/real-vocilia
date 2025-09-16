-- Migration: Row Level Security policies for store code validation
-- Created: 2025-09-16
-- Purpose: Secure access to stores and validation tracking tables

-- Enable RLS on store_code_validations table
ALTER TABLE store_code_validations ENABLE ROW LEVEL SECURITY;

-- Policy: Public can insert validation attempts (for logging)
CREATE POLICY "Public can insert validation attempts"
  ON store_code_validations FOR INSERT
  WITH CHECK (true);

-- Policy: Service role can read all validations (for admin monitoring)
CREATE POLICY "Service role can read all validations"
  ON store_code_validations FOR SELECT
  USING (auth.role() = 'service_role');

-- Policy: Authenticated users can read their own validation attempts
CREATE POLICY "Users can read own validation attempts"
  ON store_code_validations FOR SELECT
  USING (ip_address = inet_client_addr());

-- Update stores table RLS policies for public code validation
-- Note: This assumes stores table already exists and has RLS enabled

-- Policy: Public can read active store codes only (for validation)
DROP POLICY IF EXISTS "Public can read active store codes" ON stores;
CREATE POLICY "Public can read active store codes"
  ON stores FOR SELECT
  USING (is_active = true);

-- Policy: Authenticated users can read stores for their business
-- (Preserve existing business access if exists)
DROP POLICY IF EXISTS "Users can read own business stores" ON stores;
CREATE POLICY "Users can read own business stores"
  ON stores FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    business_id IN (
      SELECT business_id FROM business_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Service role has full access to stores
CREATE POLICY "Service role has full access to stores"
  ON stores FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grant necessary permissions for anonymous users (for public validation)
GRANT SELECT ON stores TO anon;
GRANT INSERT ON store_code_validations TO anon;

-- Grant permissions for authenticated users
GRANT SELECT ON stores TO authenticated;
GRANT SELECT, INSERT ON store_code_validations TO authenticated;

-- Create function to safely validate store codes (for API endpoint)
CREATE OR REPLACE FUNCTION validate_store_code(code TEXT)
RETURNS JSON AS $$
DECLARE
  store_record stores%ROWTYPE;
  result JSON;
BEGIN
  -- Validate input format
  IF code !~ '^[0-9]{6}$' THEN
    RETURN JSON_BUILD_OBJECT(
      'valid', false,
      'error', 'INVALID_FORMAT',
      'message', 'Please enter exactly 6 digits'
    );
  END IF;

  -- Look up store
  SELECT * INTO store_record
  FROM stores
  WHERE store_code = code AND is_active = true;

  IF FOUND THEN
    RETURN JSON_BUILD_OBJECT(
      'valid', true,
      'store_id', store_record.id,
      'redirect_url', 'https://vocilia.com/feedback/' || code
    );
  ELSE
    RETURN JSON_BUILD_OBJECT(
      'valid', false,
      'error', 'NOT_FOUND',
      'message', 'This code is not recognized. Please check and try again'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on validation function
GRANT EXECUTE ON FUNCTION validate_store_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION validate_store_code(TEXT) TO authenticated;