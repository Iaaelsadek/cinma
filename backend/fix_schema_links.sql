-- Fix missing embed_links column in movies table
ALTER TABLE IF EXISTS movies 
ADD COLUMN IF NOT EXISTS embed_links JSONB DEFAULT '{}'::JSONB;

-- Fix missing embed_links column in tv_series table
ALTER TABLE IF EXISTS tv_series 
ADD COLUMN IF NOT EXISTS embed_links JSONB DEFAULT '{}'::JSONB;

-- Ensure link_checks table exists
CREATE TABLE IF NOT EXISTS link_checks ( 
   id SERIAL PRIMARY KEY, 
   content_id BIGINT, 
   content_type TEXT CHECK (content_type IN ('movie', 'tv', 'episode')), 
   source_name TEXT, 
   url TEXT, 
   status_code INT, 
   response_time_ms INT, 
   checked_at TIMESTAMPTZ DEFAULT NOW() 
);
