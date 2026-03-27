-- ✅ Cleanup Script: Remove Malformed Records from CockroachDB
-- This script removes all records with NULL or invalid tmdb_id from movies and tv_series tables
-- Run this before testing the new Content Request Engine

-- ============================================================================
-- STEP 1: Backup count before deletion
-- ============================================================================

SELECT 
  'BEFORE CLEANUP' as status,
  (SELECT COUNT(*) FROM movies WHERE tmdb_id IS NULL OR tmdb_id <= 0) as malformed_movies,
  (SELECT COUNT(*) FROM tv_series WHERE tmdb_id IS NULL OR tmdb_id <= 0) as malformed_tv_series,
  (SELECT COUNT(*) FROM movies) as total_movies,
  (SELECT COUNT(*) FROM tv_series) as total_tv_series;

-- ============================================================================
-- STEP 2: Delete malformed movies (tmdb_id IS NULL or <= 0)
-- ============================================================================

DELETE FROM movies 
WHERE tmdb_id IS NULL OR tmdb_id <= 0;

-- ============================================================================
-- STEP 3: Delete malformed TV series (tmdb_id IS NULL or <= 0)
-- ============================================================================

DELETE FROM tv_series 
WHERE tmdb_id IS NULL OR tmdb_id <= 0;

-- ============================================================================
-- STEP 4: Verify cleanup
-- ============================================================================

SELECT 
  'AFTER CLEANUP' as status,
  (SELECT COUNT(*) FROM movies WHERE tmdb_id IS NULL OR tmdb_id <= 0) as malformed_movies,
  (SELECT COUNT(*) FROM tv_series WHERE tmdb_id IS NULL OR tmdb_id <= 0) as malformed_tv_series,
  (SELECT COUNT(*) FROM movies) as total_movies,
  (SELECT COUNT(*) FROM tv_series) as total_tv_series;

-- ============================================================================
-- STEP 5: Show sample of remaining records
-- ============================================================================

SELECT 'SAMPLE MOVIES' as info, id, tmdb_id, title 
FROM movies 
ORDER BY id DESC 
LIMIT 5;

SELECT 'SAMPLE TV SERIES' as info, id, tmdb_id, name 
FROM tv_series 
ORDER BY id DESC 
LIMIT 5;
