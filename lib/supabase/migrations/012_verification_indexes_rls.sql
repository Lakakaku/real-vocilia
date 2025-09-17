-- Payment Verification System: Additional Indexes and RLS Policies
-- Performance optimization and security hardening for verification system

-- =============================================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- =============================================================================

-- Composite indexes for complex queries
CREATE INDEX idx_payment_batches_business_status_deadline
  ON payment_batches(business_id, status, deadline)
  WHERE status IN ('pending', 'downloaded', 'in_progress');

CREATE INDEX idx_verification_sessions_business_deadline_status
  ON verification_sessions(business_id, deadline, status)
  WHERE status != 'completed';

CREATE INDEX idx_verification_results_session_verified_date
  ON verification_results(verification_session_id, verified, verified_at DESC)
  WHERE verified IS NOT NULL;

-- Fraud assessment indexes for analytics
CREATE INDEX idx_fraud_assessments_business_date_risk
  ON fraud_assessments(business_id, assessed_at DESC, risk_level)
  WHERE risk_level IN ('medium', 'high');

-- Audit log indexes for compliance queries
CREATE INDEX idx_audit_logs_date_event_business
  ON verification_audit_logs(created_at DESC, event_type, business_id);

CREATE INDEX idx_audit_logs_actor_date
  ON verification_audit_logs(actor_type, actor_id, created_at DESC)
  WHERE actor_id IS NOT NULL;

-- =============================================================================
-- CROSS-TABLE FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- Add foreign key reference from verification_results to fraud_assessments
ALTER TABLE verification_results
ADD CONSTRAINT fk_verification_results_fraud_assessment
FOREIGN KEY (fraud_assessment_id) REFERENCES fraud_assessments(id);

-- Create index for the new foreign key
CREATE INDEX idx_verification_results_fraud_assessment
  ON verification_results(fraud_assessment_id);

-- =============================================================================
-- ENHANCED RLS POLICIES
-- =============================================================================

-- Additional security policy for payment batches - prevent unauthorized status changes
CREATE POLICY "Businesses cannot modify completed batches"
  ON payment_batches FOR UPDATE
  USING (
    business_id = auth.uid() AND
    status NOT IN ('completed', 'cancelled', 'auto_approved')
  );

-- Policy to prevent businesses from seeing other businesses' data in joins
CREATE POLICY "Verification sessions strict business isolation"
  ON verification_sessions FOR SELECT
  USING (
    business_id = auth.uid() OR
    auth.jwt() ->> 'role' IN ('service_role', 'admin')
  );

-- Policy to ensure verification results can only be updated by session owner
CREATE POLICY "Verification results update restrictions"
  ON verification_results FOR UPDATE
  USING (
    verification_session_id IN (
      SELECT id FROM verification_sessions
      WHERE business_id = auth.uid() AND status IN ('downloaded', 'in_progress')
    )
  );

-- Policy to prevent fraud assessment tampering
CREATE POLICY "Fraud assessments read-only for businesses"
  ON fraud_assessments FOR UPDATE
  USING (FALSE);

CREATE POLICY "Fraud assessments no delete for businesses"
  ON fraud_assessments FOR DELETE
  USING (FALSE);

-- =============================================================================
-- UTILITY FUNCTIONS FOR PERFORMANCE
-- =============================================================================

