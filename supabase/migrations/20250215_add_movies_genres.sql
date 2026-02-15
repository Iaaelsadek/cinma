-- Add genres column to movies table
ALTER TABLE "public"."movies" ADD COLUMN IF NOT EXISTS "genres" text[];
