-- ============================================================================
-- Script: 02_create_cast_tables.sql
-- Purpose: Create cast and crew tables for movies and TV series
-- Date: 2026-04-19
-- Database: CockroachDB
-- ============================================================================

-- ============================================================================
-- Movie Cast Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS movie_cast (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  actor_id INTEGER NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  character_name TEXT,
  cast_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(movie_id, actor_id)
);

-- Indexes for movie_cast
CREATE INDEX IF NOT EXISTS idx_movie_cast_movie_id ON movie_cast(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_cast_actor_id ON movie_cast(actor_id);
CREATE INDEX IF NOT EXISTS idx_movie_cast_order ON movie_cast(movie_id, cast_order);

-- ============================================================================
-- TV Series Cast Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS tv_cast (
  id SERIAL PRIMARY KEY,
  series_id INTEGER NOT NULL REFERENCES tv_series(id) ON DELETE CASCADE,
  actor_id INTEGER NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  character_name TEXT,
  cast_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(series_id, actor_id)
);

-- Indexes for tv_cast
CREATE INDEX IF NOT EXISTS idx_tv_cast_series_id ON tv_cast(series_id);
CREATE INDEX IF NOT EXISTS idx_tv_cast_actor_id ON tv_cast(actor_id);
CREATE INDEX IF NOT EXISTS idx_tv_cast_order ON tv_cast(series_id, cast_order);

-- ============================================================================
-- Movie Crew Table (Optional - for directors, producers, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS movie_crew (
  id SERIAL PRIMARY KEY,
  movie_id INTEGER NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  actor_id INTEGER NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  job TEXT NOT NULL,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(movie_id, actor_id, job)
);

-- Indexes for movie_crew
CREATE INDEX IF NOT EXISTS idx_movie_crew_movie_id ON movie_crew(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_crew_actor_id ON movie_crew(actor_id);
CREATE INDEX IF NOT EXISTS idx_movie_crew_job ON movie_crew(job);

-- ============================================================================
-- TV Series Crew Table (Optional - for directors, producers, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tv_crew (
  id SERIAL PRIMARY KEY,
  series_id INTEGER NOT NULL REFERENCES tv_series(id) ON DELETE CASCADE,
  actor_id INTEGER NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  job TEXT NOT NULL,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(series_id, actor_id, job)
);

-- Indexes for tv_crew
CREATE INDEX IF NOT EXISTS idx_tv_crew_series_id ON tv_crew(series_id);
CREATE INDEX IF NOT EXISTS idx_tv_crew_actor_id ON tv_crew(actor_id);
CREATE INDEX IF NOT EXISTS idx_tv_crew_job ON tv_crew(job);

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('movie_cast', 'tv_cast', 'movie_crew', 'tv_crew')
ORDER BY table_name;
