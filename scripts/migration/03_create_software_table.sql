-- ==========================================
-- Create software table in CockroachDB
-- Task 1.5: إنشاء جدول software في CockroachDB (NOT Supabase)
-- ==========================================

CREATE TABLE IF NOT EXISTS software (
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
  version TEXT,
  license_type TEXT,
  price FLOAT,
  features JSONB,
  screenshots JSONB,
  videos JSONB,
  website TEXT,
  download_url TEXT,
  system_requirements JSONB,
  file_size TEXT,
  languages JSONB,
  slug TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
