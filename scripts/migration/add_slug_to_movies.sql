-- Migration: Add slug column to movies table
-- Task 1.1: إضافة عمود slug لجدول movies في CockroachDB
-- Requirements: 2.1, 2.6

-- Step 1: Add slug column (nullable for backward compatibility)
ALTER TABLE movies ADD COLUMN IF NOT EXISTS slug TEXT;

-- Step 2: Create unique index on slug (partial index for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_movies_slug 
ON movies(slug) 
WHERE slug IS NOT NULL;

-- Step 3: Enable pg_trgm extension for trigram similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 4: Create GIN index for fast slug search using trigrams
CREATE INDEX IF NOT EXISTS idx_movies_slug_trgm 
ON movies USING GIN (slug gin_trgm_ops);

-- Verification queries:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'movies' AND column_name = 'slug';
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'movies' AND indexname LIKE 'idx_movies_slug%';
