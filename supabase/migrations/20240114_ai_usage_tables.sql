-- AI Usage Tracking Tables for GPT-4o-mini Integration
-- Production database - Handle with care

-- Table for tracking daily AI usage per business
CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  requests INTEGER DEFAULT 0,
  tokens INTEGER DEFAULT 0,
  cost DECIMAL(10,4) DEFAULT 0, -- Cost in SEK
  last_request_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one record per business per day
  UNIQUE(business_id, date)
);

-- Table for recent request tracking (for burst limiting)
CREATE TABLE IF NOT EXISTS ai_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_ai_usage_business_date ON ai_usage(business_id, date);
CREATE INDEX idx_ai_usage_date ON ai_usage(date);
CREATE INDEX idx_ai_request_log_business_created ON ai_request_log(business_id, created_at);

-- Row Level Security for ai_usage
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can view their own AI usage"
  ON ai_usage FOR SELECT
  USING (business_id = auth.uid());

CREATE POLICY "System can insert AI usage"
  ON ai_usage FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update AI usage"
  ON ai_usage FOR UPDATE
  USING (true);

-- Row Level Security for ai_request_log
ALTER TABLE ai_request_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can view their own request logs"
  ON ai_request_log FOR SELECT
  USING (business_id = auth.uid());

CREATE POLICY "System can manage request logs"
  ON ai_request_log FOR ALL
  USING (true);

-- Function to clean up old request logs (older than 1 minute)
CREATE OR REPLACE FUNCTION cleanup_old_request_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM ai_request_log
  WHERE created_at < NOW() - INTERVAL '1 minute';
END;
$$;

-- Function to get current usage stats
CREATE OR REPLACE FUNCTION get_ai_usage_stats(p_business_id UUID)
RETURNS TABLE(
  requests_today INTEGER,
  tokens_today INTEGER,
  cost_this_month DECIMAL,
  last_request_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(u.requests, 0) as requests_today,
    COALESCE(u.tokens, 0) as tokens_today,
    COALESCE(SUM(m.cost), 0) as cost_this_month,
    u.last_request_at
  FROM
    (SELECT * FROM ai_usage
     WHERE business_id = p_business_id
     AND date = CURRENT_DATE) u
  LEFT JOIN
    ai_usage m ON m.business_id = p_business_id
    AND m.date >= DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY u.requests, u.tokens, u.last_request_at;
END;
$$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_usage_updated_at
  BEFORE UPDATE ON ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT ON ai_usage TO authenticated;
GRANT SELECT ON ai_request_log TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_usage_stats TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_request_logs TO service_role;

-- Add comment for documentation
COMMENT ON TABLE ai_usage IS 'Tracks daily AI API usage per business for cost control and rate limiting';
COMMENT ON TABLE ai_request_log IS 'Tracks recent AI requests for burst rate limiting (1 minute window)';
COMMENT ON FUNCTION get_ai_usage_stats IS 'Returns current AI usage statistics for a business';
COMMENT ON FUNCTION cleanup_old_request_logs IS 'Removes request logs older than 1 minute for burst limiting';