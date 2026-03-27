-- ============================================
-- CockroachDB Schema for Cinema Online
-- Run this FIRST before importing data
-- ============================================

-- Movies table
CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  original_title TEXT,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  release_date DATE,
  vote_average FLOAT DEFAULT 0,
  vote_count INTEGER DEFAULT 0,
  popularity FLOAT DEFAULT 0,
  adult BOOLEAN DEFAULT FALSE,
  original_language TEXT,
  runtime INTEGER,
  status TEXT,
  tagline TEXT,
  budget BIGINT DEFAULT 0,
  revenue BIGINT DEFAULT 0,
  genres JSONB DEFAULT '[]',
  cast_data JSONB DEFAULT '[]',
  crew_data JSONB DEFAULT '[]',
  similar_content JSONB DEFAULT '[]',
  production_companies JSONB DEFAULT '[]',
  spoken_languages JSONB DEFAULT '[]',
  keywords JSONB DEFAULT '[]',
  videos JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TV Series table
CREATE TABLE IF NOT EXISTS tv_series (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  original_name TEXT,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  first_air_date DATE,
  last_air_date DATE,
  vote_average FLOAT DEFAULT 0,
  vote_count INTEGER DEFAULT 0,
  popularity FLOAT DEFAULT 0,
  adult BOOLEAN DEFAULT FALSE,
  original_language TEXT,
  number_of_seasons INTEGER DEFAULT 0,
  number_of_episodes INTEGER DEFAULT 0,
  status TEXT,
  tagline TEXT,
  type TEXT,
  genres JSONB DEFAULT '[]',
  cast_data JSONB DEFAULT '[]',
  crew_data JSONB DEFAULT '[]',
  similar_content JSONB DEFAULT '[]',
  production_companies JSONB DEFAULT '[]',
  spoken_languages JSONB DEFAULT '[]',
  keywords JSONB DEFAULT '[]',
  videos JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  networks JSONB DEFAULT '[]',
  seasons JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies (popularity DESC);
CREATE INDEX IF NOT EXISTS idx_movies_vote_average ON movies (vote_average DESC);
CREATE INDEX IF NOT EXISTS idx_movies_release_date ON movies (release_date DESC);
CREATE INDEX IF NOT EXISTS idx_movies_original_language ON movies (original_language);

CREATE INDEX IF NOT EXISTS idx_tv_popularity ON tv_series (popularity DESC);
CREATE INDEX IF NOT EXISTS idx_tv_vote_average ON tv_series (vote_average DESC);
CREATE INDEX IF NOT EXISTS idx_tv_first_air_date ON tv_series (first_air_date DESC);
CREATE INDEX IF NOT EXISTS idx_tv_original_language ON tv_series (original_language);

-- GIN indexes for JSONB search
CREATE INDEX IF NOT EXISTS idx_movies_genres ON movies USING GIN (genres);
CREATE INDEX IF NOT EXISTS idx_tv_genres ON tv_series USING GIN (genres);

-- Trigram indexes for fast ILIKE text search
CREATE INDEX IF NOT EXISTS idx_movies_title_trgm ON movies USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tv_name_trgm ON tv_series USING GIN (name gin_trgm_ops);

SELECT 'Schema created successfully!' AS status;
