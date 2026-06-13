-- ============================================================
-- Student Application Portal — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Table: applications
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(10),
  first_name      VARCHAR(100) NOT NULL,
  middle_name     VARCHAR(100),
  last_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  mobile          VARCHAR(15) NOT NULL,
  gender          VARCHAR(30),
  dob             DATE,
  state           VARCHAR(100),
  pan_number      VARCHAR(10),
  aadhaar_masked  VARCHAR(20),
  aadhaar_verified BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);

-- ============================================================
-- Table: aadhaar_verification
-- ============================================================
CREATE TABLE IF NOT EXISTS aadhaar_verification (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id       UUID REFERENCES applications(id) ON DELETE CASCADE,
  request_id           VARCHAR(255) UNIQUE NOT NULL,
  aadhaar_name         VARCHAR(255),
  aadhaar_state        VARCHAR(100),
  name_match           BOOLEAN,
  state_match          BOOLEAN,
  verification_status  VARCHAR(20) DEFAULT 'INITIATED'
                         CHECK (verification_status IN ('INITIATED','PENDING','VERIFIED','FAILED')),
  verification_message TEXT,
  verified_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_application_id ON aadhaar_verification(application_id);
CREATE INDEX IF NOT EXISTS idx_verification_request_id ON aadhaar_verification(request_id);
CREATE INDEX IF NOT EXISTS idx_verification_status ON aadhaar_verification(verification_status);

-- ============================================================
-- Table: webhook_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id  VARCHAR(255),
  payload     JSONB NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_request_id ON webhook_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received_at ON webhook_logs(received_at DESC);

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_aadhaar_verification_updated_at
  BEFORE UPDATE ON aadhaar_verification
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security (RLS) — Supabase best practice
-- ============================================================
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE aadhaar_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Service role bypass (backend uses service role key)
CREATE POLICY "Service role full access - applications"
  ON applications FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - aadhaar_verification"
  ON aadhaar_verification FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access - webhook_logs"
  ON webhook_logs FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- Useful views for admin
-- ============================================================
CREATE OR REPLACE VIEW v_verification_summary AS
SELECT
  a.id AS application_id,
  a.first_name,
  a.last_name,
  a.email,
  a.mobile,
  a.state AS form_state,
  a.aadhaar_masked,
  a.aadhaar_verified,
  a.created_at,
  av.request_id,
  av.aadhaar_name,
  av.aadhaar_state,
  av.name_match,
  av.state_match,
  av.verification_status,
  av.verification_message,
  av.verified_at
FROM applications a
LEFT JOIN aadhaar_verification av
  ON a.id = av.application_id
  AND av.created_at = (
    SELECT MAX(created_at)
    FROM aadhaar_verification
    WHERE application_id = a.id
  );
