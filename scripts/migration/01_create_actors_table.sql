-- ==========================================
-- Create actors table in CockroachDB
-- Task 1.3: إنشاء جدول actors بشكل صحيح
-- ==========================================

CREATE TABLE IF NOT EXISTS actors (
  id SERIAL PRIMARY KEY,
  tmdb_id INT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  original_name TEXT,
  profile_path TEXT,
  biography TEXT,
  birthday DATE,
  deathday DATE,
  place_of_birth TEXT,
  gender INT,
  known_for_department TEXT,
  popularity FLOAT DEFAULT 0,
  adult BOOLEAN DEFAULT FALSE,
  also_known_as JSONB,
  homepage TEXT,
  imdb_id TEXT,
  slug TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
