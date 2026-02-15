-- Force update movies table
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS arabic_title TEXT;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS embed_links JSONB DEFAULT '{}'::JSONB;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS rating_color TEXT DEFAULT 'yellow';
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS trailer_url TEXT;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS subtitle_urls JSONB DEFAULT '{}'::JSONB;
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS last_checked TIMESTAMPTZ;

-- Force update tv_series table
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS arabic_title TEXT;
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS embed_links JSONB DEFAULT '{}'::JSONB;
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS rating_color TEXT DEFAULT 'yellow';
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS trailer_url TEXT;
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS subtitle_urls JSONB DEFAULT '{}'::JSONB;
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS last_checked TIMESTAMPTZ;
ALTER TABLE public.tv_series ADD COLUMN IF NOT EXISTS first_air_date DATE;

-- Force update other tables
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

ALTER TABLE public.software ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.software ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS rating_color TEXT DEFAULT 'green';
ALTER TABLE public.anime ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.quran_reciters ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.quran_reciters ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE public.quran_reciters ADD COLUMN IF NOT EXISTS category TEXT;

-- Create link_checks if not exists
CREATE TABLE IF NOT EXISTS public.link_checks ( 
   id SERIAL PRIMARY KEY, 
   content_id BIGINT, 
   content_type TEXT CHECK (content_type IN ('movie', 'tv', 'episode')), 
   source_name TEXT, 
   url TEXT, 
   status_code INT, 
   response_time_ms INT, 
   checked_at TIMESTAMPTZ DEFAULT NOW() 
);

-- Reload schema cache (this is a special Supabase/PostgREST function call if available, or just a comment)
NOTIFY pgrst, 'reload schema';
