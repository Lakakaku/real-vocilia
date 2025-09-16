-- Migration 002: Store Code Generation System Enhancements
-- Adds store code generation, rotation, and rate limiting capabilities

-- Add new columns to stores table for enhanced functionality
ALTER TABLE stores ADD COLUMN IF NOT EXISTS previous_store_codes JSONB DEFAULT '[]';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS code_rotated_at TIMESTAMPTZ;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS location_validated BOOLEAN DEFAULT false;

-- Create feedback_rate_limits table for phone number rate limiting
CREATE TABLE IF NOT EXISTS feedback_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  feedback_date DATE NOT NULL,
  feedback_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone_number, store_id, feedback_date)
);

-- Indexes for feedback_rate_limits
CREATE INDEX IF NOT EXISTS idx_feedback_rate_limits_phone_store_date 
  ON feedback_rate_limits(phone_number, store_id, feedback_date);
CREATE INDEX IF NOT EXISTS idx_feedback_rate_limits_created_at 
  ON feedback_rate_limits(created_at);

-- Enhanced generate_store_code function with better uniqueness
CREATE OR REPLACE FUNCTION generate_store_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  new_code VARCHAR(6);
  code_exists BOOLEAN;
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i INTEGER;
  attempts INTEGER := 0;
  max_attempts INTEGER := 1000;
BEGIN
  LOOP
    new_code := '';
    
    -- Generate 6-character code using uppercase letters and numbers
    FOR i IN 1..6 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars))::int + 1, 1);
    END LOOP;
    
    -- Check if code already exists in stores table
    SELECT EXISTS(SELECT 1 FROM stores WHERE store_code = new_code)
    INTO code_exists;
    
    attempts := attempts + 1;
    
    -- Exit if unique code found or max attempts reached
    EXIT WHEN NOT code_exists OR attempts >= max_attempts;
  END LOOP;
  
  -- If we couldn't generate a unique code, raise an exception
  IF code_exists THEN
    RAISE EXCEPTION 'Unable to generate unique store code after % attempts', max_attempts;
  END IF;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to rotate store code
CREATE OR REPLACE FUNCTION rotate_store_code(store_uuid UUID)
RETURNS VARCHAR(6) AS $$
DECLARE
  old_code VARCHAR(6);
  new_code VARCHAR(6);
  previous_codes JSONB;
BEGIN
  -- Get current store code and previous codes
  SELECT store_code, previous_store_codes 
  INTO old_code, previous_codes
  FROM stores 
  WHERE id = store_uuid;
  
  IF old_code IS NULL THEN
    RAISE EXCEPTION 'Store not found';
  END IF;
  
  -- Generate new unique code
  new_code := generate_store_code();
  
  -- Update previous_codes array to include old code
  IF previous_codes IS NULL THEN
    previous_codes := '[]'::jsonb;
  END IF;
  
  previous_codes := previous_codes || jsonb_build_array(
    jsonb_build_object(
      'code', old_code,
      'rotated_at', NOW()
    )
  );
  
  -- Update store with new code and history
  UPDATE stores 
  SET 
    store_code = new_code,
    previous_store_codes = previous_codes,
    code_rotated_at = NOW(),
    updated_at = NOW()
  WHERE id = store_uuid;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limit for feedback submissions
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_phone_number VARCHAR(20),
  p_store_id UUID,
  p_max_per_day INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  today_date DATE;
BEGIN
  today_date := CURRENT_DATE;
  
  -- Get current feedback count for today
  SELECT COALESCE(feedback_count, 0)
  INTO current_count
  FROM feedback_rate_limits
  WHERE phone_number = p_phone_number
    AND store_id = p_store_id
    AND feedback_date = today_date;
  
  -- Return true if under limit, false if at or over limit
  RETURN COALESCE(current_count, 0) < p_max_per_day;
END;
$$ LANGUAGE plpgsql;

-- Function to increment rate limit counter
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_phone_number VARCHAR(20),
  p_store_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
  today_date DATE;
BEGIN
  today_date := CURRENT_DATE;
  
  -- Insert or update rate limit record
  INSERT INTO feedback_rate_limits (phone_number, store_id, feedback_date, feedback_count)
  VALUES (p_phone_number, p_store_id, today_date, 1)
  ON CONFLICT (phone_number, store_id, feedback_date)
  DO UPDATE SET 
    feedback_count = feedback_rate_limits.feedback_count + 1,
    updated_at = NOW()
  RETURNING feedback_count INTO current_count;
  
  RETURN current_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get store by code (including historical codes)
