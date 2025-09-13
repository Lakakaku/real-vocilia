# DATABASE.md - Vocilia Database Architecture

## Critical Notice: Production Database Only
⚠️ **NO TEST DATABASE** - This is the production database from day one ⚠️

All data is real production data. Use minimal test amounts (1-5 SEK) when testing payment flows. Every record created is permanent unless explicitly deleted.

## Supabase Project Configuration

**Project ID:** ervnxnbxsaaeakbvwieh
**URL:** https://ervnxnbxsaaeakbvwieh.supabase.co
**Dashboard:** https://supabase.com/dashboard/project/ervnxnbxsaaeakbvwieh

## Database Schema

### Core Business Tables

#### businesses
Primary table for business accounts.

```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  subscription_status VARCHAR(50) DEFAULT 'trial',
  subscription_ends_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step INTEGER DEFAULT 0,
  business_type VARCHAR(100),
  store_count INTEGER DEFAULT 1,
  avg_transaction_value DECIMAL(10,2),
  expected_feedback_volume VARCHAR(50),
  pos_system VARCHAR(100),
  verification_preference VARCHAR(50) DEFAULT 'simple',
  primary_goals TEXT[],
  quick_context JSONB,
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_businesses_email ON businesses(email);
CREATE INDEX idx_businesses_created_at ON businesses(created_at);
CREATE INDEX idx_businesses_subscription_status ON businesses(subscription_status);
```

#### business_contexts
AI-managed context data for fraud detection and analysis.

```sql
CREATE TABLE business_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  context_data JSONB NOT NULL DEFAULT '{}',
  completeness_score INTEGER DEFAULT 0,
  last_ai_update TIMESTAMPTZ,
  ai_conversation_history JSONB DEFAULT '[]',
  physical_layout JSONB,
  staff_info JSONB,
  products_services JSONB,
  operational_details JSONB,
  customer_patterns JSONB,
  custom_questions JSONB DEFAULT '[]',
  fraud_indicators JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_business_contexts_business_id ON business_contexts(business_id);
CREATE INDEX idx_business_contexts_completeness ON business_contexts(completeness_score);
```

#### stores
Individual store locations with unique codes.

```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  store_code VARCHAR(6) UNIQUE NOT NULL,
  location_address TEXT,
  location_city VARCHAR(100),
  location_region VARCHAR(100),
  location_postal VARCHAR(20),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  qr_code_url TEXT,
  is_active BOOLEAN DEFAULT true,
  operating_hours JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_stores_business_id ON stores(business_id);
CREATE INDEX idx_stores_store_code ON stores(store_code);
CREATE INDEX idx_stores_is_active ON stores(is_active);
```

### Feedback & Quality Tables

#### feedbacks
All customer feedback records with quality scores.

```sql
CREATE TABLE feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  phone_last_four VARCHAR(4) GENERATED ALWAYS AS (RIGHT(phone_number, 4)) STORED,
  transaction_amount DECIMAL(10,2) NOT NULL,
  transaction_time TIMESTAMPTZ NOT NULL,
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  quality_tier VARCHAR(20), -- '3%', '5-8%', '10-12%', '15%'
  reward_percentage DECIMAL(4,2),
  reward_amount DECIMAL(10,2),
  voice_transcript TEXT,
  ai_analysis JSONB,
  sentiment_score INTEGER,
  categories TEXT[],
  key_insights JSONB,
  fraud_risk_score INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_fraudulent BOOLEAN DEFAULT false,
  admin_notes TEXT,
  week_number INTEGER NOT NULL,
  year_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feedbacks_store_id ON feedbacks(store_id);
CREATE INDEX idx_feedbacks_phone_last_four ON feedbacks(phone_last_four);
CREATE INDEX idx_feedbacks_week_year ON feedbacks(week_number, year_number);
CREATE INDEX idx_feedbacks_quality_score ON feedbacks(quality_score);
CREATE INDEX idx_feedbacks_is_verified ON feedbacks(is_verified);
CREATE INDEX idx_feedbacks_created_at ON feedbacks(created_at);
```

#### quality_scores
Detailed breakdown of quality scoring.

