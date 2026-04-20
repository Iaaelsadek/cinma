-- Migration: Add Genre Indexes for Performance
-- Database: CockroachDB
-- Updated to match actual table schemas

-- ============================================================================
-- MOVIES - has primary_genre column
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_primary_genre 
ON movies (primary_genre) 
WHERE primary_genre IS NOT NULL AND primary_genre != '';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_genre_rating_date 
ON movies (primary_genre, vote_average DESC, release_date DESC);

-- ============================================================================
-- TV_SERIES - has primary_genre and category columns
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tv_series_primary_genre 
ON tv_series (primary_genre) 
WHERE primary_genre IS NOT NULL AND primary_genre != '';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tv_series_genre_rating_date 
ON tv_series (primary_genre, vote_average DESC, first_air_date DESC);

-- tv_series does NOT have a category column - skip category index

-- ============================================================================
-- GAMES - has primary_genre column
-- ============================================================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_games_primary_genre 
ON games (primary_genre) 
WHERE primary_genre IS NOT NULL AND primary_genre != '';

-- ============================================================================
-- SOFTWARE - does NOT have primary_genre, uses genres JSONB
-- No index needed for JSONB text search (ILIKE on ::text is not indexable)
-- ============================================================================

-- ============================================================================
-- ANIME - table may not exist yet, skip
-- ============================================================================

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- DROP INDEX CONCURRENTLY IF EXISTS idx_movies_primary_genre;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_movies_genre_rating_date;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_tv_series_primary_genre;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_tv_series_genre_rating_date;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_tv_series_category;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_games_primary_genre;
