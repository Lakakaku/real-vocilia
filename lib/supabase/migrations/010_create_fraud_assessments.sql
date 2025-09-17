-- Payment Verification System: Fraud Assessments Table
-- AI-generated fraud detection analysis for transactions

-- Custom enums for fraud assessment
CREATE TYPE risk_level_type AS ENUM (
  'low',    -- 0-30
  'medium', -- 31-60
  'high'    -- 61-100
);

CREATE TYPE ai_recommendation_type AS ENUM (
  'approve',
  'review',
  'reject'
);

-- Fraud assessments table
CREATE TABLE fraud_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL CHECK (transaction_id ~ '^VCL-\d+$'),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Risk scoring
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level risk_level_type NOT NULL,
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),

  -- AI recommendation
  recommendation ai_recommendation_type NOT NULL,
  reasoning TEXT[] NOT NULL CHECK (array_length(reasoning, 1) > 0),
  risk_factors JSONB,

  -- Assessment metadata
  model_version TEXT DEFAULT 'gpt-4o-mini-v1',
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  assessment_duration_ms INTEGER,

  -- Context used for assessment
  business_context_version INTEGER DEFAULT 1,
  fraud_patterns_version INTEGER DEFAULT 1,

  -- Transaction context (cached for assessment)
  transaction_amount DECIMAL(10,2),
  transaction_date TIMESTAMPTZ,
  store_code TEXT,
  quality_score INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(transaction_id, business_id),

  -- Ensure risk_score matches risk_level
  CONSTRAINT risk_score_level_consistency CHECK (
    (risk_level = 'low' AND risk_score <= 30) OR
    (risk_level = 'medium' AND risk_score >= 31 AND risk_score <= 60) OR
    (risk_level = 'high' AND risk_score >= 61)
  )
);

-- Performance indexes
CREATE INDEX idx_fraud_assessments_transaction ON fraud_assessments(transaction_id, business_id);
CREATE INDEX idx_fraud_assessments_business_risk ON fraud_assessments(business_id, risk_level, assessed_at DESC);
CREATE INDEX idx_fraud_assessments_risk_score ON fraud_assessments(risk_score DESC);
CREATE INDEX idx_fraud_assessments_recommendation ON fraud_assessments(recommendation, assessed_at DESC);
CREATE INDEX idx_fraud_assessments_date ON fraud_assessments(assessed_at DESC);

-- GIN index for risk_factors JSONB queries
CREATE INDEX idx_fraud_assessments_risk_factors ON fraud_assessments USING gin(risk_factors);

-- Row Level Security
ALTER TABLE fraud_assessments ENABLE ROW LEVEL SECURITY;

-- Businesses can view assessments for their transactions
CREATE POLICY "Businesses can view own fraud assessments"
  ON fraud_assessments FOR SELECT
  USING (business_id = auth.uid());

-- System can create and update assessments
CREATE POLICY "System can manage fraud assessments"
  ON fraud_assessments FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Function to create fraud assessment
CREATE OR REPLACE FUNCTION create_fraud_assessment(
  p_transaction_id TEXT,
  p_business_id UUID,
  p_risk_score INTEGER,
  p_confidence DECIMAL,
  p_reasoning TEXT[],
  p_risk_factors JSONB DEFAULT NULL,
  p_transaction_amount DECIMAL DEFAULT NULL,
  p_transaction_date TIMESTAMPTZ DEFAULT NULL,
  p_store_code TEXT DEFAULT NULL,
  p_quality_score INTEGER DEFAULT NULL,
  p_assessment_duration_ms INTEGER DEFAULT NULL
)
RETURNS fraud_assessments AS $$
DECLARE
  assessment_record fraud_assessments;
  calculated_risk_level risk_level_type;
  calculated_recommendation ai_recommendation_type;
BEGIN
  -- Calculate risk level based on score
  IF p_risk_score <= 30 THEN
    calculated_risk_level := 'low';
  ELSIF p_risk_score <= 60 THEN
    calculated_risk_level := 'medium';
  ELSE
    calculated_risk_level := 'high';
  END IF;

  -- Calculate recommendation based on risk level
  IF calculated_risk_level = 'low' THEN
    calculated_recommendation := 'approve';
  ELSIF calculated_risk_level = 'medium' THEN
    calculated_recommendation := 'review';
  ELSE
    calculated_recommendation := 'reject';
  END IF;

  -- Insert fraud assessment
  INSERT INTO fraud_assessments (
    transaction_id,
    business_id,
    risk_score,
    risk_level,
    confidence,
    recommendation,
    reasoning,
    risk_factors,
    transaction_amount,
    transaction_date,
    store_code,
    quality_score,
    assessment_duration_ms
  ) VALUES (
    p_transaction_id,
    p_business_id,
    p_risk_score,
    calculated_risk_level,
    p_confidence,
    calculated_recommendation,
    p_reasoning,
    p_risk_factors,
    p_transaction_amount,
    p_transaction_date,
    p_store_code,
    p_quality_score,
    p_assessment_duration_ms
  )
  ON CONFLICT (transaction_id, business_id)
  DO UPDATE SET
    risk_score = EXCLUDED.risk_score,
    risk_level = EXCLUDED.risk_level,
    confidence = EXCLUDED.confidence,
    recommendation = EXCLUDED.recommendation,
    reasoning = EXCLUDED.reasoning,
    risk_factors = EXCLUDED.risk_factors,
    assessed_at = NOW()
  RETURNING * INTO assessment_record;

  RETURN assessment_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get fraud statistics for a business