```sql
CREATE TABLE quality_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID UNIQUE NOT NULL REFERENCES feedbacks(id) ON DELETE CASCADE,
  legitimacy_score INTEGER NOT NULL,
  depth_score INTEGER NOT NULL,
  constructiveness_score INTEGER NOT NULL,
  specificity_score INTEGER NOT NULL,
  total_score INTEGER NOT NULL,
  scoring_details JSONB,
  context_matches JSONB,
  fraud_indicators JSONB,
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quality_scores_feedback_id ON quality_scores(feedback_id);
CREATE INDEX idx_quality_scores_total_score ON quality_scores(total_score);
```

### Verification & Payment Tables

#### verifications
Weekly verification batches and status tracking.

```sql
CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  year_number INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'pending', 'in_progress', 'uploaded', 'completed', 'auto_approved'
  batch_sent_at TIMESTAMPTZ,
  batch_downloaded_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ NOT NULL,
  uploaded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_items INTEGER,
  approved_items INTEGER,
  rejected_items INTEGER,
  total_amount DECIMAL(10,2),
  verified_csv_url TEXT,
  auto_approved BOOLEAN DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_verifications_business_id ON verifications(business_id);
CREATE INDEX idx_verifications_week_year ON verifications(week_number, year_number);
CREATE INDEX idx_verifications_status ON verifications(status);
CREATE INDEX idx_verifications_deadline ON verifications(deadline);
```

#### verification_items
Individual feedback items within verification batches.

```sql
CREATE TABLE verification_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES verifications(id) ON DELETE CASCADE,
  feedback_id UUID NOT NULL REFERENCES feedbacks(id) ON DELETE CASCADE,
  transaction_id VARCHAR(50),
  transaction_time TIMESTAMPTZ,
  transaction_amount DECIMAL(10,2),
  phone_last_four VARCHAR(4),
  is_verified BOOLEAN,
  verification_status VARCHAR(50), -- 'YES', 'NO-NOT_FOUND', 'NO-FRAUD', etc.
  business_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_verification_items_verification_id ON verification_items(verification_id);
CREATE INDEX idx_verification_items_feedback_id ON verification_items(feedback_id);
```

#### payments
Customer payment records via Swish.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  week_number INTEGER NOT NULL,
  year_number INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  swish_payment_id VARCHAR(100),
  swish_reference VARCHAR(50),
  consolidated_feedback_ids UUID[],
  paid_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payments_phone_number ON payments(phone_number);
CREATE INDEX idx_payments_week_year ON payments(week_number, year_number);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);
```

#### invoices
Business billing records.

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  year_number INTEGER NOT NULL,
  customer_rewards_total DECIMAL(10,2) NOT NULL,
  platform_fee_percentage DECIMAL(4,2) DEFAULT 20.00,
  platform_fee_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'paid', 'overdue'
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  invoice_pdf_url TEXT,
  line_items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_invoices_business_id ON invoices(business_id);
CREATE INDEX idx_invoices_week_year ON invoices(week_number, year_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
```

### Admin & System Tables

#### admin_users
Admin account management (manually created).

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  permissions JSONB DEFAULT '{}',
  two_factor_enabled BOOLEAN DEFAULT true,
  allowed_ips TEXT[],
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_is_active ON admin_users(is_active);
```

#### admin_logs
Complete audit trail for admin actions.

```sql
CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_action ON admin_logs(action);
CREATE INDEX idx_admin_logs_timestamp ON admin_logs(timestamp);
CREATE INDEX idx_admin_logs_entity ON admin_logs(entity_type, entity_id);
```

#### weekly_batches
Track weekly operational cycles.

```sql
CREATE TABLE weekly_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  year_number INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'collecting', 'verification', 'payment', 'completed'
  total_feedbacks INTEGER DEFAULT 0,
  total_businesses INTEGER DEFAULT 0,
  total_rewards DECIMAL(10,2) DEFAULT 0,
  total_platform_fees DECIMAL(10,2) DEFAULT 0,
  batch_released_at TIMESTAMPTZ,
  payments_processed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_number, year_number)
);

