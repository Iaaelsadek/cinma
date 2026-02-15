-- Add updated_at column to movies and tv_series
ALTER TABLE "public"."movies" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now();
ALTER TABLE "public"."tv_series" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz DEFAULT now();
