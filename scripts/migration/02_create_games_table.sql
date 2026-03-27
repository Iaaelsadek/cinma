-- ==========================================
-- Create games table in CockroachDB
-- Task 1.4: إنشاء جدول games في CockroachDB (NOT Supabase)
-- ==========================================

CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  release_date DATE,
  rating FLOAT DEFAULT 0,
  rating_count INT DEFAULT 0,
  popularity FLOAT DEFAULT 0,
  category TEXT,
  platform JSONB,
  developer TEXT,
  publisher TEXT,
  genres JSONB,
  tags JSONB,
  system_requirements JSONB,
  screenshots JSONB,
  videos JSONB,
  website TEXT,
  steam_id INT,
  metacritic_score INT,
  slug TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