-- Indexes
CREATE INDEX idx_weekly_batches_week_year ON weekly_batches(week_number, year_number);
CREATE INDEX idx_weekly_batches_status ON weekly_batches(status);
```

## Row Level Security (RLS) Policies

### Enable RLS on all tables
```sql
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_batches ENABLE ROW LEVEL SECURITY;
```

### Business Access Policies
```sql
-- Businesses can only see their own data
CREATE POLICY "Businesses can view own business" ON businesses
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Businesses can update own business" ON businesses
  FOR UPDATE USING (auth.uid() = id);

-- Business contexts
CREATE POLICY "Businesses can view own context" ON business_contexts
  FOR SELECT USING (business_id = auth.uid());

CREATE POLICY "Businesses can update own context" ON business_contexts
  FOR UPDATE USING (business_id = auth.uid());

-- Stores
CREATE POLICY "Businesses can view own stores" ON stores
  FOR SELECT USING (business_id = auth.uid());

CREATE POLICY "Businesses can manage own stores" ON stores
  FOR ALL USING (business_id = auth.uid());

-- Feedbacks (businesses can view after admin release)
CREATE POLICY "Businesses can view released feedback" ON feedbacks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = feedbacks.store_id
      AND stores.business_id = auth.uid()
    )
    AND is_verified = true
  );

-- Verifications
CREATE POLICY "Businesses can view own verifications" ON verifications
  FOR SELECT USING (business_id = auth.uid());

CREATE POLICY "Businesses can update own verifications" ON verifications
  FOR UPDATE USING (business_id = auth.uid());

-- Invoices
CREATE POLICY "Businesses can view own invoices" ON invoices
  FOR SELECT USING (business_id = auth.uid());
```

### Admin Access Policies
```sql
-- Admins have full access (implement admin check function)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = auth.uid()
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant admin access to all tables
CREATE POLICY "Admins have full access" ON businesses
  FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access" ON business_contexts
  FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access" ON stores
  FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access" ON feedbacks
  FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access" ON verifications
  FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access" ON payments
  FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access" ON invoices
  FOR ALL USING (is_admin());

CREATE POLICY "Admins have full access" ON weekly_batches
  FOR ALL USING (is_admin());
```

## Database Functions & Triggers

### Auto-update timestamps
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_contexts_updated_at BEFORE UPDATE ON business_contexts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verifications_updated_at BEFORE UPDATE ON verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Generate unique store codes
```sql
CREATE OR REPLACE FUNCTION generate_store_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  new_code VARCHAR(6);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 6-character alphanumeric code
    new_code := UPPER(
      SUBSTRING(
        MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT),
        1, 6
      )
    );

    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM stores WHERE store_code = new_code)
    INTO code_exists;

    EXIT WHEN NOT code_exists;
  END LOOP;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql;
