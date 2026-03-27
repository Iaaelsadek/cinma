-- ============================================
-- CockroachDB Migration: Create Requests Table
-- Purpose: Store user content requests for admin processing
-- NOTE: This is a temporary solution - ideally requests should be in Supabase
-- ============================================

-- Create requests table
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  notes TEXT,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'rejected')),
  media_type TEXT CHECK (media_type IN ('movie', 'tv')),
  tmdb_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_tmdb_id ON requests(tmdb_id);

SELECT 'Requests table created successfully in CockroachDB!' AS status;
