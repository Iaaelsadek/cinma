-- Migration: Create link_checks table in CockroachDB
-- Date: 2026-04-10
-- Purpose: Move link_checks from Supabase to CockroachDB

-- Create link_checks table
CREATE TABLE IF NOT EXISTS link_checks (
  id SERIAL PRIMARY KEY,
  provider_id VARCHAR(255),
  content_id INTEGER,
  content_type VARCHAR(50),
  source_name VARCHAR(255),
  url TEXT NOT NULL,
  ok BOOLEAN DEFAULT false,
  status_code INTEGER DEFAULT 0,
  response_ms INTEGER DEFAULT 0,
  checked_at TIMESTAMP DEFAULT NOW(),
  source VARCHAR(100) DEFAULT 'manual',
  season_number INTEGER,
  episode_number INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_link_checks_content ON link_checks(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_link_checks_status ON link_checks(status_code);
CREATE INDEX IF NOT EXISTS idx_link_checks_checked_at ON link_checks(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_link_checks_provider ON link_checks(provider_id);

-- Create embed_sources table if it doesn't exist
CREATE TABLE IF NOT EXISTS embed_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  priority INTEGER DEFAULT 5,
  response_time_ms INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default embed sources
INSERT INTO embed_sources (name, priority, response_time_ms, is_active)
VALUES 
  ('vidsrc', 1, 500, true),
  ('2embed', 2, 600, true),
  ('embed_su', 3, 700, true),
  ('autoembed', 4, 800, true)
ON CONFLICT (name) DO NOTHING;

-- Add comment
COMMENT ON TABLE link_checks IS 'Link health checks and broken link reports - moved from Supabase to CockroachDB';
COMMENT ON TABLE embed_sources IS 'Embed server sources configuration';
