-- foundation-traffic-watch schema
-- Run via Supabase CLI: supabase db push

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Anonymous tips (no PII stored by default)
CREATE TABLE tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL CHECK (source IN ('hotline', 'web_form', 'text', 'app', 'social_media')),
  category TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  location_region TEXT,
  urgency TEXT NOT NULL DEFAULT 'informational',
  status TEXT NOT NULL DEFAULT 'received',
  triage_notes TEXT,
  assigned_to UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Classified ads under analysis
CREATE TABLE ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  url TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  location TEXT,
  phone_numbers TEXT[] DEFAULT '{}',
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT CHECK (risk_level IN ('low', 'moderate', 'high', 'critical')),
  recommended_action TEXT,
  captured_at TIMESTAMPTZ NOT NULL,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ads_risk_level ON ads(risk_level);
CREATE INDEX idx_ads_platform ON ads(platform);
CREATE INDEX idx_ads_phone_numbers ON ads USING GIN(phone_numbers);

-- Cross-ad links
CREATE TABLE ad_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  target_ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL,
  confidence NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_ad_id, target_ad_id, link_type)
);

-- Investigation dossiers
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  case_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'preliminary',
  victim_safety_risk TEXT,
  evidence_strength TEXT,
  network_size TEXT,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chain of custody audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  metadata JSONB DEFAULT '{}',
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Survivor safety plans (encrypted payload — client-side encryption recommended)
CREATE TABLE safety_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id_hash TEXT NOT NULL,
  encrypted_payload BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Analytics metrics
CREATE TABLE metrics (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  metric_type TEXT NOT NULL DEFAULT 'gauge',
  tags JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_metrics_name_time ON metrics(name, recorded_at DESC);

-- Row Level Security
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

-- Service role has full access; authenticated investigators read cases/ads
CREATE POLICY "service_role_all" ON tips FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON ads FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON ad_links FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON cases FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON safety_plans FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anonymous tip submission (insert only, no read back)
CREATE POLICY "anon_insert_tips" ON tips FOR INSERT TO anon WITH CHECK (true);