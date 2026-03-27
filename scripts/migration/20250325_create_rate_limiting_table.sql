-- Migration: Create Rate Limiting Tables
-- Database: CockroachDB
-- Date: 2025-03-25

-- Table for tracking per-user rate limits
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address VARCHAR(45) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  INDEX idx_rate_limits_ip_created (ip_address, created_at)
);

-- Table for tracking global rate limits
CREATE TABLE IF NOT EXISTS global_rate_limits (
  id VARCHAR(50) PRIMARY KEY,
  request_count INT NOT NULL DEFAULT 0,
  window_start TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert initial global rate limit record
INSERT INTO global_rate_limits (id, request_count, window_start)
VALUES ('global', 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- Comments
COMMENT ON TABLE rate_limits IS 'Tracks individual user/IP rate limits for instant-add API';
COMMENT ON TABLE global_rate_limits IS 'Tracks global hourly rate limits across the entire site';