-- Function to get verification dashboard summary
CREATE OR REPLACE FUNCTION get_verification_dashboard_summary(p_business_id UUID)
RETURNS TABLE (
  current_batch_id UUID,
  current_session_id UUID,
  batch_status verification_batch_status,
  session_status verification_session_status,
  deadline TIMESTAMPTZ,
  time_remaining_seconds INTEGER,
  total_transactions INTEGER,
  verified_transactions INTEGER,
  high_risk_transactions INTEGER,
  completion_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pb.id as current_batch_id,
    vs.id as current_session_id,
    pb.status as batch_status,
    vs.status as session_status,
    pb.deadline,
    GREATEST(0, EXTRACT(EPOCH FROM (pb.deadline - NOW()))::INTEGER) as time_remaining_seconds,
    pb.total_transactions,
    vs.verified_transactions,
    COALESCE(fraud_stats.high_risk_count, 0)::INTEGER as high_risk_transactions,
    CASE
      WHEN pb.total_transactions = 0 THEN 0
      ELSE ROUND((vs.verified_transactions::NUMERIC / pb.total_transactions) * 100, 2)
    END as completion_percentage
  FROM payment_batches pb
  LEFT JOIN verification_sessions vs ON vs.payment_batch_id = pb.id
  LEFT JOIN (
    SELECT
      pb_inner.id as batch_id,
      COUNT(*) as high_risk_count
    FROM payment_batches pb_inner
    JOIN verification_sessions vs_inner ON vs_inner.payment_batch_id = pb_inner.id
    JOIN verification_results vr ON vr.verification_session_id = vs_inner.id
    JOIN fraud_assessments fa ON fa.transaction_id = vr.transaction_id AND fa.business_id = pb_inner.business_id
    WHERE pb_inner.business_id = p_business_id
      AND fa.risk_level = 'high'
    GROUP BY pb_inner.id
  ) fraud_stats ON fraud_stats.batch_id = pb.id
  WHERE pb.business_id = p_business_id
    AND pb.status IN ('pending', 'downloaded', 'in_progress', 'submitted')
  ORDER BY pb.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get business verification statistics
CREATE OR REPLACE FUNCTION get_business_verification_stats(
  p_business_id UUID,
  p_months_back INTEGER DEFAULT 12
)
RETURNS TABLE (
  total_batches INTEGER,
  completed_batches INTEGER,
  auto_approved_batches INTEGER,
  avg_completion_time_hours NUMERIC,
  total_transactions_verified INTEGER,
  approval_rate_percentage NUMERIC,
  fraud_detection_rate_percentage NUMERIC,
  on_time_completion_rate_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(pb.id)::INTEGER as total_batches,
    COUNT(pb.id) FILTER (WHERE pb.status = 'completed')::INTEGER as completed_batches,
    COUNT(pb.id) FILTER (WHERE pb.status = 'auto_approved')::INTEGER as auto_approved_batches,
    ROUND(AVG(EXTRACT(EPOCH FROM (vs.submitted_at - vs.started_at)) / 3600), 2) as avg_completion_time_hours,
    COALESCE(SUM(vs.verified_transactions), 0)::INTEGER as total_transactions_verified,
    CASE
      WHEN SUM(vs.verified_transactions) = 0 THEN 0
      ELSE ROUND((SUM(vs.approved_count)::NUMERIC / SUM(vs.verified_transactions)) * 100, 2)
    END as approval_rate_percentage,
    CASE
      WHEN SUM(vs.verified_transactions) = 0 THEN 0
      ELSE ROUND((COUNT(fa.id) FILTER (WHERE fa.risk_level = 'high')::NUMERIC / SUM(vs.verified_transactions)) * 100, 2)
    END as fraud_detection_rate_percentage,
    CASE
      WHEN COUNT(pb.id) = 0 THEN 0
      ELSE ROUND((COUNT(pb.id) FILTER (WHERE vs.submitted_at <= pb.deadline)::NUMERIC / COUNT(pb.id)) * 100, 2)
    END as on_time_completion_rate_percentage
  FROM payment_batches pb
  LEFT JOIN verification_sessions vs ON vs.payment_batch_id = pb.id
  LEFT JOIN verification_results vr ON vr.verification_session_id = vs.id
  LEFT JOIN fraud_assessments fa ON fa.transaction_id = vr.transaction_id AND fa.business_id = pb.business_id
  WHERE pb.business_id = p_business_id
    AND pb.created_at >= NOW() - (p_months_back || ' months')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending deadline notifications
CREATE OR REPLACE FUNCTION get_pending_deadline_notifications()
RETURNS TABLE (
  business_id UUID,
  batch_id UUID,
  session_id UUID,
  deadline TIMESTAMPTZ,
  hours_remaining NUMERIC,
  last_reminder_sent TIMESTAMPTZ,
  should_send_reminder BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pb.business_id,
    pb.id as batch_id,
    vs.id as session_id,
    pb.deadline,
    ROUND(EXTRACT(EPOCH FROM (pb.deadline - NOW())) / 3600, 2) as hours_remaining,
    (
      SELECT MAX(unnest_val)
      FROM unnest(vs.reminder_sent_at) as unnest_val
    ) as last_reminder_sent,
    CASE
      WHEN (
        SELECT MAX(unnest_val)
        FROM unnest(vs.reminder_sent_at) as unnest_val
      ) IS NULL THEN TRUE
      WHEN EXTRACT(EPOCH FROM (pb.deadline - NOW())) / 3600 <= 6 AND
           (
             SELECT MAX(unnest_val)
             FROM unnest(vs.reminder_sent_at) as unnest_val
           ) < NOW() - INTERVAL '6 hours' THEN TRUE
      ELSE FALSE
    END as should_send_reminder
  FROM payment_batches pb
  JOIN verification_sessions vs ON vs.payment_batch_id = pb.id
  WHERE pb.status IN ('pending', 'downloaded', 'in_progress')
    AND pb.deadline > NOW()
    AND pb.deadline <= NOW() + INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- MATERIALIZED VIEW FOR ANALYTICS (Optional - for high-traffic systems)
-- =============================================================================

-- Materialized view for business verification metrics (refresh periodically)
CREATE MATERIALIZED VIEW mv_business_verification_metrics AS
SELECT
  pb.business_id,
  DATE_TRUNC('month', pb.created_at) as month,
  COUNT(pb.id) as total_batches,
  COUNT(pb.id) FILTER (WHERE pb.status = 'completed') as completed_batches,
  COUNT(pb.id) FILTER (WHERE pb.status = 'auto_approved') as auto_approved_batches,
  AVG(EXTRACT(EPOCH FROM (vs.submitted_at - vs.started_at)) / 3600) as avg_completion_time_hours,
  SUM(vs.verified_transactions) as total_transactions_verified,
  SUM(vs.approved_count) as total_approved,
  SUM(vs.rejected_count) as total_rejected,
  COUNT(fa.id) FILTER (WHERE fa.risk_level = 'high') as high_risk_transactions
FROM payment_batches pb
LEFT JOIN verification_sessions vs ON vs.payment_batch_id = pb.id
LEFT JOIN verification_results vr ON vr.verification_session_id = vs.id
LEFT JOIN fraud_assessments fa ON fa.transaction_id = vr.transaction_id AND fa.business_id = pb.business_id
WHERE pb.created_at >= NOW() - INTERVAL '24 months'
GROUP BY pb.business_id, DATE_TRUNC('month', pb.created_at);

-- Index for the materialized view
CREATE INDEX idx_mv_business_metrics_business_month
  ON mv_business_verification_metrics(business_id, month DESC);

-- Function to refresh metrics (call this periodically)
CREATE OR REPLACE FUNCTION refresh_verification_metrics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_business_verification_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- AUTOMATED CLEANUP AND MAINTENANCE
-- =============================================================================

-- Function to run daily maintenance tasks
CREATE OR REPLACE FUNCTION run_verification_maintenance()
RETURNS TABLE (
  task TEXT,
  records_affected INTEGER,
  execution_time_ms INTEGER
) AS $$
DECLARE
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
  affected_count INTEGER;
BEGIN
  -- Auto-approve expired batches
  start_time := NOW();
  SELECT auto_approve_expired_batches() INTO affected_count;
  end_time := NOW();

  RETURN QUERY SELECT
    'auto_approve_expired_batches'::TEXT,
    affected_count,
    EXTRACT(EPOCH FROM (end_time - start_time) * 1000)::INTEGER;

  -- Auto-approve expired sessions
  start_time := NOW();
  SELECT auto_approve_expired_sessions() INTO affected_count;
  end_time := NOW();

  RETURN QUERY SELECT
    'auto_approve_expired_sessions'::TEXT,
    affected_count,
    EXTRACT(EPOCH FROM (end_time - start_time) * 1000)::INTEGER;

  -- Clean up old audit logs (keep 2 years)
  start_time := NOW();
  SELECT cleanup_old_audit_logs(730) INTO affected_count;
  end_time := NOW();

  RETURN QUERY SELECT
    'cleanup_old_audit_logs'::TEXT,
    affected_count,
    EXTRACT(EPOCH FROM (end_time - start_time) * 1000)::INTEGER;

  -- Refresh metrics view
  start_time := NOW();
  PERFORM refresh_verification_metrics();
  end_time := NOW();

  RETURN QUERY SELECT
    'refresh_verification_metrics'::TEXT,
    0, -- No records affected count for materialized view refresh
    EXTRACT(EPOCH FROM (end_time - start_time) * 1000)::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS AND GRANTS
-- =============================================================================

-- Comments for documentation
COMMENT ON FUNCTION get_verification_dashboard_summary IS 'Returns comprehensive dashboard summary for business verification interface';
COMMENT ON FUNCTION get_business_verification_stats IS 'Returns historical verification statistics for business analytics';
COMMENT ON FUNCTION get_pending_deadline_notifications IS 'Returns batches that need deadline reminder notifications';
COMMENT ON FUNCTION run_verification_maintenance IS 'Runs daily maintenance tasks including auto-approvals and cleanup';
COMMENT ON MATERIALIZED VIEW mv_business_verification_metrics IS 'Pre-aggregated verification metrics for analytics dashboard';

-- Grant permissions for utility functions
GRANT SELECT ON mv_business_verification_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION get_verification_dashboard_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_verification_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_deadline_notifications TO service_role;
GRANT EXECUTE ON FUNCTION run_verification_maintenance TO service_role;
GRANT EXECUTE ON FUNCTION refresh_verification_metrics TO service_role;

-- =============================================================================
-- FINAL VERIFICATION CONSTRAINTS
-- =============================================================================

-- Ensure verification system referential integrity
DO $$
BEGIN
  -- Verify all necessary tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_batches') THEN
    RAISE EXCEPTION 'payment_batches table not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification_sessions') THEN
    RAISE EXCEPTION 'verification_sessions table not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification_results') THEN
    RAISE EXCEPTION 'verification_results table not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fraud_assessments') THEN
    RAISE EXCEPTION 'fraud_assessments table not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'verification_audit_logs') THEN
    RAISE EXCEPTION 'verification_audit_logs table not found';
  END IF;

  RAISE NOTICE 'Payment verification database schema validation completed successfully';
END
$$;