CREATE OR REPLACE FUNCTION get_store_by_code(p_store_code VARCHAR(6))
RETURNS TABLE(
  store_id UUID,
  business_id UUID,
  name VARCHAR(255),
  current_code VARCHAR(6),
  is_current_code BOOLEAN,
  is_active BOOLEAN
) AS $$
BEGIN
  -- First check current codes
  RETURN QUERY
  SELECT 
    s.id as store_id,
    s.business_id,
    s.name,
    s.store_code as current_code,
    true as is_current_code,
    s.is_active
  FROM stores s
  WHERE s.store_code = p_store_code
    AND s.is_active = true;
  
  -- If no current code found, check historical codes
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      s.id as store_id,
      s.business_id,
      s.name,
      s.store_code as current_code,
      false as is_current_code,
      s.is_active
    FROM stores s,
         jsonb_array_elements(s.previous_store_codes) as prev_code
    WHERE prev_code->>'code' = p_store_code
      AND s.is_active = true;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to validate Swedish postal code format
CREATE OR REPLACE FUNCTION validate_swedish_postal_code(postal_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Swedish postal codes are 5 digits with optional space after 3rd digit
  -- Examples: 11251, 112 51
  RETURN postal_code ~ '^[0-9]{3}\s?[0-9]{2}$';
END;
$$ LANGUAGE plpgsql;

-- Add trigger for auto-updating timestamps on feedback_rate_limits
CREATE TRIGGER update_feedback_rate_limits_updated_at 
  BEFORE UPDATE ON feedback_rate_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for feedback_rate_limits
ALTER TABLE feedback_rate_limits ENABLE ROW LEVEL SECURITY;

-- Businesses can view rate limits for their stores
CREATE POLICY "Businesses can view own store rate limits" ON feedback_rate_limits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = feedback_rate_limits.store_id
      AND stores.business_id = auth.uid()
    )
  );

-- Allow inserts for rate limiting (needed for feedback submission)
CREATE POLICY "Allow rate limit inserts" ON feedback_rate_limits
  FOR INSERT WITH CHECK (true);

-- Allow updates for rate limiting
CREATE POLICY "Allow rate limit updates" ON feedback_rate_limits
  FOR UPDATE USING (true);

-- Admins have full access to rate limits
CREATE POLICY "Admins have full access to rate limits" ON feedback_rate_limits
  FOR ALL USING (is_admin());

-- Create index for faster lookups on store codes including historical
CREATE INDEX IF NOT EXISTS idx_stores_previous_codes 
  ON stores USING gin(previous_store_codes);

-- Create materialized view for store code lookup optimization
CREATE MATERIALIZED VIEW IF NOT EXISTS store_code_lookup AS
SELECT 
  s.id as store_id,
  s.business_id,
  s.name,
  s.store_code as code,
  true as is_current,
  s.is_active,
  s.created_at
FROM stores s
WHERE s.is_active = true

UNION ALL

SELECT 
  s.id as store_id,
  s.business_id,
  s.name,
  (prev_code->>'code')::VARCHAR(6) as code,
  false as is_current,
  s.is_active,
  (prev_code->>'rotated_at')::TIMESTAMPTZ as created_at
FROM stores s,
     jsonb_array_elements(s.previous_store_codes) as prev_code
WHERE s.is_active = true;

-- Create unique index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_code_lookup_code_current 
  ON store_code_lookup(code, is_current);

-- Create index for business lookups
CREATE INDEX IF NOT EXISTS idx_store_code_lookup_business 
  ON store_code_lookup(business_id);

-- Function to refresh store code lookup materialized view
CREATE OR REPLACE FUNCTION refresh_store_code_lookup()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY store_code_lookup;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh materialized view when stores are updated
CREATE OR REPLACE FUNCTION trigger_refresh_store_code_lookup()
RETURNS trigger AS $$
BEGIN
  -- Use pg_notify to trigger async refresh
  PERFORM pg_notify('refresh_store_lookup', '');
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_store_code_lookup_trigger
  AFTER INSERT OR UPDATE OR DELETE ON stores
  FOR EACH ROW EXECUTE FUNCTION trigger_refresh_store_code_lookup();

-- Initial refresh of materialized view
SELECT refresh_store_code_lookup();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON store_code_lookup TO authenticated;
GRANT EXECUTE ON FUNCTION generate_store_code() TO authenticated;
GRANT EXECUTE ON FUNCTION rotate_store_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(VARCHAR(20), UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_rate_limit(VARCHAR(20), UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_store_by_code(VARCHAR(6)) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_swedish_postal_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_store_code_lookup() TO authenticated;

-- Comments for documentation
COMMENT ON TABLE feedback_rate_limits IS 'Rate limiting table to prevent spam feedback submissions';
COMMENT ON FUNCTION generate_store_code() IS 'Generates unique 6-character alphanumeric store codes';
COMMENT ON FUNCTION rotate_store_code(UUID) IS 'Rotates store code and preserves history';
COMMENT ON FUNCTION check_rate_limit(VARCHAR(20), UUID, INTEGER) IS 'Checks if phone number is under rate limit for store';
COMMENT ON FUNCTION increment_rate_limit(VARCHAR(20), UUID) IS 'Increments rate limit counter for phone/store combination';
COMMENT ON FUNCTION get_store_by_code(VARCHAR(6)) IS 'Retrieves store information by code, including historical codes';
COMMENT ON MATERIALIZED VIEW store_code_lookup IS 'Optimized lookup for all store codes including historical ones';