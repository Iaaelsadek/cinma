-- ============================================
-- Add Essential Indexes Only (Lightweight)
-- Cinema.Online - Performance Optimization
-- Fixed for CockroachDB compatibility
-- ============================================

-- Performance Indexes for Audit Queries (lightweight)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_created_at ON movies(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_updated_at ON movies(updated_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tv_created_at ON tv_series(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tv_updated_at ON tv_series(updated_at DESC);

-- Content Filtering Indexes (lightweight - partial index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_adult ON movies(adult) WHERE adult = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_status ON movies(status) WHERE status IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tv_status ON tv_series(status) WHERE status IS NOT NULL;

-- Language Filtering (lightweight)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_language ON movies(original_language);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tv_language ON tv_series(original_language);

-- Composite Indexes for Common Queries (lightweight - partial index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_rating_popularity 
  ON movies(vote_average DESC, popularity DESC) 
  WHERE vote_average > 0 AND poster_path IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tv_rating_popularity 
  ON tv_series(vote_average DESC, popularity DESC) 
  WHERE vote_average > 0 AND poster_path IS NOT NULL;

-- Soft Delete Support
ALTER TABLE movies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE tv_series ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_deleted_at 
  ON movies(deleted_at) WHERE deleted_at IS NOT NULL;
  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tv_deleted_at 
  ON tv_series(deleted_at) WHERE deleted_at IS NOT NULL;

-- Success message
SELECT 'Essential indexes added successfully!' AS status;
