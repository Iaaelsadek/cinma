-- Migration SQL: Add slug column to games table in Supabase
-- Task 1.4: إضافة عمود slug لجدول games
-- Requirements: 2.4, 2.6

-- Step 1: Add slug column (TEXT, nullable)
ALTER TABLE games ADD COLUMN IF NOT EXISTS slug TEXT;

-- Step 2: Create unique index on slug column
-- (partial index - only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_games_slug
ON games(slug)
WHERE slug IS NOT NULL;

-- Step 3: Enable pg_trgm extension for trigram search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 4: Create GIN index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_games_slug_trgm
ON games USING GIN (slug gin_trgm_ops);

-- Verification queries:
-- Check if slug column exists
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'games' AND column_name = 'slug';

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'games' AND indexname LIKE 'idx_games_slug%';

-- Sample data
-- SELECT id, title, slug 
-- FROM games 
-- ORDER BY id 
-- LIMIT 10;
