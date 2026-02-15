-- Add missing columns to support Python fetchers

-- Anime: Add episodes
ALTER TABLE "public"."anime" ADD COLUMN IF NOT EXISTS "episodes" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "public"."anime" ADD COLUMN IF NOT EXISTS "rating" numeric;

-- Games: Add category and rating
ALTER TABLE "public"."games" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "public"."games" ADD COLUMN IF NOT EXISTS "rating" numeric;

-- TV Series: Add genres
ALTER TABLE "public"."tv_series" ADD COLUMN IF NOT EXISTS "genres" text[];
