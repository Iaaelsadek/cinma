-- Migration: Make vote_average and vote_count nullable in games and software tables
-- This allows the system to distinguish between "no rating" (NULL) and "rated as zero" (0)
-- enabling proper neutral rating defaults (5.0) for unrated content.
--
-- Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 14.1-14.8
-- Safe to run multiple times (idempotent)

-- Make vote_average nullable in games table
ALTER TABLE games ALTER COLUMN vote_average DROP NOT NULL;

-- Make vote_count nullable in games table
ALTER TABLE games ALTER COLUMN vote_count DROP NOT NULL;

-- Make vote_average nullable in software table
ALTER TABLE software ALTER COLUMN vote_average DROP NOT NULL;

-- Make vote_count nullable in software table
ALTER TABLE software ALTER COLUMN vote_count DROP NOT NULL;
