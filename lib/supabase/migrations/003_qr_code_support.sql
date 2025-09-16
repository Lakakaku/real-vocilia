-- Migration 003: Add QR Code Support
-- Date: 2025-09-16
-- Description: Adds support for QR code generation, templates, and tracking

-- Add new fields to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS qr_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS qr_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS qr_logo_enabled BOOLEAN DEFAULT true;

-- Create qr_templates table
CREATE TABLE IF NOT EXISTS qr_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  width_cm DECIMAL(5,2) NOT NULL,
  height_cm DECIMAL(5,2) NOT NULL,
  qr_size_px INTEGER NOT NULL,
  dpi INTEGER DEFAULT 300,
  padding_px INTEGER DEFAULT 20,
  font_size_code INTEGER NOT NULL,
  font_size_instructions INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create qr_download_history table
CREATE TABLE IF NOT EXISTS qr_download_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES qr_templates(id),
  format VARCHAR(10) NOT NULL CHECK (format IN ('PDF', 'PNG', 'SVG')),
  file_url TEXT,
  file_size_kb INTEGER,
  downloaded_by UUID,
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  qr_version INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create qr_cache table
CREATE TABLE IF NOT EXISTS qr_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES qr_templates(id),
  format VARCHAR(10) NOT NULL CHECK (format IN ('PDF', 'PNG', 'SVG')),
  qr_version INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  file_size_kb INTEGER,
  checksum VARCHAR(64) NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  access_count INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Create qr_translations table
CREATE TABLE IF NOT EXISTS qr_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code VARCHAR(5) NOT NULL CHECK (language_code IN ('sv', 'en')),
  key VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  context VARCHAR(50) NOT NULL CHECK (context IN ('instruction', 'ui', 'email')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(language_code, key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qr_download_store_id ON qr_download_history(store_id);
CREATE INDEX IF NOT EXISTS idx_qr_download_business_id ON qr_download_history(business_id);
CREATE INDEX IF NOT EXISTS idx_qr_download_downloaded_at ON qr_download_history(downloaded_at);
CREATE INDEX IF NOT EXISTS idx_qr_cache_store_template ON qr_cache(store_id, template_id, format);
CREATE INDEX IF NOT EXISTS idx_qr_cache_expires ON qr_cache(expires_at);

-- Enable Row Level Security
ALTER TABLE qr_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_download_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_translations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for qr_templates (public read)
CREATE POLICY "Public can view active templates" ON qr_templates
  FOR SELECT USING (is_active = true);

-- RLS Policies for qr_download_history (businesses own data)
CREATE POLICY "Businesses can view own download history" ON qr_download_history
  FOR SELECT USING (business_id = auth.uid());

CREATE POLICY "Businesses can create download records" ON qr_download_history
  FOR INSERT WITH CHECK (business_id = auth.uid());

-- RLS Policies for qr_cache (system managed)
CREATE POLICY "System can manage cache" ON qr_cache
  FOR ALL USING (true);

-- RLS Policies for qr_translations (public read)
CREATE POLICY "Public can view translations" ON qr_translations
  FOR SELECT USING (true);

-- Insert initial template data
INSERT INTO qr_templates (name, width_cm, height_cm, qr_size_px, dpi, padding_px, font_size_code, font_size_instructions)
VALUES
  ('counter', 10.0, 10.0, 280, 300, 20, 14, 10),
  ('wall', 21.0, 21.0, 600, 300, 30, 18, 12),
  ('window', 30.0, 30.0, 900, 300, 40, 24, 14)
ON CONFLICT (name) DO NOTHING;

-- Insert initial translations (Swedish)
INSERT INTO qr_translations (language_code, key, value, context) VALUES
  ('sv', 'scan_prompt', 'Skanna för att ge feedback', 'instruction'),
  ('sv', 'cashback_info', 'Få upp till 15% cashback', 'instruction'),
  ('sv', 'step_1', '1. Skanna QR-koden med din mobil', 'instruction'),
  ('sv', 'step_2', '2. Berätta om din upplevelse', 'instruction'),
  ('sv', 'step_3', '3. Få cashback direkt via Swish', 'instruction'),
  ('sv', 'store_code_label', 'Kod', 'instruction'),
  ('sv', 'download_button', 'Ladda ner', 'ui'),
  ('sv', 'select_size', 'Välj storlek', 'ui'),
  ('sv', 'select_format', 'Välj format', 'ui')
ON CONFLICT (language_code, key) DO NOTHING;

-- Insert initial translations (English)
INSERT INTO qr_translations (language_code, key, value, context) VALUES
  ('en', 'scan_prompt', 'Scan to give feedback', 'instruction'),
  ('en', 'cashback_info', 'Get up to 15% cashback', 'instruction'),
  ('en', 'step_1', '1. Scan the QR code with your phone', 'instruction'),
  ('en', 'step_2', '2. Share your experience', 'instruction'),
  ('en', 'step_3', '3. Get cashback instantly via Swish', 'instruction'),
  ('en', 'store_code_label', 'Code', 'instruction'),
  ('en', 'download_button', 'Download', 'ui'),
  ('en', 'select_size', 'Select size', 'ui'),
  ('en', 'select_format', 'Select format', 'ui')
ON CONFLICT (language_code, key) DO NOTHING;

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_qr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_qr_templates_updated_at BEFORE UPDATE ON qr_templates
  FOR EACH ROW EXECUTE FUNCTION update_qr_updated_at();

CREATE TRIGGER update_qr_translations_updated_at BEFORE UPDATE ON qr_translations
  FOR EACH ROW EXECUTE FUNCTION update_qr_updated_at();

-- Create function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_qr_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM qr_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comment on tables for documentation
COMMENT ON TABLE qr_templates IS 'Stores QR code size templates for different display contexts';
COMMENT ON TABLE qr_download_history IS 'Tracks QR code downloads for analytics and auditing';
COMMENT ON TABLE qr_cache IS 'Caches generated QR codes for performance';
COMMENT ON TABLE qr_translations IS 'Stores multilingual text for QR code instructions';
COMMENT ON COLUMN stores.qr_version IS 'Version number incremented when QR code needs regeneration';
COMMENT ON COLUMN stores.qr_logo_enabled IS 'Whether to include Vocilia logo in QR codes';