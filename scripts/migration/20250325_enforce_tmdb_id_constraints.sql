-- Migration: Enforce tmdb_id constraints for Content Request Fetching Engine
-- Date: 2025-03-25
-- Purpose: Ensure tmdb_id is UNIQUE, INDEXED, and NOT NULL to fix malformed content records
-- CRITICAL: This migration safely cleans up malformed records BEFORE applying constraints

-- ============================================================================
-- STEP 1: SAFE CLEANUP - Remove or fix malformed records
-- ============================================================================

-- Log malformed records before cleanup (for audit trail)
DO $$
DECLARE
  movies_null_count INTEGER;
  series_null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO movies_null_count FROM movies WHERE tmdb_id IS NULL;
  SELECT COUNT(*) INTO series_null_count FROM tv_series WHERE tmdb_id IS NULL;
  
  RAISE NOTICE 'Found % movies with NULL tmdb_id', movies_null_count;
  RAISE NOTICE 'Found % tv_series with NULL tmdb_id', series_null_count;
END $$;

-- Delete movies with NULL tmdb_id (cannot be recovered without TMDB ID)
DELETE FROM movies WHERE tmdb_id IS NULL;

-- Delete tv_series with NULL tmdb_id (cannot be recovered without TMDB ID)
DELETE FROM tv_series WHERE tmdb_id IS NULL;

-- Handle duplicate tmdb_ids - keep the most recent record
-- For movies: Delete older duplicates, keep newest by created_at
DELETE FROM movies a
USING movies b
WHERE a.tmdb_id = b.tmdb_id
  AND a.id < b.id
  AND a.tmdb_id IS NOT NULL;

-- For tv_series: Delete older duplicates, keep newest by created_at
DELETE FROM tv_series a
USING tv_series b
WHERE a.tmdb_id = b.tmdb_id
  AND a.id < b.id
  AND a.tmdb_id IS NOT NULL;

-- ============================================================================
-- STEP 2: ADD UNIQUE CONSTRAINTS
-- ============================================================================

-- Add UNIQUE constraint on tmdb_id for movies table
ALTER TABLE movies 
  ADD CONSTRAINT IF NOT EXISTS movies_tmdb_id_unique UNIQUE (tmdb_id);

-- Add UNIQUE constraint on tmdb_id for tv_series table
ALTER TABLE tv_series 
  ADD CONSTRAINT IF NOT EXISTS tv_series_tmdb_id_unique UNIQUE (tmdb_id);

-- ============================================================================
-- STEP 3: ADD NOT NULL CONSTRAINTS
-- ============================================================================

-- Add NOT NULL constraint on tmdb_id for movies table
ALTER TABLE movies 
  ALTER COLUMN tmdb_id SET NOT NULL;

-- Add NOT NULL constraint on tmdb_id for tv_series table
ALTER TABLE tv_series 
  ALTER COLUMN tmdb_id SET NOT NULL;

-- ============================================================================
-- STEP 4: ADD INDEXES FOR QUERY PERFORMANCE
-- ============================================================================

-- Create index on tmdb_id for movies (if not exists from UNIQUE constraint)
-- Note: UNIQUE constraint automatically creates an index, but we ensure it's there
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);

-- Create index on tmdb_id for tv_series (if not exists from UNIQUE constraint)
CREATE INDEX IF NOT EXISTS idx_tv_series_tmdb_id ON tv_series(tmdb_id);

-- ============================================================================
-- STEP 5: VERIFICATION
-- ============================================================================

-- Verify constraints were applied successfully
DO $$
DECLARE
  movies_count INTEGER;
  series_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO movies_count FROM movies;
  SELECT COUNT(*) INTO series_count FROM tv_series;
  
  RAISE NOTICE 'Migration complete. Movies: %, TV Series: %', movies_count, series_count;
  RAISE NOTICE 'All records now have valid, unique tmdb_id values';
END $$;