CREATE OR REPLACE FUNCTION get_fraud_statistics(
  p_business_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_assessments BIGINT,
  high_risk_count BIGINT,
  medium_risk_count BIGINT,
  low_risk_count BIGINT,
  avg_risk_score NUMERIC,
  avg_confidence NUMERIC,
  recommendation_breakdown JSONB,
  top_risk_factors JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_assessments,
    COUNT(*) FILTER (WHERE risk_level = 'high') as high_risk_count,
    COUNT(*) FILTER (WHERE risk_level = 'medium') as medium_risk_count,
    COUNT(*) FILTER (WHERE risk_level = 'low') as low_risk_count,
    ROUND(AVG(risk_score), 2) as avg_risk_score,
    ROUND(AVG(confidence), 3) as avg_confidence,
    jsonb_object_agg(recommendation, rec_count) as recommendation_breakdown,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'factor', factor_name,
          'count', factor_count,
          'avg_impact', avg_impact
        )
      )
      FROM (
        SELECT
          factor_key as factor_name,
          COUNT(*) as factor_count,
          ROUND(AVG((factor_value->>'score')::numeric), 2) as avg_impact
        FROM fraud_assessments fa,
             jsonb_each(fa.risk_factors) as factor(factor_key, factor_value)
        WHERE fa.business_id = p_business_id
          AND fa.assessed_at >= p_start_date
          AND fa.assessed_at <= p_end_date
          AND factor_value ? 'score'
        GROUP BY factor_key
        ORDER BY factor_count DESC
        LIMIT 10
      ) top_factors
    ) as top_risk_factors
  FROM fraud_assessments fa
  LEFT JOIN (
    SELECT
      recommendation,
      COUNT(*) as rec_count
    FROM fraud_assessments
    WHERE business_id = p_business_id
      AND assessed_at >= p_start_date
      AND assessed_at <= p_end_date
    GROUP BY recommendation
  ) rec_counts ON TRUE
  WHERE fa.business_id = p_business_id
    AND fa.assessed_at >= p_start_date
    AND fa.assessed_at <= p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get high-risk transactions for review
CREATE OR REPLACE FUNCTION get_high_risk_transactions(
  p_business_id UUID DEFAULT NULL,
  p_min_risk_score INTEGER DEFAULT 61,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  transaction_id TEXT,
  business_id UUID,
  risk_score INTEGER,
  risk_level risk_level_type,
  recommendation ai_recommendation_type,
  reasoning TEXT[],
  transaction_amount DECIMAL,
  transaction_date TIMESTAMPTZ,
  assessed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fa.transaction_id,
    fa.business_id,
    fa.risk_score,
    fa.risk_level,
    fa.recommendation,
    fa.reasoning,
    fa.transaction_amount,
    fa.transaction_date,
    fa.assessed_at
  FROM fraud_assessments fa
  WHERE
    (p_business_id IS NULL OR fa.business_id = p_business_id) AND
    fa.risk_score >= p_min_risk_score
  ORDER BY fa.risk_score DESC, fa.assessed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update verification results with fraud assessment reference
CREATE OR REPLACE FUNCTION link_fraud_assessment_to_result()
RETURNS TRIGGER AS $$
BEGIN
  -- When a verification result is created, try to link it to existing fraud assessment
  IF TG_OP = 'INSERT' THEN
    UPDATE verification_results
    SET fraud_assessment_id = fa.id
    FROM fraud_assessments fa
    WHERE verification_results.id = NEW.id
      AND fa.transaction_id = NEW.transaction_id
      AND fa.business_id = (
        SELECT business_id
        FROM verification_sessions
        WHERE id = NEW.verification_session_id
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add foreign key reference to verification_results (after both tables exist)
-- This will be added later when verification_results references are set up

-- Comments for documentation
COMMENT ON TABLE fraud_assessments IS 'AI-generated fraud detection analysis for payment verification transactions';
COMMENT ON COLUMN fraud_assessments.risk_score IS 'Fraud risk score from 0-100 (0=no risk, 100=high fraud risk)';
COMMENT ON COLUMN fraud_assessments.confidence IS 'AI confidence level in assessment (0-1)';
COMMENT ON COLUMN fraud_assessments.reasoning IS 'Array of human-readable reasons for the risk assessment';
COMMENT ON COLUMN fraud_assessments.risk_factors IS 'Structured JSON of risk factors and their scores';
COMMENT ON FUNCTION create_fraud_assessment IS 'Creates or updates a fraud assessment for a transaction';
COMMENT ON FUNCTION get_fraud_statistics IS 'Returns fraud detection statistics for a business over a time period';
COMMENT ON FUNCTION get_high_risk_transactions IS 'Returns transactions with high fraud risk scores for review';

-- Grant permissions
GRANT SELECT ON fraud_assessments TO authenticated;
GRANT EXECUTE ON FUNCTION create_fraud_assessment TO service_role;
GRANT EXECUTE ON FUNCTION get_fraud_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_high_risk_transactions TO authenticated;