```

### Calculate week and year numbers
```sql
CREATE OR REPLACE FUNCTION get_week_year(date_input TIMESTAMPTZ)
RETURNS TABLE(week_number INTEGER, year_number INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(WEEK FROM date_input)::INTEGER,
    EXTRACT(YEAR FROM date_input)::INTEGER;
END;
$$ LANGUAGE plpgsql;
```

### Consolidate payments by phone number
```sql
CREATE OR REPLACE FUNCTION consolidate_weekly_payments(
  p_week_number INTEGER,
  p_year_number INTEGER
)
RETURNS TABLE(
  phone_number VARCHAR(20),
  total_amount DECIMAL(10,2),
  feedback_count INTEGER,
  feedback_ids UUID[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.phone_number,
    SUM(f.reward_amount) as total_amount,
    COUNT(*)::INTEGER as feedback_count,
    ARRAY_AGG(f.id) as feedback_ids
  FROM feedbacks f
  WHERE f.week_number = p_week_number
    AND f.year_number = p_year_number
    AND f.is_verified = true
    AND f.is_fraudulent = false
  GROUP BY f.phone_number
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;
```

## Indexes for Performance

### Additional performance indexes
```sql
-- Frequently queried combinations
CREATE INDEX idx_feedbacks_store_week ON feedbacks(store_id, week_number, year_number);
CREATE INDEX idx_feedbacks_phone_week ON feedbacks(phone_number, week_number, year_number);
CREATE INDEX idx_verifications_business_week ON verifications(business_id, week_number, year_number);
CREATE INDEX idx_payments_phone_week ON payments(phone_number, week_number, year_number);

-- Full-text search indexes
CREATE INDEX idx_feedbacks_transcript_search ON feedbacks USING gin(to_tsvector('swedish', voice_transcript));
CREATE INDEX idx_feedbacks_insights_search ON feedbacks USING gin(ai_analysis);

-- JSON indexes for efficient querying
CREATE INDEX idx_business_contexts_data ON business_contexts USING gin(context_data);
CREATE INDEX idx_stores_metadata ON stores USING gin(metadata);
CREATE INDEX idx_feedbacks_categories ON feedbacks USING gin(categories);
```

## Migration Strategy

### Initial Setup (Migration 001)
```sql
-- Create all tables
-- Apply RLS policies
-- Create functions and triggers
-- Create indexes

-- Seed initial data (if any)
INSERT INTO admin_users (email, name, role)
VALUES ('admin@vocilia.com', 'System Admin', 'super_admin');
```

### Adding Features (Migration 002+)
```sql
-- Example: Adding a new feature
ALTER TABLE businesses
ADD COLUMN feature_flags JSONB DEFAULT '{}';

-- Update RLS policies if needed
-- Add new indexes if needed
```

## Backup & Recovery

### Automated Backups
- **Frequency:** Daily automated backups via Supabase
- **Retention:** 30 days of point-in-time recovery
- **Location:** Supabase managed backups

### Manual Backup Commands
```bash
# Export entire database
pg_dump $DATABASE_URL > vocilia_backup_$(date +%Y%m%d).sql

# Export specific tables
pg_dump $DATABASE_URL -t businesses -t feedbacks > critical_tables_$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < vocilia_backup_20240315.sql
```

## Performance Optimization

### Query Optimization Tips
1. Always use indexes for frequently queried columns
2. Use `EXPLAIN ANALYZE` for slow queries
3. Partition large tables by week/year if needed
4. Use materialized views for complex analytics
5. Implement connection pooling via Supabase

### Monitoring Queries
```sql
-- Find slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 20;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan;

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Security Considerations

### Data Encryption
- All data encrypted at rest via Supabase
- SSL/TLS for all connections
- Sensitive fields (phone numbers) partially masked in UI

### Access Control
- Row Level Security on all tables
- Role-based access (business, admin)
- API key rotation every 90 days
- Audit logging for all admin actions

### GDPR Compliance
- Personal data deletion capabilities
- Data export functionality
- Consent tracking
- Privacy policy enforcement

## Maintenance Tasks

### Weekly Tasks
```sql
-- Clean up old verification attempts
DELETE FROM verifications
WHERE status = 'pending'
AND created_at < NOW() - INTERVAL '30 days';

-- Archive old feedback
-- (Consider moving to cold storage after 1 year)

-- Vacuum and analyze tables
VACUUM ANALYZE feedbacks;
VACUUM ANALYZE payments;
```

### Monthly Tasks
```sql
-- Reindex for performance
REINDEX TABLE feedbacks;
REINDEX TABLE payments;

-- Update statistics
ANALYZE;

-- Check for unused indexes
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelname NOT LIKE 'pg_toast%';
```

## Emergency Procedures

### Database Recovery
1. Stop all write operations
2. Assess damage/corruption
3. Restore from latest backup
4. Replay transaction logs if available
5. Verify data integrity
6. Resume operations

### Performance Issues
1. Check active queries: `SELECT * FROM pg_stat_activity;`
2. Kill long-running queries if needed
3. Check connection count
4. Review recent deployments
5. Scale up if necessary via Supabase dashboard

### Data Corruption
1. Identify affected tables
2. Stop writes to affected tables
3. Export clean data
4. Rebuild affected tables
5. Restore clean data
6. Verify integrity

## Contact & Support

**Database Issues:** Contact Supabase support
**Schema Changes:** Require admin approval
**Performance Tuning:** DevOps team responsibility
**Security Concerns:** Immediate escalation required