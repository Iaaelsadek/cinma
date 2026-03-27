-- Migration: Add slug column to software table in Supabase
-- Task 1.5: إضافة عمود slug لجدول software
-- Requirements: 2.5, 2.6

-- Step 1: Add slug column (TEXT, nullable)
ALTER TABLE software ADD COLUMN IF NOT EXISTS slug TEXT;

-- Step 2: Create unique index on slug column
-- Only applies to non-null values to allow gradual migration
CREATE UNIQUE INDEX IF NOT EXISTS idx_software_slug
ON software(slug)
WHERE slug IS NOT NULL;

-- Step 3: Enable pg_trgm extension for trigram similarity search
-- This extension is required for GIN indexes on text columns
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 4: Create GIN index for fast text search using trigrams
-- This enables fast ILIKE queries and similarity searches
CREATE INDEX IF NOT EXISTS idx_software_slug_trgm
ON software USING GIN (slug gin_trgm_ops);

-- Verification queries (optional - run after migration)
-- Check if slug column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'software' AND column_name = 'slug';

-- Check if indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'software' AND indexname LIKE 'idx_software_slug%'
ORDER BY indexname;

-- Count software items with and without slugs
SELECT
  COUNT(*) as total_software,
  COUNT(slug) as with_slug,
  COUNT(*) - COUNT(slug) as without_slug
FROM software;
